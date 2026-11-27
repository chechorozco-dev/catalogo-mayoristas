export async function rpcCarrito(nombre, args) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
 const r=await fetch(url+'/rest/v1/rpc/'+nombre,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store',signal:AbortSignal.timeout(10000)});
 const data=await r.json();
 if(!r.ok)throw Error(['CART_CLOSED','CART_MOVED','CART_LINK_INVALID'].includes(data?.message)?data.message:'CART_UNAVAILABLE');
 return data;
}
export const esSesionCompartida=s=>typeof s==='string'&&s.startsWith('rcl_');
export async function sesionOriginal(tienda,dispositivo){
 return rpcCarrito('ra_live_cart_session',{p_store:tienda,p_device:dispositivo});
}
