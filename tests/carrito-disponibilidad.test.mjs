import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { consultarDisponibilidadCarrito } from "../lib/catalogo/consultar-carrito.mjs";
import { quitarProductosRetirados, confirmarCarritoVigente } from "../lib/catalogo/carrito-disponibilidad.mjs";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return { url: "data:text/javascript,export function after(callback){}", shortCircuit: true };
  return next(specifier, context);
} });
const { POST: comprobar } = await import("../app/api/carrito/disponibilidad/route.js");
const { POST: confirmar } = await import("../app/api/confirmar-pedido/route.js");
const tienda = { id: "2a6d7ead-6f80-4671-962a-8e8dbfa24dd4", negocio_id: "negocio-prueba", tipo_tienda: "RA", slug: "mayoristas-ra", activa: true };

async function entorno(datos, ejecutar) {
  const anteriorFetch = globalThis.fetch;
  const anteriores = { NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY };
  const llamadas = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ejemplo.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "PRUEBA-SIN-SECRETOS";
  globalThis.fetch = async (url, init = {}) => {
    const consulta = new URL(url);
    llamadas.push({ consulta, init });
    assert.equal(init.cache, "no-store");
    if (consulta.pathname.endsWith("/tiendas")) return Response.json([tienda]);
    if (consulta.pathname.endsWith("/ra_web_order_control")) return Response.json([{ mode: "direct", tienda_id: tienda.id, negocio_id: tienda.negocio_id }]);
    if (consulta.pathname.endsWith("/ra_web_orders")) return Response.json([]);
    if (datos.falla) return Response.json({ message: "Fallo temporal" }, { status: 503 });
    let filas;
    if (consulta.pathname.endsWith("/productos")) filas = datos.productos || [];
    else if (consulta.pathname.endsWith("/tienda_productos")) filas = datos.configuraciones || [];
    else if (consulta.pathname.endsWith("/producto_variantes")) filas = datos.variantes || [];
    else throw new Error("Solicitud inesperada: " + consulta.pathname);
    // Incluso si Supabase aplica un límite menor, no se confunde una página
    // parcial con productos retirados.
    const offset = Number(consulta.searchParams.get("offset") || 0);
    const pagina = filas.slice(offset, offset + (datos.pagina || 400));
    return Response.json(pagina, { headers: { "Content-Range": `${offset}-${offset + pagina.length - 1}/${filas.length}` } });
  };
  try { return await ejecutar(llamadas); }
  finally {
    globalThis.fetch = anteriorFetch;
    for (const [clave, valor] of Object.entries(anteriores)) {
      if (valor === undefined) delete process.env[clave]; else process.env[clave] = valor;
    }
  }
}

test("se retiran productos eliminados, inactivos, ocultos y variantes retiradas sin afectar los demás colores", async () => {
  const items = [1, 2, 3, 4].map(id => ({ producto_id: id }));
  items.push({ producto_id: 5, variante_id: 51 }, { producto_id: 5, variante_id: 52 }, { producto_id: 5, variante_id: 53 });
  await entorno({ productos: [{ id: 1, activo: true, cant: 0 }, { id: 2, activo: false },
    { id: 3, activo: true }, { id: 5, activo: true }],
    configuraciones: [{ producto_id: 3, visible: false }],
    variantes: [{ id: 51, producto_id: 5, activo: false }, { id: 52, producto_id: 5, activo: true },
      { id: 53, producto_id: 99, activo: true }], pagina: 1 }, async llamadas => {
    const resultado = await consultarDisponibilidadCarrito(tienda, items);
    assert.deepEqual(resultado.disponibles.map(fila => fila.item), [items[0], items[5]]);
    assert.deepEqual(resultado.retirados, [
      { producto_id: 2, variante_id: null }, { producto_id: 3, variante_id: null },
      { producto_id: 4, variante_id: null }, { producto_id: 5, variante_id: 51 }, { producto_id: 5, variante_id: 53 },
    ]);
    for (const { consulta } of llamadas) {
      assert.equal(consulta.searchParams.get("negocio_id"), "eq." + tienda.negocio_id);
      assert.ok(!consulta.searchParams.get("select").includes("costo"));
    }
    assert.ok(llamadas.some(({ consulta }) => consulta.searchParams.get("offset") === "1"));
  });
});

test("una respuesta tardía conserva cantidades y productos añadidos mientras se verificaba", () => {
  const actual = [{ id: 1, variante_id: 51, cantidad: 2 }, { id: 1, variante_id: 52, cantidad: 4 }, { id: 3, cantidad: 1 }];
  const resultado = quitarProductosRetirados(actual, [{ producto_id: 1, variante_id: 51 }]);
  assert.deepEqual(resultado, [actual[1], actual[2]]);
  assert.equal(quitarProductosRetirados(actual, [{ producto_id: 99 }]), actual);
});

test("el endpoint público solo devuelve identificadores y respeta el retiro por tienda", async () => {
  await entorno({ productos: [{ id: 1, activo: true, infoimagen: "privado" }, { id: 2, activo: true }],
    configuraciones: [{ producto_id: 2, visible: false }] }, async () => {
    const respuesta = await comprobar({ json: async () => ({ tienda_id: tienda.id, productos: [{ id: 1 }, { id: 2 }] }) });
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get("cache-control"), "no-store");
    assert.deepEqual(await respuesta.json(), { ok: true, retirados: [{ producto_id: 2, variante_id: null }] });
  });
});

test("una caída temporal devuelve 503 y nunca vacía ni registra el carrito", async () => {
  await entorno({ falla: true }, async llamadas => {
    const respuesta = await comprobar({ json: async () => ({ tienda_id: tienda.id, productos: [{ id: 1 }] }) });
    assert.equal(respuesta.status, 503);
    assert.equal((await respuesta.json()).retirados, undefined);
    assert.ok(llamadas.every(({ init }) => !init.method || init.method === "GET"));
  });
});

test("el servidor revisa el carrito antes de crear pedidos o consumir reservas", async () => {
  await entorno({ productos: [{ id: 1, activo: true }] }, async llamadas => {
    const respuesta = await confirmar({ json: async () => ({ tienda_id: tienda.id, sesion_id: "prueba",
      confirmacion_id: "pedido-prueba-123", productos: [{ producto_id: 1 }, { producto_id: 2 }] }) });
    assert.equal(respuesta.status, 409);
    const datos = await respuesta.json();
    assert.equal(datos.codigo, "CARRITO_ACTUALIZADO");
    assert.deepEqual(datos.retirados, [{ producto_id: 2, variante_id: null }]);
    assert.ok(llamadas.every(({ init }) => !init.method || init.method === "GET"));
  });
});

test("la confirmación silenciosa recalcula descuento y flete y solo envía los productos vigentes", async () => {
  const pedido = { pago: { forma_pago: "TRANSFERENCIA" },
    productos: [{ producto_id: 1, cantidad: 1, precio_unitario: 300000 }, { producto_id: 2, cantidad: 1, precio_unitario: 150000 }],
    valores: { subtotal_productos: 450000, porcentaje_descuento: 6, descuento: 27000, costo_envio_original: 15000,
      costo_envio_final: 0, envio_gratis: true, total_pedido: 423000 } };
  let llamadas = 0;
  const retirados = [];
  const resultado = await confirmarCarritoVigente(pedido, async vigente => {
    if (++llamadas === 1) return Response.json({ codigo: "CARRITO_ACTUALIZADO", retirados: [{ producto_id: 2 }] }, { status: 409 });
    assert.equal(vigente.productos.length, 1);
    assert.equal(vigente.valores.subtotal_productos, 300000);
    assert.equal(vigente.valores.descuento, 18000);
    assert.equal(vigente.valores.costo_envio_final, 15000);
    assert.equal(vigente.valores.total_pedido, 297000);
    return Response.json({ ok: true, numero_pedido: "PRUEBA" });
  }, items => retirados.push(...items));
  assert.equal(llamadas, 2);
  assert.equal(resultado.datos.ok, true);
  assert.equal(resultado.pedido.productos.length, 1);
  assert.equal(retirados.length, 1);
});

test("si se retira todo el carrito no se envía un pedido vacío", async () => {
  let llamadas = 0;
  const resultado = await confirmarCarritoVigente({ productos: [{ producto_id: 1 }], valores: {} }, async () => {
    llamadas++;
    return Response.json({ codigo: "CARRITO_ACTUALIZADO", retirados: [{ producto_id: 1 }] }, { status: 409 });
  }, () => {});
  assert.equal(resultado.vacio, true);
  assert.equal(llamadas, 1);
});

test("los reintentos conservan fallos de conexión sin quitar referencias", async () => {
  let retirados = false;
  await assert.rejects(confirmarCarritoVigente({ productos: [{ producto_id: 1 }] }, async () =>
    Response.json({ error: "Servicio temporalmente no disponible." }, { status: 503 }), () => { retirados = true; }),
  /temporalmente/);
  assert.equal(retirados, false);
});
