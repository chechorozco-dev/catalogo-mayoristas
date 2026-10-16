import test from "node:test";
import assert from "node:assert/strict";
import {
  obtenerPrecioMayoristaWebhook,
  obtenerNombreProductoWebhook,
  obtenerCostoCompraWebhook,
  parsearCostoCompraOpcional,
} from "../lib/catalogo/costoWebhook.mjs";

const appsheet = {
  codigo: "RA7332",
  producto: "Anillo en rodio",
  precio: "7500",
  "precio SUGERIDO": "15000",
  COSTO: "3200",
};

test("reenvío AppSheet actualiza el nombre desde PRODUCTO aunque nombre esté vacío o desactualizado", () => {
  assert.equal(obtenerNombreProductoWebhook({producto:"ARETE EN RODIO PLATEADO LARGO",nombre:"ARETE EN RODIO"}),"ARETE EN RODIO PLATEADO LARGO");
  assert.equal(obtenerNombreProductoWebhook({producto:" ",nombre:"ARETE NUEVO"}),"ARETE NUEVO");
  assert.equal(obtenerNombreProductoWebhook({nombre:"ARETE ÚNICO"}),"ARETE ÚNICO");
  assert.equal(obtenerNombreProductoWebhook({nombre:"",producto:""}),undefined);
  assert.equal(obtenerNombreProductoWebhook({PRODUCTO:"CADENA NUEVA"}),"CADENA NUEVA");
});

test("body AppSheet: PRECIO_SHOPIFY es la venta y COSTO es la compra interna", () => {
  assert.equal(obtenerPrecioMayoristaWebhook(appsheet), "7500");
  assert.equal(parsearCostoCompraOpcional(obtenerCostoCompraWebhook(appsheet)),3200);
});

test("COSTO faltante, vacío, null o espacios no es obligatorio ni borra costos previos", () => {
  for(const cost of [undefined,null,"","  "]) {
    const body={...appsheet,COSTO:cost};
    assert.equal(obtenerPrecioMayoristaWebhook(body),"7500");
    assert.equal(obtenerCostoCompraWebhook(body),undefined);
    assert.equal(parsearCostoCompraOpcional(obtenerCostoCompraWebhook(body)),undefined);
  }
  const noColumn={...appsheet};
  delete noColumn.COSTO;
  assert.equal(obtenerCostoCompraWebhook(noColumn),undefined);
});

test("costo_compra explícito opcional conserva compatibilidad", () => {
  assert.equal(obtenerCostoCompraWebhook({precio:"7500",costo_compra:"2.900"}),"2.900");
  assert.equal(parsearCostoCompraOpcional("2.900"),2900);
  assert.equal(parsearCostoCompraOpcional("2.900,50"),2900.5);
  assert.equal(parsearCostoCompraOpcional(0),0);
  assert.equal(parsearCostoCompraOpcional("0"),0);
  assert.equal(parsearCostoCompraOpcional(null),undefined);
  assert.equal(parsearCostoCompraOpcional("1,200.50"),1200.5);
  assert.equal(obtenerCostoCompraWebhook({precio:"7500",costo_compra:"",COSTO:"3000"}),"3000");
});

test("COSTO de compra nunca es precio mayorista aunque falte PRECIO_SHOPIFY", () => {
  assert.equal(obtenerPrecioMayoristaWebhook({COSTO:"3200"}),undefined);
  assert.equal(obtenerPrecioMayoristaWebhook({precio:"",COSTO:"3200"}),undefined);
  assert.equal(obtenerPrecioMayoristaWebhook({PRECIO_SHOPIFY:"7500",COSTO:"3200"}),"7500");
  assert.equal(obtenerPrecioMayoristaWebhook({costo:"7500"}),undefined);
  assert.equal(obtenerCostoCompraWebhook({costo:"7500"}),undefined);
  assert.equal(obtenerPrecioMayoristaWebhook({precio:"7500",COSTO:""}),"7500");
});

test("costo inválido explícito se rechaza, pero no se exige cuando falta",()=>{
  for(const cost of ["ABC","<<[COSTO]>>","-1",{},-1,NaN]){
    assert.throws(()=>parsearCostoCompraOpcional(cost));
  }
});
