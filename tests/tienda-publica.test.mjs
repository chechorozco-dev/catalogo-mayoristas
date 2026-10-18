import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const codigo = readFileSync(
  new URL("../app/[slug]/TiendaCliente.js", import.meta.url), "utf8"
);

test("el carrito debe inicializarse antes de los efectos del perfil del cliente", () => {
  const inicioCarrito = codigo.indexOf("const [carritoAbierto, setCarritoAbierto]");
  const primerEfectoPerfil = codigo.indexOf(
    "// El perfil solo se consulta cuando se abre el checkout"
  );
  assert.ok(inicioCarrito >= 0, "falta la declaración de carritoAbierto");
  assert.ok(primerEfectoPerfil >= 0, "falta el efecto del perfil");
  assert.ok(
    inicioCarrito < primerEfectoPerfil,
    "carritoAbierto se utiliza en dependencias de useEffect antes de declararse: ReferenceError durante la carga pública"
  );
});

test("los estados del carrito no se inicializan dos veces", () => {
  for (const estado of ["carrito", "carritoAbierto", "carritoCargado"]) {
    const match = codigo.match(new RegExp("const \\[" + estado + ",\\s*set", "g")) || [];
    assert.equal(match.length, 1, "estado duplicado: " + estado);
  }
});

test("ambos efectos de datos guardados permanecen después de los estados del carrito", () => {
  const declaracion = codigo.indexOf("const [carritoAbierto, setCarritoAbierto]");
  const usosEnDependencias = [...codigo.matchAll(
    /},\s*\[formularioCompraAbierto,\s*carritoAbierto,/g
  )].map((match) => match.index);
  assert.equal(usosEnDependencias.length, 2);
  assert.ok(usosEnDependencias.every((index) => index > declaracion));
});
