// La URL pública es estable aunque el administrador se abra desde un
// despliegue de prueba. Debe coincidir con el enlace canónico del catálogo.
export function enlaceTiendaPublica(tienda) {
  const slug = String(tienda?.slug || "").trim();
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return "";
  if (slug.toLowerCase() === "mayoristas-ra") {
    return "https://www.mayoristasra.com/mayoristas-ra";
  }
  return "https://mi-catalogo-accesorios.vercel.app/" + encodeURIComponent(slug);
}

export function mensajeParaCompartirTienda(nombre, enlace) {
  if (!enlace) return "";
  const titulo = String(nombre || "Mi tienda").trim() || "Mi tienda";
  return "✨ ¡Te invito a conocer " + titulo + "!\n\n" +
    "Mira nuestro catálogo completo, descubre los productos disponibles y haz tu pedido fácilmente. 🛍️\n\n" +
    "👉 " + enlace;
}

export function enlaceChatWhatsapp(mensaje) {
  if (!mensaje) return "";
  return "https://api.whatsapp.com/send?text=" + encodeURIComponent(mensaje);
}
