import test from "node:test";
import assert from "node:assert/strict";
import { enlaceTiendaPublica, mensajeParaCompartirTienda, enlaceChatWhatsapp } from "../lib/catalogo/compartir.mjs";

test("el enlace de los clientes usa siempre el dominio publicado (nunca una preview)", () => {
  assert.equal(
    enlaceTiendaPublica({ slug: "mi-joyeria" }),
    "https://mi-catalogo-accesorios.vercel.app/mi-joyeria"
  );
  assert.equal(
    enlaceTiendaPublica({ slug: "mayoristas-ra" }),
    "https://www.mayoristasra.com/mayoristas-ra"
  );
  assert.equal(enlaceTiendaPublica({ slug: "https://ejemplo.com" }), "");
  assert.equal(enlaceTiendaPublica({}), "");
});

test("el mismo enlace aparece en el mensaje sugerido para estados y chats", () => {
  const url = enlaceTiendaPublica({ slug: "tienda-linda" });
  const mensaje = mensajeParaCompartirTienda("Tienda Linda", url);
  assert.ok(mensaje.includes("Tienda Linda"));
  assert.ok(mensaje.includes(url));
  const destino = new URL(enlaceChatWhatsapp(mensaje));
  assert.equal(destino.hostname, "api.whatsapp.com");
  assert.equal(destino.searchParams.get("text"), mensaje);
});

test("no se construyen enlaces a chats cuando la tienda aún no tiene slug", () => {
  assert.equal(mensajeParaCompartirTienda("Tienda", ""), "");
  assert.equal(enlaceChatWhatsapp(""), "");
});
