import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function rpc(nombre, args) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Configuración incompleta.");
  const respuesta = await fetch(url + "/rest/v1/rpc/" + nombre, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const dato = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    console.error("Reserva SOLO_RA:", nombre, respuesta.status, dato);
    throw new Error("No se pudo consultar la disponibilidad. Intenta nuevamente.");
  }
  return dato;
}

export async function GET(request) {
  try {
    const tienda = new URL(request.url).searchParams.get("tienda_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(tienda)) {
      return NextResponse.json({ ok: false, error: "Tienda inválida." }, { status: 400 });
    }
    const filas = await rpc("ra_solo_ra_disponibles", { p_tienda_id: tienda });
    return NextResponse.json({
      ok: true,
      ids: (Array.isArray(filas) ? filas : [])
        .filter((fila) => Number(fila.disponible) > 0)
        .map((fila) => Number(fila.producto_id)),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const tienda = body?.tienda_id;
    const sesion = body?.sesion_id;
    const producto = Number(body?.producto_id);
    const cantidad = Number(body?.cantidad);
    if (!/^[0-9a-f-]{36}$/i.test(String(tienda || "")) ||
        !/^[\w-]{16,200}$/.test(String(sesion || "")) ||
        !Number.isSafeInteger(producto) || producto <= 0 ||
        !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 99) {
      return NextResponse.json({ ok: false, error: "Datos de reserva inválidos." }, { status: 400 });
    }
    const resultado = await rpc("ra_solo_ra_reservar", {
      p_producto_id: producto,
      p_tienda_id: tienda,
      p_sesion_id: sesion,
      p_cantidad: cantidad,
    });
    return NextResponse.json(resultado, {
      status: resultado?.ok ? 200 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
}
