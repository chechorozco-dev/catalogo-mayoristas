import test from "node:test";
import { createHmac } from "node:crypto";
import { GET, POST } from "../app/api/apartados/route.js";
import assert from "node:assert/strict";
import {
  actualizarSeleccion,
  combinarCarrito,
  descontarConfirmados,
} from "../lib/apartados/carrito.mjs";
import { descargarPdfApartado } from "../lib/apartados/pdf.mjs";

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
test("la revisión retira solo las cantidades que no se pueden apartar y conserva las variantes y las unidades del carrito", () => {
  const items = [
    { clave: "w:10:1", cantidad: 4, desdeCarrito: 2, referencia: "LETRA-A" },
    {
      clave: "w:10:2",
      cantidad: 2,
      desdeCarrito: 1,
      referencia: "LETRA-B",
      mayor: 500,
    },
    { clave: "r:agotado", cantidad: 1, referencia: "AC-AGOTADO" },
  ];
  const productos = [{ clave: "w:10:2", referencia: "LETRA-B", mayor: 600 }];
  assert.deepEqual(actualizarSeleccion(items, productos), [
    { ...items[1], mayor: 600, disponible: true },
  ]);
  assert.deepEqual(actualizarSeleccion(items, []), []);
  assert.equal(items.length, 3);
});

test("la descarga entrega el archivo de WhatsApp Lab y utiliza un permiso específico", async (t) => {
  const token = "a".repeat(64);
  const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
  const llamada = t.mock.method(globalThis, "fetch", async (url, opciones) => {
    assert.equal(
      url,
      "https://ra-whatsapp-lab.vercel.app/api/portal/apartado-pdf",
    );
    assert.deepEqual(opciones.headers, { Authorization: "Bearer " + token });
    assert.equal(opciones.redirect, "error");
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="RA_APT4000_MEDIA_CARTA.pdf"',
      },
    });
  });
  await assert.rejects(descargarPdfApartado("incorrecto"), /PORTAL_PDF/);
  const r = await descargarPdfApartado(token);
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()), bytes);
  assert.match(r.headers.get("Content-Disposition"), /APT4000_MEDIA_CARTA/);
  assert.equal(llamada.mock.callCount(), 1);
});

test("Mis apartados valida en la base la cuenta firmada del cliente, del maestro y de la sesión creada al abrir tienda", async (t) => {
  const secreto = "prueba-de-sesion";
  const anterior = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = secreto;
  t.after(() => {
    if (anterior === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = anterior;
  });
  const cuenta = {
    cliente_id: "e5776008-5dbb-439e-8974-fd327bfc666d",
    telefono: "573000000000",
  };
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
    const firma = createHmac("sha256", secreto)
      .update(payload)
      .digest("base64url");
    return GET({
      nextUrl,
      cookies: { get: () => ({ value: payload + "." + firma }) },
    });
  }
  for (const rol of ["CLIENTE", "MAESTRO", undefined]) {
    assert.equal((await consultar({ ...cuenta, rol, exp })).status, 200);
  }
  assert.equal(
    (await consultar({ ...cuenta, rol: "MAESTRO", exp: 1 })).status,
    401,
  );
  assert.equal(rpc.mock.callCount(), 3);
});

test("las fechas del APT respetan el día de Colombia y los registros sin fecha", async () => {
  const { fechaApartado } = await import("../lib/apartados/fechas.mjs");
  assert.equal(
    fechaApartado("2026-11-28T02:10:00Z"),
    fechaApartado("2026-11-27"),
  );
  assert.notEqual(
    fechaApartado("2026-11-28T05:10:00Z"),
    fechaApartado("2026-11-27"),
  );
  assert.equal(fechaApartado(null), "Sin fecha registrada");
});

test("las opciones de entrega dependen del pago y del subtotal mayorista estricto", async () => {
  const { empresasDisponibles, entregaValida, empresasApartado } = await import(
    "../lib/apartados/entrega.mjs"
  );
  const normales = ["INTERRAPIDISIMO", "ENVIA", "SERVIENTREGA"];
  assert.equal(empresasApartado.ENVIA, "ENVIO");
  for (const precio of [399999, 400000])
    assert.deepEqual(empresasDisponibles("PAGO_EN_CASA", precio), normales);
  assert.deepEqual(empresasDisponibles("PAGO_EN_CASA", 400001), [
    ...normales,
    "COORDINADORA",
  ]);
  for (const forma_pago of ["CONTADO", "CONTADO_CON_ENVIO"])
    assert.deepEqual(empresasDisponibles(forma_pago, 600000), normales);
  assert.equal(
    entregaValida(
      { forma_pago: "PAGO_EN_CASA", transportadora: "COORDINADORA" },
      400000,
    ),
    false,
  );
  assert.deepEqual(empresasDisponibles("RECOGE_EN_LOCAL", 500000), []);
  assert.equal(
    entregaValida(
      { forma_pago: "RECOGE_EN_LOCAL", transportadora: null },
      500000,
    ),
    true,
  );
  assert.equal(
    entregaValida(
      { forma_pago: "RECOGE_EN_LOCAL", transportadora: "SERVIENTREGA" },
      500000,
    ),
    false,
  );
});

test("el permiso de apartar pertenece a la sesión y una reserva rechazada invita a consultar sin revelar inventario", async (t) => {
  const secreto = "sesion-qa-stock";
  const anterior = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = secreto;
  t.after(() => {
    if (anterior === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = anterior;
  });
  const cliente = "eea6b881-1229-4dbe-87a7-43f7d31b3265";
  const telefono = "573000000000";
  const payload = Buffer.from(
    JSON.stringify({
      cliente_id: cliente,
      telefono,
      exp: Math.floor(Date.now() / 1000) + 120,
    }),
  ).toString("base64url");
  const token =
    payload +
    "." +
    createHmac("sha256", secreto).update(payload).digest("base64url");
  const nextUrl = new URL("https://tienda.example/api/apartados?modo=permiso");
  const req = {
    nextUrl,
    cookies: { get: () => ({ value: token }) },
    headers: new Headers({ origin: nextUrl.origin }),
  };
  let penalizado = true;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.p_cliente, cliente);
    assert.equal(body.p_telefono, telefono);
    if (url.endsWith("ra_portal_leer")) {
      assert.equal(body.p_modo, "permiso");
      return Response.json({ puede_apartar: !penalizado });
    }
    assert.ok(url.endsWith("ra_portal_apartar"));
    return Response.json(
      {
        message: penalizado ? "PORTAL_PENALIZADO" : "PORTAL_DISPONIBILIDAD",
        details: "RA469",
      },
      { status: 400 },
    );
  });
  const envio = {
    accion: "apartar",
    solicitud: cliente,
    destino: cliente,
    lineas: [{ clave: "w:1:0", cantidad: 1, mayor: 7500 }],
  };
  assert.deepEqual(await (await GET(req)).json(), { puede_apartar: false });
  const denegado = await POST({
    ...req,
    text: async () => JSON.stringify(envio),
  });
  assert.equal(denegado.status, 403);
  assert.equal((await denegado.json()).codigo, "PORTAL_PENALIZADO");
  penalizado = false;
  assert.deepEqual(await (await GET(req)).json(), { puede_apartar: true });
  const sinSaldo = await POST({
    ...req,
    text: async () => JSON.stringify(envio),
  });
  assert.equal(sinSaldo.status, 409);
  const datos = await sinSaldo.json();
  assert.deepEqual(Object.keys(datos).sort(), ["codigo", "mensaje"]);
  assert.equal(datos.codigo, "PORTAL_DISPONIBILIDAD");
  assert.match(datos.mensaje, /Escríbenos/);
});
