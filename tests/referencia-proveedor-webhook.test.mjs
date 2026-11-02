import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Ejecutar la ruta real y sus normalizadores sin arrancar Next ni llamar
// servicios externos. El diagnóstico diferido no forma parte de la escritura.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return {
        url: "data:text/javascript," + encodeURIComponent(
          "export const NextResponse = Response; export function after() {}"
        ),
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const { POST } = await import("../app/api/automation/producto/route.js");

const producto = {
  id: 8123, referencia: "RA-PRUEBA", nombre: "Arete de prueba",
  costo: 7500, precio_detal: 15000,
};
const bodyAppSheet = {
  codigo: producto.referencia, producto: producto.nombre,
  precio: "7500", "precio SUGERIDO": "15000",
};
const alias = [
  "ref prov", "REF PROV", "referencia_proveedor",
  "REFERENCIA_PROVEEDOR", "REFERENCIA PROVEEDOR", "referenciaProveedor",
];

async function ejecutar(body, { existe = true, privado = "ok", autorizado = true, activo = true } = {}) {
  const keys = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "RA_AUTOMATION_SECRET"];
  const anteriores = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const fetchAnterior = globalThis.fetch;
  const errores = [];
  const errorAnterior = console.error;
  const llamadas = [];
  let guardado = "PROVEEDOR-ANTERIOR";
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "SOLO_PRUEBA";
    process.env.RA_AUTOMATION_SECRET = "AUTOMATION_SOLO_PRUEBA";
    console.error = (...args) => errores.push(args);
    globalThis.fetch = async (url, options = {}) => {
      const destino = new URL(url);
      assert.equal(destino.origin, "https://example.supabase.co");
      const metodo = options.method || "GET";
      const datos = options.body ? JSON.parse(options.body) : null;
      llamadas.push({ destino, metodo, datos });
      if (destino.pathname === "/rest/v1/ra_web_integracion_controles") {
        return Response.json([{ activo, version: 1 }]);
      }
      if (destino.pathname === "/rest/v1/productos") {
        if (metodo === "GET") return Response.json(existe ? [producto] : []);
        assert.ok(["POST", "PATCH"].includes(metodo));
        for (const key of alias) assert.equal(Object.hasOwn(datos, key), false);
        return Response.json([{ ...producto, ...datos }]);
      }
      if (destino.pathname === "/rest/v1/ra_productos_principal") {
        assert.equal(metodo, "PATCH");
        assert.equal(destino.searchParams.get("fuente_catalogo_id"), "eq.8123");
        assert.equal(destino.searchParams.get("select"), "id");
        if (privado === "error") return new Response("fallo simulado", { status: 500 });
        if (privado === "sin_fila") return Response.json([]);
        if (Object.hasOwn(datos, "referencia_proveedor")) guardado = datos.referencia_proveedor;
        return Response.json([{ id: "producto-privado-de-prueba" }]);
      }
      throw new Error("Solicitud inesperada: " + destino.pathname);
    };
    const request = new Request("https://example.test/api/automation/producto", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(autorizado ? {
        "x-ra-automation-secret": "AUTOMATION_SOLO_PRUEBA",
      } : {}) },
      body: JSON.stringify(body),
    });
    const respuesta = await POST(request);
    return { status: respuesta.status, resultado: await respuesta.json(), llamadas, guardado, errores };
  } finally {
    globalThis.fetch = fetchAnterior;
    console.error = errorAnterior;
    for (const key of keys) {
      if (anteriores[key] === undefined) delete process.env[key];
      else process.env[key] = anteriores[key];
    }
  }
}

function cambiosPrivados(result) {
  return result.llamadas.filter(call => call.destino.pathname === "/rest/v1/ra_productos_principal");
}

test("AppSheet crea el producto y guarda ref prov únicamente en el maestro privado", async () => {
  const result = await ejecutar({ ...bodyAppSheet, "ref prov": "  0012-AB/09  " }, { existe: false });
  assert.equal(result.status, 200);
  assert.equal(result.resultado.accion, "CREADO");
  assert.equal(result.guardado, "0012-AB/09");
  assert.equal(cambiosPrivados(result).length, 1);
  assert.equal(result.llamadas.filter(call => call.metodo === "POST").length, 1);
  assert.equal(result.resultado.producto.referencia, producto.referencia);
  assert.ok(!JSON.stringify(result.resultado).includes("0012-AB/09"));
});

test("AppSheet actualiza ref prov junto con campos públicos sin cambiar referencia RA", async () => {
  const result = await ejecutar({ ...bodyAppSheet, "ref prov": "PRV-002", producto: "Nombre actualizado" });
  assert.equal(result.status, 200);
  assert.equal(result.resultado.accion, "ACTUALIZADO");
  assert.equal(result.guardado, "PRV-002");
  assert.equal(result.resultado.producto.nombre, "Nombre actualizado");
  assert.equal(result.resultado.producto.referencia, producto.referencia);
  assert.equal(cambiosPrivados(result).length, 1);
  assert.ok(!JSON.stringify(result.resultado).includes("PRV-002"));
});

test("reenviar solamente código y ref prov completa el maestro sin escribir en productos", async () => {
  const result = await ejecutar({ codigo: producto.referencia, "ref prov": "00123" });
  assert.equal(result.status, 200);
  assert.equal(result.guardado, "00123");
  assert.equal(cambiosPrivados(result).length, 1);
  assert.equal(result.llamadas.filter(call => call.destino.pathname === "/rest/v1/productos" && call.metodo !== "GET").length, 0);
});

test("ausente, null o blanco no borra una referencia de proveedor guardada", async () => {
  for (const value of [undefined, null, "", "   "]) {
    const result = await ejecutar({ ...bodyAppSheet, "ref prov": value });
    assert.equal(result.status, 200);
    assert.equal(result.guardado, "PROVEEDOR-ANTERIOR");
    assert.equal(cambiosPrivados(result).length, 0);
  }
});

test("todos los alias anteriores y REF PROV conservan compatibilidad", async () => {
  for (const key of alias) {
    const result = await ejecutar({ codigo: producto.referencia, [key]: "PRV-COMPATIBLE" });
    assert.equal(result.status, 200, key);
    assert.equal(result.guardado, "PRV-COMPATIBLE", key);
  }
});

test("la clave canónica mantiene su precedencia cuando llegan dos nombres", async () => {
  const result = await ejecutar({ codigo: producto.referencia, referencia_proveedor: "CANONICA", "ref prov": "ALIAS" });
  assert.equal(result.status, 200);
  assert.equal(result.guardado, "CANONICA");
});

test("ref prov inválida se rechaza antes de escribir el producto", async () => {
  for (const value of [123, true, {}, ["PRV"], "x".repeat(161)]) {
    const result = await ejecutar({ ...bodyAppSheet, "ref prov": value }, { existe: false });
    assert.equal(result.status, 400);
    assert.equal(result.resultado.ok, false);
    assert.equal(result.llamadas.filter(call => call.metodo !== "GET").length, 0);
    assert.equal(result.guardado, "PROVEEDOR-ANTERIOR");
  }
});

test("se acepta una referencia proveedor de 160 caracteres", async () => {
  const value = "0".repeat(160);
  const result = await ejecutar({ codigo: producto.referencia, "ref prov": value });
  assert.equal(result.status, 200);
  assert.equal(result.guardado, value);
});

test("un error al guardar el dato privado no confirma éxito", async () => {
  for (const privado of ["error", "sin_fila"]) {
    const result = await ejecutar({ ...bodyAppSheet, "ref prov": "PRV-ERROR" }, { privado });
    assert.equal(result.status, 500);
    assert.equal(result.resultado.ok, false);
    assert.equal(result.guardado, "PROVEEDOR-ANTERIOR");
    assert.equal(result.errores.length, 1);
  }
});

test("añadir ref prov no evita autenticación ni pausa de sincronización", async () => {
  const body = { ...bodyAppSheet, "ref prov": "PRV-SEGURIDAD" };
  const sinPermiso = await ejecutar(body, { autorizado: false });
  assert.equal(sinPermiso.status, 401);
  assert.equal(sinPermiso.llamadas.length, 0);
  const pausado = await ejecutar(body, { activo: false });
  assert.equal(pausado.status, 503);
  assert.equal(pausado.resultado.codigo, "RA_SYNC_PAUSADA");
  assert.equal(pausado.llamadas.filter(call => call.metodo !== "GET").length, 0);
});
