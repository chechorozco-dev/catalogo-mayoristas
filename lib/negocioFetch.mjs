// Cada proyecto Vercel corresponde a un negocio, no al negocio indicado por el navegador.
// La clave secreta de Supabase omite RLS; por eso TODOS los accesos REST del servidor
// deben pasar por esta barrera. No poner este módulo en componentes de cliente.
const TABLAS_PRIVADAS = new Set([
  "productos", "tiendas", "tienda_productos", "clientes_autorizados",
  "codigos_acceso", "variantes_producto", "producto_variantes",
  "precios_tienda", "pedidos", "anuncios_tienda", "carritos_web",
]);
const UUID = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

export function getNegocioId() {
  const id = process.env.NEGOCIO_ID?.trim();
  if (!id || !UUID.test(id)) {
    throw new Error("NEGOCIO_ID no configurado: la consulta se bloqueó por seguridad.");
  }
  return id.toLowerCase();
}

function agregarNegocio(cuerpo, id) {
  const actualizar = (registro) => {
    if (!registro || typeof registro !== "object" || Array.isArray(registro)) {
      throw new Error("Formato inválido para insertar en una tabla privada.");
    }
    if (registro.negocio_id && String(registro.negocio_id).toLowerCase() !== id) {
      throw new Error("Intento de escribir datos de otro negocio.");
    }
    return { ...registro, negocio_id: id };
  };
  return Array.isArray(cuerpo) ? cuerpo.map(actualizar) : actualizar(cuerpo);
}

export async function negocioFetch(input, init = {}) {
  const urlTexto = typeof input === "string" ? input : input instanceof URL ? String(input) : input?.url;
  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!apiUrl || !urlTexto) return globalThis.fetch(input, init);

  const url = new URL(urlTexto);
  const supabase = new URL(apiUrl);
  const prefijo = supabase.pathname.replace(/\/$/, "") + "/rest/v1/";
  if (url.origin !== supabase.origin || !url.pathname.startsWith(prefijo)) {
    return globalThis.fetch(input, init);
  }
  const tabla = decodeURIComponent(url.pathname.slice(prefijo.length).split("/")[0]);
  if (!TABLAS_PRIVADAS.has(tabla)) return globalThis.fetch(input, init);

  const id = getNegocioId();
  const metodo = (init.method || input?.method || "GET").toUpperCase();
  const anterior = url.searchParams.getAll("negocio_id");
  if (anterior.length && (anterior.length !== 1 || anterior[0] !== `eq.${id}`)) {
    throw new Error("Filtro negocio_id inconsistente con el negocio del servidor.");
  }
  const opciones = { ...init };
  if (metodo === "POST") {
    if (anterior.length) url.searchParams.delete("negocio_id");
    if (typeof opciones.body !== "string") {
      throw new Error("No se permite insertar sin cuerpo JSON verificable.");
    }
    let objeto;
    try { objeto = JSON.parse(opciones.body); }
    catch { throw new Error("No se permite insertar JSON inválido."); }
    opciones.body = JSON.stringify(agregarNegocio(objeto, id));
  } else {
    url.searchParams.set("negocio_id", `eq.${id}`);
    if (["PATCH", "PUT"].includes(metodo) && typeof opciones.body === "string") {
      let obj;
      try { obj = JSON.parse(opciones.body); }
      catch { throw new Error("No se permite modificar con JSON inválido."); }
      if (obj && (Array.isArray(obj) || typeof obj === "object") && Object.hasOwn(obj, "negocio_id")
          && String(obj.negocio_id).toLowerCase() !== id) {
        throw new Error("Intento de modificar el negocio dueño de la fila.");
      }
    }
  }
  return globalThis.fetch(url.toString(), opciones);
}
