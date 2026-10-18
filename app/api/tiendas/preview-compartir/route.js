import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { normalizarUrlFoto } from "../../../../lib/catalogo/pdf-layout.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verificarSesion(token) {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!token || !secret) return null;
  try {
    const [payload, firma, resto] = token.split(".");
    if (!payload || !firma || resto) return null;
    const esperado = crypto.createHmac("sha256", secret)
      .update(payload).digest("base64url");
    const a = Buffer.from(esperado);
    const b = Buffer.from(firma);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const sesion = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!sesion.exp || sesion.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!sesion.cliente_id || !sesion.tienda_id) return null;
    return sesion;
  } catch {
    return null;
  }
}

async function consultar(ruta, config) {
  const response = await fetch(
    config.url + "/rest/v1/" + ruta,
    {
      headers: { apikey: config.secret, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!response.ok) throw new Error("Error consultando la vista previa");
  return response.json();
}

// Solo lectura, sesión validada y datos públicos de la tienda propia.
// No devuelve costo, clientes, carritos ni ninguna clave privada.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sesion = verificarSesion(cookieStore.get("ra_session")?.value);
    if (!sesion) {
      return NextResponse.json({ ok: false, mensaje: "Inicia sesión para ver tu tienda." }, { status: 401 });
    }

    const config = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      secret: process.env.SUPABASE_SECRET_KEY,
    };
    if (!config.url || !config.secret) {
      return NextResponse.json({ ok: false, mensaje: "Servicio no disponible." }, { status: 503 });
    }

    const clientes = await consultar(
      "clientes_autorizados?id=eq." + encodeURIComponent(sesion.cliente_id) +
      "&activo=eq.true&select=id,tienda_id,negocio_id&limit=1",
      config
    );
    const cliente = clientes?.[0];
    if (!cliente?.tienda_id || String(cliente.tienda_id) !== String(sesion.tienda_id)) {
      return NextResponse.json({ ok: false, mensaje: "Sin acceso a esta tienda." }, { status: 403 });
    }

    const tiendas = await consultar(
      "tiendas?id=eq." + encodeURIComponent(cliente.tienda_id) +
      "&activa=eq.true&select=id,negocio_id,tipo_tienda,creado_en&limit=1",
      config
    );
    const tienda = tiendas?.[0];
    if (!tienda?.negocio_id || tienda.negocio_id !== cliente.negocio_id) {
      return NextResponse.json({ ok: false, mensaje: "Tienda no disponible." }, { status: 404 });
    }

    const [productos, configuracion] = await Promise.all([
      consultar(
        "productos?activo=eq.true&negocio_id=eq." + encodeURIComponent(tienda.negocio_id) +
        "&select=id,nombre,created_at,foto_url,foto_url_2,solo_ra" +
        "&order=created_at.desc,id.desc&limit=100",
        config
      ),
      consultar(
        "tienda_productos?tienda_id=eq." + encodeURIComponent(tienda.id) +
        "&negocio_id=eq." + encodeURIComponent(tienda.negocio_id) +
        "&select=producto_id,visible,publicar_anticipadamente",
        config
      ),
    ]);

    const ajustes = new Map(
      (configuracion || []).map((c) => [String(c.producto_id), c])
    );
    const esRa = String(tienda.tipo_tienda || "").toUpperCase() === "RA";
    const ahora = Date.now();
    const creadoTienda = new Date(tienda.creado_en || "").getTime();
    const visibles = [];

    for (const producto of productos || []) {
      if (!esRa && producto.solo_ra === true) continue;
      // Para las vistas promocionales de RA no mostramos unidades SOLO_RA.
      if (producto.solo_ra === true) continue;
      const ajuste = ajustes.get(String(producto.id));
      if (ajuste?.visible === false) continue;
      const creadoProducto = new Date(producto.created_at || "").getTime();
      const esAntiguo = !Number.isFinite(creadoProducto) ||
        (Number.isFinite(creadoTienda) && creadoProducto <= creadoTienda);
      const publicado = esRa || ajuste?.publicar_anticipadamente === true ||
        esAntiguo || ahora - creadoProducto >= 24 * 60 * 60 * 1000;
      if (!publicado) continue;

      const foto = normalizarUrlFoto(producto.foto_url) ||
        normalizarUrlFoto(producto.foto_url_2);
      if (!foto) continue;
      visibles.push({ id: producto.id, nombre: producto.nombre || "Producto", foto });
      if (visibles.length === 4) break;
    }

    return NextResponse.json(
      { ok: true, productos: visibles },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("No se pudo preparar muestra de tienda:", error?.message);
    return NextResponse.json(
      { ok: false, mensaje: "No pudimos cargar las fotografías de muestra." },
      { status: 503 }
    );
  }
}
