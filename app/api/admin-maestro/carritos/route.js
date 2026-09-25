import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const bufferRecibido = Buffer.from(firmaRecibida);
    const bufferCorrecto = Buffer.from(firmaCorrecta);

    if (bufferRecibido.length !== bufferCorrecto.length) {
      return null;
    }

    const firmaValida = crypto.timingSafeEqual(
      bufferRecibido,
      bufferCorrecto
    );

    if (!firmaValida) {
      return null;
    }

    const datos = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (!datos.exp) {
      return null;
    }

    const ahora = Math.floor(Date.now() / 1000);

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

export async function GET() {
  try {
    // ========================================
    // 1. VERIFICAR CONFIGURACIÓN
    // ========================================

    const secreto = process.env.AUTH_SESSION_SECRET;

    if (!secreto) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta AUTH_SESSION_SECRET.",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 2. VERIFICAR SESIÓN
    // ========================================

    const cookieStore = await cookies();
    const token = cookieStore.get("ra_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const sesion = verificarToken(token, secreto);

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sesión inválida o vencida.",
        },
        { status: 401 }
      );
    }

    // ========================================
    // 3. SOLO ADMINISTRADOR MAESTRO
    // ========================================

    if (sesion.rol !== "MAESTRO") {
      return NextResponse.json(
        {
          ok: false,
          error: "No tienes permiso para ver los carritos.",
        },
        { status: 403 }
      );
    }

    // ========================================
    // 4. VERIFICAR SUPABASE
    // ========================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecret =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase no está configurado.",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 5. CONSULTAR CARRITOS
    // ========================================

    const respuesta = await fetch(
      `${supabaseUrl}/rest/v1/carritos_web?select=id,sesion_id,tienda_id,nombre_cliente,cedula_cliente,telefono_cliente,correo_cliente,direccion_cliente,estado,productos,cantidad_productos,subtotal,ciudad,forma_pago,creado_en,ultima_actividad,completado_en&order=ultima_actividad.desc&limit=200`,
      {
        method: "GET",

        headers: {
          apikey: supabaseSecret,
          Accept: "application/json",
        },

        cache: "no-store",
      }
    );

    const texto = await respuesta.text();

    if (!respuesta.ok) {
      console.error(
        "Error consultando carritos_web:",
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No pudimos consultar los carritos.",
        },
        { status: 500 }
      );
    }

    let carritos = [];

    try {
      carritos = texto ? JSON.parse(texto) : [];
    } catch {
      carritos = [];
    }

    // ========================================
    // 6. DEVOLVER INFORMACIÓN
    // ========================================

    return NextResponse.json({
      ok: true,
      carritos: Array.isArray(carritos)
        ? carritos
        : [],
      total: Array.isArray(carritos)
        ? carritos.length
        : 0,
    });
  } catch (error) {
    console.error(
      "Error cargando carritos maestro:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "No pudimos cargar los carritos.",
      },
      { status: 500 }
    );
  }
}