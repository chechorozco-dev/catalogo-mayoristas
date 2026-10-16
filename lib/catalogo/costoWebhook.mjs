// Helpers for the AppSheet → RA catalogue webhook.
// public.productos.costo is the WHOLESALE SALE price, not the supplier cost.
// In the existing AppSheet body, "precio" = wholesale sale and "COSTO"
// = private purchase cost; keeping those apart prevents accidental price cuts.
// Only an explicit wholesale-price field may update the public sale price.
// Bare uppercase "COSTO" is ambiguous and must NEVER become the retail price.

const has = (body, key) =>
  body != null && Object.prototype.hasOwnProperty.call(body, key);

const blank = (value) =>
  value === undefined || value === null ||
  (typeof value === "string" && value.trim() === "");

function firstNonBlank(body, keys) {
  for (const key of keys) {
    if (has(body, key) && !blank(body[key])) return body[key];
  }
  return undefined;
}

const WHOLESALE_KEYS = [
  "precio", "PRECIO", "precio_mayorista", "PRECIO_MAYORISTA",
  "precio_shopify", "PRECIO_SHOPIFY",
];
const PURCHASE_KEYS = [
  "costo_compra", "COSTO_COMPRA", "COSTO COMPRA",
  "costo_real", "COSTO_REAL", "COSTO REAL",
];

// AppSheet uses "producto" as the product name. If another integration sends
// both "nombre" and "producto", prioritize the explicit AppSheet field and
// ignore blank aliases instead of retaining a stale name.
export function obtenerNombreProductoWebhook(body) {
  return firstNonBlank(body, ["producto", "PRODUCTO", "nombre", "NOMBRE"]);
}

export function obtenerPrecioMayoristaWebhook(body) {
  // No "costo"/"COSTO" fallback: purchase cost can NEVER become a public price.
  return firstNonBlank(body, WHOLESALE_KEYS);
}

export function obtenerCostoCompraWebhook(body) {
  const explicit = firstNonBlank(body, PURCHASE_KEYS);
  if (explicit !== undefined) return explicit;
  // AppSheet 2026: "COSTO": <<[COSTO]>> is private only
  // when a distinct wholesale field is also present.
  if (firstNonBlank(body, WHOLESALE_KEYS) !== undefined) {
    return firstNonBlank(body, ["COSTO"]);
  }
  return undefined;
}

export function parsearCostoCompraOpcional(value) {
  if (blank(value)) return undefined;

  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error("COSTO es opcional, pero cuando se envía debe ser numérico.");
  }

  let n;
  if (typeof value === "number") {
    n = value;
  } else {
    const text = value.trim().replace(/\s+/g, "").replace(/^\$/, "");
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) {
      // Colombian format: $1.250,50
      n = Number(text.replace(/\./g, "").replace(",", "."));
    } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(text)) {
      // Other locale: 1,250.50
      n = Number(text.replace(/,/g, ""));
    } else if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) {
      n = Number(text.replace(",", "."));
    } else {
      throw new Error("COSTO es opcional, pero cuando se envía debe ser numérico.");
    }
  }

  if (!Number.isFinite(n) || n < 0 || n > 99_999_999_999 ||
    Math.round(n * 100) / 100 !== n) {
    throw new Error("El valor de COSTO debe ser positivo y válido.");
  }

  return n;
}
