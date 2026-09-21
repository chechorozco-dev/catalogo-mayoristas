import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "ra_session";

// =========================================
// VERIFICAR SESIÓN
// =========================================

function verificarSesion(cookieValue) {
  try {
    if (!cookieValue) {
      return null;
    }

    const partes = cookieValue.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [payloadCodificado, firmaRecibida] =
      partes;

    const secret =
      process.env.AUTH_SESSION_SECRET;

    if (!secret) {
      console.error(
        "Falta AUTH_SESSION_SECRET"
      );

      return null;
    }

    const firmaEsperada = crypto
      .createHmac("sha256", secret)
      .update(payloadCodificado)
      .digest("base64url");

    const bufferRecibido =
      Buffer.from(firmaRecibida);

    const bufferEsperado =
      Buffer.from(firmaEsperada);

    if (
      bufferRecibido.length !==
      bufferEsperado.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        bufferRecibido,
        bufferEsperado
      )
    ) {
      return null;
    }

    const payloadTexto =
      Buffer.from(
        payloadCodificado,
        "base64url"
      ).toString("utf8");

    return JSON.parse(payloadTexto);
  } catch (error) {
    console.error(
      "Error verificando sesión:",
      error
    );

    return null;
  }
}

// =========================================
// PETICIÓN A SUPABASE
// =========================================

async function supabaseRequest(
  ruta,
  opciones = {}
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  if (!secretKey) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY"
    );
  }

  const respuesta = await fetch(
    `${supabaseUrl}/rest/v1/${ruta}`,
    {
      ...opciones,

      headers: {
        apikey: secretKey,
        "Content-Type":
          "application/json",
        ...(opciones.headers || {}),
      },

      cache: "no-store",
    }
  );

  const texto =
    await respuesta.text();

  let data = null;

  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      data = texto;
    }
  }

  if (!respuesta.ok) {
    console.error(
      "Error Supabase:",
      respuesta.status,
      data
    );

    throw new Error(
      typeof data === "object" &&
        data?.message
        ? data.message
        : `Error Supabase ${respuesta.status}`
    );
  }

  return data;
}

// =========================================
// OBTENER CLIENTE DE LA SESIÓN
// =========================================

async function obtenerCliente(request) {
  const cookieValue =
    request.cookies.get(
      COOKIE_NAME
    )?.value;

  const sesion =
    verificarSesion(cookieValue);

  if (!sesion) {
    return null;
  }

  const clienteId =
    sesion.id ||
    sesion.cliente_id ||
    sesion.cliente?.id;

  const telefono =
    sesion.telefono ||
    sesion.cliente?.telefono;

  let filtroCliente = "";

  if (clienteId) {
    filtroCliente =
      `id=eq.${encodeURIComponent(
        clienteId
      )}`;
  } else if (telefono) {
    filtroCliente =
      `telefono=eq.${encodeURIComponent(
        telefono
      )}`;
  } else {
    return null;
  }

  const clientes =
    await supabaseRequest(
      `clientes_autorizados` +
        `?select=id,nombre,telefono,activo,tienda_id,rol` +
        `&${filtroCliente}` +
        `&limit=1`
    );

  const cliente =
    Array.isArray(clientes)
      ? clientes[0]
      : null;

  if (
    !cliente ||
    cliente.activo !== true ||
    !cliente.tienda_id
  ) {
    return null;
  }

  return cliente;
}

// =========================================
// POST
// MOSTRAR / OCULTAR PRODUCTO
// =========================================

export async function POST(request) {
  try {
    const cliente =
      await obtenerCliente(request);

    if (!cliente) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Sesión no válida.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const productoId =
      Number(body.producto_id);

    const visible =
      body.visible;

    // =====================================
    // VALIDACIONES
    // =====================================

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Producto no válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof visible !== "boolean"
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Estado de visibilidad no válido.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // VERIFICAR QUE PRODUCTO EXISTE
    // =====================================

    const productos =
      await supabaseRequest(
        `productos` +
          `?select=id` +
          `&id=eq.${productoId}` +
          `&limit=1`
      );

    if (
      !Array.isArray(productos) ||
      productos.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El producto no existe.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================
    // BUSCAR CONFIGURACIÓN EXISTENTE
    // =====================================

    const existentes =
      await supabaseRequest(
        `tienda_productos` +
          `?select=id,visible` +
          `&tienda_id=eq.${encodeURIComponent(
            cliente.tienda_id
          )}` +
          `&producto_id=eq.${productoId}` +
          `&limit=1`
      );

    let resultado = null;

    // =====================================
    // SI YA EXISTE -> ACTUALIZAR
    // =====================================

    if (
      Array.isArray(existentes) &&
      existentes.length > 0
    ) {
      const registroId =
        existentes[0].id;

      resultado =
        await supabaseRequest(
          `tienda_productos?id=eq.${registroId}`,
          {
            method: "PATCH",

            headers: {
              Prefer:
                "return=representation",
            },

            body: JSON.stringify({
              visible,
            }),
          }
        );
    }

    // =====================================
    // SI NO EXISTE -> CREAR
    // =====================================

    else {
      resultado =
        await supabaseRequest(
          "tienda_productos",
          {
            method: "POST",

            headers: {
              Prefer:
                "return=representation",
            },

            body: JSON.stringify({
              tienda_id:
                cliente.tienda_id,

              producto_id:
                productoId,

              visible,
            }),
          }
        );
    }

    // =====================================
    // RESPUESTA
    // =====================================

    return NextResponse.json({
      ok: true,

      producto_id:
        productoId,

      visible,

      mensaje: visible
        ? "Producto visible en tu catálogo."
        : "Producto ocultado de tu catálogo.",

      registro:
        Array.isArray(resultado)
          ? resultado[0] || null
          : resultado,
    });
  } catch (error) {
    console.error(
      "ERROR VISIBILIDAD PRODUCTO:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          error?.message ||
          "No pudimos cambiar la visibilidad del producto.",
      },
      {
        status: 500,
      }
    );
  }
}
