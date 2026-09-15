import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

function base64UrlDecode(valor) {
  return Buffer.from(valor, "base64url").toString("utf8");
}

function verificarFirma(token, secreto) {
  try {
    if (!token || !secreto) return null;

    const partes = token.split(".");
    if (partes.length !== 2) return null;

    const [payloadBase64, firmaRecibida] = partes;

    const firmaEsperada = crypto
      .createHmac("sha256", secreto)
      .update(payloadBase64)
      .digest("base64url");

    const bufferEsperado = Buffer.from(firmaEsperada);
    const bufferRecibido = Buffer.from(firmaRecibida);

    if (bufferEsperado.length !== bufferRecibido.length) {
      return null;
    }

    const firmaCorrecta = crypto.timingSafeEqual(
      bufferEsperado,
      bufferRecibido
    );

    if (!firmaCorrecta) return null;

    const payload = JSON.parse(base64UrlDecode(payloadBase64));

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Error verificando sesión:", error);
    return null;
  }
}

function limpiarNombreArchivo(nombre = "") {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function obtenerExtension(archivo) {
  const tipo = archivo.type?.toLowerCase();

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
    return limpiarNombreArchivo(partes.pop());
  }

  return "jpg";
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    const authSessionSecret = process.env.AUTH_SESSION_SECRET;

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

    // ==============================
    // 1. COMPROBAR SESIÓN
    // ==============================

    const cookieStore = await cookies();
    const token = cookieStore.get("ra_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Debes iniciar sesión.",
        },
        { status: 401 }
      );
    }

    const sesion = verificarFirma(
      token,
      authSessionSecret
    );

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Tu sesión no es válida o expiró.",
        },
        { status: 401 }
      );
    }

    const clienteId =
      sesion.cliente_id ||
      sesion.id ||
      sesion.cliente?.id;

    if (!clienteId) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos identificar al administrador.",
        },
        { status: 401 }
      );
    }

    // ==============================
    // 2. COMPROBAR QUE SEA MAESTRO
    // ==============================

    const urlCliente =
      `${supabaseUrl}/rest/v1/clientes_autorizados` +
      `?id=eq.${encodeURIComponent(clienteId)}` +
      `&activo=eq.true` +
      `&select=id,nombre,telefono,rol`;

    const respuestaCliente = await fetch(urlCliente, {
      method: "GET",
      headers: {
        apikey: supabaseSecretKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!respuestaCliente.ok) {
      const detalle = await respuestaCliente.text();

      console.error(
        "Error verificando administrador maestro:",
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos comprobar los permisos del administrador.",
        },
        { status: 500 }
      );
    }

    const clientes = await respuestaCliente.json();
    const cliente = clientes?.[0];

    if (!cliente || cliente.rol !== "MAESTRO") {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes permiso para subir fotografías de productos.",
        },
        { status: 403 }
      );
    }

    // ==============================
    // 3. RECIBIR FOTO
    // ==============================

    const formData = await request.formData();
    const archivo = formData.get("foto");

    if (!archivo || typeof archivo === "string") {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Selecciona una fotografía.",
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

    /*
      IMPORTANTE:

      No colocamos aquí un límite artificial de 2 MB o 5 MB.

      El bucket "productos" que creaste tiene actualmente
      el límite del proyecto/bucket, que en tu captura aparece
      como 50 MB.

      Más adelante el navegador comprimirá automáticamente las
      fotografías grandes antes de enviarlas para conservar
      calidad y ahorrar almacenamiento.
    */

    // ==============================
    // 4. CREAR NOMBRE ÚNICO
    // ==============================

    const extension = obtenerExtension(archivo);

    const identificador = crypto.randomUUID();

    const fecha = new Date()
      .toISOString()
      .slice(0, 10);

    const nombreArchivo =
      `catalogo/${fecha}/${identificador}.${extension}`;

    // ==============================
    // 5. CONVERTIR ARCHIVO
    // ==============================

    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ==============================
    // 6. SUBIR A SUPABASE STORAGE
    // ==============================

    const rutaStorage =
      `${supabaseUrl}/storage/v1/object/productos/` +
      nombreArchivo;

    const respuestaStorage = await fetch(
      rutaStorage,
      {
        method: "POST",

        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            archivo.type || "application/octet-stream",
          "x-upsert": "false",
        },

        body: buffer,
      }
    );

    if (!respuestaStorage.ok) {
      const detalle = await respuestaStorage.text();

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

    // ==============================
    // 7. URL PÚBLICA
    // ==============================

    const urlPublica =
      `${supabaseUrl}/storage/v1/object/public/productos/` +
      nombreArchivo;

    return NextResponse.json({
      ok: true,
      mensaje: "Fotografía subida correctamente.",
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