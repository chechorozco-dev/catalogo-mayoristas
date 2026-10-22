import test from "node:test";
import assert from "node:assert/strict";
import {consultarControlProductos} from "../lib/integraciones/productosControl.mjs";
async function fixture(rows,callback){
 const oldFetch=globalThis.fetch;
 const keys=["NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SECRET_KEY"];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://sample.supabase.co";
 process.env.SUPABASE_SECRET_KEY="TEST_SERVICE_KEY";
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url:String(url),options});
  if(rows==="NETWORK_ERROR")throw Error("red caída");
  return Response.json(rows,{status:200});
 };
 try{await callback(calls);}finally{
  globalThis.fetch=oldFetch;
  for(const k of keys){
   if(old[k]===undefined)delete process.env[k];
   else process.env[k]=old[k];
  }
 }
}
test("Control compartido activo permite continuar (sin modificar productos)",async()=>{
 await fixture([{activo:true,version:2}],async calls=>{
  assert.deepEqual(await consultarControlProductos(),{activo:true,version:2});
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.cache,"no-store");
  assert.equal(calls[0].options.headers.apikey,"TEST_SERVICE_KEY");
  assert.ok(!String(calls[0].url).includes("TEST_SERVICE_KEY"));
 });
});
test("Control desactivado conserva el estado real de pausa",async()=>{
 await fixture([{activo:false,version:3}],async()=>{
  assert.equal((await consultarControlProductos()).activo,false);
 });
});
test("Fallo de red no se interpreta como activo",async()=>{
 await fixture("NETWORK_ERROR",async()=>{
  await assert.rejects(consultarControlProductos(),/CONTROL_NO_DISPONIBLE/);
 });
});
test("Respuesta inconsistente tampoco habilita actualizaciones",async()=>{
 await fixture([],async()=>{
  await assert.rejects(consultarControlProductos(),/CONTROL_NO_DISPONIBLE/);
 });
});
