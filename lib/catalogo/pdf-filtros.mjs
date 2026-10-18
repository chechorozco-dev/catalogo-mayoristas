import { limpiarTexto } from "./formatos.mjs";

// Filtros del PDF independientes de «Nuevos» y «Todos los productos».
// El material y la familia siempre deben especificarse antes de crear el archivo.
export const MATERIALES_PDF = Object.freeze([
  { id: "RODIO", nombre: "Rodio" },
  { id: "ACERO", nombre: "Acero" },
  { id: "AMBOS", nombre: "Rodio y acero" },
]);

export const TIPOS_PDF = Object.freeze([
  { id: "Aretes", nombre: "Aretes" },
  { id: "Candongas", nombre: "Candongas" },
  { id: "Juegos", nombre: "Juegos" },
  { id: "Collares y cadenas", nombre: "Collares y cadenas" },
  { id: "Pulseras", nombre: "Pulseras" },
  { id: "Anillos", nombre: "Anillos" },
  { id: "Topos y maxitopos", nombre: "Topos y maxitopos" },
  { id: "Tobilleras", nombre: "Tobilleras" },
  { id: "Camándulas y denarios", nombre: "Camándulas y denarios" },
  { id: "Dijes", nombre: "Dijes" },
  { id: "Earcuff", nombre: "Earcuff" },
]);

// Hasta 150 referencias por catálogo, como antes de introducir la división
// por partes. Se conservan la compresión de fotografías y los filtros.
export const MAX_PRODUCTOS_PDF = 150;

export function esSeleccionPdfValida(material, tipo) {
  return MATERIALES_PDF.some((item) => item.id === material) &&
    TIPOS_PDF.some((item) => item.id === tipo);
}

function incluyeAlguno(texto, palabras) {
  return palabras.some((palabra) => texto.includes(palabra));
}

export function productoCoincidePdf(producto, material, tipo) {
  if (!esSeleccionPdfValida(material, tipo)) return false;

  const nombre = limpiarTexto(producto?.nombre || "");
  const categoria = limpiarTexto(producto?.categoria || "");
  const referencia = limpiarTexto(producto?.referencia || "");
  const texto = `${nombre} ${categoria} ${referencia}`;
  const esRodio = texto.includes("rodio");
  const esAcero = texto.includes("acero");

  if (material === "RODIO" && !esRodio) return false;
  if (material === "ACERO" && !esAcero) return false;
  if (material === "AMBOS" && !esRodio && !esAcero) return false;

  // Se mantienen familias separadas para no mezclar, por ejemplo,
  // los topos o las candongas con aretes de otra clase.
  const esJuego = incluyeAlguno(texto, ["juego", "set de", "set "]);
  const esCandonga = texto.includes("candonga");
  const esTopo = incluyeAlguno(texto, ["topo", "maxitopo"]);
  const esEarcuff = incluyeAlguno(texto, ["earcuff", "ear cuff"]);
  const esCamandula = incluyeAlguno(texto, ["camandula", "denario"]);
  const esDije = texto.includes("dije");

  switch (tipo) {
    case "Juegos":
      return esJuego;
    case "Candongas":
      return esCandonga && !esJuego;
    case "Topos y maxitopos":
      return esTopo && !esJuego && !esCandonga;
    case "Aretes":
      return texto.includes("arete") && !esJuego && !esCandonga && !esTopo;
    case "Collares y cadenas":
      return incluyeAlguno(texto, ["collar", "cadena"]) && !esJuego && !esDije;
    case "Pulseras":
      return incluyeAlguno(texto, ["pulsera", "brazalete"]) && !esJuego;
    case "Anillos":
      return texto.includes("anillo") && !esJuego;
    case "Tobilleras":
      return texto.includes("tobillera") && !esJuego;
    case "Camándulas y denarios":
      return esCamandula && !esJuego;
    case "Dijes":
      return esDije && !esJuego;
    case "Earcuff":
      return esEarcuff && !esJuego;
    default:
      return false;
  }
}
