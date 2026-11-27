-- Check the requested quantities against the same offer and location used at confirmation.
create function public.ra_portal_revisar_seleccion(p_cliente uuid,p_telefono text,p_pedido uuid,p_lineas jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare c public.clientes_autorizados; loc uuid; claves text[]; productos jsonb;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
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
 where f.disponible is null or f.disponible>=x.cantidad;
 return jsonb_build_object('productos',productos);
end $$;
revoke all on function public.ra_portal_revisar_seleccion(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ra_portal_revisar_seleccion(uuid,text,uuid,jsonb) to service_role;
