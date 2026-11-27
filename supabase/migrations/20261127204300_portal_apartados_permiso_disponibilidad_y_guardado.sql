set local lock_timeout='4s';

create function public.ra_portal_skus(p_negocio uuid,p_busca text,p_claves text[])
returns table(clave text,producto uuid,variante uuid,referencia text,nombre text,foto text,mayor numeric,sugerido numeric)
language sql stable security invoker set search_path='' as $$ with skus as (
  select case when p.fuente_catalogo_id is null then 'r:'||p.id else 'w:'||p.fuente_catalogo_id||':0' end clave,
   p.id producto,null::uuid variante,p.referencia,p.nombre,coalesce(nullif(p.foto_url,''),p.foto_url_2) foto,p.precio_mayorista mayor,p.precio_sugerido sugerido
  from public.ra_productos_principal p where p.negocio_id=p_negocio and p.activo_administrativo and not p.tiene_variantes
  union all
  select case when p.fuente_catalogo_id is null or v.fuente_variante_id is null then 'r:'||v.id else 'w:'||p.fuente_catalogo_id||':'||v.fuente_variante_id end,
   p.id,v.id,v.referencia,concat_ws(' · ',p.nombre,nullif(v.nombre_variante,'')),
   coalesce(nullif(v.foto_url,''),nullif(v.foto_url_2,''),nullif(p.foto_url,''),p.foto_url_2),
   coalesce(v.precio_mayorista,p.precio_mayorista),coalesce(v.precio_sugerido,p.precio_sugerido)
  from public.ra_productos_principal p join public.ra_producto_variantes_principal v on v.producto_ra_id=p.id and v.negocio_id=p.negocio_id
  where p.negocio_id=p_negocio and p.activo_administrativo and p.tiene_variantes and v.activo_administrativo

 ) select * from skus s where (p_claves is null or s.clave=any(p_claves))
 and (p_busca='' or position(lower(p_busca) in lower(s.referencia||' '||s.nombre))>0)
$$;

CREATE OR REPLACE FUNCTION public.ra_portal_oferta(p_negocio uuid, p_local uuid, p_busca text, p_claves text[])
 RETURNS TABLE(clave text, producto uuid, variante uuid, referencia text, nombre text, foto text, mayor numeric, sugerido numeric, disponible integer)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with candidatos as materialized (
  select s.*,d.disponible,(row_number() over(order by s.clave)-1)/500 grupo
  from public.ra_portal_skus(p_negocio,p_busca,p_claves) s join public.ra_inventario_disponibilidad d on d.negocio_id=p_negocio and d.local_id=p_local and d.producto_ra_id=s.producto and d.variante_ra_id is not distinct from s.variante
  where s.mayor>0 and d.disponible>0
 ), grupos as (
  select grupo,jsonb_agg(jsonb_build_object('productId',producto,'variantId',variante)) ids
  from candidatos where coalesce(disponible,0)<=5 group by grupo
 ), publicados as (
  select s.product_key from grupos g cross join lateral public.ra_operation_catalog_states(p_negocio,g.ids) s where s.web_state='published'
 )
 select c.clave,c.producto,c.variante,c.referencia,c.nombre,c.foto,c.mayor,c.sugerido,c.disponible from candidatos c
 where c.disponible>5 or c.producto::text||':'||coalesce(c.variante::text,'') in (select product_key from publicados)
$function$;


create function public.ra_portal_puede_apartar(p_negocio uuid,p_telefono text)
returns boolean language sql stable security invoker set search_path='' as $$
 select not exists(select from public.ra_portal_documentos(p_negocio,p_telefono) d where d.apartado_alerta_activa)
$$;

-- Staff may reserve according to their own workflow. A shared row lock orders new
-- commitments against the portal's exclusive stock check, without limiting staff quantities.
create function public.ra_portal_coordinar_reserva() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.producto_ra_id is null then return new;end if;
 if tg_op='UPDATE' then
  if new.pedido_id=old.pedido_id and new.producto_ra_id is not distinct from old.producto_ra_id
   and new.variante_ra_id is not distinct from old.variante_ra_id and new.cantidad<=old.cantidad then return new;end if;
 end if;
 perform s.id from public.ra_chat_pedidos o
 join public.ra_phone_lines l on l.phone_number_id=o.phone_number_id and l.active
 join public.ra_inventario_saldos s on s.local_id=l.location_id and s.producto_ra_id=new.producto_ra_id
   and s.variante_ra_id is not distinct from new.variante_ra_id
 where o.id=new.pedido_id and o.estado in ('BORRADOR','CONFIRMADO') and o.eliminado_en is null
 order by s.id for key share of s;
 return new;
end $$;
create trigger ra_portal_coordinar_reserva before insert or update of pedido_id,producto_ra_id,variante_ra_id,cantidad
on public.ra_chat_pedido_items for each row execute function public.ra_portal_coordinar_reserva();

CREATE OR REPLACE FUNCTION public.ra_portal_confirmar_apartado(p_cliente uuid, p_telefono text, p_pedido uuid, p_solicitud uuid, p_lineas jsonb, p_compromiso boolean, p_entrega jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; previo public.ra_portal_apartado_envios;
 linea public.ra_phone_lines; loc uuid; contacto uuid; chat public.whatsapp_conversations; oferta record;
 claves text[]; saldos integer; seleccion jsonb; productos jsonb;
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
 if not public.ra_portal_puede_apartar(c.negocio_id,c.telefono) then raise exception 'PORTAL_PENALIZADO';end if;
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
 -- Serialize the final read with physical movements and pending reservations in Lab.
 perform s.id from public.ra_portal_skus(c.negocio_id,'',claves) k
 join public.ra_inventario_saldos s on s.negocio_id=c.negocio_id and s.local_id=loc
  and s.producto_ra_id=k.producto and s.variante_ra_id is not distinct from k.variante
 order by s.id for update of s;
 get diagnostics saldos=row_count;
 if saldos<>cardinality(claves) then raise exception 'PORTAL_DISPONIBILIDAD';end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.clave),'[]') into productos from (
  select f.*,x.cantidad solicitada,x.mayor revisado from public.ra_portal_oferta(c.negocio_id,loc,'',claves) f
  join jsonb_to_recordset(p_lineas) as x(clave text,cantidad int,mayor numeric) using(clave)
 ) q;
 if jsonb_array_length(productos)<>cardinality(claves) then raise exception 'PORTAL_DISPONIBILIDAD';end if;
 for oferta in select * from jsonb_to_recordset(productos) as x(disponible int, solicitada int, revisado numeric, mayor numeric,referencia text) loop
  if oferta.disponible is null or oferta.solicitada>oferta.disponible then raise exception 'PORTAL_DISPONIBILIDAD' using detail=oferta.referencia;end if;
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


CREATE OR REPLACE FUNCTION public.ra_portal_revisar_seleccion(p_cliente uuid, p_telefono text, p_pedido uuid, p_lineas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare c public.clientes_autorizados; loc uuid; claves text[]; productos jsonb;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 if not public.ra_portal_puede_apartar(c.negocio_id,c.telefono) then raise exception 'PORTAL_PENALIZADO';end if;
 if jsonb_typeof(p_lineas) is distinct from 'array' then raise exception 'PORTAL_DATOS'; end if;
 if jsonb_array_length(p_lineas)>250 or exists (
  select from jsonb_to_recordset(p_lineas) x(clave text,cantidad integer)
  where x.clave is null or length(x.clave)>90 or x.cantidad is null or x.cantidad not between 1 and 999
 ) then raise exception 'PORTAL_DATOS'; end if;
 if p_pedido is null then
  select l.location_id into loc from public.ra_phone_lines l join public.ra_locations s on s.id=l.location_id
  where l.provider='wati' and l.active and s.active and s.stock_enabled and s.catalogo_negocio_id=c.negocio_id
  order by l.created_at limit 1;
 else
  select l.location_id into loc from public.ra_portal_documentos(c.negocio_id,c.telefono) d
  join public.ra_phone_lines l on l.phone_number_id=d.phone_number_id join public.ra_locations s on s.id=l.location_id
  where d.id=p_pedido and l.active and s.active and s.stock_enabled and s.catalogo_negocio_id=c.negocio_id;
  if not found then raise exception 'PORTAL_DESTINO'; end if;
 end if;
 if loc is null then raise exception 'PORTAL_LINEA'; end if;
 select array(select distinct x.clave from jsonb_to_recordset(p_lineas) x(clave text)) into claves;
 if cardinality(claves)<>jsonb_array_length(p_lineas) then raise exception 'PORTAL_DATOS'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('clave',f.clave,'referencia',f.referencia,'nombre',f.nombre,
  'foto',f.foto,'mayor',f.mayor,'sugerido',f.sugerido)),'[]'::jsonb) into productos
 from public.ra_portal_oferta(c.negocio_id,loc,'',claves) f
 join jsonb_to_recordset(p_lineas) x(clave text,cantidad integer) using(clave)
 where f.disponible>=x.cantidad;
 return jsonb_build_object('productos',productos);
end $function$;


CREATE OR REPLACE FUNCTION public.ra_portal_leer(p_cliente uuid, p_telefono text, p_modo text, p_pedido uuid DEFAULT NULL::uuid, p_busca text DEFAULT ''::text, p_offset integer DEFAULT 0, p_claves text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; loc uuid; resultado jsonb; total numeric;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 if p_modo='permiso' then
  return jsonb_build_object('puede_apartar',public.ra_portal_puede_apartar(c.negocio_id,c.telefono));
 end if;
 if p_modo='ciudades' then
  if char_length(btrim(p_busca)) not between 2 and 80 then return jsonb_build_object('ciudades','[]'::jsonb);end if;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into resultado from (
   select ciudad_id,ciudad_departamento from public.ciudades_envio where activa
   and strpos(translate(lower(ciudad_departamento),'áéíóúü','aeiouu'),translate(lower(btrim(p_busca)),'áéíóúü','aeiouu'))>0
   order by ciudad_departamento limit 30) q;
  return jsonb_build_object('ciudades',resultado);
 end if;
 if p_modo in ('catalogo','referencia','seleccion') then
  if not public.ra_portal_puede_apartar(c.negocio_id,c.telefono) then raise exception 'PORTAL_PENALIZADO';end if;
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
  select jsonb_build_object( 'cliente',c.id,'whatsapp_ra',(select public.ra_phone_normalized(l.display_phone) from public.ra_phone_lines l join public.ra_locations s on s.id=l.location_id where l.provider='wati' and l.active and s.active and s.stock_enabled and s.catalogo_negocio_id=c.negocio_id order by l.created_at limit 1),'bloqueado',exists(select from docs where apartado_alerta_activa),
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
  'guardadas',g.unidades,'estado',case when pr.despachado then 'Despachado'
   when g.unidades>=i.cantidad then 'Guardado' when pr.agotado or col.efectivo='ROJO' then 'Agotado'
   when g.unidades>0 then 'Parcial' else 'Por guardar' end)
  order by i.creado_en,i.id),'[]'),coalesce(sum(i.cantidad*i.precio_unitario),0) into resultado,total from public.ra_chat_pedido_items i
  left join public.ra_productos_principal p on p.id=i.producto_ra_id and p.negocio_id=c.negocio_id
  left join public.ra_producto_variantes_principal v on v.id=i.variante_ra_id and v.producto_ra_id=p.id
  left join public.ra_preparacion_items pr on pr.item_id=i.id
  left join public.ra_reservas_guardadas_antes a on a.item_id=i.id
  left join public.ra_apartado_color_jobs j on j.pedido_id=i.pedido_id and j.destino=i.id::text
  cross join lateral (select case
    when nullif(upper(btrim(i.appsheet_data->>'CodigoEscaneado')),'')=upper(btrim(coalesce(i.referencia,i.appsheet_data->>'CODIGO')))
      or upper(btrim(i.appsheet_data->>'ESTADO')) in ('VERDE','GREEN') then 'VERDE'
    when upper(btrim(i.appsheet_data->>'ESTADO')) in ('ROJO','RED') then 'ROJO' else 'BLANCO' end historico) h
  cross join lateral (select case when j.estado<>'synced' then j.color else h.historico end efectivo) col
  cross join lateral (select least(i.cantidad,greatest(0,coalesce(pr.cantidad_apartada,0),
    case when a.devuelta_en is null and not coalesce(a.excluida_previa,false) and not(coalesce(a.origen='PRECONTEO',false) and coalesce(pr.agotado,false) and coalesce(pr.cantidad_apartada,0)=0) then coalesce(a.cantidad,0) else 0 end,
    case when col.efectivo='VERDE' and h.historico='VERDE' and a.item_id is null and not coalesce(pr.agotado,false) then i.cantidad else 0 end)) unidades) g
  where i.pedido_id=o.id;
 return jsonb_build_object('id',o.id,'codigo','APT'||o.numero_externo,'cliente',coalesce(nullif(o.nombre_cliente,''),c.nombre),
  'fecha',o.creado_en,'ultimo_producto_en',o.apartado_ultimo_ingreso_en,
  'forma_pago',o.forma_pago,'total',total,'transportadora',(select public.ra_portal_transportadora_visible(o,ct,total) from public.whatsapp_contacts ct where ct.id=o.contacto_id),'destinatario',o.nombre_cliente,'ficha',(select public.ra_portal_ficha(c,ct) from public.whatsapp_contacts ct where ct.id=o.contacto_id),
  'vence_en',public.ra_reserva_plazo(o.id)->>'vence_en','estado',public.ra_portal_estado(o),'abono',o.abono,'productos',resultado);
end $function$;


revoke all on function public.ra_portal_skus(uuid,text,text[]),
 public.ra_portal_coordinar_reserva(),
 public.ra_portal_puede_apartar(uuid,text) from public,anon,authenticated;
grant execute on function public.ra_portal_skus(uuid,text,text[]),
 public.ra_portal_coordinar_reserva(),
 public.ra_portal_puede_apartar(uuid,text) to service_role;
