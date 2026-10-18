import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/[slug]/page.js", import.meta.url),"utf8");
const checkout = readFileSync(new URL("../app/[slug]/TiendaCliente.js", import.meta.url),"utf8");
const api = readFileSync(new URL("../app/api/confirmar-pedido/route.js", import.meta.url),"utf8");

test("el servidor decide cuándo es la principal de Villavo", () => {
  assert.match(page, /esRaAccesoriosVillavo\(tienda\)/);
  assert.match(page, /esLocalVillavo=\{esRaAccesoriosVillavo\(tienda\)\}/);
  assert.match(checkout, /const esPuntoVillavo = esTiendaRA && esLocalVillavo/);
});

test("el checkout físico tiene únicamente transferencia y efectivo", () => {
  const start=checkout.indexOf("esPuntoVillavo ? (");
  const end=checkout.indexOf(") : checkoutMinimizado ? (",start);
  assert.ok(start>=0 && end>start);
  const bloque=checkout.slice(start,end);
  assert.match(bloque, /abrirCheckoutConPago\("TRANSFERENCIA"\)/);
  assert.match(bloque, /abrirCheckoutConPago\("EFECTIVO"\)/);
  assert.doesNotMatch(bloque, /abrirCheckoutConPago\("CONTRA_ENTREGA"\)/);
  assert.doesNotMatch(bloque, /-6%|Descuento \(6%\)/);
  assert.match(bloque, /totalCarrito/);
});

test("la principal mayorista mantiene su checkout de contraentrega, sin ejecutar para Villavo", () => {
  assert.match(checkout, /\) : checkoutMinimizado \? \(/);
  assert.match(checkout, /abrirCheckoutConPago\("CONTRA_ENTREGA"\)/);
  assert.match(checkout, /!esPuntoVillavo &&\s*!checkoutMinimizado/);
});

test("para retiro local no hay flete ni descuento por transferencia", () => {
  assert.match(checkout, /formaPago === "TRANSFERENCIA" && !esPuntoVillavo/);
  assert.match(checkout, /const costoEnvioNormal =\s*esPuntoVillavo \? 0/);
  assert.match(checkout, /const tieneEnvioGratis =\s*!esPuntoVillavo/);
  assert.match(checkout, /esPuntoVillavo \? 0 : Math.round\(totalCarrito \* 0\.06\)/);
  assert.match(checkout, /esPuntoVillavo \? Number\(totalCarrito\) : Number\(totalPedido\)/);
});

test("el API consulta tienda real y bloquea métodos no admitidos antes de escribir", () => {
  const chequeo=api.indexOf("if (esRaAccesoriosVillavo(tiendaActual))");
  const write=api.indexOf("/rest/v1/pedidos?select=id,numero_pedido");
  const firstRpc=api.indexOf('"ra_solo_ra_verificar"');
  assert.ok(chequeo>=0 && chequeo<write);
  assert.ok(chequeo<firstRpc);
  assert.match(api, /esFormaPagoLocalValida\(metodo\)/);
  assert.match(api, /totalesRetiroLocal\(pedido\?\.productos\)/);
  assert.match(api, /direccion: "RECOGEN EN LOCAL"/);
});
