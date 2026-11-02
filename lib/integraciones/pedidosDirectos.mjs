import {createHash} from 'node:crypto';

function context(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw Error('No se pudo conectar con el servicio de pedidos.');
 return {url:url.replace(/\/+$/,''),headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}};
}
export async function pedidoDirectoHabilitado(tienda){
 if(tienda?.slug!=='mayoristas-ra'||tienda?.tipo_tienda!=='RA')return false;
 const db=context(),r=await fetch(db.url+'/rest/v1/ra_web_order_control?select=mode,tienda_id,negocio_id&id=eq.principal',
  {headers:db.headers,cache:'no-store',signal:AbortSignal.timeout(4000)});
 // Missing migration is a deployment ordering error, never permission to bypass a pause.
 if(!r.ok)throw Error('No se pudo comprobar el servicio de pedidos.');
 const rows=await r.json();
 if(rows.length!==1||rows[0].tienda_id!==tienda.id||rows[0].negocio_id!==tienda.negocio_id)throw Error('Configuración de tienda inválida.');
 if(rows[0].mode==='paused')throw Error('Los pedidos están temporalmente en mantenimiento.');
 return rows[0].mode==='direct';
}
export function directRequestKey(pedido,provided){
 if(/^[A-Za-z0-9_:-]{8,150}$/.test(provided||''))return provided;
 // Compatibility for already-open checkouts. The session + exact purchase snapshot
 // reuses the same key after a lost response; new checkout clients provide a UUID.
 const value={session:pedido.sesion_id,store:pedido.tienda_id,cliente:pedido.cliente,pago:pedido.pago,
  items:pedido.productos?.map(i=>({id:i.producto_id,variant:i.variante_id,ref:i.referencia,q:i.cantidad,p:i.precio_unitario}))};
 if(!value.session)throw Error('Actualiza la página antes de confirmar tu compra.');
 return 'web:'+createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export async function registrarPedidoDirecto(pedido,tienda,key){
 const db=context(),r=await fetch(db.url+'/rest/v1/rpc/ra_web_order_enqueue',{
  method:'POST',headers:db.headers,cache:'no-store',signal:AbortSignal.timeout(20000),
  body:JSON.stringify({p_tienda_id:tienda.id,p_payload:pedido,p_request_key:key})});
 const data=await r.json().catch(()=>null);
 if(!r.ok||!data?.id||!data?.numero_pedido)throw Error('No se pudo confirmar la compra. Puedes reintentar sin duplicar el pedido.');
 return data;
}
