import { consultarDisponibilidadCarrito } from "../../../../lib/catalogo/consultar-carrito.mjs";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function POST(request) {
  try {
    const body = await request.json();
    const tiendaId = String(body?.tienda_id || "");
    if (!/^[a-f0-9-]{36}$/i.test(tiendaId) || !Array.isArray(body?.productos) || body.productos.length > 500) {
      return Response.json({ ok: false, error: "Carrito inválido." }, { status: 400, headers });
    }
    const key = process.env.SUPABASE_SECRET_KEY;
    const respuesta = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL +
      "/rest/v1/tiendas?select=id,negocio_id,tipo_tienda,creado_en,activa&id=eq." +
      encodeURIComponent(tiendaId) + "&limit=1", {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!respuesta.ok) throw new Error("No pudimos comprobar la tienda.");
    const tienda = (await respuesta.json())?.[0];
    if (!tienda?.activa || !tienda.negocio_id) {
      return Response.json({ ok: false, error: "La tienda no está disponible." }, { status: 404, headers });
    }
    const { retirados } = await consultarDisponibilidadCarrito(tienda, body.productos);
    // Solo devolver identificadores; nunca datos privados del catálogo.
    return Response.json({ ok: true, retirados }, { headers });
  } catch {
    return Response.json({ ok: false, error: "No pudimos comprobar el carrito. Tus productos siguen guardados." },
      { status: 503, headers });
  }
}
