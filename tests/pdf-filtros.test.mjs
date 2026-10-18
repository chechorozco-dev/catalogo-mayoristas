import test from "node:test";
import assert from "node:assert/strict";
import { MATERIALES_PDF, TIPOS_PDF, MAX_PRODUCTOS_PDF, esSeleccionPdfValida, productoCoincidePdf } from "../lib/catalogo/pdf-filtros.mjs";

test("la selección PDF exige material y familia específica, no permite Nuevos ni Todos", () => {
  assert.equal(esSeleccionPdfValida("RODIO", "Aretes"), true);
  assert.equal(esSeleccionPdfValida("ACERO", "Juegos"), true);
  assert.equal(esSeleccionPdfValida("AMBOS", "Anillos"), true);
  assert.equal(esSeleccionPdfValida("AMBOS", "Todos los productos"), false);
  assert.equal(esSeleccionPdfValida("RODIO", "Nuevos"), false);
  assert.equal(esSeleccionPdfValida("", "Aretes"), false);
  assert.equal(esSeleccionPdfValida("RODIO", ""), false);
  assert.ok(!TIPOS_PDF.some(x => ["Nuevos", "Todos los productos"].includes(x.id)));
  assert.equal(MATERIALES_PDF.length, 3);
  assert.equal(MAX_PRODUCTOS_PDF, 150);
});

test("los aretes de rodio no incluyen acero ni otros tipos", () => {
  const rodio = { nombre: "Arete flor", categoria: "Accesorios en Rodio" };
  const acero = { nombre: "Aretes negros", categoria: "Accesorios en Acero" };
  const juegos = { nombre: "Juego de aretes", categoria: "Rodio" };
  const candongas = { nombre: "Candongas de rodio" };
  const topos = { nombre: "Topos flor", categoria: "Rodio" };
  assert.equal(productoCoincidePdf(rodio, "RODIO", "Aretes"), true);
  assert.equal(productoCoincidePdf(acero, "RODIO", "Aretes"), false);
  assert.equal(productoCoincidePdf(juegos, "RODIO", "Aretes"), false);
  assert.equal(productoCoincidePdf(candongas, "RODIO", "Aretes"), false);
  assert.equal(productoCoincidePdf(topos, "RODIO", "Aretes"), false);
  assert.equal(productoCoincidePdf(acero, "AMBOS", "Aretes"), true);
  assert.equal(productoCoincidePdf(rodio, "AMBOS", "Aretes"), true);
});

test("los juegos de acero, pulseras, anillos y collares respetan los filtros", () => {
  assert.equal(productoCoincidePdf({ nombre: "Juego mariposa acero" }, "ACERO", "Juegos"), true);
  assert.equal(productoCoincidePdf({ nombre: "Pulsera de acero" }, "ACERO", "Pulseras"), true);
  assert.equal(productoCoincidePdf({ nombre: "Anillo en rodio" }, "RODIO", "Anillos"), true);
  assert.equal(productoCoincidePdf({ nombre: "Collar de acero" }, "ACERO", "Collares y cadenas"), true);
  assert.equal(productoCoincidePdf({ nombre: "Collar con dije en acero" }, "ACERO", "Collares y cadenas"), false);
  assert.equal(productoCoincidePdf({ nombre: "Collar con dije en acero" }, "ACERO", "Dijes"), true);
  assert.equal(productoCoincidePdf({ nombre: "Arete de plata 925" }, "AMBOS", "Aretes"), false);
});
