import { NextResponse } from "next/server";
import { modoClave, limpiarTelefono, claveValida, comprobarClave, cifrarClave, crearSesion, tablaSupabase } from "../../../../../lib/claveAcceso.mjs";
export const runtime = "nodejs";
export async function POST(request) {
  if (!modoClave()) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const body = await request.json();
    const telefono = limpiarTelefono(body.telefono);
    if (!telefono || !claveValida(body.nueva) || typeof body.actual !== "string" || body.actual === body.nueva) {
      return NextResponse.json({ ok: false, mensaje: "Elige una contraseña nueva de mínimo 6 caracteres. Puedes usar letras, números o símbolos." }, { status: 400 });
    }
    const clientes = await tablaSupabase("clientes_autorizados", {
      select: "id,nombre,telefono,tienda_id,rol,negocio_id", telefono: "eq." + telefono, activo: "eq.true", limit: "1"
    });
    const cliente = clientes?.[0];
    if (!cliente) return NextResponse.json({ ok: false, mensaje: "No pudimos verificar tus datos." }, { status: 401 });
    const registros = await tablaSupabase("credenciales_acceso", {
      select: "password_hash,estado,requiere_cambio,bloqueado_hasta,intentos_fallidos", cliente_id: "eq." + cliente.id, limit: "1"
    });
    const cred = registros?.[0];
    if (!cred || cred.estado !== "ACTIVO") {
      return NextResponse.json({ ok: false, mensaje: "No pudimos verificar tus datos." }, { status: 401 });
    }
    if (cred.bloqueado_hasta && Date.parse(cred.bloqueado_hasta) > Date.now()) {
      return NextResponse.json({ ok: false, mensaje: "Demasiados intentos. Vuelve a intentar en 15 minutos." }, { status: 429 });
    }
    if (!comprobarClave(body.actual, cred.password_hash)) {
      const intentos = (Number(cred.intentos_fallidos) || 0) + 1;
      await tablaSupabase("credenciales_acceso", { cliente_id: "eq." + cliente.id }, {
        method: "PATCH", body: JSON.stringify({
          intentos_fallidos: intentos >= 5 ? 0 : intentos,
          bloqueado_hasta: intentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
        })
      });
      return NextResponse.json({ ok: false, mensaje: "La contraseña actual no es correcta." }, { status: 401 });
    }
    await tablaSupabase("credenciales_acceso", { cliente_id: "eq." + cliente.id }, {
      method: "PATCH", body: JSON.stringify({ password_hash: cifrarClave(body.nueva), requiere_cambio: false,
        intentos_fallidos: 0, bloqueado_hasta: null, actualizado_en: new Date().toISOString() })
    });
    const { token, duracion } = crearSesion(cliente, process.env.AUTH_SESSION_SECRET);
    const respuesta = NextResponse.json({ ok: true, autenticado: true,
      cliente: { nombre: cliente.nombre, tienda_id: cliente.tienda_id, rol: cliente.rol }
    });
    respuesta.cookies.set({ name: "ra_session", value: token, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: duracion });
    return respuesta;
  } catch (error) {
    console.error("Error cambio de contraseña:", error);
    return NextResponse.json({ ok: false, mensaje: "No pudimos cambiar la contraseña." }, { status: 500 });
  }
}