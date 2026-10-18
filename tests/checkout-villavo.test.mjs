import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/[slug]/page.js", import.meta.url), "utf8");
const checkout = readFileSync(new URL("../app/[slug]/TiendaCliente.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/confirmar-pedido/route.js", import.meta.url), "utf8");

test("solo la tienda física Villavo recibe estas condiciones", () => {
  assert.match(page, /esRaAccesoriosVillavo\(tienda\)/);
  assert.match(page, /esLocalVillavo=\{esRaAccesoriosVillavo\(tienda\)\}/);
  assert.match(checkout, /const esPuntoVillavo = esTiendaRA && esLocalVillavo/);
});

test("checkout de retiro Villavo no solicita efectivo ni transferencia", () => {
  const start = checkout.indexOf(") : retiroVillavo ? (");
  const end = checkout.indexOf(") : checkoutMinimizado ? (", start);
  assert.ok(start >= 0 && end > start);
  const bloque = checkout.slice(start, end);
  assert.doesNotMatch(bloque, /abrirCheckoutConPago\(/);
  assert.doesNotMatch(bloque, /-6%|Descuento \(6%\)/);
  assert.match(bloque, /Pago por acordar por WhatsApp/);
  assert.match(bloque, /id="campo-nombre"/);
  assert.match(bloque, /id="campo-telefono"/);
  assert.match(bloque, /onClick=\{confirmarPedido\}/);
});

test("para envío Villavo muestra costo y formulario sin pedir medio de pago", () => {
  assert.match(checkout, /setModalidadEntrega\("RECOGER"\)/);
  assert.match(checkout, /setModalidadEntrega\("ENVIO"\)/);
  assert.match(checkout, /\(!esPuntoVillavo \|\| envioVillavo\) &&\s*!checkoutMinimizado/);
  assert.match(checkout, /\) : !esPuntoVillavo && !formaPago \? \(/);
  assert.match(checkout, /\{esPuntoVillavo \? \(\s*<div style=\{\{/);
  assert.match(checkout, /Total del pedido con envío/);
  assert.match(checkout, /Confirmar pedido para envío/);
  assert.match(checkout, /"POR_ACORDAR"/);
});

test("mayorista conserva contraentrega y descuento, pero Villavo no muestra tarjetas", () => {
  assert.match(checkout, /abrirCheckoutConPago\("CONTRA_ENTREGA"\)/);
  assert.match(checkout, /abrirCheckoutConPago\("TRANSFERENCIA"\)/);
  assert.match(checkout, /\{esPuntoVillavo \? \(/);
  assert.match(checkout, /!esPuntoVillavo && <span className="pago-descuento-badge"/);
  assert.match(checkout, /formaPago === "TRANSFERENCIA" && !esPuntoVillavo/);
  assert.match(checkout, /esPuntoVillavo \? 0 : Math\.round\(totalCarrito \* 0\.06\)/);
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

test("checkout de Villavo valida solo modalidad, ubicación cuando envía y contacto", () => {
  assert.match(checkout, /nuevosErrores\.modalidad/);
  assert.match(checkout, /!esPuntoVillavo && !formaPago/);
  assert.match(checkout, /!retiroVillavo && !direccionCliente\.trim\(\)/);
  assert.match(checkout, /!retiroVillavo && !ciudadSeleccionada\?\.ciudad_id/);
});
