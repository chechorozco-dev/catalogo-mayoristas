CREATE OR REPLACE FUNCTION public.ra_portal_cliente(p_cliente uuid, p_telefono text)
 RETURNS public.clientes_autorizados
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare c public.clientes_autorizados;
begin
 select a.* into c from public.clientes_autorizados a join public.tiendas t on t.id=a.tienda_id and t.negocio_id=a.negocio_id and t.activa
 where a.id=p_cliente and a.activo and a.rol in ('CLIENTE','MAESTRO') and public.ra_contact_commercial_phone(null,a.telefono)=public.ra_contact_commercial_phone(null,p_telefono);
 if not found then raise exception 'PORTAL_ACCESO';end if;
 c.nombre:=nullif(btrim(left(btrim(regexp_replace(c.nombre,'[[:cntrl:]]',' ','g')),180)),'');
 return c;
end $function$;
