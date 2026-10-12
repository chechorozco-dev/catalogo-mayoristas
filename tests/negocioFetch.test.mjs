import test from "node:test";
import assert from "node:assert/strict";
import { negocioFetch } from "../lib/negocioFetch.mjs";

const ID = "33333333-3333-4333-8333-333333333333";
function entorno() {
  const prev = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ejemplo.supabase.co";
  process.env.NEGOCIO_ID = ID;
  const llamadas = [];
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url: String(url), init });
    return { ok: true, json: async () => [] };
  };
  return { llamadas, cerrar() { process.env = prev; globalThis.fetch = originalFetch; } };
}

test("GET de productos siempre filtra el negocio del servidor", async () => {
  const { llamadas, cerrar } = entorno();
  try {
    await negocioFetch("https://ejemplo.supabase.co/rest/v1/productos?select=id&activo=eq.true", { method: "GET" });
    const url = new URL(llamadas[0].url);
    assert.equal(url.searchParams.get("negocio_id"), `eq.${ID}`);
    assert.equal(url.searchParams.get("activo"), "eq.true");
  } finally { cerrar(); }
});

test("POST de tienda inserta negocio_id, no acepta ID distinto", async () => {
  const { llamadas, cerrar } = entorno();
  try {
    await negocioFetch("https://ejemplo.supabase.co/rest/v1/tiendas", { method: "POST", body: JSON.stringify({ slug: "local2" }) });
    assert.equal(JSON.parse(llamadas[0].init.body).negocio_id, ID);
    await assert.rejects(
      negocioFetch("https://ejemplo.supabase.co/rest/v1/tiendas", { method: "POST", body: JSON.stringify({ negocio_id: "otro" }) }),
      /otro negocio/
    );
    assert.equal(llamadas.length, 1);
  } finally { cerrar(); }
});

test("PATCH con ID manipulado o filtro ajeno se rechaza", async () => {
  const { cerrar } = entorno();
  try {
    await assert.rejects(negocioFetch("https://ejemplo.supabase.co/rest/v1/tiendas?id=eq.1&negocio_id=eq.otro", { method: "PATCH", body: "{}" }), /inconsistente/);
    await assert.rejects(negocioFetch("https://ejemplo.supabase.co/rest/v1/tiendas?id=eq.1", { method: "PATCH", body: JSON.stringify({ negocio_id: "otro" }) }), /otro/);
  } finally { cerrar(); }
});

test("Falta de NEGOCIO_ID bloquea lectura privada", async () => {
  const { cerrar } = entorno();
  try {
    delete process.env.NEGOCIO_ID;
    await assert.rejects(negocioFetch("https://ejemplo.supabase.co/rest/v1/productos", {}), /NEGOCIO_ID/);
  } finally { cerrar(); }
});

test("Proveedores externos no cambian", async () => {
  const { llamadas, cerrar } = entorno();
  try {
    await negocioFetch("https://otro.example.com/notificar", { method: "POST", body: "sin modificar" });
    assert.equal(llamadas[0].init.body, "sin modificar");
  } finally { cerrar(); }
});
