set lock_timeout='5s';
alter table public.ra_chat_pedidos add column transportadora_apartado text
 check(transportadora_apartado in ('INTERRAPIDISIMO','ENVIA','SERVIENTREGA','COORDINADORA'));

create function public.ra_portal_transportadora_permitida(p_pago text,p_total numeric,p_empresa text)
returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(p_pago in ('CONTADO','CONTADO_CON_ENVIO','PAGO_EN_CASA') and
  (p_empresa in ('INTERRAPIDISIMO','ENVIA','SERVIENTREGA') or
  (p_empresa='COORDINADORA' and p_pago='PAGO_EN_CASA' and p_total>400000)),false)
$$;

create function public.ra_portal_transportadora_visible(o public.ra_chat_pedidos,ct public.whatsapp_contacts,p_total numeric)
returns text language sql stable security invoker set search_path='' as $$
 select case when public.ra_portal_transportadora_permitida(o.forma_pago,p_total,empresa) then empresa end
 from (select upper(btrim(coalesce(o.transportadora_apartado,nullif(ct.transportadora_preferida,''),o.appsheet_data->>'TRANSPORTADORA'))) empresa) s
$$;

create function public.ra_portal_validar_entrega(p_pago text,p_empresa text,p_total numeric,p_contacto uuid)
returns void language plpgsql stable security invoker set search_path='' as $$
declare ciudad public.ciudades_envio; contacto public.whatsapp_contacts;
begin
 if p_pago is null or p_pago not in ('CONTADO','CONTADO_CON_ENVIO','PAGO_EN_CASA','RECOGE_EN_LOCAL') then raise exception 'PORTAL_ENTREGA'; end if;
 if p_pago='RECOGE_EN_LOCAL' then
  if p_empresa is not null then raise exception 'PORTAL_ENTREGA';end if;
 elsif not public.ra_portal_transportadora_permitida(p_pago,p_total,p_empresa) then
  raise exception 'PORTAL_ENTREGA';
 end if;
 if p_pago='PAGO_EN_CASA' then
  select * into contacto from public.whatsapp_contacts where id=p_contacto;
  if coalesce(nullif(contacto.ciudad_id,''),nullif(contacto.ciudad,'')) is not null then
   select * into ciudad from public.ra_resolve_shipping_city(coalesce(nullif(contacto.ciudad_id,''),contacto.ciudad),contacto.departamento);
   if found and (nullif(btrim(ciudad.pago_en_casa),'') is null or upper(btrim(ciudad.pago_en_casa)) like 'NO HAY%') then
    raise exception 'PORTAL_COBERTURA';
   end if;
  end if;
 end if;
end $$;

CREATE OR REPLACE FUNCTION public.ra_portal_confirmar_apartado(p_cliente uuid, p_telefono text, p_pedido uuid, p_solicitud uuid, p_lineas jsonb, p_compromiso boolean, p_entrega jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; previo public.ra_portal_apartado_envios;
 linea public.ra_phone_lines; loc uuid; contacto uuid; chat public.whatsapp_conversations; oferta record;
 claves text[]; seleccion jsonb; productos jsonb;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 if p_compromiso is distinct from true or p_solicitud is null or jsonb_typeof(p_lineas) is distinct from 'array' then raise exception 'PORTAL_DATOS';end if;
 if jsonb_array_length(p_lineas) not between 1 and 250 then raise exception 'PORTAL_DATOS';end if;
 if exists(select 1 from jsonb_to_recordset(p_lineas) as x(clave text,cantidad int,mayor numeric)
  where clave is null or length(clave)>90 or cantidad is null or cantidad not between 1 and 999 or mayor is null or mayor<=0)
 then raise exception 'PORTAL_DATOS';end if;
 select array_agg(distinct x.clave order by x.clave) into claves from jsonb_to_recordset(p_lineas) as x(clave text);
 if cardinality(claves)<>jsonb_array_length(p_lineas) then raise exception 'PORTAL_DATOS';end if;
 seleccion:=jsonb_build_object('destino',p_pedido,'lineas',p_lineas,'compromiso',1);
 if p_entrega is not null and p_entrega<>'{}'::jsonb then
  if p_pedido is not null or jsonb_typeof(p_entrega)<>'object' then raise exception 'PORTAL_ENTREGA';end if;
  seleccion:=seleccion||jsonb_build_object('entrega',p_entrega);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('ra-portal:'||c.negocio_id||':'||public.ra_contact_commercial_phone(null,c.telefono),0));
 select * into previo from public.ra_portal_apartado_envios where cliente_id=c.id and solicitud=p_solicitud;
 if found then
  if previo.seleccion<>seleccion then raise exception 'PORTAL_SOLICITUD';end if;
  return jsonb_build_object('id',previo.pedido_id);
 end if;
 -- Lock matching contacts in the same way as the staff penalty workflow.
 perform 1 from public.whatsapp_contacts ct where ct.id in (select contacto_id from public.ra_portal_documentos(c.negocio_id,c.telefono))
 or ct.id=c.contacto_id order by ct.id for update;
 if exists(select from public.ra_portal_documentos(c.negocio_id,c.telefono) where apartado_alerta_activa) then raise exception 'PORTAL_PENALIZADO';end if;
 if p_pedido is not null then
  select h.* into o from public.ra_chat_pedidos h where h.id=p_pedido and h.id in
   (select id from public.ra_portal_documentos(c.negocio_id,c.telefono)) for update;
  if not found or public.ra_portal_estado(o)<>'Abierto' then raise exception 'PORTAL_DESTINO';end if;
  select l.* into linea from public.ra_phone_lines l join public.ra_locations s on s.id=l.location_id
   where l.phone_number_id=o.phone_number_id and l.active and s.active and s.stock_enabled and s.catalogo_negocio_id=c.negocio_id;
 else
  if exists(select from public.ra_portal_documentos(c.negocio_id,c.telefono) d where public.ra_portal_estado(d)='Abierto') then raise exception 'PORTAL_DESTINO';end if;
  select l.* into linea from public.ra_phone_lines l join public.ra_locations s on s.id=l.location_id
   where l.provider='wati' and l.active and s.active and s.stock_enabled and s.catalogo_negocio_id=c.negocio_id order by l.created_at limit 1;
 end if;
 if linea.id is null then raise exception 'PORTAL_LINEA';end if;
 loc:=linea.location_id;
 -- Serialize portal checkouts for the same SKU, in a deterministic order.
 perform pg_advisory_xact_lock(hashtextextended('ra-portal-sku:'||loc||':'||k,0)) from unnest(claves) k order by k;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.clave),'[]') into productos from (
  select f.*,x.cantidad solicitada,x.mayor revisado from public.ra_portal_oferta(c.negocio_id,loc,'',claves) f
  join jsonb_to_recordset(p_lineas) as x(clave text,cantidad int,mayor numeric) using(clave)
 ) q;
 if jsonb_array_length(productos)<>cardinality(claves) then raise exception 'PORTAL_DISPONIBILIDAD';end if;
 for oferta in select * from jsonb_to_recordset(productos) as x(disponible int, solicitada int, revisado numeric, mayor numeric,referencia text) loop
  if oferta.disponible is not null and oferta.solicitada>oferta.disponible then raise exception 'PORTAL_DISPONIBILIDAD' using detail=oferta.referencia;end if;
  if oferta.revisado<>oferta.mayor then raise exception 'PORTAL_PRECIO';end if;
 end loop;
 if p_pedido is null then
  contacto:=public.ra_order_contact_for_phone(linea.phone_number_id,c.telefono,c.nombre,'portal_mayorista');
  select * into chat from public.whatsapp_conversations where contacto_id=contacto and phone_number_id=linea.phone_number_id and merged_into is null;
  if chat.id is null then
   insert into public.whatsapp_conversations(contacto_id,telefono_empresa,phone_number_id) values(contacto,public.ra_phone_normalized(linea.display_phone),linea.phone_number_id)
   on conflict(contacto_id,phone_number_id) do update set contacto_id=excluded.contacto_id returning * into chat;
  end if;
  if chat.merged_into is not null then raise exception 'PORTAL_LINEA';end if;
  if p_entrega is not null then
   perform public.ra_portal_validar_entrega(p_entrega->>'forma_pago',p_entrega->>'transportadora',
    (select sum(x.mayor*x.solicitada) from jsonb_to_recordset(productos) x(mayor numeric,solicitada integer)),chat.contacto_id);
  end if;
  insert into public.ra_chat_pedidos(conversacion_id,contacto_id,phone_number_id,nombre_cliente,tipo_documento,sync_state)
   values(chat.id,chat.contacto_id,linea.phone_number_id,c.nombre,'APARTADO','pending') returning * into o;
  if p_entrega is not null then
   update public.ra_chat_pedidos set forma_pago=p_entrega->>'forma_pago',transportadora_apartado=p_entrega->>'transportadora',
    actualizado_en=now() where id=o.id;
  end if;
 end if;
 for oferta in select * from jsonb_to_recordset(productos) as x(producto uuid,variante uuid,referencia text,nombre text,foto text,mayor numeric,solicitada int) loop
  perform public.ra_chat_pedido_agregar(o.id,oferta.producto,oferta.variante,oferta.referencia,oferta.nombre,oferta.foto,oferta.mayor,oferta.solicitada);
 end loop;
 insert into public.ra_portal_apartado_envios values(c.id,p_solicitud,o.id,seleccion,now());
 insert into public.ra_chat_pedido_cambios(pedido_id,accion,despues)
  values(o.id,'AGREGAR_DESDE_PORTAL',jsonb_build_object('solicitud',p_solicitud,'cliente',c.id,'referencias',cardinality(claves),'compromiso',1));
 return jsonb_build_object('id',o.id);
end $function$;

-- Installed clients retain their original request payload and receipt on retry.
create or replace function public.ra_portal_apartar(p_cliente uuid,p_telefono text,p_pedido uuid,p_solicitud uuid,p_lineas jsonb,p_compromiso boolean)
returns jsonb language sql security invoker set search_path='' as $$
 select public.ra_portal_confirmar_apartado(p_cliente,p_telefono,p_pedido,p_solicitud,p_lineas,p_compromiso,null)
$$;

create function public.ra_portal_editar_entrega(p_cliente uuid,p_telefono text,p_pedido uuid,p_pago text,p_empresa text,p_antes jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; ct public.whatsapp_contacts; total numeric; anterior jsonb; nueva jsonb;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 select h.* into o from public.ra_chat_pedidos h where h.id=p_pedido and exists
  (select from public.ra_portal_documentos(c.negocio_id,c.telefono) d where d.id=h.id) for update;
 if not found then raise exception 'PORTAL_NO_EXISTE';end if;
 if public.ra_portal_estado(o)<>'Abierto' then raise exception 'PORTAL_DESTINO';end if;
 select * into ct from public.whatsapp_contacts where id=o.contacto_id;
 select coalesce(sum(i.cantidad*i.precio_unitario),0) into total from public.ra_chat_pedido_items i where i.pedido_id=o.id;
 perform public.ra_portal_validar_entrega(p_pago,p_empresa,total,ct.id);
 anterior:=jsonb_build_object('forma_pago',o.forma_pago,'transportadora',public.ra_portal_transportadora_visible(o,ct,total));
 nueva:=jsonb_build_object('forma_pago',p_pago,'transportadora',p_empresa);
 if nueva is distinct from anterior or o.transportadora_apartado is distinct from p_empresa then
  if p_antes is distinct from anterior then raise exception 'PORTAL_ENTREGA_CAMBIO';end if;
  update public.ra_chat_pedidos set forma_pago=p_pago,transportadora_apartado=p_empresa,actualizado_en=now() where id=o.id;
  insert into public.ra_chat_pedido_cambios(pedido_id,accion,antes,despues) values(o.id,'EDITAR_ENTREGA_DESDE_PORTAL',anterior,nueva);
 end if;
 return nueva||jsonb_build_object('id',o.id,'total',total);
end $$;

CREATE OR REPLACE FUNCTION public.ra_portal_leer(p_cliente uuid, p_telefono text, p_modo text, p_pedido uuid DEFAULT NULL::uuid, p_busca text DEFAULT ''::text, p_offset integer DEFAULT 0, p_claves text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; loc uuid; resultado jsonb; total numeric;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 if p_modo='ciudades' then
  if char_length(btrim(p_busca)) not between 2 and 80 then return jsonb_build_object('ciudades','[]'::jsonb);end if;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into resultado from (
   select ciudad_id,ciudad_departamento from public.ciudades_envio where activa
   and strpos(translate(lower(ciudad_departamento),'áéíóúü','aeiouu'),translate(lower(btrim(p_busca)),'áéíóúü','aeiouu'))>0
   order by ciudad_departamento limit 30) q;
  return jsonb_build_object('ciudades',resultado);
 end if;
 if p_modo in ('catalogo','referencia','seleccion') then
  if length(p_busca)>80 or p_offset not between 0 and 100000 or (p_modo='seleccion' and (p_claves is null or cardinality(p_claves)>250)) then raise exception 'PORTAL_DATOS';end if;
  select distinct l.location_id into strict loc from public.ra_phone_lines l join public.ra_locations s on s.id=l.location_id
   where l.active and s.active and s.stock_enabled and s.catalogo_negocio_id=c.negocio_id;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into resultado from (
   select clave,referencia,nombre,foto,mayor,sugerido from public.ra_portal_oferta(c.negocio_id,loc,trim(p_busca),p_claves)
   where p_modo<>'referencia' or lower(btrim(referencia))=lower(btrim(p_busca))
      or (btrim(p_busca) ~ '^[0-9]+$' and substring(referencia from '[0-9]+')=btrim(p_busca))
   order by lower(btrim(referencia))=lower(trim(p_busca)) desc,
     (btrim(p_busca) ~ '^[0-9]+$' and substring(referencia from '[0-9]+')=btrim(p_busca)) desc nulls last,
     referencia,clave
   limit case when p_modo='seleccion' then 250 when p_modo='referencia' then null else 25 end offset p_offset
  ) x;
  return jsonb_build_object('productos',resultado);
 end if;
 if p_modo='resumen' then
  with docs as materialized (select * from public.ra_portal_documentos(c.negocio_id,c.telefono))
  select jsonb_build_object('cliente',c.id,'bloqueado',exists(select from docs where apartado_alerta_activa),
   'apartados',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'codigo','APT'||d.numero_externo,'estado',public.ra_portal_estado(d),
    'forma_pago',d.forma_pago,'transportadora',public.ra_portal_transportadora_visible(d,ct,s.total),'destinatario',d.nombre_cliente,'ficha',public.ra_portal_ficha(c,ct),'fecha',d.creado_en,'ultimo_producto_en',d.apartado_ultimo_ingreso_en,'unidades',s.unidades,'total',s.total) order by d.creado_en desc,d.id)
    from docs d join public.whatsapp_contacts ct on ct.id=d.contacto_id cross join lateral (select coalesce(sum(i.cantidad),0) unidades,coalesce(sum(i.precio_unitario*i.cantidad),0) total
    from public.ra_chat_pedido_items i where i.pedido_id=d.id) s),'[]')) into resultado;
  return resultado;
 end if;
 if p_modo<>'detalle' then raise exception 'PORTAL_DATOS';end if;
 select * into o from public.ra_portal_documentos(c.negocio_id,c.telefono) where id=p_pedido;
 if not found then raise exception 'PORTAL_NO_EXISTE';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'referencia',i.referencia,'nombre',i.nombre,'cantidad',i.cantidad,'agregado_en',i.agregado_en,
  'mayor',i.precio_unitario,'sugerido',coalesce(v.precio_sugerido,p.precio_sugerido),'foto',i.foto_url,
  'estado',case when pr.despachado then 'Despachado' when pr.agotado or upper(trim(i.appsheet_data->>'ESTADO')) in ('RED','ROJO') then 'Agotado'
   when pr.cantidad_apartada>=i.cantidad or upper(trim(i.appsheet_data->>'ESTADO')) in ('GREEN','VERDE') then 'Guardado' else 'Por guardar' end)
  order by i.creado_en,i.id),'[]'),coalesce(sum(i.cantidad*i.precio_unitario),0) into resultado,total from public.ra_chat_pedido_items i
  left join public.ra_productos_principal p on p.id=i.producto_ra_id and p.negocio_id=c.negocio_id
  left join public.ra_producto_variantes_principal v on v.id=i.variante_ra_id and v.producto_ra_id=p.id
  left join public.ra_preparacion_items pr on pr.item_id=i.id where i.pedido_id=o.id;
 return jsonb_build_object('id',o.id,'codigo','APT'||o.numero_externo,'cliente',coalesce(nullif(o.nombre_cliente,''),c.nombre),
  'fecha',o.creado_en,'ultimo_producto_en',o.apartado_ultimo_ingreso_en,
  'forma_pago',o.forma_pago,'total',total,'transportadora',(select public.ra_portal_transportadora_visible(o,ct,total) from public.whatsapp_contacts ct where ct.id=o.contacto_id),'destinatario',o.nombre_cliente,'ficha',(select public.ra_portal_ficha(c,ct) from public.whatsapp_contacts ct where ct.id=o.contacto_id),
  'vence_en',public.ra_reserva_plazo(o.id)->>'vence_en','estado',public.ra_portal_estado(o),'abono',o.abono,'productos',resultado);
end $function$;

revoke all on function public.ra_portal_transportadora_permitida(text,numeric,text),
 public.ra_portal_transportadora_visible(public.ra_chat_pedidos,public.whatsapp_contacts,numeric),
 public.ra_portal_validar_entrega(text,text,numeric,uuid),public.ra_portal_confirmar_apartado(uuid,text,uuid,uuid,jsonb,boolean,jsonb),
 public.ra_portal_editar_entrega(uuid,text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ra_portal_transportadora_permitida(text,numeric,text),
 public.ra_portal_transportadora_visible(public.ra_chat_pedidos,public.whatsapp_contacts,numeric),
 public.ra_portal_validar_entrega(text,text,numeric,uuid),public.ra_portal_confirmar_apartado(uuid,text,uuid,uuid,jsonb,boolean,jsonb),
 public.ra_portal_editar_entrega(uuid,text,uuid,text,text,jsonb) to service_role;
