// Traduce el body de AppSheet al esquema de productos de Supabase.
// No lee negocios ni claves desde el body: la pertenencia se impone en el servidor.
function obtener(body, ...nombres) {
  for (const nombre of nombres) {
    if (Object.prototype.hasOwnProperty.call(body, nombre)) return body[nombre];
  }
  return undefined;
}

function texto(valor, campo, maximo, requerido = false) {
  if (valor === undefined || valor === null || valor === "") {
    if (requerido) throw new Error("Falta " + campo + ".");
    return null;
  }
  if (typeof valor !== "string" && typeof valor !== "number") throw new Error("Valor inválido en " + campo + ".");
  const limpio = String(valor).trim();
  if (requerido && !limpio) throw new Error("Falta " + campo + ".");
  if (limpio.length > maximo) throw new Error(campo + " es demasiado largo.");
  return limpio || null;
}

export function precioAppSheet(valor, nombre) {
  if (valor === undefined || valor === null || String(valor).trim() === "") {
    throw new Error("Falta " + nombre + ".");
  }
  if (typeof valor !== "number" && typeof valor !== "string") throw new Error("Formato incorrecto para " + nombre + ".");
  let s = String(valor).trim().replace(/[\s$]/g, "");
  if (!/^[0-9.,]+$/.test(s)) throw new Error("Precio inválido en " + nombre + ".");
  if (s.includes(".") && s.includes(",")) {
    // El último separador es el decimal: 12.345,67 ó 12,345.67.
    const decimal = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const millar = decimal === "." ? "," : ".";
    s = s.replaceAll(millar, "").replace(decimal, ".");
  } else if (/^\d{1,3}(?:[.,]\d{3})+$/.test(s)) {
    s = s.replace(/[.,]/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) throw new Error("Precio fuera de rango en " + nombre + ".");
  return n;
}

function booleano(valor) {
  if (typeof valor === "boolean") return valor;
  if (valor === null || valor === undefined || String(valor).trim() === "") return false;
  const texto = String(valor).trim().toLowerCase();
  if (["true", "si", "sí", "yes", "1"].includes(texto)) return true;
  if (["false", "no", "0"].includes(texto)) return false;
  throw new Error("Valor inválido de solo_ra.");
}

function foto(valor, campo) {
  const s = texto(valor, campo, 3000);
  if (!s) return null;
  try {
    const url = new URL(s);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error(campo + " debe ser una URL http o https.");
  }
  return s;
}

export function mapearProductoAppSheet(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("El body debe ser un objeto JSON.");
  }
  const referencia = texto(obtener(body, "codigo", "CODIGO", "referencia"), "codigo", 100, true);
  const nombre = texto(obtener(body, "producto", "PRODUCTO", "nombre"), "producto", 400, true);
  const costo = precioAppSheet(obtener(body, "precio", "PRECIO", "costo"), "precio");
  const precioDetal = precioAppSheet(
    obtener(body, "precio SUGERIDO", "PRECIO SUGERIDO", "precio_sugerido", "precio_detal"),
    "precio SUGERIDO"
  );
  const producto = {
    referencia,
    nombre,
    costo,
    precio_detal: precioDetal,
    origen: "APPSHEET_VILLAVO"
  };
  for (const [key, from, max] of [
    ["infoimagen", ["INFOIMAGEN", "infoimagen"], 20000],
    ["categoria", ["categoria", "CATEGORIA"], 120],
    ["descripcion", ["descripcion", "DESCRIPCION"], 5000]
  ]) {
    const v = obtener(body, ...from);
    if (v !== undefined) producto[key] = texto(v, key, max);
  }
  const uno = obtener(body, "url_1", "URL_1", "foto_url");
  const dos = obtener(body, "url_2", "URL_2", "foto_url_2");
  if (uno !== undefined) producto.foto_url = foto(uno, "url_1");
  if (dos !== undefined) producto.foto_url_2 = foto(dos, "url_2");

  const soloRa = obtener(body, "solo_ra", "SOLO_RA");
  if (soloRa !== undefined) producto.solo_ra = booleano(soloRa);

  const cantidad = obtener(body, "cant", "CANT");
  if (cantidad !== undefined) {
    if (cantidad === null || String(cantidad).trim() === "") producto.cant = null;
    else {
      const n = precioAppSheet(cantidad, "cant");
      if (!Number.isInteger(n)) throw new Error("cant debe ser un número entero.");
      producto.cant = n;
    }
  }
  return producto;
}

/** Sólo una referencia explícita puede borrar un producto. */
export function referenciaParaEliminar(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("El body debe ser un objeto JSON.");
  }
  return texto(obtener(body, "codigo", "CODIGO", "referencia", "REFERENCIA"), "codigo", 100, true);
}
