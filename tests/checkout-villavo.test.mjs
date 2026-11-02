import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/[slug]/page.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/confirmar-pedido/route.js", import.meta.url), "utf8");

test("solo la tienda física Villavo recibe estas condiciones", () => {
  assert.match(page, /esRaAccesoriosVillavo\(tienda\)/);
  assert.match(page, /esLocalVillavo=\{esRaAccesoriosVillavo\(tienda\)\}/);
});

test("servidor comprueba tienda y marca pago por acordar antes de guardar", () => {
  const check = api.indexOf("if (esRaAccesoriosVillavo(tiendaActual))");
  const write = api.indexOf("/rest/v1/pedidos?select=id,numero_pedido");
  assert.ok(check >= 0 && check < write);
  assert.match(api, /esFormaPagoLocalValida\(metodo, modalidad\)/);
  assert.match(api, /forma_pago: PAGO_POR_ACORDAR/);
  assert.match(api, /calcularTotalesVillavo\(pedido\?\.productos, modalidad, tarifaEnvio\)/);
  assert.match(api, /ciudades_envio\?select=ciudad_id/);
});
