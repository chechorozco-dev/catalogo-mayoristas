/**
 * Control real del proceso de sincronización AppSheet/Make -> catálogo.
 * Consulta Supabase COMPARTIDO en cada solicitud autorizada.
 * Fallar cerrado previene que una pausa explícita quede ignorada.
 * Nunca incluir credenciales ni payloads en mensajes o telemetría.
 */
export async function consultarControlProductos(){
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!base||!secret)throw Error("CONTROL_NO_DISPONIBLE");
 const url=base.replace(/\/+$/,"")+
  "/rest/v1/ra_web_integracion_controles?select=activo,version&id=eq.web-productos-appsheet&limit=1";
 let response;
 try{
  response=await fetch(url,{
   headers:{apikey:secret,Accept:"application/json"},
   cache:"no-store",signal:AbortSignal.timeout(4500)
  });
 }catch{throw Error("CONTROL_NO_DISPONIBLE");}
 if(!response.ok)throw Error("CONTROL_NO_DISPONIBLE");
 let rows;
 try{rows=await response.json();}catch{throw Error("CONTROL_NO_DISPONIBLE");}
 if(!Array.isArray(rows)||rows.length!==1||typeof rows[0].activo!=="boolean"||
   !Number.isSafeInteger(rows[0].version))throw Error("CONTROL_NO_DISPONIBLE");
 return {activo:rows[0].activo,version:rows[0].version};
}
