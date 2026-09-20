import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ========================================
// LEER Y VALIDAR SESIÓN
// ========================================

async function obtenerSesion() {
  const cookieStore = await cookies();

  const cookieSesion =
    cookieStore.get("ra_session")?.value;

  if (!cookieSesion) {
    return null;
  }

  const secreto =
    process.env.AUTH_SESSION_SECRET;

  if (!secreto) {
    throw new Error(
      "Falta AUTH_SESSION_SECRET"
    );
  }

  const partes =
    cookieSesion.split(".");

  if (partes.length !== 2) {
    return null;
  }

  const [contenidoBase64, firmaRecibida] =
    partes;

  const firmaEsperada = crypto
    .createHmac("sha256", secreto)
    .update(contenidoBase64)
    .digest("hex");

  try {
    const firmaValida =
      crypto.timingSafeEqual(
        Buffer.from(firmaRecibida),
        Buffer.from(firmaEsperada)
      );

    if (!firmaValida) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const contenido = Buffer.from(
      contenidoBase64,
      "base64url"
    ).toString("utf8");

    return JSON.parse(contenido);
  } catch {
    return null;
  }
}

// ========================================
// CONFIGURACIÓN SUPABASE
// ========================================

function configuracionSupabase() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY"
    );
  }

  return {
    supabaseUrl,
    supabaseSecretKey,
  };
}

// ========================================
// OBTENER TIENDA DE LA SESIÓN
// ========================================

async function obtenerTiendaSesion() {
  const sesion =
    await obtenerSesion();

  if (!sesion) {
    return null;
  }

  const tiendaId =
    sesion.tienda_id ||
    sesion.cliente?.tienda_id ||
    null;

  if (!tiendaId) {
    return null;
  }

  return String(tiendaId);
}

// ========================================
// GET - LISTAR ANUNCIOS
// ========================================

export async function GET() {
  try {
    const tiendaId =
      await obtenerTiendaSesion();

    if (!tiendaId) {
      return Response.json(
        {
          ok: false,
          mensaje: "Sesión no válida.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      supabaseUrl,
      supabaseSecretKey,
    } = configuracionSupabase();

    const url =
      `${supabaseUrl}` +
      `/rest/v1/anuncios_tienda` +
      `?select=` +
      [
        "id",
        "tipo",
        "titulo",
        "mensaje",
        "texto_boton",
        "enlace_boton",
        "color_fondo",
        "color_texto",
        "imagen_url",
        "fecha_inicio",
        "fecha_fin",
        "activo",
        "orden",
        "creado_en",
      ].join(",") +
      `&tienda_id=eq.${encodeURIComponent(
        tiendaId
      )}` +
      `&order=orden.asc,creado_en.desc`;

    const respuesta =
      await fetch(url, {
        method: "GET",

        headers: {
          apikey:
            supabaseSecretKey,

          "Content-Type":
            "application/json",
        },

        cache: "no-store",
      });

    const texto =
      await respuesta.text();

    if (!respuesta.ok) {
      console.error(
        "ERROR LISTANDO ANUNCIOS:",
        respuesta.status,
        texto
      );

      throw new Error(
        "No se pudieron cargar los anuncios."
      );
    }

    const anuncios =
      texto ? JSON.parse(texto) : [];

    return Response.json({
      ok: true,
      anuncios:
        Array.isArray(anuncios)
          ? anuncios
          : [],
    });
  } catch (error) {
    console.error(
      "ERROR GET ANUNCIOS:",
      error
    );

    return Response.json(
      {
        ok: false,
        mensaje:
          "No se pudieron cargar los anuncios.",
      },
      {
        status: 500,
      }
    );
  }
}

// ========================================
// POST - CREAR ANUNCIO
// ========================================

export async function POST(request) {
  try {
    const tiendaId =
      await obtenerTiendaSesion();

    if (!tiendaId) {
      return Response.json(
        {
          ok: false,
          mensaje: "Sesión no válida.",
        },
        {
          status: 401,
        }
      );
    }

    const datos =
      await request.json();

    const titulo =
      String(datos?.titulo || "")
        .trim()
        .slice(0, 100);

    const mensaje =
      String(datos?.mensaje || "")
        .trim()
        .slice(0, 300);

    const tiposPermitidos = [
      "AVISO",
      "PROMOCION",
      "NOVEDAD",
      "URGENTE",
    ];

    const tipoRecibido =
      String(
        datos?.tipo || "AVISO"
      )
        .trim()
        .toUpperCase();

    const tipo =
      tiposPermitidos.includes(
        tipoRecibido
      )
        ? tipoRecibido
        : "AVISO";

    if (!titulo) {
      return Response.json(
        {
          ok: false,
          mensaje:
            "Escribe un título para el anuncio.",
        },
        {
          status: 400,
        }
      );
    }

    const colorHex =
      /^#[0-9A-Fa-f]{6}$/;

    const colorFondo =
      colorHex.test(
        String(
          datos?.color_fondo || ""
        )
      )
        ? datos.color_fondo
        : "#FFF4D6";

    const colorTexto =
      colorHex.test(
        String(
          datos?.color_texto || ""
        )
      )
        ? datos.color_texto
        : "#111111";

    const {
      supabaseUrl,
      supabaseSecretKey,
    } = configuracionSupabase();

    const nuevoAnuncio = {
      tienda_id: tiendaId,

      tipo,

      titulo,

      mensaje:
        mensaje || null,

      texto_boton:
        String(
          datos?.texto_boton || ""
        )
          .trim()
          .slice(0, 50) ||
        null,

      enlace_boton:
        String(
          datos?.enlace_boton || ""
        )
          .trim()
          .slice(0, 1000) ||
        null,

      color_fondo:
        colorFondo,

      color_texto:
        colorTexto,

      imagen_url:
        String(
          datos?.imagen_url || ""
        )
          .trim()
          .slice(0, 2000) ||
        null,

      fecha_inicio:
        datos?.fecha_inicio ||
        null,

      fecha_fin:
        datos?.fecha_fin ||
        null,

      activo:
        datos?.activo !== false,

      orden:
        Number.isFinite(
          Number(datos?.orden)
        )
          ? Number(datos.orden)
          : 0,
    };

    const respuesta =
      await fetch(
        `${supabaseUrl}/rest/v1/anuncios_tienda`,
        {
          method: "POST",

          headers: {
            apikey:
              supabaseSecretKey,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation",
          },

          body: JSON.stringify(
            nuevoAnuncio
          ),

          cache: "no-store",
        }
      );

    const texto =
      await respuesta.text();

    if (!respuesta.ok) {
      console.error(
        "ERROR CREANDO ANUNCIO:",
        respuesta.status,
        texto
      );

      throw new Error(
        "No se pudo crear el anuncio."
      );
    }

    const creados =
      texto ? JSON.parse(texto) : [];

    return Response.json({
      ok: true,
      anuncio:
        Array.isArray(creados)
          ? creados[0] || null
          : null,
    });
  } catch (error) {
    console.error(
      "ERROR POST ANUNCIOS:",
      error
    );

    return Response.json(
      {
        ok: false,
        mensaje:
          "No se pudo crear el anuncio.",
      },
      {
        status: 500,
      }
    );
  }
}