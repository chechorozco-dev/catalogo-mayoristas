import test from "node:test";
import assert from "node:assert/strict";
import { pasoConErrores, validarDatosCompra } from "../lib/catalogo/checkout.mjs";

const comprador = {
  nombre: "María Rodríguez", telefono: "3101234567", direccion: "Calle 15 # 20-30",
  correo: "", ciudad: { ciudad_id: "VILLAVICENCIO", costo_envio: 7500 },
  esPuntoVillavo: false, modalidad: "", pago: "CONTRA_ENTREGA",
};

test("los datos del mayorista se completan antes de elegir pago", () => {
  const datos = { ...comprador, pago: "" };
  assert.deepEqual(validarDatosCompra(datos, { incluirPago: false }), {});
  assert.deepEqual(Object.keys(validarDatosCompra(datos)), ["pago"]);
  for (const pago of ["CONTRA_ENTREGA", "TRANSFERENCIA"]) {
    assert.deepEqual(validarDatosCompra({ ...datos, pago }), {});
  }
  assert.ok(validarDatosCompra({ ...datos, pago: "EFECTIVO" }).pago);
});

test("WhatsApp acepta el número colombiano con o sin indicativo", () => {
  for (const telefono of ["3101234567", "+57 310 123 4567", "00573101234567"]) {
    assert.deepEqual(validarDatosCompra({ ...comprador, telefono }), {});
  }
  for (const telefono of ["", "310123", "1234567890", "5731012345678"]) {
    assert.ok(validarDatosCompra({ ...comprador, telefono }).telefono);
  }
});

test("escribir una ciudad sin seleccionarla no permite continuar", () => {
  assert.ok(validarDatosCompra({ ...comprador, ciudad: null }).ciudad);
  assert.ok(validarDatosCompra({ ...comprador, ciudad: { ciudad_departamento: "Villavicencio" } }).ciudad);
});

test("los errores de datos regresan al paso de datos y el pago al paso final", () => {
  for (const campo of ["modalidad", "nombre", "telefono", "ciudad", "direccion", "correo"]) {
    assert.equal(pasoConErrores({ [campo]: "Falta completar", pago: "Elige un pago" }), 1);
  }
  assert.equal(pasoConErrores({ pago: "Elige un pago" }), 2);
});

test("nombre y dirección no admiten solo espacios; el correo sigue siendo opcional", () => {
  assert.ok(validarDatosCompra({ ...comprador, nombre: "  " }).nombre);
  assert.ok(validarDatosCompra({ ...comprador, direccion: "  " }).direccion);
  assert.deepEqual(validarDatosCompra({ ...comprador, correo: "" }), {});
  assert.ok(validarDatosCompra({ ...comprador, correo: "incompleto@" }).correo);
  assert.deepEqual(validarDatosCompra({ ...comprador, correo: "maria@example.com" }), {});
});

test("retiro Villavo necesita contacto y modalidad, sin dirección, ciudad ni pago", () => {
  const retiro = { ...comprador, esPuntoVillavo: true, modalidad: "RECOGER", pago: "", ciudad: null, direccion: "", correo: "dato antiguo inválido" };
  assert.deepEqual(validarDatosCompra(retiro), {});
  assert.ok(validarDatosCompra({ ...retiro, telefono: "" }).telefono);
  assert.ok(validarDatosCompra({ ...retiro, nombre: "" }).nombre);
});

test("envío Villavo requiere ubicación y contacto, sin obligar un medio de pago", () => {
  const envio = { ...comprador, esPuntoVillavo: true, modalidad: "ENVIO", pago: "" };
  assert.deepEqual(validarDatosCompra(envio), {});
  assert.ok(validarDatosCompra({ ...envio, ciudad: null }).ciudad);
  assert.ok(validarDatosCompra({ ...envio, direccion: "" }).direccion);
  assert.ok(validarDatosCompra({ ...envio, modalidad: "" }).modalidad);
});
