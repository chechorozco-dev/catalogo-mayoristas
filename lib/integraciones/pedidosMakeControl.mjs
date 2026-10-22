/**
 * Control compartido de envíos de pedidos a Make. Los dos procesos inician ACTIVADOS.
 * Una pausa explícita impide aceptar una compra sin poder remitirla a Make;
 * se consulta antes de crear pedido o enviar cualquier dato al proveedor.
 * Un error de lectura NO debe interpretarse como ACTIVADO.
 */
const VALID = new Set(["web-confirmar-pedido","web-pedidos-make"]);
function contexto(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw Error("CONTROL_PEDIDOS_INDISPONIBLE");
 return {url:url.replace(/\/+$/,""),headers:{apikey:key,Accept:"application/json"}};
}
export async function revisarPedidosMake(flujo){
 if(!VALID.has(flujo))throw Error("CONTROL_PEDIDOS_INDISPONIBLE");
 const db=contexto();
 let response;
 try{
  response=await fetch(db.url+
    "/rest/v1/ra_web_integracion_controles?select=activo,version&id=eq."+
    encodeURIComponent(flujo)+"&limit=1",{
     headers:db.headers,cache:"no-store",signal:AbortSignal.timeout(4000)});
 }catch{throw Error("CONTROL_PEDIDOS_INDISPONIBLE");}
 if(!response.ok)throw Error("CONTROL_PEDIDOS_INDISPONIBLE");
 let rows;
 try{rows=await response.json();}catch{throw Error("CONTROL_PEDIDOS_INDISPONIBLE");}
 if(!Array.isArray(rows)||rows.length!==1||
  typeof rows[0].activo!=="boolean"||
  !Number.isSafeInteger(rows[0].version))
  throw Error("CONTROL_PEDIDOS_INDISPONIBLE");
 return {activo:rows[0].activo,version:rows[0].version};
}
/** Never logs a webhook URL, order ID, phone, amount, or body. */
export async function registrarResultadoMake(flujo,codigoHttp){
 if(!VALID.has(flujo))return;
 const code=Number(codigoHttp);
 if(!Number.isInteger(code)||(code!==0&&(code<200||code>599)))return;
 try{
  const db=contexto();
  const response=await fetch(db.url+"/rest/v1/ra_web_make_resultados",{
   method:"POST",headers:{...db.headers,"Content-Type":"application/json",
    Prefer:"return=minimal"},cache:"no-store",
   signal:AbortSignal.timeout(3500),
   body:JSON.stringify({flujo_id:flujo,
    estado:code>=200&&code<300?"ACEPTADO":"ERROR",codigo_http:code})
  });
  if(!response.ok)console.warn("RA Make: diagnóstico no disponible.");
 }catch{console.warn("RA Make: diagnóstico no disponible.");}
}
