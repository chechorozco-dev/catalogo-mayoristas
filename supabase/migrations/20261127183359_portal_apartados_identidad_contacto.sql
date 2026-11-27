create or replace function public.ra_portal_cliente(p_cliente uuid,p_telefono text)
returns public.clientes_autorizados language plpgsql stable security invoker set search_path='' as $$
declare c public.clientes_autorizados;
begin
 select a.* into c from public.clientes_autorizados a join public.tiendas t on t.id=a.tienda_id and t.negocio_id=a.negocio_id and t.activa
 where a.id=p_cliente and a.activo and a.rol='CLIENTE' and public.ra_contact_commercial_phone(null,a.telefono)=public.ra_contact_commercial_phone(null,p_telefono);
 if not found then raise exception 'PORTAL_ACCESO';end if;
 c.nombre:=nullif(btrim(left(btrim(regexp_replace(c.nombre,'[[:cntrl:]]',' ','g')),180)),'');
 return c;
end $$;

create or replace function public.ra_portal_documentos(p_negocio uuid,p_telefono text)
returns setof public.ra_chat_pedidos language sql stable security invoker set search_path='' as $$
 with lineas as (
  select l.id,l.phone_number_id from public.ra_phone_lines l join public.ra_locations loc on loc.id=l.location_id
  where loc.catalogo_negocio_id=p_negocio
 ), contactos as (
  select id from public.whatsapp_contacts where public.ra_contact_commercial_phone(wa_id,telefono)=public.ra_contact_commercial_phone(null,p_telefono)
  union
  select w.contact_id from public.ra_wati_contacts w join public.ra_wati_connections cx on cx.id=w.connection_id
  join lineas l on l.id=cx.line_id where w.external_id=public.ra_contact_commercial_phone(null,p_telefono)
  union
  select b.contact_id from public.ra_wati_phone_links b join public.ra_wati_connections cx on cx.id=b.connection_id
  join lineas l on l.id=cx.line_id where b.phone=public.ra_contact_commercial_phone(null,p_telefono)
 )
 select o.* from public.ra_chat_pedidos o join lineas l on l.phone_number_id=o.phone_number_id
 where o.tipo_documento='APARTADO' and o.contacto_id in (select id from contactos)
 and o.eliminado_en is null and o.estado<>'ELIMINADO'
$$;
