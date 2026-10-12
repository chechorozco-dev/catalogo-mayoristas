import test from "node:test";
import assert from "node:assert/strict";

import {
  limpiarTexto,
  formatoPrecio,
  limpiarWhatsapp,
  normalizarTelefonoColombia,
  obtenerColorTexto,
} from "../lib/catalogo/formatos.mjs";

import {
  productoPerteneceCategoria,
  obtenerTipoProducto,
} from "../lib/catalogo/categorias.mjs";

import {
  estadoPublicacionProducto,
  claveProducto,
} from "../lib/catalogo/publicacion.mjs";

// Estos casos fijan las reglas que debe conservar una refactorización.
test("textos, acentos y números se formatean como antes", () => {
  assert.equal(limpiarTexto("  CÁNDONGAS en RÓDIO "), "candongas en rodio");
  assert.equal(limpiarWhatsapp("+57 314 603 9934"), "573146039934");
  assert.equal(normalizarTelefonoColombia("314 603 9934"), "573146039934");
  assert.equal(normalizarTelefonoColombia("0057 3146039934"), "573146039934");
  assert.match(formatoPrecio(150000), /150[.,]000/);
});

test("el color del texto contrasta con los fondos de tienda", () => {
  assert.equal(obtenerColorTexto("#ffffff"), "#111111");
  assert.equal(obtenerColorTexto("#111111"), "#FFFFFF");
  assert.equal(obtenerColorTexto("#fff"), "#111111");
  assert.equal(obtenerColorTexto("no-es-un-color"), "#111111");
});

test("las categorías de joyería conservan sus reglas especiales", () => {
  assert.equal(productoPerteneceCategoria({ nombre: "Candongas en rodio" }, "Aretes"), true);
  assert.equal(productoPerteneceCategoria({ nombre: "Pulsera de acero" }, "Pulseras"), true);
  assert.equal(productoPerteneceCategoria({ nombre: "Camándula San Benito" }, "Camándulas y denarios"), true);
  assert.equal(productoPerteneceCategoria({ nombre: "Collar con dije" }, "Collares y cadenas"), false);
  assert.equal(productoPerteneceCategoria({ nombre: "Collar con dije" }, "Dijes"), true);
  assert.equal(productoPerteneceCategoria({ nombre: "Arete flor" }, "Todos"), true);
  assert.equal(obtenerTipoProducto({ nombre: "Maxitopo de flor" }), "aretes");
  assert.equal(obtenerTipoProducto({ nombre: "Anillo liso" }), "anillos");
});

test("productos antiguos no esperan 24 horas para tienda recién creada", () => {
  const antiguo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const tiendaNueva = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  assert.equal(
    estadoPublicacionProducto({ created_at: antiguo }, { tipo_tienda: "CLIENTE", creado_en: tiendaNueva }).enEspera,
    false
  );
});

test("tienda RA y publicación anticipada nunca quedan en espera", () => {
  const reciente = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  assert.equal(
    estadoPublicacionProducto({ created_at: reciente }, { tipo_tienda: "RA" }).enEspera,
    false
  );
  assert.equal(
    estadoPublicacionProducto({ created_at: reciente, publicar_anticipadamente: true }, { tipo_tienda: "CLIENTE" }).enEspera,
    false
  );
});

test("el revendedor debe esperar 24 horas para productos nuevos", () => {
  const reciente = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const estado = estadoPublicacionProducto({ created_at: reciente }, { tipo_tienda: "CLIENTE" });
  assert.equal(estado.enEspera, true);
  assert.ok(estado.horasRestantes > 0 && estado.horasRestantes <= 24);
  const antiguo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
  assert.equal(
    estadoPublicacionProducto({ created_at: antiguo }, { tipo_tienda: "CLIENTE" }).enEspera,
    false
  );
});

test("identificadores de producto y variante mantienen su estructura", () => {
  assert.equal(claveProducto(45), "producto-45");
  assert.equal(claveProducto(45, 7), "producto-45-variante-7");
});
