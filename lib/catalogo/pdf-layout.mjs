// Diseño de fichas A4: dos fotos del mismo producto o dos productos
// de una foto, cada uno con su propio nombre y precio.

export function normalizarUrlFoto(valor) {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (!texto || ["null", "undefined", "none"].includes(texto.toLowerCase())) return null;
  try {
    const url = new URL(texto);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (!url.hostname) return null;

    // AppSheet puede construir https://drive.google.com/thumbnail?id=&sz=w1200
    // aunque no haya fotografía. Es una URL, pero NO una imagen.
    const host = url.hostname.toLowerCase();
    if (host === "drive.google.com" || host === "www.drive.google.com") {
      if (url.pathname === "/thumbnail" || url.pathname === "/uc") {
        if (!url.searchParams.get("id")?.trim()) return null;
      }
      if (url.pathname.startsWith("/file/d/")) {
        const identificador = url.pathname.slice("/file/d/".length).split("/")[0];
        if (!identificador || identificador === "view") return null;
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function fotosProducto(producto) {
  const unicas = new Set();
  for (const valor of [producto?.foto_url, producto?.foto_url_2]) {
    const url = normalizarUrlFoto(valor);
    if (url) unicas.add(url);
  }
  return [...unicas];
}

export function posicionesFotosProducto(producto, anchoPagina = 595.28) {
  const fotos = fotosProducto(producto);
  const margen = 24;
  const separacion = 10;
  const anchoFoto = (anchoPagina - margen * 2 - separacion) / 2;
  return fotos.map((url, indice) => ({
    url,
    x: fotos.length === 1
      ? (anchoPagina - anchoFoto) / 2
      : margen + indice * (anchoFoto + separacion),
    ancho: anchoFoto,
  }));
}

/**
 * Cada fila contiene:
 * - dos: un producto con dos fotos, ocupando ambas columnas;
 * - pareja: dos productos de una foto, uno por columna;
 * - solo: único producto de una foto sin pareja, centrado.
 *
 * Para los PDFs se usan imagenes_pdf verificadas tras descargarlas,
 * evitando espacios en blanco por enlaces aparentemente válidos pero rotos.
 * Las parejas se buscan en toda la selección, sin cortar por páginas.
 */
export function organizarFilasProductosPdf(productos) {
  const items = Array.isArray(productos) ? productos : [];
  const cantidad = (producto) => Array.isArray(producto.imagenes_pdf)
    ? producto.imagenes_pdf.length
    : fotosProducto(producto).length;

  const indicesUna = [];
  for (let i = 0; i < items.length; i++) {
    if (cantidad(items[i]) === 1) indicesUna.push(i);
  }

  const parejaDe = new Map();
  const indicesParejaDerecha = new Set();
  for (let i = 0; i + 1 < indicesUna.length; i += 2) {
    parejaDe.set(indicesUna[i], indicesUna[i + 1]);
    indicesParejaDerecha.add(indicesUna[i + 1]);
  }

  const filas = [];
  for (let i = 0; i < items.length; i++) {
    const fotos = cantidad(items[i]);
    if (fotos === 0 || indicesParejaDerecha.has(i)) continue;
    if (fotos >= 2) {
      filas.push({ tipo: "dos", productos: [items[i]] });
    } else if (parejaDe.has(i)) {
      filas.push({ tipo: "pareja", productos: [items[i], items[parejaDe.get(i)]] });
    } else {
      filas.push({ tipo: "solo", productos: [items[i]] });
    }
  }
  return filas;
}
