-- Private wholesale portal. The web server supplies the identity from its signed cookie.
create table public.ra_portal_apartado_envios (
 cliente_id uuid not null references public.clientes_autorizados(id),
 solicitud uuid not null, pedido_id uuid not null references public.ra_chat_pedidos(id),
 seleccion jsonb not null, creado_en timestamptz not null default now(),
 primary key(cliente_id,solicitud)
);
alter table public.ra_portal_apartado_envios enable row level security;
revoke all on public.ra_portal_apartado_envios from public, anon, authenticated;
grant select,insert on public.ra_portal_apartado_envios to service_role;

create function public.ra_portal_cliente(p_cliente uuid,p_telefono text)
returns public.clientes_autorizados language plpgsql stable security invoker set search_path='' as $$
declare c public.clientes_autorizados;
begin
 select a.* into c from public.clientes_autorizados a join public.tiendas t on t.id=a.tienda_id and t.negocio_id=a.negocio_id and t.activa
 where a.id=p_cliente and a.activo and a.rol='CLIENTE' and public.ra_contact_commercial_phone(null,a.telefono)=public.ra_contact_commercial_phone(null,p_telefono);
 if not found then raise exception 'PORTAL_ACCESO';end if;
 return c;
end $$;

create function public.ra_portal_documentos(p_negocio uuid,p_telefono text)
returns setof public.ra_chat_pedidos language sql stable security invoker set search_path='' as $$
 with lineas as (
  select l.id,l.phone_number_id from public.ra_phone_lines l join public.ra_locations loc on loc.id=l.location_id
  where loc.catalogo_negocio_id=p_negocio
 ), contactos as (
  select id from public.whatsapp_contacts where public.ra_contact_commercial_phone(wa_id,telefono)=public.ra_contact_commercial_phone(null,p_telefono)
  union
  select w.contact_id from public.ra_wati_contacts w join public.ra_wati_connections cx on cx.id=w.connection_id
  join lineas l on l.id=cx.line_id where w.external_id=public.ra_contact_commercial_phone(null,p_telefono)
 )
 select o.* from public.ra_chat_pedidos o join lineas l on l.phone_number_id=o.phone_number_id
 where o.tipo_documento='APARTADO' and o.contacto_id in (select id from contactos)
 and o.eliminado_en is null and o.estado<>'ELIMINADO'
$$;

create function public.ra_portal_estado(o public.ra_chat_pedidos)
returns text language sql immutable security invoker set search_path='' as $$
 select case
 when o.apartado_no_retirado_en is not null or upper(trim(o.appsheet_data->>'REF COLOR'))='ZMORA' then 'No retirado'
 when o.estado='CANCELADO' or upper(trim(o.appsheet_data->>'ESTADO')) in ('ELIMINADO','CANCELADO') then 'Cancelado'
 when upper(trim(o.appsheet_data->>'ESTADO'))='DESPACHADO' then 'Despachado'
 when o.etapa_operativa='DESPACHOS' then 'En despachos'
 when o.sync_remote_locked or o.sync_state='archived' or upper(trim(o.appsheet_data->>'ESTADO')) in ('CERRADO','ARCHIVADO') then 'Cerrado'
 when o.sync_state='review' or upper(trim(o.appsheet_data->>'REF COLOR'))='ZAZUL' then 'En revisión'
 when o.estado='BORRADOR' and o.etapa_operativa='ORIGEN' then 'Abierto'
 when o.estado='CONFIRMADO' then 'Confirmado' else 'Cerrado' end
$$;

-- Work in batches to reuse the Lab's live publication rules for every SKU.
create function public.ra_portal_oferta(p_negocio uuid,p_local uuid,p_busca text,p_claves text[])
returns table(clave text, producto uuid, variante uuid, referencia text, nombre text, foto text, mayor numeric, sugerido numeric, disponible integer)
language sql stable security invoker set search_path='' as $$
 with skus as (
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
 ), candidatos as materialized (
  select s.*,d.disponible,(row_number() over(order by s.clave)-1)/500 grupo
  from skus s left join public.ra_inventario_disponibilidad d on d.negocio_id=p_negocio and d.local_id=p_local and d.producto_ra_id=s.producto and d.variante_ra_id is not distinct from s.variante
  where s.mayor>0 and (d.disponible is null or d.disponible>0)
   and (p_claves is null or s.clave=any(p_claves))
   and (p_busca='' or position(lower(p_busca) in lower(s.referencia||' '||s.nombre))>0)
 ), grupos as (
  select grupo,jsonb_agg(jsonb_build_object('productId',producto,'variantId',variante)) ids
  from candidatos where coalesce(disponible,0)<=5 group by grupo
 ), publicados as (
  select s.product_key from grupos g cross join lateral public.ra_operation_catalog_states(p_negocio,g.ids) s where s.web_state='published'
 )
 select c.clave,c.producto,c.variante,c.referencia,c.nombre,c.foto,c.mayor,c.sugerido,c.disponible from candidatos c
 where c.disponible>5 or c.producto::text||':'||coalesce(c.variante::text,'') in (select product_key from publicados)
$$;

create function public.ra_portal_leer(p_cliente uuid,p_telefono text,p_modo text,p_pedido uuid default null,p_busca text default '',p_offset integer default 0,p_claves text[] default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; loc uuid; resultado jsonb;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 if p_modo in ('catalogo','seleccion') then
  if length(p_busca)>80 or p_offset not between 0 and 100000 or (p_modo='seleccion' and (p_claves is null or cardinality(p_claves)>250)) then raise exception 'PORTAL_DATOS';end if;
  select distinct l.location_id into strict loc from public.ra_phone_lines l join public.ra_locations s on s.id=l.location_id
   where l.active and s.active and s.stock_enabled and s.catalogo_negocio_id=c.negocio_id;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into resultado from (
   select clave,referencia,nombre,foto,mayor,sugerido from public.ra_portal_oferta(c.negocio_id,loc,trim(p_busca),p_claves)
   order by lower(referencia)=lower(trim(p_busca)) desc,referencia,clave
   limit case when p_modo='seleccion' then 250 else 25 end offset p_offset
  ) x;
  return jsonb_build_object('productos',resultado);
 end if;
 if p_modo='resumen' then
  with docs as materialized (select * from public.ra_portal_documentos(c.negocio_id,c.telefono))
  select jsonb_build_object('cliente',c.id,'bloqueado',exists(select from docs where apartado_alerta_activa),
   'apartados',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'codigo','APT'||d.numero_externo,'estado',public.ra_portal_estado(d),
    'fecha',d.creado_en,'unidades',s.unidades,'total',s.total) order by d.creado_en desc,d.id)
    from docs d cross join lateral (select coalesce(sum(i.cantidad),0) unidades,coalesce(sum(i.precio_unitario*i.cantidad),0) total
    from public.ra_chat_pedido_items i where i.pedido_id=d.id) s),'[]')) into resultado;
  return resultado;
 end if;
 if p_modo<>'detalle' then raise exception 'PORTAL_DATOS';end if;
 select * into o from public.ra_portal_documentos(c.negocio_id,c.telefono) where id=p_pedido;
 if not found then raise exception 'PORTAL_NO_EXISTE';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'referencia',i.referencia,'nombre',i.nombre,'cantidad',i.cantidad,
  'mayor',i.precio_unitario,'sugerido',coalesce(v.precio_sugerido,p.precio_sugerido),'foto',i.foto_url,
  'estado',case when pr.despachado then 'Despachado' when pr.agotado or upper(trim(i.appsheet_data->>'ESTADO')) in ('RED','ROJO') then 'Agotado'
   when pr.cantidad_apartada>=i.cantidad or upper(trim(i.appsheet_data->>'ESTADO')) in ('GREEN','VERDE') then 'Guardado' else 'Por guardar' end)
  order by i.creado_en,i.id),'[]') into resultado from public.ra_chat_pedido_items i
  left join public.ra_productos_principal p on p.id=i.producto_ra_id and p.negocio_id=c.negocio_id
  left join public.ra_producto_variantes_principal v on v.id=i.variante_ra_id and v.producto_ra_id=p.id
  left join public.ra_preparacion_items pr on pr.item_id=i.id where i.pedido_id=o.id;
 return jsonb_build_object('id',o.id,'codigo','APT'||o.numero_externo,'cliente',coalesce(nullif(o.nombre_cliente,''),c.nombre),
  'fecha',o.creado_en,'estado',public.ra_portal_estado(o),'abono',o.abono,'productos',resultado);
end $$;

create function public.ra_portal_apartar(p_cliente uuid,p_telefono text,p_pedido uuid,p_solicitud uuid,p_lineas jsonb,p_compromiso boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
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
  insert into public.ra_chat_pedidos(conversacion_id,contacto_id,phone_number_id,nombre_cliente,tipo_documento,sync_state)
   values(chat.id,chat.contacto_id,linea.phone_number_id,c.nombre,'APARTADO','pending') returning * into o;
 end if;
 for oferta in select * from jsonb_to_recordset(productos) as x(producto uuid,variante uuid,referencia text,nombre text,foto text,mayor numeric,solicitada int) loop
  perform public.ra_chat_pedido_agregar(o.id,oferta.producto,oferta.variante,oferta.referencia,oferta.nombre,oferta.foto,oferta.mayor,oferta.solicitada);
 end loop;
 insert into public.ra_portal_apartado_envios values(c.id,p_solicitud,o.id,seleccion,now());
 insert into public.ra_chat_pedido_cambios(pedido_id,accion,despues)
  values(o.id,'AGREGAR_DESDE_PORTAL',jsonb_build_object('solicitud',p_solicitud,'cliente',c.id,'referencias',cardinality(claves),'compromiso',1));
 return jsonb_build_object('id',o.id);
end $$;

revoke all on function public.ra_portal_cliente(uuid,text),public.ra_portal_documentos(uuid,text),public.ra_portal_estado(public.ra_chat_pedidos),
 public.ra_portal_oferta(uuid,uuid,text,text[]),public.ra_portal_leer(uuid,text,text,uuid,text,integer,text[]),public.ra_portal_apartar(uuid,text,uuid,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.ra_portal_cliente(uuid,text),public.ra_portal_documentos(uuid,text),public.ra_portal_estado(public.ra_chat_pedidos),
 public.ra_portal_oferta(uuid,uuid,text,text[]),public.ra_portal_leer(uuid,text,text,uuid,text,integer,text[]),public.ra_portal_apartar(uuid,text,uuid,uuid,jsonb,boolean) to service_role;
