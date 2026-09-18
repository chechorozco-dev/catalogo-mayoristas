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
    if (!token || !secreto) {
      return null;
    }

    const partes = token.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [payload, firmaRecibida] = partes;

    const firmaCorrecta = crearFirma(
      payload,
      secreto
    );

    const bufferRecibido =
      Buffer.from(firmaRecibida);

    const bufferCorrecto =
      Buffer.from(firmaCorrecta);

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

    const ahora = Math.floor(
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

async function obtenerSesion() {
  const secreto =
    process.env.AUTH_SESSION_SECRET;

  if (!secreto) {
    return null;
  }

  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "ra_session"
    )?.value;

  return verificarToken(
    token,
    secreto
  );
}

function limpiarTelefono(valor) {
  return String(valor || "").replace(
    /\D/g,
    ""
  );
}

/* =========================================
   GET - CARGAR TIENDA
========================================= */

export async function GET() {
  try {
    const sesion =
      await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Debes iniciar sesión.",
        },
        { status: 401 }
      );
    }

    if (!sesion.tienda_id) {
      return NextResponse.json(
        {
          ok: false,
          necesita_tienda: true,
          mensaje:
            "Todavía no tienes una tienda.",
        },
        { status: 404 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El servicio no está configurado.",
        },
        { status: 500 }
      );
    }

    const headers = {
      apikey: supabaseSecretKey,
      "Content-Type":
        "application/json",
    };

    /*
      Confirmamos que el cliente siga activo
      y que tienda_id siga siendo suyo.
    */

    const clienteResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/clientes_autorizados?id=eq.${encodeURIComponent(
          sesion.cliente_id
        )}&activo=eq.true&select=id,nombre,telefono,tienda_id`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    if (!clienteResponse.ok) {
      const texto =
        await clienteResponse.text();

      console.error(
        "Error consultando cliente:",
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos validar tu cuenta.",
        },
        { status: 500 }
      );
    }

    const clientes =
      await clienteResponse.json();

    const cliente =
      clientes?.[0];

    if (!cliente) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu cuenta ya no está autorizada.",
        },
        { status: 403 }
      );
    }

    if (!cliente.tienda_id) {
      return NextResponse.json(
        {
          ok: false,
          necesita_tienda: true,
        },
        { status: 404 }
      );
    }

    const tiendaResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/tiendas?id=eq.${encodeURIComponent(
          cliente.tienda_id
        )}&activa=eq.true&select=id,nombre_tienda,slug,whatsapp,logo_url,color_principal,color_fondo,activa,creado_en`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    if (!tiendaResponse.ok) {
      const texto =
        await tiendaResponse.text();

      console.error(
        "Error consultando tienda:",
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos cargar tu tienda.",
        },
        { status: 500 }
      );
    }

    const tiendas =
      await tiendaResponse.json();

    const tienda =
      tiendas?.[0];

    if (!tienda) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No encontramos tu tienda.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,

      cliente: {
        id: cliente.id,
        nombre:
          cliente.nombre || "",
        telefono:
          cliente.telefono,
      },

      tienda,
    });
  } catch (error) {
    console.error(
      "Error en GET mi-tienda:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error inesperado.",
      },
      { status: 500 }
    );
  }
}

/* =========================================
   PATCH - EDITAR TIENDA
========================================= */

export async function PATCH(request) {
  try {
    const sesion =
      await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Debes iniciar sesión.",
        },
        { status: 401 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El servicio no está configurado.",
        },
        { status: 500 }
      );
    }

    const headers = {
      apikey: supabaseSecretKey,
      "Content-Type":
        "application/json",
    };

    /*
      Volvemos a comprobar en la base
      cuál es la tienda de este cliente.
    */

    const clienteResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/clientes_autorizados?id=eq.${encodeURIComponent(
          sesion.cliente_id
        )}&activo=eq.true&select=id,tienda_id`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    if (!clienteResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos validar tu cuenta.",
        },
        { status: 500 }
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
        { status: 404 }
      );
    }

    const body =
      await request.json();
      const colorPrincipal =
  String(
    body.color_principal || "#000000"
  ).trim();

const colorFondo =
  String(
    body.color_fondo || "#FFFFFF"
  ).trim();

    const nombreTienda =
      String(
        body.nombre_tienda || ""
      ).trim();

    let whatsapp =
      limpiarTelefono(
        body.whatsapp
      );

    if (nombreTienda.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El nombre de la tienda no puede quedar vacío.",
        },
        { status: 400 }
      );
    }

    if (nombreTienda.length > 80) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El nombre es demasiado largo.",
        },
        { status: 400 }
      );
    }

    /*
      Si escribe un celular colombiano
      de 10 dígitos, agregamos 57.
    */

    if (
      whatsapp.length === 10 &&
      whatsapp.startsWith("3")
    ) {
      whatsapp =
        "57" + whatsapp;
    }

    if (whatsapp.length < 10) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Escribe un WhatsApp válido.",
        },
        { status: 400 }
      );
    }

    const actualizarResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/tiendas?id=eq.${encodeURIComponent(
          cliente.tienda_id
        )}`,
        {
          method: "PATCH",

          headers: {
            ...headers,
            Prefer:
              "return=representation",
          },

          body: JSON.stringify({
            nombre_tienda:
              nombreTienda,
            whatsapp,
          }),
        }
      );

    if (!actualizarResponse.ok) {
      const texto =
        await actualizarResponse.text();

      console.error(
        "Error actualizando tienda:",
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos guardar los cambios.",
        },
        { status: 500 }
      );
    }

    const tiendas =
      await actualizarResponse.json();

    return NextResponse.json({
      ok: true,
      mensaje:
        "Datos actualizados correctamente.",
      tienda:
        tiendas?.[0] || null,
    });
  } catch (error) {
    console.error(
      "Error actualizando tienda:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error inesperado.",
      },
      { status: 500 }
    );
  }
}
