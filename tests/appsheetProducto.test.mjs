import test from "node:test";
import assert from "node:assert/strict";
import { mapearProductoAppSheet, precioAppSheet } from "../lib/appsheetProducto.mjs";

test("AppSheet mapea el body del mayorista con precio y precio sugerido separados", () => {
  const producto = mapearProductoAppSheet({
    ra_secret: "secreto-no-va-a-db",
    codigo: "VI001", producto: "Arete clásico", precio: "15.000",
    "precio SUGERIDO": "29.900", INFOIMAGEN: "info",
    cant: "12", solo_ra: "false", url_1: "https://ejemplo.co/foto1.jpg", url_2: ""
  });
  assert.equal(producto.referencia, "VI001");
  assert.equal(producto.nombre, "Arete clásico");
  assert.equal(producto.costo, 15000);
  assert.equal(producto.precio_detal, 29900);
  assert.equal(producto.cant, 12);
  assert.equal(producto.solo_ra, false);
  assert.equal(producto.foto_url_2, null);
  assert.equal(producto.origen, "APPSHEET_VILLAVO");
  assert.equal(Object.hasOwn(producto, "ra_secret"), false);
  assert.equal(Object.hasOwn(producto, "negocio_id"), false);
});

test("Rechaza cantidades, enlaces o precios inválidos", () => {
  const base = {codigo:"VI002", producto:"Cadena", precio:15000,"precio SUGERIDO":20000};
  assert.throws(() => mapearProductoAppSheet({...base,cant:"-1"}),/Precio|cant/);
  assert.throws(() => mapearProductoAppSheet({...base,cant:"1.5"}),/entero/);
  assert.throws(() => mapearProductoAppSheet({...base,url_1:"javascript:alert(1)"}),/URL/);
  assert.throws(() => mapearProductoAppSheet({...base,"precio SUGERIDO":""}),/precio SUGERIDO/);
  assert.throws(() => mapearProductoAppSheet({...base,producto:""}),/producto/);
  assert.throws(() => mapearProductoAppSheet({...base,codigo:""}),/codigo/);
});
test("Admite formato de miles colombiano y decimales normales", () => {
  assert.equal(precioAppSheet("1.234,50","precio"),1234.5);
  assert.equal(precioAppSheet("1,234.50","precio"),1234.5);
  assert.equal(precioAppSheet("12000","precio"),12000);
  assert.equal(precioAppSheet(12500,"precio"),12500);
  assert.equal(precioAppSheet("12.500","precio"),12500);
  assert.equal(precioAppSheet("12,50","precio"),12.5);
});
