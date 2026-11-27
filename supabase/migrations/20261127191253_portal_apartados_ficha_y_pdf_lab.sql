-- Each PDF grant is issued to an authenticated customer for one document.
create table public.ra_portal_pdf_permisos (
 huella bytea primary key, cliente uuid not null references public.clientes_autorizados(id) on delete cascade,
 pedido uuid not null references public.ra_chat_pedidos(id) on delete cascade, vence timestamptz not null
);
create index ra_portal_pdf_permisos_vence on public.ra_portal_pdf_permisos(vence);
alter table public.ra_portal_pdf_permisos enable row level security;
revoke all on public.ra_portal_pdf_permisos from public,anon,authenticated;
grant select,insert,delete on public.ra_portal_pdf_permisos to service_role;

create function public.ra_portal_pdf_emitir(p_cliente uuid,p_telefono text,p_pedido uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare c public.clientes_autorizados; token text;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 if not exists(select from public.ra_portal_documentos(c.negocio_id,c.telefono) where id=p_pedido) then raise exception 'PORTAL_NO_EXISTE';end if;
 delete from public.ra_portal_pdf_permisos where vence<now();
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.ra_portal_pdf_permisos values(sha256(convert_to(token,'UTF8')),p_cliente,p_pedido,now()+interval '90 seconds');
 return token;
end $$;

create function public.ra_portal_pdf_canjear(p_token text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare permiso public.ra_portal_pdf_permisos; c public.clientes_autorizados; salida jsonb;
begin
 if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null;end if;
 delete from public.ra_portal_pdf_permisos where huella=sha256(convert_to(p_token,'UTF8')) and vence>now() returning * into permiso;
 if not found then return null;end if;
 select * into c from public.clientes_autorizados where id=permiso.cliente;
 c:=public.ra_portal_cliente(c.id,c.telefono);
 select jsonb_build_object('pedido',d.id,'chat',d.conversacion_id) into salida
 from public.ra_portal_documentos(c.negocio_id,c.telefono) d join public.whatsapp_conversations chat
 on chat.id=d.conversacion_id and chat.contacto_id=d.contacto_id and chat.phone_number_id=d.phone_number_id where d.id=permiso.pedido;
 return salida;
end $$;

create function public.ra_portal_ficha(c public.clientes_autorizados,ct public.whatsapp_contacts)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('nombre',coalesce(nullif(btrim(ct.nombre_personalizado),''),nullif(c.nombre,''),ct.nombre,''),
  'whatsapp',c.telefono,'cedula',coalesce(ct.cedula,''),'correo',coalesce(ct.correo,''),
  'telefono_llamadas',coalesce(ct.telefono_llamadas,''),'direccion',coalesce(ct.direccion,''),
  'punto_referencia',coalesce(ct.punto_referencia,''),'ciudad_id',coalesce(ct.ciudad_id,''),
  'ciudad',coalesce(ct.ciudad,''),'departamento',coalesce(ct.departamento,''))
$$;

create function public.ra_portal_guardar_ficha(p_cliente uuid,p_telefono text,p_pedido uuid,p_cambios jsonb,p_antes jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.clientes_autorizados; o public.ra_chat_pedidos; ct public.whatsapp_contacts; ficha jsonb; destino public.ciudades_envio;
 campo text; valor text; patch jsonb:='{}'; overrides text[]:='{}'; registrados text[]; partes text[]; actual public.whatsapp_contacts; candidato uuid;
begin
 c:=public.ra_portal_cliente(p_cliente,p_telefono);
 select * into o from public.ra_portal_documentos(c.negocio_id,c.telefono) where id=p_pedido;
 if not found then raise exception 'PORTAL_NO_EXISTE';end if;
 -- Lock in the same order as the reservation flow: contacts first, then the document.
 perform 1 from public.whatsapp_contacts w where w.id=o.contacto_id or (w.id=c.contacto_id and w.meta_scope=''
   and public.ra_contact_commercial_phone(w.wa_id,w.telefono)=public.ra_contact_commercial_phone(null,c.telefono)) order by w.id for update;
 select * into ct from public.whatsapp_contacts where id=o.contacto_id;
 select * into o from public.ra_chat_pedidos where id=p_pedido and contacto_id=ct.id for update;
 if not found or public.ra_portal_estado(o)<>'Abierto' then raise exception 'PORTAL_DESTINO';end if;
 if not exists(select from public.ra_portal_documentos(c.negocio_id,c.telefono) where id=o.id) then raise exception 'PORTAL_NO_EXISTE';end if;
 ficha:=public.ra_portal_ficha(c,ct);
 if p_cambios is null or p_antes is null or jsonb_typeof(p_cambios)<>'object' or jsonb_typeof(p_antes)<>'object' or p_cambios='{}' then raise exception 'PORTAL_FICHA';end if;
 for campo in select jsonb_object_keys(p_cambios) loop
  if campo not in ('nombre','cedula','correo','telefono_llamadas','direccion','punto_referencia','ciudad_id')
    or jsonb_typeof(p_cambios->campo)<>'string' then raise exception 'PORTAL_FICHA';end if;
  if (p_antes->campo) is distinct from (ficha->campo) then raise exception 'PORTAL_FICHA_CAMBIO';end if;
  valor:=btrim(p_cambios->>campo);
  if char_length(valor)>(case campo when 'nombre' then 100 when 'cedula' then 32 when 'correo' then 254 when 'telefono_llamadas' then 24 when 'ciudad_id' then 100 else 250 end)
    or valor ~ '[[:cntrl:]]' then raise exception 'PORTAL_FICHA';end if;
  if campo='nombre' then
   if valor='' then raise exception 'PORTAL_FICHA';end if;
   patch:=patch||jsonb_build_object('nombre_personalizado',valor);
  elsif campo='ciudad_id' then
   select * into destino from public.ciudades_envio where ciudad_id=valor and activa;
   if not found then raise exception 'PORTAL_CIUDAD';end if;
   partes:=regexp_match(destino.ciudad_departamento,'^(.*?),[[:space:]]*(ARCHIPI[ÉE]LAGO DE SAN ANDR[ÉE]S,[[:space:]]*PROVIDENCIA Y SANTA CATALINA|BOGOT[ÁA],[[:space:]]*D[.]C[.]|[^,]+)$','i');
   patch:=patch||jsonb_build_object('ciudad_id',valor,'ciudad',coalesce(btrim(partes[1]),destino.ciudad_departamento),'departamento',nullif(btrim(partes[2]),''));
   overrides:=overrides||array['ciudad_id','ciudad','departamento'];
  else
   if campo='correo' and valor<>'' then
    if valor !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'PORTAL_FICHA';end if;
    valor:=lower(valor);
   elsif campo='cedula' and valor<>'' then
    if valor !~ '^[[:alnum:] .-]+$' then raise exception 'PORTAL_FICHA';end if;
    valor:=regexp_replace(valor,'[ .-]','','g');
   elsif campo='telefono_llamadas' and valor<>'' then
    if valor !~ '^[0-9+ ().-]+$' then raise exception 'PORTAL_FICHA';end if;
    valor:=regexp_replace(valor,'[^0-9]','','g');
    if valor ~ '^3[0-9]{9}$' then valor:='57'||valor;end if;
    if valor !~ '^[0-9]{8,15}$' or (left(valor,2)='57' and length(valor)<>12) then raise exception 'PORTAL_FICHA';end if;
   end if;
   patch:=patch||jsonb_build_object(campo,nullif(valor,''));
   if campo in ('cedula','correo','direccion','punto_referencia') then overrides:=array_append(overrides,campo);end if;
  end if;
 end loop;
 -- The protected WhatsApp identity and the document's payment terms are never editable here.
 for candidato in select w.id from public.whatsapp_contacts w where w.id=ct.id or (w.id=c.contacto_id and w.meta_scope=''
   and public.ra_contact_commercial_phone(w.wa_id,w.telefono)=public.ra_contact_commercial_phone(null,c.telefono))
   order by (w.id=ct.id),w.id loop
  select * into actual from public.whatsapp_contacts where id=candidato;
  actual:=jsonb_populate_record(actual,patch);
  select array(select distinct v from unnest(coalesce(actual.manual_override_fields,'{}')||overrides) v order by v) into registrados;
  update public.whatsapp_contacts set nombre_personalizado=actual.nombre_personalizado,cedula=actual.cedula,correo=actual.correo,
   direccion=actual.direccion,telefono_llamadas=actual.telefono_llamadas,punto_referencia=actual.punto_referencia,ciudad_id=actual.ciudad_id,
   ciudad=actual.ciudad,departamento=actual.departamento,manual_override_fields=registrados,actualizado_en=now() where id=candidato;
 end loop;
 if patch?'nombre_personalizado' then
  update public.clientes_autorizados set nombre=patch->>'nombre_personalizado' where id=c.id;
  -- Keep a separately named recipient on this document. A copied account name follows the customer's edit.
  if nullif(btrim(o.nombre_cliente),'') is null or upper(btrim(o.nombre_cliente)) in (upper(ficha->>'nombre'),upper(c.nombre),upper(ct.nombre)) then
   update public.ra_chat_pedidos set nombre_cliente=patch->>'nombre_personalizado' where id=o.id;
  end if;
 end if;
 update public.whatsapp_conversations set actualizado_en=now() where contacto_id=ct.id and merged_into is null;
 select * into ct from public.whatsapp_contacts where id=ct.id;
 return public.ra_portal_ficha(c,ct);
end $$;

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
   where p_modo<>'referencia' or lower(referencia)=lower(btrim(p_busca))
   order by lower(referencia)=lower(trim(p_busca)) desc,referencia,clave
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
revoke all on function public.ra_portal_pdf_emitir(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.ra_portal_pdf_emitir(uuid,text,uuid) to service_role;
revoke all on function public.ra_portal_pdf_canjear(text) from public,anon,authenticated;
grant execute on function public.ra_portal_pdf_canjear(text) to service_role;
revoke all on function public.ra_portal_ficha(public.clientes_autorizados,public.whatsapp_contacts) from public,anon,authenticated;
grant execute on function public.ra_portal_ficha(public.clientes_autorizados,public.whatsapp_contacts) to service_role;
revoke all on function public.ra_portal_guardar_ficha(uuid,text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ra_portal_guardar_ficha(uuid,text,uuid,jsonb,jsonb) to service_role;
