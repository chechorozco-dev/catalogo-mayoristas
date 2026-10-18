import test from "node:test";
import assert from "node:assert/strict";
import { urlFotoParaVista } from "../lib/catalogo/fotos-web.mjs";

test("una foto pequeña de Google Drive solicita miniatura ligera", () => {
  const foto = "https://drive.google.com/thumbnail?id=AbCd123&sz=w1200";
  assert.match(urlFotoParaVista(foto, 96), /sz=w192/);
  assert.match(urlFotoParaVista(foto, 160), /sz=w384/);
  assert.match(urlFotoParaVista(foto, 640), /sz=w640/);
  assert.match(urlFotoParaVista(foto, 1400), /sz=w1200/);
});

test("fotografía de Supabase permanece intacta para el optimizador Next", () => {
  const foto = "https://ejemplo.supabase.co/storage/v1/object/public/productos/foto.jpg";
  assert.equal(urlFotoParaVista(foto, 96), foto);
  assert.equal(urlFotoParaVista(foto, 640), foto);
});

test("identificadores vacíos, esquemas no seguros y cadenas corruptas no se descargan", () => {
  assert.equal(urlFotoParaVista("https://drive.google.com/thumbnail?id=&sz=w1200"), "");
  assert.equal(urlFotoParaVista("javascript:alert(1)"), "");
  assert.equal(urlFotoParaVista("esto no es una URL"), "");
});

test("dos miniaturas del mismo tamaño comparten URL estable y con el mismo ID", () => {
  const original = "https://drive.google.com/thumbnail?id=AB_C-12&sz=w1200";
  const primero = urlFotoParaVista(original, 640);
  assert.equal(primero, urlFotoParaVista(original, 640));
  assert.equal(new URL(primero).searchParams.get("id"), "AB_C-12");
});
