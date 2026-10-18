import test from "node:test";
import assert from "node:assert/strict";
import {
  esRaAccesoriosVillavo, esFormaPagoLocalValida, totalesRetiroLocal,
  calcularTotalesVillavo, LOCAL_VILLAVO_ID, PAGO_POR_ACORDAR,
} from "../lib/catalogo/pagos-local.mjs";

const tiendaFisica = {
  id: LOCAL_VILLAVO_ID,
  slug: "local-2",
  tipo_tienda: "RA",
  negocio_id: "38100510-1325-4d3c-9b6c-886552e82089",
};

test("solo se aplican las reglas de Villavo a la principal física", () => {
  assert.equal(esRaAccesoriosVillavo(tiendaFisica), true);
  assert.equal(esRaAccesoriosVillavo({...tiendaFisica, slug:"mayoristas-ra"}), false);
  assert.equal(esRaAccesoriosVillavo({...tiendaFisica, tipo_tienda:"CLIENTE"}), false);
  assert.equal(esRaAccesoriosVillavo({...tiendaFisica, id:"otro-id"}), false);
  assert.equal(esRaAccesoriosVillavo({...tiendaFisica, negocio_id:"otro-negocio"}), false);
});

test("el medio de pago se acuerda por WhatsApp para recoger o enviar", () => {
  assert.equal(PAGO_POR_ACORDAR, "POR_ACORDAR");
  for (const modalidad of ["RECOGER", "ENVIO"]) {
    assert.equal(esFormaPagoLocalValida(PAGO_POR_ACORDAR, modalidad), true);
    for (const metodo of ["TRANSFERENCIA", "EFECTIVO", "CONTRA_ENTREGA", "PAGO EN CASA", "", "CONTADO"]) {
      assert.equal(esFormaPagoLocalValida(metodo, modalidad), false);
    }
  }
  assert.equal(esFormaPagoLocalValida(PAGO_POR_ACORDAR, "OTRO"), false);
});

test("retiro sin envío ni descuento del 6 por ciento", () => {
  const totales = totalesRetiroLocal([
    {precio_unitario:10800,cantidad:2},
    {precio_unitario:25000,cantidad:1},
  ]);
  assert.equal(totales.total_pedido,46600);
  assert.equal(totales.descuento,0);
  assert.equal(totales.porcentaje_descuento,0);
  assert.equal(totales.costo_envio_final,0);
  assert.equal(totalesRetiroLocal([{precio_unitario:-1,cantidad:1}]),null);
  assert.equal(totalesRetiroLocal([{precio_unitario:100,cantidad:0}]),null);
});

test("envío calcula tarifa sin descuento y aplica las reglas existentes de flete", () => {
  const productos=[{precio_unitario:12000,cantidad:2}];
  const envio=calcularTotalesVillavo(productos,"ENVIO",15000);
  assert.equal(envio.subtotal_productos,24000);
  assert.equal(envio.total_pedido,39000);
  assert.equal(envio.costo_envio_original,15000);
  assert.equal(envio.costo_envio_final,15000);
  assert.equal(envio.descuento,0);
  assert.equal(envio.porcentaje_descuento,0);

  const gratis=calcularTotalesVillavo([{precio_unitario:410000,cantidad:1}],"ENVIO",15000);
  assert.equal(gratis.costo_envio_final,0);
  assert.equal(gratis.envio_gratis,true);
  assert.equal(gratis.total_pedido,410000);

  const tarifaAlta=calcularTotalesVillavo([{precio_unitario:410000,cantidad:1}],"ENVIO",28000);
  assert.equal(tarifaAlta.total_pedido,438000);
  assert.equal(tarifaAlta.envio_gratis,false);
  assert.equal(calcularTotalesVillavo(productos,"ENVIO",-1),null);
  assert.equal(calcularTotalesVillavo(productos,"ENVIO",NaN),null);
  assert.equal(calcularTotalesVillavo(productos,"INVALIDO",15000),null);
});
