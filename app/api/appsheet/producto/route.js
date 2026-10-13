import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { negocioFetch, getNegocioId } from "../../../../lib/negocioFetch.mjs";
import { mapearProductoAppSheet, referenciaParaEliminar } from "../../../../lib/appsheetProducto.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respuesta(datos, status = 200) {
  return NextResponse.json(datos, { status, headers: { "Cache-Control": "no-store" } });
}

function autorizado(recibido, secreto) {
  if (typeof recibido !== "string" || typeof secreto !== "string" ||
      secreto.length < 24 || recibido.length > 250) return false;
  const a = crypto.createHash("sha256").update(recibido).digest();
  const b = crypto.createHash("sha256").update(secreto).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;
    const webhookSecret = process.env.APPSHEET_PRODUCTOS_SECRET;
    // Bloquear por defecto en otros Vercel o con configuración incompleta.
    if (!supabaseUrl || !supabaseKey || !webhookSecret) {
      return respuesta({ ok: false, mensaje: "Importación aún no configurada." }, 503);
    }
    getNegocioId(); // Validar que el servidor tiene negocio fijo.
    const longitud = Number(request.headers.get("content-length") || 0);
    if (longitud > 40000) return respuesta({ ok: false, mensaje: "Body demasiado grande." }, 413);
    let body;
    try { body = await request.json(); }
    catch { return respuesta({ ok: false, mensaje: "Envía JSON válido." }, 400); }
    if (!autorizado(body?.ra_secret, webhookSecret)) {
      return respuesta({ ok: false, mensaje: "No autorizado." }, 401);
    }

    const accion = String(body?.accion ?? "").trim().toUpperCase();
    if (accion && !["ELIMINAR", "DELETE", "CREAR", "ACTUALIZAR", "GUARDAR", "SINCRONIZAR"].includes(accion)) {
      return respuesta({ ok: false, mensaje: "Acción no reconocida." }, 400);
    }

    if (accion === "ELIMINAR" || accion === "DELETE") {
      let referencia;
      try { referencia = referenciaParaEliminar(body); }
      catch (err) { return respuesta({ ok: false, mensaje: err.message }, 400); }

      // Filtro doble obligatorio: por referencia Y negocio_id impuesto por negocioFetch.
      // No se acepta negocio_id desde AppSheet; jamás alcanza productos de RA principal.
      const eliminarUrl = new URL(supabaseUrl.replace(/\\/$/, "") + "/rest/v1/productos");
      eliminarUrl.searchParams.set("referencia", "eq." + referencia);
      eliminarUrl.searchParams.set("select", "id,referencia");
      const eliminadoResp = await negocioFetch(eliminarUrl.toString(), {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Prefer: "return=representation",
        },
        cache: "no-store",
      });
      if (!eliminadoResp.ok) {
        console.error("AppSheet: error eliminando producto", eliminadoResp.status);
        return respuesta({ ok: false, accion: "ERROR", mensaje: "No se pudo eliminar el producto.", codigo: eliminadoResp.status }, 502);
      }
      const eliminados = await eliminadoResp.json();
      if (!Array.isArray(eliminados) || eliminados.length === 0) {
        return respuesta({
          ok: false, accion: "NO_EXISTE",
          mensaje: "No existe esa referencia en RA ACCESORIOS VILLAVO.",
          referencia
        }, 404);
      }
      return respuesta({
        ok: true, accion: "ELIMINADO",
        mensaje: "Producto eliminado de RA ACCESORIOS VILLAVO.",
        referencia,
        eliminados: eliminados.length
      });
    }

    let producto;
    try { producto = mapearProductoAppSheet(body); }
    catch (err) { return respuesta({ ok: false, mensaje: err.message }, 400); }

    // negocioFetch asigna negocio_id desde la variable del servidor, NO del body.
    // El índice UNIQUE(negocio_id,referencia) evita duplicados y no toca otros locales.
    const url = new URL(supabaseUrl.replace(/\/$/, "") + "/rest/v1/productos");
    url.searchParams.set("on_conflict", "negocio_id,referencia");
    url.searchParams.set("select", "id,referencia,nombre,costo,precio_detal,cant,negocio_id");
    const r = await negocioFetch(url.toString(), {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(producto),
      cache: "no-store",
    });
    if (!r.ok) {
      console.error("AppSheet producto: error de Supabase", r.status, (await r.text()).slice(0,800));
      return respuesta({ ok: false, mensaje: "No se pudo guardar el producto. Revisa las columnas y la referencia.", codigo: r.status }, 502);
    }
    const registros = await r.json();
    const creado = Array.isArray(registros) ? registros[0] : null;
    if (!creado) return respuesta({ ok: false, mensaje: "Supabase no confirmó el producto." }, 502);
    return respuesta({
      ok: true, accion: "SINCRONIZADO",
      mensaje: "Producto sincronizado en RA ACCESORIOS VILLAVO.",
      referencia: creado.referencia,
      id: creado.id
    });
  } catch (error) {
    console.error("AppSheet producto: fallo inesperado", error);
    return respuesta({ ok: false, mensaje: "Error al importar el producto." }, 500);
  }
}
