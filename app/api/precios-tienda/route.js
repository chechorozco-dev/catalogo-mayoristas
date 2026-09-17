import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

const AUTH_SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET;

/* =========================================================
   LEER COOKIE
========================================================= */

function obtenerCookie(request, nombre) {
  return request.cookies.get(nombre)?.value || "";
}

/* =========================================================
   VALIDAR SESIÓN
========================================================= */

function validarSesion(cookie) {
  try {
    if (!cookie || !AUTH_SESSION_SECRET) {
      return null;
    }

    const ultimoPunto = cookie.lastIndexOf(".");

    if (ultimoPunto === -1) {
      return null;
    }

    const payloadBase64 =
      cookie.slice(0, ultimoPunto);

    const firmaRecibida =
      cookie.slice(ultimoPunto + 1);

    const firmaEsperada = crypto
      .createHmac(
        "sha256",
        AUTH_SESSION_SECRET
      )
      .update(payloadBase64)
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
        payloadBase64,
        "base64url"
      ).toString("utf8");

    const payload =
      JSON.parse(payloadTexto);

    return payload;
  } catch (error) {
    console.error(
      "Error validando sesión:",
      error
    );

    return null;
  }
}

/* =========================================================
   CONSULTAR SUPABASE
========================================================= */

async function consultarSupabase(ruta, opciones = {}) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${ruta}`,
    {
      ...opciones,

      headers: {
        apikey: SUPABASE_SECRET_KEY,
        "Content-Type": "application/json",
        ...(opciones.headers || {}),
      },

      cache: "no-store",
    }
  );

  const texto = await response.text();

  let data = null;

  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      data = texto;
    }
  }

  if (!response.ok) {
    console.error(
      "Error Supabase:",
      response.status,
      data
    );

    throw new Error(
      "Error consultando la base de datos."
    );
  }

  return data;
}

/* =========================================================
   OBTENER CLIENTE AUTENTICADO
========================================================= */

async function obtenerCliente(request) {
  const cookie =
    obtenerCookie(request, "ra_session");

  const sesion =
    validarSesion(cookie);

  if (!sesion) {
    return null;
  }

  let filtro = "";

  if (sesion.cliente_id) {
    filtro =
      `id=eq.${encodeURIComponent(
        sesion.cliente_id
      )}`;
  } else if (sesion.id) {
    filtro =
      `id=eq.${encodeURIComponent(
        sesion.id
      )}`;
  } else if (sesion.telefono) {
    filtro =
      `telefono=eq.${encodeURIComponent(
        sesion.telefono
      )}`;
  } else {
    return null;
  }

  const clientes =
    await consultarSupabase(
      `clientes_autorizados?select=id,nombre,telefono,activo,tienda_id,rol&${filtro}&limit=1`
    );

  if (
    !Array.isArray(clientes) ||
    clientes.length === 0
  ) {
    return null;
  }

  const cliente = clientes[0];

  if (cliente.activo !== true) {
    return null;
  }

  if (!cliente.tienda_id) {
    return null;
  }

  return cliente;
}

/* =========================================================
   GET
   TRAER PRECIOS PERSONALIZADOS DE ESTA TIENDA
========================================================= */

export async function GET(request) {
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

    const precios =
      await consultarSupabase(
        `precios_tienda?select=id,producto_id,variante_id,precio_sugerido,actualizado_en&tienda_id=eq.${encodeURIComponent(
          cliente.tienda_id
        )}&order=actualizado_en.desc`
      );

    return NextResponse.json({
      ok: true,
      precios:
        Array.isArray(precios)
          ? precios
          : [],
    });
  } catch (error) {
    console.error(
      "Error obteniendo precios:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "No pudimos cargar los precios personalizados.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   GUARDAR / ACTUALIZAR PRECIO PERSONALIZADO
========================================================= */

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

    const varianteId =
      body.variante_id !== null &&
      body.variante_id !== undefined &&
      body.variante_id !== ""
        ? Number(body.variante_id)
        : null;

    const precioSugerido =
      Number(body.precio_sugerido);

    /* ===============================================
       VALIDACIONES
    =============================================== */

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
      varianteId !== null &&
      (
        !Number.isInteger(varianteId) ||
        varianteId <= 0
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Variante no válida.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(precioSugerido) ||
      precioSugerido < 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Precio no válido.",
        },
        {
          status: 400,
        }
      );
    }

    /* ===============================================
       VERIFICAR QUE EL PRODUCTO EXISTE
    =============================================== */

    const productos =
      await consultarSupabase(
        `productos?select=id,activo&id=eq.${productoId}&limit=1`
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

    /* ===============================================
       SI HAY VARIANTE, VALIDAR QUE PERTENEZCA
       AL PRODUCTO
    =============================================== */

    if (varianteId !== null) {
      const variantes =
        await consultarSupabase(
          `producto_variantes?select=id,producto_id,activo&id=eq.${varianteId}&producto_id=eq.${productoId}&limit=1`
        );

      if (
        !Array.isArray(variantes) ||
        variantes.length === 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "La variante no pertenece a este producto.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ===============================================
       BUSCAR SI YA EXISTE UN PRECIO
    =============================================== */

    let rutaBusqueda =
      `precios_tienda?select=id&tienda_id=eq.${encodeURIComponent(
        cliente.tienda_id
      )}&producto_id=eq.${productoId}`;

    if (varianteId === null) {
      rutaBusqueda +=
        "&variante_id=is.null";
    } else {
      rutaBusqueda +=
        `&variante_id=eq.${varianteId}`;
    }

    rutaBusqueda += "&limit=1";

    const existentes =
      await consultarSupabase(
        rutaBusqueda
      );

    const datosGuardar = {
      tienda_id:
        cliente.tienda_id,

      producto_id:
        productoId,

      variante_id:
        varianteId,

      precio_sugerido:
        Math.round(precioSugerido),

      actualizado_en:
        new Date().toISOString(),
    };

    let resultado;

    /* ===============================================
       ACTUALIZAR
    =============================================== */

    if (
      Array.isArray(existentes) &&
      existentes.length > 0
    ) {
      const registroId =
        existentes[0].id;

      resultado =
        await consultarSupabase(
          `precios_tienda?id=eq.${registroId}`,
          {
            method: "PATCH",

            headers: {
              Prefer:
                "return=representation",
            },

            body: JSON.stringify({
              precio_sugerido:
                datosGuardar.precio_sugerido,

              actualizado_en:
                datosGuardar.actualizado_en,
            }),
          }
        );
    }

    /* ===============================================
       CREAR
    =============================================== */

    else {
      resultado =
        await consultarSupabase(
          "precios_tienda",
          {
            method: "POST",

            headers: {
              Prefer:
                "return=representation",
            },

            body:
              JSON.stringify(
                datosGuardar
              ),
          }
        );
    }

    return NextResponse.json({
      ok: true,

      mensaje:
        "Precio guardado correctamente.",

      precio_sugerido:
        datosGuardar.precio_sugerido,

      producto_id:
        productoId,

      variante_id:
        varianteId,

      registro:
        Array.isArray(resultado)
          ? resultado[0] || null
          : resultado,
    });
  } catch (error) {
    console.error(
      "Error guardando precio:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          error.message ||
          "No pudimos guardar el precio.",
      },
      {
        status: 500,
      }
    );
  }
}