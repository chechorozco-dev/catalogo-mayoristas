import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { modoClave, limpiarTelefono, claveValida, cifrarClave, tablaSupabase } from "../../../lib/claveAcceso.mjs";
export const runtime = "nodejs";

function mismoSecreto(entrada, secreto) {
  if (typeof entrada !== "string" || !secreto || entrada.length > 256) return false;
  const a = crypto.createHash("sha256").update(entrada).digest();
  const b = crypto.createHash("sha256").update(secreto).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  if (!modoClave()) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const body = await request.json();
    const telefono = limpiarTelefono(body.telefono);
    const esperado = limpiarTelefono(process.env.ADMIN_BOOTSTRAP_PHONE);
    const token = process.env.ADMIN_BOOTSTRAP_TOKEN;
    // El código inicial se entrega solo al propietario. No se confirma ni el teléfono ni el estado.
    if (!telefono || !esperado || telefono !== esperado || !mismoSecreto(body.codigo, token)) {
      return NextResponse.json({ ok: false, mensaje: "No pudimos validar la activación del administrador." }, { status: 403 });
    }
    if (!claveValida(body.password)) {
      return NextResponse.json({ ok: false, mensaje: "La contraseña debe tener al menos 10 caracteres con letras y números." }, { status: 400 });
    }
    const usuarios = await tablaSupabase("clientes_autorizados", {
      select: "id,telefono,activo,rol", telefono: "eq." + telefono,
      activo: "eq.true", rol: "eq.MAESTRO", limit: "1"
    });
    if (usuarios?.length !== 1) {
      return NextResponse.json({ ok: false, mensaje: "No pudimos validar la activación del administrador." }, { status: 403 });
    }
    const cliente_id = usuarios[0].id;
    const anteriores = await tablaSupabase("credenciales_acceso", { select: "cliente_id", cliente_id: "eq." + cliente_id, limit: "1" });
    if (anteriores?.length) {
      return NextResponse.json({ ok: false, mensaje: "El administrador ya tiene acceso configurado. Solicita un restablecimiento seguro." }, { status: 409 });
    }
    await tablaSupabase("credenciales_acceso", {}, {
      method: "POST",
      body: JSON.stringify({ cliente_id, password_hash: cifrarClave(body.password),
        estado: "ACTIVO", requiere_cambio: false }),
      headers: { Prefer: "return=minimal" }
    });
    return NextResponse.json({ ok: true, mensaje: "Acceso de administrador activado. Ya puedes ingresar con tu número y contraseña." }, { status: 201 });
  } catch (e) {
    console.error("Error activando administrador:", e);
    return NextResponse.json({ ok: false, mensaje: "No se pudo activar el administrador. Comprueba la configuración y vuelve a intentar." }, { status: 500 });
  }
}
