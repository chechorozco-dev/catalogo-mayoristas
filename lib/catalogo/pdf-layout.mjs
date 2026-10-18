// Geometría compartida de fotografías para catálogos A4 (puntos PDF).
// Se usa el mismo tamaño de columna con una o dos fotografías.
export function fotosProducto(producto) {
  return [producto?.foto_url, producto?.foto_url_2].filter((valor) => {
    if (typeof valor !== "string") return false;
    return /^https?:\/\//i.test(valor.trim());
  }).map((valor) => valor.trim());
}

export function posicionesFotosProducto(producto, anchoPagina = 595.28) {
  const fotos = fotosProducto(producto);
  const margen = 24;
  const separacion = 10;
  const anchoFoto = (anchoPagina - margen * 2 - separacion) / 2;
  return fotos.map((url, indice) => ({
    url,
    // Una foto ocupa una columna centrada, nunca la columna izquierda.
    x: fotos.length === 1
      ? (anchoPagina - anchoFoto) / 2
      : margen + indice * (anchoFoto + separacion),
    ancho: anchoFoto,
  }));
}
