import test from "node:test";
import { createHmac } from "node:crypto";
import { GET } from "../app/api/apartados/route.js";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  combinarCarrito,
  descontarConfirmados,
} from "../lib/apartados/carrito.mjs";
import { generarPdfApartado } from "../lib/apartados/pdf.mjs";

const carrito = [
  {
    producto_id: 10,
    variante_id: 22,
    nombre: "Dije A",
    cantidad: 2,
    costo: 5000,
  },
];
test("volver a abrir el carrito conserva las unidades adicionales sin duplicar la importación", () => {
  const lista = combinarCarrito([], carrito);
  lista[0].cantidad += 1;
  assert.equal(combinarCarrito(lista, carrito)[0].cantidad, 3);
  assert.deepEqual(descontarConfirmados(carrito, lista), []);
});
test("al confirmar menos unidades, el resto queda en el carrito mayorista", () => {
  const lista = combinarCarrito([], carrito);
  lista[0].cantidad = 1;
  assert.equal(descontarConfirmados(carrito, lista)[0].cantidad, 1);
});
test("el detalle PDF admite nombres con acentos, símbolos y varias páginas", async () => {
  const p = {
    nombre: "Pulsera · corazón 💚",
    referencia: "RA11",
    cantidad: 2,
    mayor: 6500,
    sugerido: 13000,
    estado: "Guardado",
  };
  const bytes = await generarPdfApartado({
    codigo: "APT4000",
    fecha: "2026-11-20",
    estado: "Abierto",
    cliente: "María Pérez",
    abono: 0,
    productos: Array.from({ length: 55 }, () => p),
  });
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() > 1);
  assert.equal(doc.getTitle(), "Apartado APT4000");
});

test("Mis apartados valida en la base la cuenta firmada del cliente, del maestro y de la sesión creada al abrir tienda", async (t) => {
  const secreto = "prueba-de-sesion";
  const anterior = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = secreto;
  t.after(() => {
    if (anterior === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = anterior;
  });
  const cuenta = { cliente_id: "e5776008-5dbb-439e-8974-fd327bfc666d", telefono: "573000000000" };
  const exp = Math.floor(Date.now() / 1000) + 90;
  const rpc = t.mock.method(globalThis, "fetch", async (_, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.p_cliente, cuenta.cliente_id);
    assert.equal(body.p_telefono, cuenta.telefono);
    return Response.json({ cliente: body.p_cliente, apartados: [] });
  });
  const nextUrl = new URL("https://tienda.example/api/apartados");
  function consultar(datos) {
    const payload = Buffer.from(JSON.stringify(datos)).toString("base64url");
    const firma = createHmac("sha256", secreto).update(payload).digest("base64url");
    return GET({ nextUrl, cookies: { get: () => ({ value: payload + "." + firma }) } });
  }
  for (const rol of ["CLIENTE", "MAESTRO", undefined]) {
    assert.equal((await consultar({ ...cuenta, rol, exp })).status, 200);
  }
  assert.equal((await consultar({ ...cuenta, rol: "MAESTRO", exp: 1 })).status, 401);
  assert.equal(rpc.mock.callCount(), 3);
});

test("las fechas del APT respetan el día de Colombia y los registros sin fecha", async () => {
  const { fechaApartado } = await import("../lib/apartados/fechas.mjs");
  assert.equal(fechaApartado("2026-11-28T02:10:00Z"), fechaApartado("2026-11-27"));
  assert.notEqual(fechaApartado("2026-11-28T05:10:00Z"), fechaApartado("2026-11-27"));
  assert.equal(fechaApartado(null), "Sin fecha registrada");
});
