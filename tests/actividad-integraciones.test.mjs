import test from "node:test";
import assert from "node:assert/strict";
import {registrarActividadWeb} from "../lib/integraciones/actividad.mjs";
test("Nunca registrar solicitudes inválidas o respuestas esperadas 4xx",async()=>{
 const old=globalThis.fetch, prior={...process.env};let calls=0;
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://db.example.test";
 process.env.SUPABASE_SECRET_KEY="fake-test-only";
 globalThis.fetch=async()=>{calls++;return Response.json({ok:true},{status:201})};
 try{
  await registrarActividadWeb("web-verificar-codigo",401);
  await registrarActividadWeb("web-desconocido",200);
  await registrarActividadWeb("web-crear-tienda",429);
  assert.equal(calls,0);
 }finally{
  globalThis.fetch=old;
  for(const k of ["NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SECRET_KEY"]){
   if(prior[k]===undefined) delete process.env[k];else process.env[k]=prior[k];
  }
 }
});
test("Solamente guarda el ID del flujo y el HTTP agregado; no falla el negocio",async()=>{
 const old=globalThis.fetch,prior={...process.env};const requests=[];
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://db.example.test";
 process.env.SUPABASE_SECRET_KEY="fake-test-only";
 globalThis.fetch=async(url,init)=>{requests.push({url:String(url),init});
  return new Response(null,{status:201});};
 try{
  await registrarActividadWeb("web-crear-tienda",201);
  await registrarActividadWeb("web-pedidos-make",503);
  assert.equal(requests.length,2);
  assert.deepEqual(JSON.parse(requests[0].init.body),{
   flujo_id:"web-crear-tienda",origen:"CATALOGO",estado:"OK",codigo_http:201
  });
  assert.deepEqual(JSON.parse(requests[1].init.body),{
   flujo_id:"web-pedidos-make",origen:"CATALOGO",estado:"ERROR",codigo_http:503
  });
  assert.ok(!requests[0].init.body.includes("telefono"));
  globalThis.fetch=async()=>{throw Error("Supabase no disponible")};
  await assert.doesNotReject(registrarActividadWeb("web-verificar-codigo",200));
 }finally{
  globalThis.fetch=old;
  for(const k of ["NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SECRET_KEY"]){
   if(prior[k]===undefined) delete process.env[k];else process.env[k]=prior[k];
  }
 }
});
