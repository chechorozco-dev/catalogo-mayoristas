import test from "node:test";
import assert from "node:assert/strict";
import { fotosProducto, posicionesFotosProducto } from "../lib/catalogo/pdf-layout.mjs";
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
