/**
 * Los interruptores de WATI se consultan en Supabase compartido.
 * Si falla la lectura, NO se envía ninguna bienvenida.
 * El código OTP se envía por su ruta histórica (fuera de este control).
 */
function dbContext(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw Error("Falta conexión Supabase en catálogo.");
 return {url:url.replace(/\/+$/,""),headers:{apikey:key,"Content-Type":"application/json"}};
}
async function updateLog(db,id,estado,codigo_http){
 try{
  const response=await fetch(db.url+"/rest/v1/ra_wati_envios_log?id=eq."+encodeURIComponent(id),{
   method:"PATCH",headers:{...db.headers,Prefer:"return=minimal"},
   cache:"no-store",body:JSON.stringify({estado,codigo_http,
    actualizado_en:new Date().toISOString()})});
  if(!response.ok)console.warn("WATI: error registrando resultado.");
 }catch{console.warn("WATI: no se pudo actualizar historial.");}
}
export async function registrarCodigoWati(estado,codigo_http){
 // Telemetría no crítica: ni número de teléfono ni código OTP se almacenan.
 try{
  const db=dbContext();
  await fetch(db.url+"/rest/v1/ra_wati_envios_log",{
   method:"POST",headers:{...db.headers,Prefer:"return=minimal"},
   cache:"no-store",body:JSON.stringify({flujo_id:"codigo_web",estado,codigo_http})});
 }catch{console.warn("WATI: historial de OTP no disponible.");}
}
export async function enviarBienvenidaWati({tiendaId,telefono,nombreTienda,slug}){
 let db;
 try{
  db=dbContext();
  const query=db.url+"/rest/v1/ra_wati_flujos?id=eq.tienda_cliente_nueva&select=plantilla,activo&limit=1";
  const res=await fetch(query,{headers:db.headers,cache:"no-store",
   signal:AbortSignal.timeout(5000)});
  if(!res.ok)throw Error("No se pudo consultar activación de bienvenida.");
  const data=await res.json();
  const conf=Array.isArray(data)?data[0]:null;
  if(conf?.activo!==true)return;
  if(!/^[a-z][a-z0-9_]{2,59}$/.test(String(conf.plantilla||"")))throw Error("Plantilla inválida.");

  // Reserva única por tienda: evita enviar dos veces ante solicitudes repetidas.
  const claim=await fetch(db.url+"/rest/v1/ra_wati_envios_log?on_conflict=flujo_id,referencia",{
   method:"POST",headers:{...db.headers,Prefer:"resolution=ignore-duplicates,return=representation"},
   cache:"no-store",signal:AbortSignal.timeout(5000),
   body:JSON.stringify({flujo_id:"tienda_cliente_nueva",referencia:String(tiendaId),
    estado:"PENDIENTE"})});
  if(!claim.ok)throw Error("No se pudo reservar el aviso de bienvenida.");
  const inserted=await claim.json();
  if(!Array.isArray(inserted)||inserted.length!==1)return; // Ya existía un intento.
  const logId=inserted[0].id;

  const endpoint=process.env.WATI_API_ENDPOINT;
  const token=process.env.WATI_API_TOKEN;
  const channel=process.env.WATI_CHANNEL_NUMBER;
  const number=String(telefono||"").replace(/\D/g,"");
  if(!endpoint||!token||!channel||!/^[0-9]{8,15}$/.test(number)){
   await updateLog(db,logId,"ERROR",null);return;
  }
  const bearer=token.trim().toLowerCase().startsWith("bearer ")?token.trim():"Bearer "+token.trim();
  const url=endpoint.replace(/\/+$/,"")+"/api/v1/sendTemplateMessage?whatsappNumber="+encodeURIComponent(number);
  try{
   const response=await fetch(url,{method:"POST",cache:"no-store",signal:AbortSignal.timeout(9000),
    headers:{"Authorization":bearer,"Content-Type":"application/json"},
    body:JSON.stringify({
     template_name:conf.plantilla,broadcast_name:"creacion_de_tienda",
     channel_number:channel,
     parameters:[{name:"1",value:String(nombreTienda).slice(0,80)},
      {name:"2",value:String(slug).slice(0,160)}],
     buttons:[{type:"url",index:"0",parameters:[{type:"text",text:String(slug).slice(0,160)}]}]
    })});
   await updateLog(db,logId,response.ok?"ENVIADO":"ERROR",response.status);
   if(!response.ok)console.warn("WATI: bienvenida rechazada por el proveedor.");
  }catch{
   await updateLog(db,logId,"ERROR",null);
   console.warn("WATI: no se confirmó envío de bienvenida.");
  }
 }catch(error){
  // Jamás hacer fallar el registro de una tienda por una integración opcional.
  console.warn("WATI: bienvenida omitida por configuración o conexión no disponible.");
 }
}
