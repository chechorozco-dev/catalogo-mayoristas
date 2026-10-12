import { limpiarTexto } from "./formatos.mjs";

// Clasificación utilizada por filtros y recomendaciones de las tiendas.
export function productoPerteneceCategoria(producto, categoria) {
  if (categoria === "Todos") return true;

  const nombre = limpiarTexto(producto.nombre);
  const referencia = limpiarTexto(producto.referencia);
  const categoriaProducto = limpiarTexto(producto.categoria);

  const texto = `${nombre} ${referencia} ${categoriaProducto}`;

  if (categoria === "Aretes") {
    return (
      texto.includes("arete") ||
      texto.includes("candonga") ||
      texto.includes("topo") ||
      texto.includes("maxitopo")
    );
  }

  if (categoria === "Juegos") {
    return texto.includes("juego") || texto.includes("set");
  }

  if (categoria === "Anillos") {
    return texto.includes("anillo");
  }

  if (categoria === "Pulseras") {
    return texto.includes("pulsera") || texto.includes("brazalete");
  }
if (categoria === "Tobilleras") {
  return (
    texto.includes("tobillera") ||
    texto.includes("tobilleras")
  );
}
  if (categoria === "Earcuff") {
    return texto.includes("earcuff") || texto.includes("ear cuff");
  }
 if (categoria === "Camándulas y denarios") {
  return (
    texto.includes("camandula") ||
    texto.includes("camandulas") ||
    texto.includes("denario") ||
    texto.includes("denarios")
  );
}

  if (categoria === "Collares y cadenas") {
  const esCollarOCadena =
    texto.includes("collar") ||
    texto.includes("cadena");

  const contieneDije =
    texto.includes("dije");

  return (
    esCollarOCadena &&
    !contieneDije
  );
}

if (categoria === "Dijes") {
  return texto.includes("dije");
}

  if (categoria === "Accesorios en Rodio") {
    return texto.includes("rodio");
  }

  if (categoria === "Accesorios en Acero") {
    return texto.includes("acero");
  }

  return true;
}

export function obtenerTipoProducto(producto) {
  const texto = limpiarTexto(
    `${producto?.nombre || ""} ${producto?.categoria || ""}`
  );

  if (
    texto.includes("arete") ||
    texto.includes("candonga") ||
    texto.includes("topo") ||
    texto.includes("maxitopo")
  ) {
    return "aretes";
  }

  if (texto.includes("juego") || texto.includes("set")) {
    return "juegos";
  }

  if (texto.includes("anillo")) {
    return "anillos";
  }

  if (texto.includes("pulsera") || texto.includes("brazalete")) {
    return "pulseras";
  }

  if (
  texto.includes("earcuff") ||
  texto.includes("ear cuff")
) {
  return "earcuff";
}

if (texto.includes("dije")) {
  return "dijes";
}

if (
  texto.includes("collar") ||
  texto.includes("cadena")
) {
  return "collares";
}

  return limpiarTexto(producto?.categoria || "");
}
