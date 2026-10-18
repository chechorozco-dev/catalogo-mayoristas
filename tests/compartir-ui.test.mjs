import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { enlaceTiendaPublica, mensajeParaCompartirTienda } from "../lib/catalogo/compartir.mjs";

const compartir = readFileSync(
  new URL("../app/admin/components/CompartirCatalogo.jsx", import.meta.url),
  "utf8"
);
const tienda = readFileSync(
  new URL("../app/[slug]/TiendaCliente.js", import.meta.url),
  "utf8"
);

test("la sección Compartir mantiene ejemplos de Estado y Chat", () => {
  assert.match(compartir, /setEjemplo\("estado"\)/);
  assert.match(compartir, /setEjemplo\("chat"\)/);
  assert.match(compartir, /Ejemplo de estado/);
  assert.match(compartir, /Cliente \(ejemplo\)/);
  assert.match(compartir, /MosaicoTienda fotos=\{fotos\}/);
});

test("compartir tiene botones útiles, con la misma URL pública", () => {
  assert.match(compartir, /Copiar enlace/);
  assert.match(compartir, /Copiar mensaje/);
  assert.match(compartir, /Enviar por WhatsApp \(chat\)/);
  assert.match(compartir, /Ver mi tienda publicada/);
  assert.match(compartir, /no publica estados automáticamente/);
  assert.match(compartir, /enlaceTiendaPublica\(tienda\)/);
  assert.equal(
    enlaceTiendaPublica({ slug: "joyeria-cliente" }),
    "https://mi-catalogo-accesorios.vercel.app/joyeria-cliente"
  );
  assert.ok(mensajeParaCompartirTienda("Joyería", enlaceTiendaPublica({slug:"joyeria-cliente"}))
    .includes("https://mi-catalogo-accesorios.vercel.app/joyeria-cliente"));
});

test("el render no construye URLs inseguras y las fotos se piden como miniaturas", () => {
  assert.match(compartir, /try \{ return enlace \? new URL\(enlace\)\.host/);
  assert.match(compartir, /urlFotoParaVista\(producto\.foto, 320\)/);
});

test("restaurar Compartir no elimina la corrección que permite cargar tiendas públicas", () => {
  const inicioCarrito = tienda.indexOf("const [carritoAbierto, setCarritoAbierto]");
  const efectoPerfil = tienda.indexOf("// El perfil solo se consulta cuando se abre el checkout");
  assert.ok(inicioCarrito > -1 && inicioCarrito < efectoPerfil);
});
