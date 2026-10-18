import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/confirmar-pedido/route.js";
import { LOCAL_VILLAVO_ID } from "../lib/catalogo/pagos-local.mjs";

const LOCAL = {
  id: LOCAL_VILLAVO_ID,
  slug: "local-2",
  tipo_tienda: "RA",
  negocio_id: "38100510-1325-4d3c-9b6c-886552e82089",
  activa: true,
};

function pedido(formaPago) {
  return {
    tienda_id: LOCAL_VILLAVO_ID,
    sesion_id: "PRUEBA-SIN-RESERVAS",
    cliente: { nombre:"Comprador de prueba",whatsapp:"573001112233",direccion:"cualquiera" },
    pago: { forma_pago: formaPago },
    valores: { porcentaje_descuento:6, descuento:1440, costo_envio_final:15000,total_pedido:37560 },
    productos: [{
      producto_id: 1, nombre:"Producto de prueba",
      referencia:"TEST", precio_unitario:12000, cantidad:2,
    }],
  };
}

function stubFetch(permitirPedido = false) {
  const llamadas = [];
  let payloadMake = null;
  async function fakeFetch(url, opciones = {}) {
    const direccion = String(url);
    llamadas.push({direccion,metodo:opciones.method || "GET"});
    if (direccion.includes("/rest/v1/tiendas?")) {
      return Response.json([LOCAL]);
    }
    if (direccion.includes("/rest/v1/productos?")) {
      return Response.json([{id:1,infoimagen:"",solo_ra:false,activo:true}]);
    }
    if (direccion.includes("/rest/v1/pedidos?") && permitirPedido) {
      return Response.json([{id:444,numero_pedido:"WEB-PRUEBA"}]);
    }
    if (direccion.startsWith("https://hook.us2.make.com/") && permitirPedido) {
      payloadMake = JSON.parse(opciones.body);
      return new Response("OK",{status:200});
    }
    throw new Error("Solicitud inesperada a " + direccion);
  }
  return {fakeFetch, llamadas, get payloadMake(){return payloadMake;}};
}

async function ejecutarConFetchFalso(metodo, puedeConfirmar) {
  const anteriorFetch = globalThis.fetch;
  const anteriorUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anteriorKey = process.env.SUPABASE_SECRET_KEY;
  const fake = stubFetch(puedeConfirmar);
  try {
    globalThis.fetch = fake.fakeFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY="SOLO_PRUEBA";
    const respuesta=await POST({json:async()=>pedido(metodo)});
    return {respuesta, fake};
  } finally {
    globalThis.fetch=anteriorFetch;
    if(anteriorUrl===undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL=anteriorUrl;
    if(anteriorKey===undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY=anteriorKey;
  }
}

test("contraentrega es rechazada antes de crear un pedido o llamar a Make", async () => {
  const {respuesta,fake}=await ejecutarConFetchFalso("CONTRA_ENTREGA", false);
  assert.equal(respuesta.status,400);
  assert.equal((await respuesta.json()).ok,false);
  assert.equal(fake.llamadas.length,1);
  assert.equal(fake.payloadMake,null);
});

test("transferencia en Villavo se envía al flujo simulado sin 6% ni flete", async () => {
  const {respuesta,fake}=await ejecutarConFetchFalso("TRANSFERENCIA",true);
  assert.equal(respuesta.status,200);
  const data=await respuesta.json();
  assert.equal(data.ok,true);
  assert.equal(fake.payloadMake.valores.subtotal_productos,24000);
  assert.equal(fake.payloadMake.valores.total_pedido,24000);
  assert.equal(fake.payloadMake.valores.porcentaje_descuento,0);
  assert.equal(fake.payloadMake.valores.descuento,0);
  assert.equal(fake.payloadMake.valores.costo_envio_final,0);
  assert.equal(fake.payloadMake.pago.forma_pago,"TRANSFERENCIA");
  assert.equal(fake.payloadMake.cliente.direccion,"RECOGEN EN LOCAL");
});

test("efectivo es aceptado como pago presencial con el total exacto", async () => {
  const {respuesta,fake}=await ejecutarConFetchFalso("EFECTIVO",true);
  assert.equal(respuesta.status,200);
  assert.equal(fake.payloadMake.pago.forma_pago,"EFECTIVO");
  assert.equal(fake.payloadMake.valores.total_pedido,24000);
});
