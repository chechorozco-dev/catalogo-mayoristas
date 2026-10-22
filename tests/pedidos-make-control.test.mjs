import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {revisarPedidosMake,registrarResultadoMake} from "../lib/integraciones/pedidosMakeControl.mjs";

async function fixture(mock,run){
 const oldFetch=globalThis.fetch,oldEnv={
  NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY
 };
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co";
 process.env.SUPABASE_SECRET_KEY="fake-unit-test-only";
 const calls=[];
 globalThis.fetch=async(input,init={})=>{
  calls.push({url:String(input),init});
  return mock(input,init);
 };
 try{await run(calls);}
 finally{
  globalThis.fetch=oldFetch;
  for(const [key,value] of Object.entries(oldEnv)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
}
test("Los dos procesos pueden estar activos o pausados en configuración real",async()=>{
 await fixture(async()=>Response.json([{activo:false,version:3}]),async calls=>{
  const state=await revisarPedidosMake("web-confirmar-pedido");
  assert.deepEqual(state,{activo:false,version:3});
  assert.match(calls[0].url,/ra_web_integracion_controles/);
  assert.equal(calls[0].init.cache,"no-store");
  assert.ok(!calls[0].url.includes("fake-unit-test-only"));
 });
 await fixture(async()=>Response.json([{activo:true,version:0}]),async()=>{
  assert.equal((await revisarPedidosMake("web-pedidos-make")).activo,true);
 });
});
test("Falla cerrada ante caída, dato incompleto o flujo desconocido",async()=>{
 await fixture(async()=>{throw Error("Network unavailable");},async()=>{
  await assert.rejects(revisarPedidosMake("web-pedidos-make"),/CONTROL_PEDIDOS_INDISPONIBLE/);
 });
 await fixture(async()=>Response.json([]),async()=>{
  await assert.rejects(revisarPedidosMake("web-pedidos-make"),/CONTROL_PEDIDOS_INDISPONIBLE/);
  await assert.rejects(revisarPedidosMake("web-ficticio"),/CONTROL_PEDIDOS_INDISPONIBLE/);
 });
});
test("Registro Make no guarda cargas, clientes ni tokens",async()=>{
 await fixture(async()=>new Response(null,{status:201}),async calls=>{
  await registrarResultadoMake("web-pedidos-make",202);
  await registrarResultadoMake("web-confirmar-pedido",503);
  await registrarResultadoMake("otro",200);
  assert.equal(calls.length,2);
  assert.deepEqual(JSON.parse(calls[0].init.body),{
   flujo_id:"web-pedidos-make",estado:"ACEPTADO",codigo_http:202
  });
  assert.deepEqual(JSON.parse(calls[1].init.body),{
   flujo_id:"web-confirmar-pedido",estado:"ERROR",codigo_http:503
  });
 });
});
test("Preflight de ambas rutas sucede antes de crear o enviar el pedido",async()=>{
 const confirmar=await readFile(new URL("../app/api/confirmar-pedido/route.js",import.meta.url),"utf8");
 const pedidos=await readFile(new URL("../app/api/pedidos/enviar/route.js",import.meta.url),"utf8");
 assert.ok(confirmar.indexOf('revisarPedidosMake("web-confirmar-pedido")')>0);
 assert.ok(confirmar.indexOf('revisarPedidosMake("web-confirmar-pedido")')<
  confirmar.indexOf("/rest/v1/pedidos?select"));
 assert.ok(pedidos.indexOf('revisarPedidosMake("web-pedidos-make")')<
  pedidos.indexOf("const pedidoId ="));
});
