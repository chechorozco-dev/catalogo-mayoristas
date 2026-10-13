import { NextResponse } from "next/server";
import { modoClave, limpiarTelefono, claveValida, cifrarClave, tablaSupabase } from "../../../../../lib/claveAcceso.mjs";
export const runtime = "nodejs";
export async function POST(request) {
  if (!modoClave()) return NextResponse.json({ ok: false, mensaje: "Registro no habilitado en esta tienda." }, { status: 404 });
  try {
    const body = await request.json();
    const telefono = limpiarTelefono(body.telefono);
    if (!telefono || !claveValida(body.password)) {
      return NextResponse.json({ ok: false, mensaje: "Escribe un celular colombiano y una contraseña de mínimo 10 caracteres con letras y números." }, { status: 400 });
    }
    const autorizados = await tablaSupabase("clientes_autorizados", {
      select: "id,telefono,activo,rol", telefono: "eq." + telefono, activo: "eq.true", rol: "eq.CLIENTE", limit: "1"
    });
    if (!autorizados?.length) {
      return NextResponse.json({ ok: false, mensaje: "Este celular no está en la lista de clientes autorizados de esta tienda. Solicita autorización al local." }, { status: 403 });
    }
    const clienteId = autorizados[0].id;
    const existentes = await tablaSupabase("credenciales_acceso", { select: "estado", cliente_id: "eq." + clienteId, limit: "1" });
    if (existentes?.length) {
      return NextResponse.json({ ok: false, mensaje: "Este número ya tiene un registro. Si olvidaste la contraseña, comunícate con la tienda." }, { status: 409 });
    }
    await tablaSupabase("credenciales_acceso", {}, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ cliente_id: clienteId, password_hash: cifrarClave(body.password), estado: "PENDIENTE" })
    });
    return NextResponse.json({ ok: true, pendiente: true, mensaje: "Registro recibido. El administrador de RA ACCESORIOS VILLAVO debe confirmar tu identidad y activar el acceso." }, { status: 201 });
  } catch (error) {
    console.error("Error en registro con contraseña:", error);
    return NextResponse.json({ ok: false, mensaje: "No fue posible completar el registro. Intenta nuevamente o contacta al local." }, { status: 500 });
  }
}