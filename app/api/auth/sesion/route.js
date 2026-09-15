import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

// ======================================================
// VERIFICAR SESIÓN
// MISMA LÓGICA QUE /api/auth/sesion
// ======================================================

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

    // IMPORTANTE:
    // Tu sesión guarda exp en SEGUNDOS.
    const ahora = Math.floor(Date.now() / 1000);

    if (datos.exp <= ahora) {
      return null;
    }

    return datos;
  } catch (error) {
    console.error("Error verificando sesión:", error);
    return null;
  }
}

// ======================================================
// OBTENER EXTENSIÓN
// ======================================================

function obtenerExtension(archivo) {
  const tipo = (archivo.type || "").toLowerCase();

  if (tipo === "image/jpeg" || tipo === "image/jpg") {
    return "jpg";
  }

  if (tipo === "image/png") {
    return "png";
  }

  if (tipo === "image/webp") {
    return "webp";
  }

  if (tipo === "image/heic") {
    return "heic";
  }

  if (tipo === "image/heif") {
    return "heif";
  }

  const nombre = archivo.name || "";
  const partes = nombre.split(".");

  if (partes.length > 1) {
    const extension = partes
      .pop()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (extension) {
      return extension;
    }
  }

  return "jpg";
}

// ======================================================
// POST
// ======================================================

export async function POST(request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    const authSessionSecret =
      process.env.AUTH_SESSION_SECRET;

    if (
      !supabaseUrl ||
      !supabaseSecretKey ||
      !authSessionSecret
    ) {
      console.error(
        "Faltan variables de entorno para subir fotografías."
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Falta configuración del servidor para subir fotografías.",
        },
        { status: 500 }
      );
    }

    // ==================================================
    // 1. LEER COOKIE
    // ==================================================

    const cookieStore = await cookies();

    const token =
      cookieStore.get("ra_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Debes iniciar sesión.",
        },
        { status: 401 }
      );
    }

    // ==================================================
    // 2. VERIFICAR TOKEN
    // ==================================================

    const sesion = verificarToken(
      token,
      authSessionSecret
    );

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu sesión no es válida o expiró.",
        },
        { status: 401 }
      );
    }

    // ==================================================
    // 3. COMPROBAR QUE SEA MAESTRO
    // ==================================================

    if (sesion.rol !== "MAESTRO") {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes permiso para subir fotografías de productos.",
        },
        { status: 403 }
      );
    }

    // ==================================================
    // 4. RECIBIR ARCHIVO
    // ==================================================

    const formData = await request.formData();

    const archivo = formData.get("foto");

    if (!archivo || typeof archivo === "string") {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Selecciona una fotografía.",
        },
        { status: 400 }
      );
    }

    if (!archivo.type?.startsWith("image/")) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El archivo seleccionado debe ser una imagen.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 5. NOMBRE ÚNICO
    // ==================================================

    const extension =
      obtenerExtension(archivo);

    const identificador =
      crypto.randomUUID();

    const fecha = new Date()
      .toISOString()
      .slice(0, 10);

    const nombreArchivo =
      `catalogo/${fecha}/${identificador}.${extension}`;

    // ==================================================
    // 6. CONVERTIR A BUFFER
    // ==================================================

    const arrayBuffer =
      await archivo.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    // ==================================================
    // 7. SUBIR A SUPABASE STORAGE
    // ==================================================

    const rutaStorage =
      `${supabaseUrl}/storage/v1/object/productos/` +
      nombreArchivo;

    const respuestaStorage = await fetch(
      rutaStorage,
      {
        method: "POST",

        headers: {
          apikey: supabaseSecretKey,

          Authorization:
            `Bearer ${supabaseSecretKey}`,

          "Content-Type":
            archivo.type ||
            "application/octet-stream",

          "x-upsert": "false",
        },

        body: buffer,
      }
    );

    // ==================================================
    // 8. COMPROBAR SUBIDA
    // ==================================================

    if (!respuestaStorage.ok) {
      const detalle =
        await respuestaStorage.text();

      console.error(
        "Error subiendo fotografía a Storage:",
        respuestaStorage.status,
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos subir la fotografía a Supabase.",
          detalle,
        },
        { status: 500 }
      );
    }

    // ==================================================
    // 9. CREAR URL PÚBLICA
    // ==================================================

    const urlPublica =
      `${supabaseUrl}/storage/v1/object/public/productos/` +
      nombreArchivo;

    console.log(
      "Fotografía subida correctamente:",
      nombreArchivo
    );

    return NextResponse.json({
      ok: true,
      mensaje:
        "Fotografía subida correctamente.",
      url: urlPublica,
      ruta: nombreArchivo,
    });
  } catch (error) {
    console.error(
      "Error general subiendo fotografía:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error al subir la fotografía.",
      },
      { status: 500 }
    );
  }
}
