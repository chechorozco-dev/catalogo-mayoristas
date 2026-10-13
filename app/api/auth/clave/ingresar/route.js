import { NextResponse } from "next/server";
import { modoClave, limpiarTelefono, comprobarClave, crearSesion, tablaSupabase } from "../../../../../lib/claveAcceso.mjs";
export const runtime = "nodejs";
const errorAcceso = () => NextResponse.json({ ok: false, mensaje: "No pudimos iniciar sesión. Verifica tus datos o consulta al administrador de la tienda." }, { status: 401 });
export async function POST(request) {
  if (!modoClave()) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const body = await request.json();
    const telefono = limpiarTelefono(body.telefono);
    if (!telefono || typeof body.password !== "string" || body.password.length > 128) return errorAcceso();
    const clientes = await tablaSupabase("clientes_autorizados", {
      select: "id,nombre,telefono,tienda_id,rol,negocio_id", telefono: "eq." + telefono, activo: "eq.true", limit: "1"
    });
    const cliente = clientes?.[0];
    if (!cliente) return errorAcceso();
    const filas = await tablaSupabase("credenciales_acceso", {
      select: "cliente_id,password_hash,estado,requiere_cambio,intentos_fallidos,bloqueado_hasta",
      cliente_id: "eq." + cliente.id, limit: "1"
    });
    const credencial = filas?.[0];
    if (!credencial || credencial.estado !== "ACTIVO") return errorAcceso();
    if (credencial.bloqueado_hasta && new Date(credencial.bloqueado_hasta).getTime() > Date.now()) {
      return NextResponse.json({ ok: false, mensaje: "Demasiados intentos. Intenta nuevamente en 15 minutos." }, { status: 429 });
    }
    const coincide = comprobarClave(body.password, credencial.password_hash);
    if (!coincide) {
      const intentos = (Number(credencial.intentos_fallidos) || 0) + 1;
      await tablaSupabase("credenciales_acceso", { cliente_id: "eq." + cliente.id }, {
        method: "PATCH", body: JSON.stringify({
          intentos_fallidos: intentos >= 5 ? 0 : intentos,
          bloqueado_hasta: intentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
          actualizado_en: new Date().toISOString()
        })
      });
      return errorAcceso();
    }
    await tablaSupabase("credenciales_acceso", { cliente_id: "eq." + cliente.id }, {
      method: "PATCH", body: JSON.stringify({ intentos_fallidos: 0, bloqueado_hasta: null })
    });
    if (credencial.requiere_cambio) {
      return NextResponse.json({ ok: true, requiereCambio: true, mensaje: "Por seguridad debes elegir una contraseña nueva antes de ingresar." });
    }
    const { token, duracion } = crearSesion(cliente, process.env.AUTH_SESSION_SECRET);
    const respuesta = NextResponse.json({ ok: true, autenticado: true,
      cliente: { id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, tienda_id: cliente.tienda_id, rol: cliente.rol }
    });
    respuesta.cookies.set({ name: "ra_session", value: token, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: duracion });
    return respuesta;
  } catch (error) {
    console.error("Fallo iniciando sesión con clave:", error);
    return NextResponse.json({ ok: false, mensaje: "No pudimos iniciar sesión en este momento." }, { status: 500 });
  }
}