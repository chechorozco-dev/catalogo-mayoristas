import { negocioFetch as fetch } from "../../../../lib/negocioFetch.mjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { fetchSupabasePaginado } from "../../../../lib/supabasePagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respuesta(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function verificarToken(token, secreto) {
  try {
    if (!token || !secreto) return null;
    const partes = token.split(".");
    if (partes.length !== 2) return null;

    const [payload, firmaRecibida] = partes;
    const firmaEsperada = crypto
      .createHmac("sha256", secreto)
      .update(payload)
      .digest("base64url");

    const recibida = Buffer.from(firmaRecibida);
    const esperada = Buffer.from(firmaEsperada);
    if (
      recibida.length !== esperada.length ||
      !crypto.timingSafeEqual(recibida, esperada)
    ) {
      return null;
    }

    const datos = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    if (!datos.exp || datos.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return datos;
  } catch {
    return null;
  }
}

function resumenNuevo() {
  return {
    carritos: 0,
    enProceso: 0,
    checkout: 0,
    completados: 0,
    abandonados: 0,
    valorCompletados: 0,
    valorEnProceso: 0,
    sinActividad24h: 0,
    ultimaActividad: null,
  };
}

function acumular(resumen, carrito, limite24h) {
  const estado = String(carrito.estado || "").trim().toUpperCase();
  const importe = Number(carrito.subtotal);
  const valor = Number.isFinite(importe) && importe > 0 ? importe : 0;
  const fecha = carrito.ultima_actividad;
  const fechaMs = fecha ? new Date(fecha).getTime() : NaN;

  resumen.carritos += 1;
  if (estado === "EN_PROCESO") {
    resumen.enProceso += 1;
    resumen.valorEnProceso += valor;
  } else if (estado === "CHECKOUT") {
    resumen.checkout += 1;
    resumen.valorEnProceso += valor;
  } else if (estado === "COMPLETADO") {
    resumen.completados += 1;
    resumen.valorCompletados += valor;
  } else if (estado === "ABANDONADO") {
    resumen.abandonados += 1;
  }

  // "Sin actividad" no significa abandonado confirmado.
  if (
    (estado === "EN_PROCESO" || estado === "CHECKOUT") &&
    Number.isFinite(fechaMs) &&
    fechaMs < limite24h
  ) {
    resumen.sinActividad24h += 1;
  }

  if (
    Number.isFinite(fechaMs) &&
    (!resumen.ultimaActividad ||
      fechaMs > new Date(resumen.ultimaActividad).getTime())
  ) {
    resumen.ultimaActividad = fecha;
  }
}

async function obtenerFilas(url, headers) {
  const respuestaSupabase = await fetchSupabasePaginado(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!respuestaSupabase.ok) {
    throw new Error("Falló una consulta de Supabase.");
  }
  const datos = await respuestaSupabase.json();
  if (!Array.isArray(datos)) throw new Error("Respuesta inválida.");
  return datos;
}

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const clave = process.env.SUPABASE_SECRET_KEY;
    const secreto = process.env.AUTH_SESSION_SECRET;
    if (!supabaseUrl || !clave || !secreto) {
      return respuesta({ ok: false, error: "Falta configuración del servidor." }, 500);
    }

    const cookieStore = await cookies();
    const sesion = verificarToken(cookieStore.get("ra_session")?.value, secreto);
    if (!sesion?.cliente_id) {
      return respuesta({ ok: false, error: "Sesión no válida." }, 401);
    }

    const headers = {
      apikey: clave,
      Accept: "application/json",
    };

    // El rol de la cookie no es suficiente: comprobar que el usuario
    // continúe activo y sea MAESTRO en la base de datos.
    const urlMaestro =
      `${supabaseUrl}/rest/v1/clientes_autorizados` +
      `?id=eq.${encodeURIComponent(sesion.cliente_id)}` +
      "&activo=eq.true&select=id,rol&limit=1";

    const acceso = await fetch(urlMaestro, {
      headers,
      cache: "no-store",
    });
    if (!acceso.ok) {
      throw new Error("No pudimos comprobar el permiso de administrador.");
    }
    const [usuario] = await acceso.json();
    if (!usuario || String(usuario.rol).toUpperCase() !== "MAESTRO") {
      return respuesta({ ok: false, error: "Acceso reservado al administrador maestro." }, 403);
    }

    const url = new URL(request.url);
    const parametro = Number(url.searchParams.get("dias") || 30);
    const dias = [7, 30, 90].includes(parametro) ? parametro : 30;

    const ahora = Date.now();
    const inicio = new Date(ahora - dias * 24 * 60 * 60 * 1000);
    const desde = encodeURIComponent(inicio.toISOString());

    const [tiendas, accesos, carritos] = await Promise.all([
      obtenerFilas(
        `${supabaseUrl}/rest/v1/tiendas` +
          "?select=id,nombre_tienda,slug,whatsapp,tipo_tienda,activa,creado_en" +
          "&order=id.asc",
        headers
      ),
      obtenerFilas(
        `${supabaseUrl}/rest/v1/clientes_autorizados` +
          "?select=id,tienda_id,activo,rol&order=id.asc",
        headers
      ),
      obtenerFilas(
        `${supabaseUrl}/rest/v1/carritos_web` +
          "?select=tienda_id,estado,subtotal,ultima_actividad" +
          `&ultima_actividad=gte.${desde}` +
          "&order=ultima_actividad.desc,tienda_id.asc",
        headers
      ),
    ]);

    const porTienda = new Map();
    const resumenGeneral = resumenNuevo();

    for (const tienda of tiendas) {
      porTienda.set(String(tienda.id), {
        id: tienda.id,
        nombre: tienda.nombre_tienda || "Tienda sin nombre",
        slug: tienda.slug || "",
        whatsapp: tienda.whatsapp || "",
        tipo: String(tienda.tipo_tienda || "").trim().toUpperCase(),
        activa: tienda.activa === true,
        creadaEn: tienda.creado_en || null,
        accesosActivos: 0,
        accesosInactivos: 0,
        ...resumenNuevo(),
      });
    }

    for (const accesoTienda of accesos) {
      const tienda = porTienda.get(String(accesoTienda.tienda_id || ""));
      if (!tienda || accesoTienda.rol === "MAESTRO") continue;
      if (accesoTienda.activo === true) tienda.accesosActivos += 1;
      else tienda.accesosInactivos += 1;
    }

    const limite24h = ahora - 24 * 60 * 60 * 1000;
    let carritosSinTienda = 0;
    for (const carrito of carritos) {
      const tienda = porTienda.get(String(carrito.tienda_id || ""));
      if (!tienda) {
        carritosSinTienda += 1;
        continue;
      }
      acumular(tienda, carrito, limite24h);
      acumular(resumenGeneral, carrito, limite24h);
    }

    const listaTiendas = [...porTienda.values()].sort((a, b) => {
      const fechaA = a.ultimaActividad ? Date.parse(a.ultimaActividad) : 0;
      const fechaB = b.ultimaActividad ? Date.parse(b.ultimaActividad) : 0;
      return fechaB - fechaA || a.nombre.localeCompare(b.nombre, "es");
    });

    return respuesta({
      ok: true,
      dias,
      generadoEn: new Date(ahora).toISOString(),
      aclaracion:
        "Los importes son subtotales declarados en carritos web, no ventas facturadas ni pagos confirmados.",
      resumen: {
        totalTiendas: listaTiendas.length,
        tiendasActivas: listaTiendas.filter((t) => t.activa).length,
        tiendasInactivas: listaTiendas.filter((t) => !t.activa).length,
        carritosSinTienda,
        ...resumenGeneral,
      },
      tiendas: listaTiendas,
    });
  } catch (error) {
    console.error("Error en resumen maestro de tiendas:", error);
    return respuesta({
      ok: false,
      error: "No se pudo cargar el resumen de las tiendas.",
    }, 500);
  }
}
