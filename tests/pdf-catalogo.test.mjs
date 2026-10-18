import test from "node:test";
import assert from "node:assert/strict";
import {
  fotosProducto, posicionesFotosProducto, normalizarUrlFoto, organizarFilasProductosPdf,
} from "../lib/catalogo/pdf-layout.mjs";
import { recibirPdfConProgreso } from "../lib/catalogo/pdf-progress.mjs";

test("dos fotografías ocupan columnas equilibradas", () => {
  const posiciones = posicionesFotosProducto({ foto_url: "https://ejemplo.co/a.jpg", foto_url_2: "https://ejemplo.co/b.jpg" });
  assert.equal(posiciones.length, 2);
  assert.equal(posiciones[0].ancho, posiciones[1].ancho);
  assert.ok(posiciones[0].x + posiciones[0].ancho < posiciones[1].x);
  assert.ok(Math.abs(posiciones[0].x - (595.28 - posiciones[1].x - posiciones[1].ancho)) < 0.01);
});

test("una fotografía queda centrada, incluso si solamente es la segunda", () => {
  for (const producto of [
    { foto_url: "https://ejemplo.co/a.jpg" },
    { foto_url: "", foto_url_2: "https://ejemplo.co/b.jpg" },
  ]) {
    const posiciones = posicionesFotosProducto(producto);
    assert.equal(posiciones.length, 1);
    assert.ok(Math.abs(posiciones[0].x - (595.28 - posiciones[0].ancho) / 2) < 0.01);
  }
  assert.deepEqual(fotosProducto({ foto_url: "null", foto_url_2: "" }), []);
});


test("Google Drive thumbnail sin ID no cuenta como segunda foto", () => {
  const resultado = fotosProducto({
    foto_url: "https://drive.google.com/thumbnail?id=1XfsrDpOExpEO0Lo_YK4iOCgTaPkrzhbu&sz=w1200",
    foto_url_2: "https://drive.google.com/thumbnail?id=&sz=w1200",
  });
  assert.equal(resultado.length, 1);
  assert.equal(normalizarUrlFoto("https://drive.google.com/thumbnail?id=&sz=w1200"), null);
  assert.equal(normalizarUrlFoto("https://drive.google.com/uc?export=view&id="), null);
  assert.equal(normalizarUrlFoto("mailto:test@example.com"), null);
  assert.equal(fotosProducto({ foto_url: resultado[0], foto_url_2: resultado[0] }).length, 1);
});

test("tres productos de una foto producen una pareja y un producto centrado", () => {
  const uno = { referencia: "AC1780", foto_url: "https://ejemplo.co/a.jpg",
    foto_url_2: "https://drive.google.com/thumbnail?id=&sz=w1200" };
  const dos = { referencia: "AC1778", foto_url: "https://ejemplo.co/b.jpg",
    foto_url_2: "https://drive.google.com/thumbnail?id=&sz=w1200" };
  const tres = { referencia: "AC1777", foto_url: "https://ejemplo.co/c.jpg" };
  const filas = organizarFilasProductosPdf([uno,dos,tres]);
  assert.deepEqual(filas.map((fila) => fila.tipo), ["pareja","solo"]);
  assert.deepEqual(filas[0].productos.map((p) => p.referencia), ["AC1780", "AC1778"]);
  assert.equal(filas[1].productos[0].referencia, "AC1777");
});

test("fotos descargadas reales determinan una foto aunque dos enlaces parecieran válidos", () => {
  const a = { referencia: "A", foto_url: "https://ejemplo.co/a1.jpg",
    foto_url_2: "https://ejemplo.co/a2.jpg", imagenes_pdf: [{bytes: new Uint8Array([1])}] };
  const b = { referencia: "B", foto_url: "https://ejemplo.co/b1.jpg",
    imagenes_pdf: [{bytes: new Uint8Array([2])}] };
  const doble = { referencia: "C", imagenes_pdf: [{bytes: 1}, {bytes: 2}] };
  const sinFoto = { referencia: "D", imagenes_pdf: [] };
  const filas = organizarFilasProductosPdf([a, doble, sinFoto, b]);
  assert.deepEqual(filas.map((fila) => fila.tipo), ["pareja", "dos"]);
  assert.deepEqual(filas.flatMap(fila => fila.productos.map(p => p.referencia)), ["A","B","C"]);
});

test("las parejas no se separan aunque haya productos con dos fotos intercalados", () => {
  const datos = [
    {referencia: "A", foto_url: "https://ejemplo.co/a.jpg"},
    {referencia: "B", foto_url: "https://ejemplo.co/b.jpg", foto_url_2:"https://ejemplo.co/b2.jpg"},
    {referencia: "C", foto_url: "https://ejemplo.co/c.jpg"},
    {referencia: "D", foto_url: "https://ejemplo.co/d.jpg"},
    {referencia: "E", foto_url: "https://ejemplo.co/e.jpg"},
  ];
  const filas = organizarFilasProductosPdf(datos);
  assert.deepEqual(filas.map(f => f.tipo), ["pareja", "dos", "pareja"]);
  assert.deepEqual(filas.flatMap(f => f.productos.map(p=>p.referencia)).sort(),["A","B","C","D","E"]);
});

function respuestaPorPartes(partes) {
  const encoder = new TextEncoder();
  const cuerpo = new ReadableStream({
    start(controller) {
      for (const parte of partes) controller.enqueue(encoder.encode(parte));
      controller.close();
    },
  });
  return new Response(cuerpo, { status: 200 });
}

test("el cliente interpreta porcentaje y PDF binario con fragmentación de red", async () => {
  const porcentajes = [];
  const respuesta = respuestaPorPartes([
    '{"type":"progress","percent":12,"etapa":"Buscando',
    ' fotos"}\n{"type":"progress","percent":86,"etapa":"Procesando"}\n',
    '{"type":"pdf","length":12}\n%PDF-',
    'prueba!',
  ]);
  const blob = await recibirPdfConProgreso(respuesta, (e) => porcentajes.push(e.percent));
  assert.equal(blob.size, 12);
  assert.deepEqual(porcentajes, [12, 86, 100]);
});

test("una generación fallida muestra el error y no descarga un archivo", async () => {
  const respuesta = respuestaPorPartes(['{"type":"error","mensaje":"Sesión caducada"}\n']);
  await assert.rejects(() => recibirPdfConProgreso(respuesta), /Sesión caducada/);
});

test("un PDF truncado se rechaza sin fingir que llegó al 100%", async () => {
  const respuesta = respuestaPorPartes(['{"type":"pdf","length":200}\n%PDF-incompleto']);
  await assert.rejects(() => recibirPdfConProgreso(respuesta), /interrumpió/);
});
