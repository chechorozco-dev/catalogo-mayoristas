
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ========================================
// VERIFICAR TOKEN DE SESIÓN
// ========================================

function verificarToken(token, secreto) {
  try {
    if (!token || !secreto) return null;

    const partes = token.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [payload, firmaRecibida] = partes;

    const firmaCorrecta = crypto
      .createHmac("sha256", secreto)
      .update(payload)
      .digest("base64url");

    const bufferRecibido = Buffer.from(
      firmaRecibida
    );

    const bufferCorrecto = Buffer.from(
      firmaCorrecta
    );

    if (
      bufferRecibido.length !==
      bufferCorrecto.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        bufferRecibido,
        bufferCorrecto
      )
    ) {
      return null;
    }

    const datos = JSON.parse(
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8")
    );

    if (!datos.exp) return null;

    const ahora = Math.floor(
      Date.now() / 1000
    );

    if (datos.exp <= ahora) {
      return null;
    }

    return datos;

  } catch (error) {
    console.error(
      "Error verificando sesión maestro:",
      error
    );

    return null;
  }
}

// ========================================
// ELIMINAR CARRITO
// ========================================

export async function POST(request) {
  try {

    // ========================================
    // 1. VALIDAR SESIÓN
    // ========================================

    const secreto =
      process.env.AUTH_SESSION_SECRET;

    if (!secreto) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta AUTH_SESSION_SECRET.",
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const token =
      cookieStore.get("ra_session")?.value;

    const sesion = verificarToken(
      token,
      secreto
    );

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    // ========================================
    // 2. SOLO ADMINISTRADOR MAESTRO
    // ========================================

    if (sesion.rol !== "MAESTRO") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No tienes permiso para eliminar carritos.",
        },
        { status: 403 }
      );
    }

    // ========================================
    // 3. RECIBIR ID DEL CARRITO
    // ========================================

    const body = await request.json();

    const carrito_id = body?.carrito_id;

    if (
      typeof carrito_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        carrito_id
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "ID de carrito no válido.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // 4. CONFIGURACIÓN SUPABASE
    // ========================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecret =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase no está configurado.",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 5. ELIMINAR Y DEVOLVER REGISTRO
    // ========================================

    const respuesta = await fetch(
      `${supabaseUrl}/rest/v1/carritos_web?id=eq.${encodeURIComponent(
        carrito_id
      )}`,
      {
        method: "DELETE",

        headers: {
          apikey: supabaseSecret,

          Authorization:
            `Bearer ${supabaseSecret}`,

          Prefer: "return=representation",

          Accept: "application/json",
        },

        cache: "no-store",
      }
    );

    const texto = await respuesta.text();

    if (!respuesta.ok) {
      console.error(
        "Error eliminando carrito:",
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase no permitió eliminar el carrito. Revisa si existen registros relacionados.",
        },
        { status: 500 }
      );
    }

    const eliminados = texto
      ? JSON.parse(texto)
      : [];

    // ========================================
    // 6. COMPROBAR ELIMINACIÓN REAL
    // ========================================

    if (
      !Array.isArray(eliminados) ||
      eliminados.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No encontramos el carrito o no pudo eliminarse.",
        },
        { status: 404 }
      );
    }

    // ========================================
    // 7. RESPUESTA EXITOSA
    // ========================================

    return NextResponse.json({
      ok: true,

      mensaje:
        "Carrito eliminado correctamente.",

      carrito_id,

      eliminado: true,
    });

  } catch (error) {
    console.error(
      "ERROR ELIMINANDO CARRITO:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error?.message ||
          "No se pudo eliminar el carrito.",
      },
      { status: 500 }
    );
  }
}
