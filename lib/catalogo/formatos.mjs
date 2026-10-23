// Utilidades de texto, moneda colombiana y colores del catálogo.
// Contratos originales preservados al extraer desde TiendaCliente.

export function limpiarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function formatoPrecio(valor, moneda = "COP") {
  const numero = Number(valor || 0);

  if (moneda === "USD") {
    return "US$ " + new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numero);
}

export function limpiarWhatsapp(numero = "") {
  return String(numero).replace(/\D/g, "");
}
export function normalizarTelefonoColombia(numero = "") {
  let limpio = String(numero).replace(/\D/g, "");

  // Si viene como 0057...
  if (limpio.startsWith("0057")) {
    limpio = limpio.substring(2);
  }

  // Si ingresaron solamente los 10 dígitos colombianos
  if (limpio.length === 10 && limpio.startsWith("3")) {
    return `57${limpio}`;
  }

  // Si ya viene correctamente con 57
  if (
    limpio.length === 12 &&
    limpio.startsWith("573")
  ) {
    return limpio;
  }

  return limpio;
}
export function obtenerColorTexto(hex = "#FFFFFF") {
  let color = String(hex || "#FFFFFF")
    .trim()
    .replace("#", "");

  // Soportar colores cortos, por ejemplo #FFF
  if (color.length === 3) {
    color = color
      .split("")
      .map((letra) => letra + letra)
      .join("");
  }

  // Si el color recibido no es válido,
  // usamos texto negro para evitar texto invisible.
  if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
    return "#111111";
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const luminosidad =
    (r * 299 + g * 587 + b * 114) / 1000;

  // Fondo claro = letras oscuras
  // Fondo oscuro = letras blancas
  return luminosidad >= 150
    ? "#111111"
    : "#FFFFFF";
}
