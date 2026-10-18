import crypto from "node:crypto";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY=process.env.SUPABASE_SECRET_KEY;
const COOKIE_SECRET=process.env.AUTH_SESSION_SECRET;

function clean(s){return String(s||"").trim();}
function normalizedPhone(s){
 let digits=clean(s).replace(/\D/g,"");
 if(/^3\d{9}$/.test(digits))digits="57"+digits;
 return /^\d{8,15}$/.test(digits)?digits:"";
}
function verifySession(request){
 const value=request.cookies.get("ra_session")?.value||"";
 const index=value.indexOf(".");
 if(!COOKIE_SECRET||index<1)return null;
 const encoded=value.slice(0,index),received=value.slice(index+1);
 const digest=crypto.createHmac("sha256",COOKIE_SECRET)
  .update(encoded).digest("base64url");
 const a=Buffer.from(received),b=Buffer.from(digest);
 if(!a.length||a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
 try{
  const session=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));
  if(!session||typeof session!=="object"||!session.exp)return null;
  if(Number(session.exp)*1000<Date.now())return null;
  return session;
 }catch{return null;}
}
async function rows(path,params={}){
 if(!SUPABASE_URL||!SUPABASE_KEY)throw Error("Base de datos no configurada");
 const qs=new URLSearchParams(params);
 const result=await fetch(SUPABASE_URL+"/rest/v1/"+path+"?"+qs,{
  method:"GET",cache:"no-store",
  headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY,
    Accept:"application/json"}
 });
 if(!result.ok)throw Error("No se pudo consultar el perfil");
 return result.json();
}
async function patchProfile(id,changes){
 const res=await fetch(SUPABASE_URL+"/rest/v1/whatsapp_contacts?id=eq."+encodeURIComponent(id),{
  method:"PATCH",cache:"no-store",
  headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY,
   "Content-Type":"application/json",Prefer:"return=representation"},
  body:JSON.stringify(changes)
 });
 if(!res.ok)throw Error("No se pudieron actualizar los datos");
 const answer=await res.json();
 if(!answer.length)throw Error("Ficha no encontrada");
 return answer[0];
}

export async function authorizeCustomerProfile(request,tiendaId){
 const session=verifySession(request);
 if(!session||session.rol!=="CLIENTE")return null;
 const id=String(session.cliente_id||"");
 if(!/^[\da-f-]{36}$/i.test(id))return null;
 const [auth]=await rows("clientes_autorizados",{
  select:"id,telefono,nombre,activo,rol,negocio_id,contacto_id",
  id:"eq."+id,limit:"1"
 });
 if(!auth||!auth.activo||auth.rol!=="CLIENTE")return null;
 // Re-check the store's business, not merely the untrusted browser's tienda_id.
 const [store]=await rows("tiendas",{
  select:"id,negocio_id,activa",id:"eq."+tiendaId,limit:"1"
 });
 if(!store||!store.activa||store.negocio_id!==auth.negocio_id)return null;
 const phone=normalizedPhone(auth.telefono);
 if(!phone)return null;
 const found=auth.contacto_id?await rows("whatsapp_contacts",{
  select:"id,wa_id,nombre_personalizado,nombre,cedula,direccion,ciudad,departamento,ciudad_id,correo,telefono_llamadas,transportadora_preferida",
  id:"eq."+auth.contacto_id,wa_id:"eq."+phone,limit:"1"
 }):await rows("whatsapp_contacts",{
  select:"id,wa_id,nombre_personalizado,nombre,cedula,direccion,ciudad,departamento,ciudad_id,correo,telefono_llamadas,transportadora_preferida",
  wa_id:"eq."+phone,limit:"1"
 });
 return {auth,profile:found?.[0]||null,phone};
}

export async function GET(request){
 try{
  const tiendaId=clean(new URL(request.url).searchParams.get("tienda_id"));
  if(!/^[\da-f-]{36}$/i.test(tiendaId))
    return Response.json({ok:false,error:"Tienda inválida"},{status:400});
  const data=await authorizeCustomerProfile(request,tiendaId);
  if(!data)return Response.json({ok:false,error:"No hay sesión de cliente autorizado para esta tienda"},{status:401});
  const {auth,profile,phone}=data;
  return Response.json({ok:true,profile:{
    nombre:profile?.nombre_personalizado||auth.nombre||profile?.nombre||"",
    whatsapp:phone,telefono_llamadas:profile?.telefono_llamadas||"",
    cedula:profile?.cedula||"",direccion:profile?.direccion||"",
    correo:profile?.correo||"",ciudad_id:profile?.ciudad_id||"",
    ciudad:profile?.ciudad||"",departamento:profile?.departamento||"",
    transportadora_preferida:profile?.transportadora_preferida||""
  }},{headers:{"Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
 }catch(error){
  console.error("Error leyendo ficha unificada",error instanceof Error?error.message:"Error");
  return Response.json({ok:false,error:"No se pudo cargar la ficha"},{status:500});
 }
}

export async function PATCH(request){
 try{
  if(request.headers.get("origin")&&
     request.headers.get("origin")!==new URL(request.url).origin)
    return Response.json({ok:false,error:"Origen no autorizado"},{status:403});
  const data=await request.json().catch(()=>null);
  const tiendaId=clean(data?.tienda_id);
  if(!/^[\da-f-]{36}$/i.test(tiendaId))
    return Response.json({ok:false,error:"Tienda inválida"},{status:400});
  const verified=await authorizeCustomerProfile(request,tiendaId);
  if(!verified?.profile)
    return Response.json({ok:false,error:"No tienes una ficha autorizada"},{status:403});
  // The current buyer may only edit their own shipping/identity details.
  // Never accept role, active, negocio_id, wa_id, access phone or user_id.
  const patch={};
  const fields=[
   ["nombre","nombre_personalizado",100],
   ["cedula","cedula",32],
   ["direccion","direccion",250],
   ["correo","correo",254],
   ["telefono_llamadas","telefono_llamadas",15]
  ];
  for(const [input,column,max] of fields){
   if(!(input in data))continue;
   const value=clean(data[input]).replace(/\s+/g," ");
   if(!value)continue; // Empty checkout inputs cannot erase a verified saved address.
   if(value.length>max)return Response.json({ok:false,error:"Campo demasiado largo"},{status:400});
   if(column==="nombre_personalizado"&&value.length<2)
    return Response.json({ok:false,error:"Nombre demasiado corto"},{status:400});
   if(column==="correo"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return Response.json({ok:false,error:"Correo inválido"},{status:400});
   if(column==="telefono_llamadas"&&
      !/^\d{8,15}$/.test(value.replace(/\D/g,"")))
    return Response.json({ok:false,error:"Teléfono inválido"},{status:400});
   patch[column]=column==="telefono_llamadas"?value.replace(/\D/g,""):value;
  }
  if(data.ciudad_id){
   const id=clean(data.ciudad_id);
   if(id.length>80)return Response.json({ok:false,error:"Ciudad inválida"},{status:400});
   const [city]=await rows("ciudades_envio",{
      select:"ciudad_id,ciudad_departamento",ciudad_id:"eq."+id,activa:"eq.true",limit:"1"
   });
   if(!city)return Response.json({ok:false,error:"Ciudad no encontrada"},{status:400});
   patch.ciudad_id=city.ciudad_id;
   // Don't rely on user supplied city names or postage information.
   patch.ciudad=city.ciudad_departamento;
   patch.departamento=null;
  }
  if(!Object.keys(patch).length)return Response.json({ok:true,unchanged:true});
  patch.actualizado_en=new Date().toISOString();
  const updated=await patchProfile(verified.profile.id,patch);
  return Response.json({ok:true,updated_at:updated.actualizado_en},{
    headers:{"Cache-Control":"private,no-store"}
  });
 }catch(error){
  console.error("Error guardando ficha web",error instanceof Error?error.message:"Error");
  return Response.json({ok:false,error:"No se pudo guardar la ficha"},{status:500});
 }
}
