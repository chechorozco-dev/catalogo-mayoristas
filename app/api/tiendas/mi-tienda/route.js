import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { normalizarWhatsappTienda } from "../../../../lib/catalogo/formatos.mjs";

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

/* =========================================
   LIMPIAR RED SOCIAL
========================================= */

function limpiarRedSocial(valor) {
  return String(valor || "")
    .trim()
    .slice(0, 200);
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
        )}&activa=eq.true&select=id,nombre_tienda,slug,whatsapp,logo_url,color_principal,color_fondo,mensaje_portada,instagram,facebook,tiktok,activa,creado_en,moneda,tipo_tienda`,
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
        )}&activo=eq.true&select=id,tienda_id,negocio_id,tiendas(tipo_tienda,whatsapp)`,
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

    // Solo actualiza la moneda de la tienda del cliente autenticado.
    // Nunca convierte los precios existentes.
    if (body && Object.keys(body).length === 1 && Object.hasOwn(body, "moneda")) {
      const moneda = String(body.moneda || "").toUpperCase();
      if (!["COP", "USD"].includes(moneda)) {
        return NextResponse.json({ ok: false, mensaje: "Moneda no válida." }, { status: 400 });
      }
      const filtroTienda = `id=eq.${encodeURIComponent(cliente.tienda_id)}&negocio_id=eq.${encodeURIComponent(cliente.negocio_id)}`;
      const tiendaActualResponse = await fetch(
        `${supabaseUrl}/rest/v1/tiendas?${filtroTienda}&select=id,tipo_tienda,activa,moneda&limit=1`,
        { headers, cache: "no-store" }
      );
      if (!tiendaActualResponse.ok) {
        return NextResponse.json({ ok: false, mensaje: "No se pudo verificar la tienda." }, { status: 500 });
      }
      const tiendaActual = (await tiendaActualResponse.json())?.[0];
      if (!tiendaActual || tiendaActual.activa !== true) {
        return NextResponse.json({ ok: false, mensaje: "Tienda no encontrada." }, { status: 404 });
      }
      if (String(tiendaActual.tipo_tienda || "").toUpperCase() === "RA" && moneda !== "COP") {
        return NextResponse.json({ ok: false, mensaje: "La tienda mayorista principal utiliza COP." }, { status: 403 });
      }
      const respuesta = await fetch(
        `${supabaseUrl}/rest/v1/tiendas?${filtroTienda}`,
        {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=representation" },
          body: JSON.stringify({ moneda }),
          cache: "no-store",
        }
      );
      if (!respuesta.ok) {
        return NextResponse.json({ ok: false, mensaje: "No pudimos cambiar la moneda." }, { status: 500 });
      }
      const tiendaActualizada = (await respuesta.json())?.[0];
      if (!tiendaActualizada) {
        return NextResponse.json({ ok: false, mensaje: "No se actualizó la tienda." }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        mensaje: "Moneda guardada. Los importes existentes no han sido convertidos.",
        tienda: { id: tiendaActualizada.id, moneda: tiendaActualizada.moneda },
      });
    }

    const cambios = {};
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, mensaje: "Datos de tienda no válidos." }, { status: 400 });
    }

    if (Object.hasOwn(body, "nombre_tienda")) {
      const nombre = String(body.nombre_tienda || "").trim();
      if (nombre.length < 2 || nombre.length > 80) {
        return NextResponse.json({ ok: false, mensaje: "El nombre de la tienda debe tener entre 2 y 80 caracteres." }, { status: 400 });
      }
      cambios.nombre_tienda = nombre;
    }
    if (Object.hasOwn(body, "whatsapp") && body.whatsapp !== cliente.tiendas?.whatsapp) {
      if (cliente.tiendas?.tipo_tienda !== "CLIENTE") {
        return NextResponse.json({ ok: false, mensaje: "Esta opción es para tiendas personalizadas." }, { status: 403 });
      }
      const numero = normalizarWhatsappTienda(body.whatsapp);
      if (!numero) {
        return NextResponse.json({ ok: false, mensaje: "Revisa el WhatsApp para pedidos. Escribe los 10 dígitos del celular colombiano o el número con su indicativo internacional." }, { status: 400 });
      }
      cambios.whatsapp = numero;
    }
    if (Object.hasOwn(body, "color_principal")) cambios.color_principal = String(body.color_principal || "#000000").trim();
    if (Object.hasOwn(body, "color_fondo")) cambios.color_fondo = String(body.color_fondo || "#FFFFFF").trim();
    if (Object.hasOwn(body, "mensaje_portada")) cambios.mensaje_portada = String(body.mensaje_portada || "").trim().slice(0, 120);
    for (const red of ["instagram", "facebook", "tiktok"]) {
      if (Object.hasOwn(body, red)) cambios[red] = limpiarRedSocial(body[red]);
    }

    const filtroTienda = `id=eq.${encodeURIComponent(cliente.tienda_id)}&negocio_id=eq.${encodeURIComponent(cliente.negocio_id)}&activa=eq.true`;
    const hayCambios = Object.keys(cambios).length > 0;
    const actualizarResponse = await fetch(
      `${supabaseUrl}/rest/v1/tiendas?${filtroTienda}`,
      hayCambios
        ? {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=representation" },
            body: JSON.stringify(cambios),
            cache: "no-store",
          }
        : { headers, cache: "no-store" }
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

    if (!tiendas?.[0]) {
      return NextResponse.json({ ok: false, mensaje: "No encontramos tu tienda activa." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        "Datos actualizados correctamente.",
      tienda:
        tiendas[0],
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
