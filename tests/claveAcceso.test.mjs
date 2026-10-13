import test from "node:test";
import assert from "node:assert/strict";
import { limpiarTelefono, claveValida, cifrarClave, comprobarClave, crearSesion, verificarSesion } from "../lib/claveAcceso.mjs";

test("los números deben tener el formato celular colombiano", () => {
  assert.equal(limpiarTelefono("314 603 9934"), "573146039934");
  assert.equal(limpiarTelefono("+57 314 603 9934"), "573146039934");
  assert.equal(limpiarTelefono("12345"), null);
  assert.equal(limpiarTelefono("300000000000000000000"), null);
});
test("la contraseña no queda legible y comprueba la coincidencia", () => {
  assert.equal(claveValida("solo123"), true);
  assert.equal(claveValida("123456"), true);
  assert.equal(claveValida("abcdef"), true);
  assert.equal(claveValida("ab#*12"), true);
  assert.equal(claveValida("12345"), false);
  assert.equal(claveValida("      "), false);
  assert.equal(claveValida("a".repeat(129)), false);
  const cifrado = cifrarClave("UnaClaveSegura2026");
  assert.ok(!cifrado.includes("UnaClaveSegura2026"));
  assert.ok(comprobarClave("UnaClaveSegura2026", cifrado));
  assert.ok(!comprobarClave("NoCoincide2026", cifrado));
  const claveSoloNumeros = cifrarClave("123456");
  assert.ok(comprobarClave("123456", claveSoloNumeros));
  assert.ok(!comprobarClave("654321", claveSoloNumeros));
});
test("las sesiones firmadas están atadas al local", () => {
  const anterior = process.env.NEGOCIO_ID;
  const clave = "a".repeat(48);
  try {
    process.env.NEGOCIO_ID = "38100510-1325-4d3c-9b6c-886552e82089";
    const cliente = { id: "abc", telefono: "573000000000", rol: "CLIENTE", negocio_id: process.env.NEGOCIO_ID };
    const { token } = crearSesion(cliente, clave);
    assert.ok(verificarSesion(token, clave));
    process.env.NEGOCIO_ID = "bde2b2d9-808f-4708-afa0-720f07f1f6df";
    assert.equal(verificarSesion(token, clave), null);
    assert.equal(verificarSesion(token + "x", clave), null);
  } finally {
    if (anterior === undefined) delete process.env.NEGOCIO_ID;
    else process.env.NEGOCIO_ID = anterior;
  }
});