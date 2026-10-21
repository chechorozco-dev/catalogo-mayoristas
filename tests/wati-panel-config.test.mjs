import test from "node:test";
import assert from "node:assert/strict";
import {enviarBienvenidaWati,registrarCodigoWati} from "../lib/integraciones/watiConfig.mjs";

function fixtures(config,flows){
 const originalFetch=globalThis.fetch;
 const old={...process.env};
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://supabase.example.org";
 process.env.SUPABASE_SECRET_KEY="unit-test-secret";
 process.env.WATI_API_ENDPOINT="https://wati.example.org";
 process.env.WATI_API_TOKEN="unit-test-token";
 process.env.WATI_CHANNEL_NUMBER="unit-channel";
 const requested=[];
 globalThis.fetch=async(input,init={})=>{
  const url=String(input);
  requested.push({url,method:init.method||"GET",body:init.body?JSON.parse(init.body):null});
  if(url.includes("ra_wati_flujos"))return Response.json([config]);
  if(url.includes("ra_wati_envios_log")&&init.method==="POST")return Response.json([{id:"log1"}]);
  if(url.includes("ra_wati_envios_log")&&init.method==="PATCH")return new Response(null,{status:204});
  if(url.includes("/api/v1/sendTemplateMessage"))return Response.json({ok:true});
  throw Error("Unexpected network call "+url);
 };
 return {requested,restore(){globalThis.fetch=originalFetch;
   for(const key of ["NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SECRET_KEY",
      "WATI_API_ENDPOINT","WATI_API_TOKEN","WATI_CHANNEL_NUMBER"]){
    if(old[key]===undefined)delete process.env[key];
    else process.env[key]=old[key];
   }
 }};
}
test("Bienvenida desactivada no llama WATI ni reserva envíos",async()=>{
 const f=fixtures({activo:false,plantilla:"tienda_cliente_nueva"});
 try{
  await enviarBienvenidaWati({tiendaId:"tienda1",telefono:"573001234567",nombreTienda:"Demo",slug:"demo"});
  assert.equal(f.requested.length,1);
  assert.ok(f.requested[0].url.includes("ra_wati_flujos"));
 }finally{f.restore();}
});
test("Bienvenida activa envía exactamente una plantilla aprobada con slug",async()=>{
 const f=fixtures({activo:true,plantilla:"tienda_cliente_nueva"});
 try{
  await enviarBienvenidaWati({tiendaId:"tienda1",telefono:"573001234567",nombreTienda:"Demo",slug:"demo"});
  const sends=f.requested.filter(r=>r.url.includes("sendTemplateMessage"));
  assert.equal(sends.length,1);
  assert.equal(sends[0].body.template_name,"tienda_cliente_nueva");
  assert.equal(sends[0].body.parameters[1].value,"demo");
  assert.equal(sends[0].body.buttons[0].parameters[0].text,"demo");
  const log=f.requested.find(r=>r.method==="POST"&&r.url.includes("ra_wati_envios_log"));
  assert.equal(log.body.referencia,"tienda1");
  assert.ok(!JSON.stringify(log.body).includes("573001234567"));
 }finally{f.restore();}
});
test("El registro de códigos WATI no guarda teléfono ni código",async()=>{
 const f=fixtures({activo:true,plantilla:"codigo_web"});
 try{
  await registrarCodigoWati("ENVIADO",200);
  const body=f.requested[0].body;
  assert.deepEqual(body,{flujo_id:"codigo_web",estado:"ENVIADO",codigo_http:200});
 }finally{f.restore();}
});
test("Error de consulta WATI no provoca envío opcional",async()=>{
 const f=fixtures({activo:true,plantilla:"tienda_cliente_nueva"});
 const orig=globalThis.fetch;
 globalThis.fetch=async()=>new Response(null,{status:503});
 try{
  await enviarBienvenidaWati({tiendaId:"t",telefono:"573001234567",nombreTienda:"Demo",slug:"demo"});
 }finally{globalThis.fetch=orig;f.restore();}
});
