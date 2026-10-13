import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { modoClave, limpiarTelefono, cifrarClave, verificarSesion, tablaSupabase } from "../../../../lib/claveAcceso.mjs";
export const runtime = "nodejs";

const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function maestro() {
  if (!modoClave()) return null;
  const cookieStore = await cookies();
  const sesion = verificarSesion(cookieStore.get("ra_session")?.value, process.env.AUTH_SESSION_SECRET);
  if (!sesion || !sesion.cliente_id || sesion.requiere_cambio) return null;
  const lista = await tablaSupabase("clientes_autorizados", {
    select: "id,rol,activo", id: "eq." + sesion.cliente_id, rol: "eq.MAESTRO", activo: "eq.true", limit: "1"
  });
  return lista?.length ? sesion : null;
}

export async function GET() {
  try {
    if (!await maestro()) return json({ ok: false, mensaje: "Acceso exclusivo del administrador." }, 403);
    const [autorizados, credenciales] = await Promise.all([
      tablaSupabase("clientes_autorizados", { select: "id,nombre,telefono,activo,rol,creado_en", order: "creado_en.desc", limit: "1000" }),
      tablaSupabase("credenciales_acceso", { select: "cliente_id,estado,requiere_cambio,creado_en", limit: "1000" })
    ]);
    const mapa = new Map((credenciales || []).map(x => [x.cliente_id, x]));
    return json({ ok: true, clientes: (autorizados || []).map(c => ({
      ...c, registro: mapa.get(c.id)?.estado || "SIN_REGISTRAR",
      requiere_cambio: mapa.get(c.id)?.requiere_cambio || false
    })) });
  } catch (err) {
    console.error("Error listando accesos del local:", err);
    return json({ ok: false, mensaje: "No fue posible consultar los accesos." }, 500);
  }
}

export async function POST(request) {
  try {
    if (!await maestro()) return json({ ok: false, mensaje: "Acceso exclusivo del administrador." }, 403);
    const body = await request.json();
    if (body.accion === "autorizar") {
      const telefono = limpiarTelefono(body.telefono);
      const nombre = String(body.nombre || "").trim().slice(0, 120);
      if (!telefono || nombre.length < 3) return json({ ok: false, mensaje: "Escribe nombre y celular válidos." }, 400);
      const existentes = await tablaSupabase("clientes_autorizados", { select: "id", telefono: "eq." + telefono, limit: "1" });
      if (existentes?.length) return json({ ok: false, mensaje: "El número ya está registrado en la lista de este local." }, 409);
      await tablaSupabase("clientes_autorizados", {}, {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ nombre, telefono, activo: true, rol: "CLIENTE" })
      });
      return json({ ok: true, mensaje: "Cliente agregado a la lista de autorizados." }, 201);
    }
    const clienteId = String(body.cliente_id || "");
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(clienteId)) {
      return json({ ok: false, mensaje: "Cliente inválido." }, 400);
    }
    const clientes = await tablaSupabase("clientes_autorizados", {
      select: "id,rol,activo", id: "eq." + clienteId, rol: "eq.CLIENTE", limit: "1"
    });
    const cliente = clientes?.[0];
    if (!cliente) return json({ ok: false, mensaje: "Cliente no encontrado." }, 404);
    if (body.accion === "desautorizar") {
      await tablaSupabase("clientes_autorizados", { id: "eq." + clienteId }, {
        method: "PATCH", body: JSON.stringify({ activo: false })
      });
      await tablaSupabase("credenciales_acceso", { cliente_id: "eq." + clienteId }, {
        method: "PATCH", body: JSON.stringify({ estado: "SUSPENDIDO" })
      });
      return json({ ok: true, mensaje: "Cliente desautorizado." });
    }
    const creds = await tablaSupabase("credenciales_acceso", {
      select: "cliente_id,estado", cliente_id: "eq." + clienteId, limit: "1"
    });
    if (!creds?.length) return json({ ok: false, mensaje: "El cliente todavía no ha solicitado registro." }, 404);
    if (body.accion === "aprobar") {
      if (!cliente.activo) return json({ ok: false, mensaje: "Este cliente no está autorizado." }, 403);
      await tablaSupabase("credenciales_acceso", { cliente_id: "eq." + clienteId }, {
        method: "PATCH", body: JSON.stringify({ estado: "ACTIVO", intentos_fallidos: 0, bloqueado_hasta: null })
      });
      return json({ ok: true, mensaje: "Acceso activado después de verificar la identidad del cliente." });
    }
    if (body.accion === "restablecer") {
      if (!cliente.activo) return json({ ok: false, mensaje: "Cliente no autorizado." }, 403);
      const temporal = crypto.randomBytes(15).toString("base64url") + "8A";
      await tablaSupabase("credenciales_acceso", { cliente_id: "eq." + clienteId }, {
        method: "PATCH", body: JSON.stringify({
          password_hash: cifrarClave(temporal), estado: "ACTIVO", requiere_cambio: true,
          intentos_fallidos: 0, bloqueado_hasta: null, actualizado_en: new Date().toISOString()
        })
      });
      return json({ ok: true, mensaje: "Contraseña temporal generada. Entrégala únicamente al titular después de verificar su identidad. Solo se mostrará una vez.", temporal });
    }
    return json({ ok: false, mensaje: "Acción no reconocida." }, 400);
  } catch (err) {
    console.error("Error gestionando accesos:", err);
    return json({ ok: false, mensaje: "No fue posible actualizar el acceso." }, 500);
  }
}