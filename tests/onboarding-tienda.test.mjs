import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PALETAS_TIENDA,crearSlugVistaPrevia,colorDeTexto} from "../lib/paletasTienda.mjs";

test("paletas coherentes de inicio",()=>{
  assert.equal(PALETAS_TIENDA.length,6);
  assert.equal(new Set(PALETAS_TIENDA.map(p=>p.id)).size,6);
  for(const p of PALETAS_TIENDA){
    assert.ok(p.nombre.trim());
    assert.equal(p.muestras.length,3);
    for(const value of [p.principal,p.acento,p.fondo,...p.muestras]){
      assert.match(value,/^#[\da-f]{6}$/i);
    }
    assert.notEqual(p.principal.toLowerCase(),p.fondo.toLowerCase());
  }
});

test("vista previa usa la misma normalización del slug que la creación",()=>{
  assert.equal(crearSlugVistaPrevia("  Joyas Ñandú  Bogotá "), "joyas-nandu-bogota");
  assert.equal(crearSlugVistaPrevia("Accesorios  Tatiana"),"accesorios-tatiana");
  assert.equal(crearSlugVistaPrevia("PÉRLAS ✨ + Anillos"),"perlas-anillos");
  assert.equal(crearSlugVistaPrevia(""),"");
});

test("texto de contraste no queda ilegible con colores oscuros o claros",()=>{
  assert.equal(colorDeTexto("#25272E"),"#FFFFFF");
  assert.equal(colorDeTexto("#FFFFFF"),"#1C2532");
});

test("registro mantiene las APIs de creación y logo existentes",()=>{
  const source=readFileSync(new URL("../app/crear-tienda/OnboardingTienda.jsx",import.meta.url),"utf8");
  assert.match(source,/\/api\/auth\/sesion/);
  assert.match(source,/\/api\/tiendas\/crear/);
  assert.match(source,/\/api\/tiendas\/logo/);
  assert.match(source,/setCreada\(true\)[\s\S]*?subirLogo\(\)/);
  assert.match(source,/setMensaje\("Tu tienda sí quedó creada/);
  assert.match(source,/aria-pressed/);
});
