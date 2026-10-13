import crypto from "node:crypto";
import { negocioFetch } from "./negocioFetch.mjs";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function modoClave() {
  return process.env.AUTH_MODE === "password";
}

export function limpiarTelefono(valor) {
  let telefono = String(valor ?? "").replace(/\D/g, "");
  if (/^3\d{9}$/.test(telefono)) telefono = "57" + telefono;
  return /^57(3\d{9})$/.test(telefono) ? telefono : null;
}

export function claveValida(valor) {
  return typeof valor === "string" &&
    valor.length >= 10 && valor.length <= 128 &&
    /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(valor) && /\d/.test(valor);
}

export function cifrarClave(valor) {
  if (!claveValida(valor)) throw new Error("La contraseña debe tener entre 10 y 128 caracteres, letras y números.");
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(valor, salt, 64, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024
  });
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("hex"), hash.toString("hex")].join("$");
}

export function comprobarClave(valor, guardada) {
  if (typeof valor !== "string" || typeof guardada !== "string") return false;
  const partes = guardada.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt" ||
    Number(partes[1]) !== SCRYPT_N || Number(partes[2]) !== SCRYPT_R ||
    Number(partes[3]) !== SCRYPT_P || !/^[a-f0-9]{32}$/.test(partes[4]) ||
    !/^[a-f0-9]{128}$/.test(partes[5])) return false;
  const esperado = Buffer.from(partes[5], "hex");
  const calculado = crypto.scryptSync(valor, Buffer.from(partes[4], "hex"), 64, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024
  });
  return crypto.timingSafeEqual(calculado, esperado);
}

export function crearSesion(cliente, secreto, duracion = 8 * 3600, requiereCambio = false) {
  if (!secreto || secreto.length < 32) throw new Error("AUTH_SESSION_SECRET inseguro o ausente.");
  const ahora = Math.floor(Date.now() / 1000);
  const datos = {
    cliente_id: cliente.id, telefono: cliente.telefono,
    nombre: cliente.nombre || "", tienda_id: cliente.tienda_id || null,
    rol: cliente.rol === "MAESTRO" ? "MAESTRO" : "CLIENTE",
    negocio_id: cliente.negocio_id, requiere_cambio: requiereCambio, iat: ahora, exp: ahora + duracion
  };
  const payload = Buffer.from(JSON.stringify(datos)).toString("base64url");
  const firma = crypto.createHmac("sha256", secreto).update(payload).digest("base64url");
  return { token: payload + "." + firma, duracion };
}

export function verificarSesion(token, secreto) {
  if (!token || !secreto) return null;
  const [payload, firma, extra] = token.split(".");
  if (!payload || !firma || extra !== undefined) return null;
  const correcta = crypto.createHmac("sha256", secreto).update(payload).digest("base64url");
  if (firma.length !== correcta.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(correcta))) return null;
  try {
    const sesion = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return sesion.exp > Math.floor(Date.now() / 1000) && sesion.negocio_id === process.env.NEGOCIO_ID ? sesion : null;
  } catch { return null; }
}

// Solo servidor: nunca hacer consultas con la clave secreta desde el navegador.
export async function tablaSupabase(tabla, query = {}, opciones = {}) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!base || !clave) throw new Error("Falta conexión segura a Supabase.");
  const url = new URL(base.replace(/\/$/, "") + "/rest/v1/" + tabla);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await negocioFetch(url.toString(), {
    cache: "no-store",
    ...opciones,
    headers: {
      apikey: clave,
      "Content-Type": "application/json",
      ...(opciones.headers || {})
    }
  });
  if (!response.ok) throw new Error("Error Supabase en " + tabla + ": " + response.status);
  if (response.status === 204) return null;
  const texto = await response.text();
  return texto ? JSON.parse(texto) : null;
}
