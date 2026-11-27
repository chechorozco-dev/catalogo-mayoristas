import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  combinarCarrito,
  descontarConfirmados,
} from "../lib/apartados/carrito.mjs";
import { generarPdfApartado } from "../lib/apartados/pdf.mjs";

const carrito = [
  {
    producto_id: 10,
    variante_id: 22,
    nombre: "Dije A",
    cantidad: 2,
    costo: 5000,
  },
];
test("volver a abrir el carrito conserva las unidades adicionales sin duplicar la importación", () => {
  const lista = combinarCarrito([], carrito);
  lista[0].cantidad += 1;
  assert.equal(combinarCarrito(lista, carrito)[0].cantidad, 3);
  assert.deepEqual(descontarConfirmados(carrito, lista), []);
});
test("al confirmar menos unidades, el resto queda en el carrito mayorista", () => {
  const lista = combinarCarrito([], carrito);
  lista[0].cantidad = 1;
  assert.equal(descontarConfirmados(carrito, lista)[0].cantidad, 1);
});
test("el detalle PDF admite nombres con acentos, símbolos y varias páginas", async () => {
  const p = {
    nombre: "Pulsera · corazón 💚",
    referencia: "RA11",
    cantidad: 2,
    mayor: 6500,
    sugerido: 13000,
    estado: "Guardado",
  };
  const bytes = await generarPdfApartado({
    codigo: "APT4000",
    fecha: "2026-11-20",
    estado: "Abierto",
    cliente: "María Pérez",
    abono: 0,
    productos: Array.from({ length: 55 }, () => p),
  });
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() > 1);
  assert.equal(doc.getTitle(), "Apartado APT4000");
});
