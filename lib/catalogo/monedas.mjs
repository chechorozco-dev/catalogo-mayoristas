// Los importes se guardan en la moneda elegida por cada tienda.
// No existe conversión automática COP <-> USD.
export function normalizarMoneda(moneda) {
  return String(moneda || "").toUpperCase() === "USD" ? "USD" : "COP";
}

export function redondearPrecio(valor, moneda = "COP") {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return NaN;
  return normalizarMoneda(moneda) === "USD"
    ? Math.round((numero + Number.EPSILON) * 100) / 100
    : Math.round(numero);
}

// Un punto en COP separa miles; en USD separa centavos.
// No se admiten separadores de miles en USD para evitar ambigüedades.
export function leerPrecioEditable(valor, moneda = "COP") {
  const entrada = String(valor ?? "").trim().replace(/\s/g, "");
  if (!entrada) return NaN;
  if (normalizarMoneda(moneda) === "USD") {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(entrada)) return NaN;
    return redondearPrecio(Number(entrada.replace(",", ".")), "USD");
  }
  if (!/^\d+(?:[.,]\d{3})*$/.test(entrada)) return NaN;
  return redondearPrecio(Number(entrada.replace(/[.,]/g, "")), "COP");
}

// Para una tienda USD no se puede tomar un precio base COP y etiquetarlo USD.
// Sin precio personalizado válido el producto está pendiente de configuración.
export function precioVentaTienda({
  precioBase,
  personalizado = null,
  moneda = "COP",
  esRa = false,
}) {
  if (esRa) return Number(precioBase || 0);
  if (personalizado !== null && personalizado !== undefined) {
    const numero = Number(personalizado);
    if (Number.isFinite(numero) && numero >= 0) return numero;
  }
  return normalizarMoneda(moneda) === "USD" ? null : Number(precioBase || 0);
}
