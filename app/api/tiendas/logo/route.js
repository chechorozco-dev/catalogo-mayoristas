import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function crearFirma(valor, secreto) {
  return crypto
    .createHmac("sha256", secreto)
    .update(valor)
    .digest("base64url");
}

function verificarToken(token, secreto) {
  try {
    if (!token || !secreto) return null;

    const partes = token.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [payload, firmaRecibida] =
      partes;

    const firmaCorrecta =
      crearFirma(
        payload,
        secreto
      );

    const bufferRecibido =
      Buffer.from(
        firmaRecibida
      );

    const bufferCorrecto =
      Buffer.from(
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

    const datos =
      JSON.parse(
        Buffer.from(
          payload,
          "base64url"
        ).toString("utf8")
      );

    const ahora =
      Math.floor(
        Date.now() / 1000
      );

    if (
      !datos.exp ||
      datos.exp <= ahora
    ) {
      return null;
    }

    return datos;
  } catch (error) {
    console.error(
      "Error verificando sesión:",
      error
    );

    return null;
  }
}

function extensionDesdeTipo(tipo) {
  if (tipo === "image/png") {
    return "png";
  }

  if (tipo === "image/webp") {
    return "webp";
  }

  if (
    tipo === "image/jpeg" ||
    tipo === "image/jpg"
  ) {
    return "jpg";
  }

  return null;
}

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
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El servicio no está configurado correctamente.",
        },
        {
          status: 500,
        }
      );
    }

    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        "ra_session"
      )?.value;

    const sesion =
      verificarToken(
        token,
        authSessionSecret
      );

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Debes iniciar sesión.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      Buscar el cliente autorizado.
    */

    const clienteResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/clientes_autorizados?id=eq.${encodeURIComponent(
          sesion.cliente_id
        )}&activo=eq.true&select=id,tienda_id`,
        {
          method: "GET",
          headers: {
            apikey:
              supabaseSecretKey,
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
        }
      );

    if (!clienteResponse.ok) {
      const detalle =
        await clienteResponse.text();

      console.error(
        "Error buscando cliente:",
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos validar tu cuenta.",
        },
        {
          status: 500,
        }
      );
    }

    const clientes =
      await clienteResponse.json();

    const cliente =
      clientes?.[0];

    if (
      !cliente ||
      !cliente.tienda_id
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No encontramos tu tienda.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      Recibir imagen.
    */

    const formData =
      await request.formData();

    const archivo =
      formData.get("logo");

    if (
      !archivo ||
      typeof archivo === "string"
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Selecciona una imagen.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      El navegador normalmente enviará WEBP
      después de comprimir.
    */

    const tiposPermitidos = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos procesar este formato de imagen.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Máximo final de 5 MB.
      La imagen normalmente llegará
      muchísimo más pequeña.
    */

    const maximoBytes =
      5 * 1024 * 1024;

    if (
      archivo.size >
      maximoBytes
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "La imagen es demasiado pesada.",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      extensionDesdeTipo(
        archivo.type
      );

    if (!extension) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Formato de imagen no permitido.",
        },
        {
          status: 400,
        }
      );
    }

    const bytes =
      await archivo.arrayBuffer();

    /*
      Utilizamos siempre el mismo nombre
      lógico por tienda.
    */

    const nombreArchivo =
      `${cliente.tienda_id}/logo.${extension}`;

    /*
      Subir / reemplazar en Storage.
    */

    const storageResponse =
      await fetch(
        `${supabaseUrl}/storage/v1/object/logos-tiendas/${nombreArchivo}`,
        {
          method: "POST",

          headers: {
            apikey:
              supabaseSecretKey,

            Authorization:
              `Bearer ${supabaseSecretKey}`,

            "Content-Type":
              archivo.type,

            "x-upsert":
              "true",
          },

          body:
            Buffer.from(bytes),
        }
      );

    if (!storageResponse.ok) {
      const texto =
        await storageResponse.text();

      console.error(
        "Error subiendo logo:",
        storageResponse.status,
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos subir el logo.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      URL pública.
    */

    const logoUrl =
      `${supabaseUrl}/storage/v1/object/public/logos-tiendas/${nombreArchivo}`;

    /*
      Guardar URL en tiendas.
    */

    const tiendaResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/tiendas?id=eq.${encodeURIComponent(
          cliente.tienda_id
        )}`,
        {
          method: "PATCH",

          headers: {
            apikey:
              supabaseSecretKey,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation",
          },

          body:
            JSON.stringify({
              logo_url:
                logoUrl,
            }),
        }
      );

    if (!tiendaResponse.ok) {
      const texto =
        await tiendaResponse.text();

      console.error(
        "Error guardando logo_url:",
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Subimos el logo, pero no pudimos vincularlo a tu tienda.",
        },
        {
          status: 500,
        }
      );
    }

    const tiendas =
      await tiendaResponse.json();

    return NextResponse.json({
      ok: true,

      mensaje:
        "Logo actualizado correctamente.",

      logo_url:
        logoUrl,

      tienda:
        tiendas?.[0] || null,
    });
  } catch (error) {
    console.error(
      "Error general subiendo logo:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error inesperado al subir el logo.",
      },
      {
        status: 500,
      }
    );
  }
}
