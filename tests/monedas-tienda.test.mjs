import test from "node:test";
import assert from "node:assert/strict";
import { formatoPrecio } from "../lib/catalogo/formatos.mjs";
import { normalizarMoneda, leerPrecioEditable, precioVentaTienda } from "../lib/catalogo/monedas.mjs";

test("COP conserva precios sin centavos y la moneda predeterminada", () => {
  assert.equal(normalizarMoneda(undefined), "COP");
  assert.equal(leerPrecioEditable("13.000", "COP"), 13000);
  assert.equal(leerPrecioEditable("13000", "COP"), 13000);
  assert.match(formatoPrecio(13000), /13[.,]000/);
});
test("USD admite 2.40 o 2,40 y lo muestra con dos decimales", () => {
  assert.equal(leerPrecioEditable("2.4", "USD"), 2.4);
  assert.equal(leerPrecioEditable("2,40", "USD"), 2.4);
  assert.equal(leerPrecioEditable("24", "USD"), 24);
  assert.equal(leerPrecioEditable("2.456", "USD"), Number.NaN);
  assert.equal(formatoPrecio(2.4, "USD"), "US$ 2.40");
});
test("el precio personalizado prevalece y no se modifica el precio base", () => {
  assert.equal(precioVentaTienda({ precioBase: 13000, personalizado: 2.4, moneda: "USD" }), 2.4);
  assert.equal(precioVentaTienda({ precioBase: 13000, personalizado: 0, moneda: "USD" }), 0);
  assert.equal(precioVentaTienda({ precioBase: 13000, moneda: "COP" }), 13000);
  assert.equal(precioVentaTienda({ precioBase: 13000, moneda: "USD" }), null);
  assert.equal(precioVentaTienda({ precioBase: 6500, moneda: "USD", esRa: true }), 6500);
});
