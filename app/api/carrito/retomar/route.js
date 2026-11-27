import {rpcCarrito} from '../../../../lib/catalogo/sesion-carrito-servidor.mjs';
export const dynamic='force-dynamic';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private,no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request){
 try{
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return reply({error:'Origen inválido.'},403);
  const {tienda_id,token,sesion}=await request.json();
  const uuid=/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
  if(!uuid.test(tienda_id)||!(uuid.test(token)&&!sesion||!token&&typeof sesion==='string'&&sesion.startsWith('rcl_')&&uuid.test(sesion.slice(4))))
   return reply({error:'Enlace de carrito inválido.'},400);
  const data=await rpcCarrito('ra_live_cart_resume',{p_store:tienda_id,p_token:token||null,p_device:sesion||null});
  return reply(data);
 }catch(error){
  if(error.message==='CART_CLOSED')return reply({error:'Este carrito ya se convirtió en pedido.'},410);
  if(error.message==='CART_LINK_INVALID')return reply({error:'El enlace ya no está disponible. Abre el último enlace que te compartimos.'},404);
  return reply({error:'No pudimos recuperar el carrito. Vuelve a abrir el enlace.'},503);
 }
}
