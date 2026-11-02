import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){if(s==='next/server')return {url:'data:text/javascript,export function after(callback){}',shortCircuit:true};return n(s,c);}});
const {POST}=await import('../app/api/confirmar-pedido/route.js');
import {checkoutKey,clearCheckoutKey} from '../lib/catalogo/checkout-key.mjs';
import {directRequestKey} from '../lib/integraciones/pedidosDirectos.mjs';
const shop={id:'2a6d7ead-6f80-4671-962a-8e8dbfa24dd4',slug:'mayoristas-ra',negocio_id:'business',tipo_tienda:'RA',activa:true};
const order=()=>({tienda_id:shop.id,sesion_id:'session-example',confirmacion_id:'checkout-example-123',cliente:{nombre:'Prueba',whatsapp:'3201112233',direccion:'Calle 1',ciudad_id:'CITY'},pago:{forma_pago:'TRANSFERENCIA'},valores:{total_pedido:30000},productos:[{producto_id:1,referencia:'RA1',nombre:'Producto',cantidad:2,precio_unitario:10000}]});
test('checkout directo guarda una vez y un reintento no llama Make ni genera otro número',async()=>{
 const previous=globalThis.fetch,oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;
 let created=0,legacy=0;const keys=new Map(),rpc=[];
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SECRET_KEY='test';
 globalThis.fetch=async(url,init={})=>{
  const u=String(url);
  if(u.includes('/tiendas?'))return Response.json([shop]);
  if(u.includes('/ra_web_order_control?'))return Response.json([{mode:'direct',tienda_id:shop.id,negocio_id:shop.negocio_id}]);
  if(u.includes('/productos?'))return Response.json([{id:1,infoimagen:'picture',solo_ra:false}]);
  if(u.includes('/rpc/ra_web_order_enqueue')){
   const b=JSON.parse(init.body);rpc.push(b);
   if(!keys.has(b.p_request_key)){keys.set(b.p_request_key,{id:'source-id',numero_pedido:'REM100',lab_order_id:'lab-id'});created++;}
   return Response.json(keys.get(b.p_request_key));
  }
  if(u.includes('/ra_webpush_events'))return new Response('',{status:201});
  legacy++;throw Error('Unexpected legacy call '+u);
 };
 try{
  for(let n=0;n<2;n++){const r=await POST({json:async()=>order()});assert.equal(r.status,200);assert.equal((await r.json()).numero_pedido,'REM100');}
  assert.equal(created,1);assert.equal(legacy,0);assert.equal(rpc[0].p_tienda_id,shop.id);assert.equal(rpc[0].p_payload.productos[0].infoimagen,'picture');
 }finally{globalThis.fetch=previous;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;}
});
test('checkout keys survive a failed request and change after acknowledged purchase or cart edits',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const p=order();const first=await checkoutKey(p,storage);assert.equal(await checkoutKey(p,storage),first);
 assert.notEqual(await checkoutKey({...p,productos:[{cantidad:3}]},storage),first);
 clearCheckoutKey(p,storage);assert.notEqual(await checkoutKey(p,storage),first);
 assert.equal(directRequestKey(p),directRequestKey(p));
 assert.notEqual(directRequestKey(p),directRequestKey({...p,sesion_id:'another-session'}));
});
