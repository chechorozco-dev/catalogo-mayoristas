CREATE OR REPLACE FUNCTION public.ra_portal_leer(p_cliente uuid, p_telefono text, p_modo text, p_pedido uuid DEFAULT NULL::uuid, p_busca text DEFAULT ''::text, p_offset integer DEFAULT 0, p_claves text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; loc uuid; resultado jsonb;
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
    'forma_pago',d.forma_pago,'destinatario',d.nombre_cliente,'ficha',public.ra_portal_ficha(c,ct),'fecha',d.creado_en,'ultimo_producto_en',d.apartado_ultimo_ingreso_en,'unidades',s.unidades,'total',s.total) order by d.creado_en desc,d.id)
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
  order by i.creado_en,i.id),'[]') into resultado from public.ra_chat_pedido_items i
  left join public.ra_productos_principal p on p.id=i.producto_ra_id and p.negocio_id=c.negocio_id
  left join public.ra_producto_variantes_principal v on v.id=i.variante_ra_id and v.producto_ra_id=p.id
  left join public.ra_preparacion_items pr on pr.item_id=i.id where i.pedido_id=o.id;
 return jsonb_build_object('id',o.id,'codigo','APT'||o.numero_externo,'cliente',coalesce(nullif(o.nombre_cliente,''),c.nombre),
  'fecha',o.creado_en,'ultimo_producto_en',o.apartado_ultimo_ingreso_en,
  'forma_pago',o.forma_pago,'destinatario',o.nombre_cliente,'ficha',(select public.ra_portal_ficha(c,ct) from public.whatsapp_contacts ct where ct.id=o.contacto_id),
  'vence_en',public.ra_reserva_plazo(o.id)->>'vence_en','estado',public.ra_portal_estado(o),'abono',o.abono,'productos',resultado);
end $function$;
