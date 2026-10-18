import test from "node:test";
import assert from "node:assert/strict";
import {
  esRaAccesoriosVillavo, esFormaPagoLocalValida, totalesRetiroLocal, calcularTotalesVillavo,
  LOCAL_VILLAVO_ID,
} from "../lib/catalogo/pagos-local.mjs";

const base = {
  id: LOCAL_VILLAVO_ID,
  slug: "local-2",
  tipo_tienda: "RA",
  negocio_id: "38100510-1325-4d3c-9b6c-886552e82089",
};

test("solo la tienda principal física local-2 utiliza pagos de Villavo", () => {
  assert.equal(esRaAccesoriosVillavo(base), true);
  assert.equal(esRaAccesoriosVillavo({...base,slug:"mayoristas-ra"}), false);
  assert.equal(esRaAccesoriosVillavo({...base,tipo_tienda:"CLIENTE"}), false);
  assert.equal(esRaAccesoriosVillavo({...base,id:"9f88c455-2801-479f-aee0-a04c01ceaa8b"}), false);
  assert.equal(esRaAccesoriosVillavo({...base,negocio_id:"bde2b2d9-808f-4708-afa0-720f07f1f6df"}), false);
});

test("Villavo acepta exclusivamente transferencia y efectivo", () => {
  assert.deepEqual(["TRANSFERENCIA", "EFECTIVO"].map(pago => esFormaPagoLocalValida(pago)), [true,true]);
  for (const pago of ["CONTRA_ENTREGA","PAGO EN CASA","CONTADO","","OTRO"]) {
    assert.equal(esFormaPagoLocalValida(pago), false);
  }
});

test("en local el precio es el publicado, sin 6 % ni costo de entrega", () => {
  const totals = totalesRetiroLocal([
    {precio_unitario:10800,cantidad:2},
    {precio_unitario:25000,cantidad:1},
  ]);
  assert.equal(totals.total_pedido,46600);
  assert.equal(totals.descuento,0);
  assert.equal(totals.porcentaje_descuento,0);
  assert.equal(totals.costo_envio_final,0);
  assert.equal(totalesRetiroLocal([{precio_unitario:-1,cantidad:1}]),null);
  assert.equal(totalesRetiroLocal([{precio_unitario:100,cantidad:0}]),null);
});

test("envío desde Villavo permite únicamente transferencia y calcula flete", () => {
  assert.equal(esFormaPagoLocalValida("TRANSFERENCIA","ENVIO"),true);
  assert.equal(esFormaPagoLocalValida("EFECTIVO","ENVIO"),false);
  assert.equal(esFormaPagoLocalValida("CONTRA_ENTREGA","ENVIO"),false);
  assert.equal(esFormaPagoLocalValida("TRANSFERENCIA","OTRO"),false);
  const envio=calcularTotalesVillavo([{precio_unitario:12000,cantidad:2}],"ENVIO",15000);
  assert.equal(envio.subtotal_productos,24000);
  assert.equal(envio.total_pedido,39000);
  assert.equal(envio.costo_envio_final,15000);
  assert.equal(envio.descuento,0);
  const gratis=calcularTotalesVillavo([{precio_unitario:410000,cantidad:1}],"ENVIO",15000);
  assert.equal(gratis.costo_envio_final,0);
  assert.equal(gratis.envio_gratis,true);
  assert.equal(gratis.total_pedido,410000);
  const conTarifaAlta=calcularTotalesVillavo([{precio_unitario:410000,cantidad:1}],"ENVIO",28000);
  assert.equal(conTarifaAlta.total_pedido,438000);
  assert.equal(calcularTotalesVillavo([{precio_unitario:1,cantidad:1}],"ENVIO",-1),null);
  assert.equal(calcularTotalesVillavo([{precio_unitario:1,cantidad:1}],"ENVIO",NaN),null);
});
