import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// =========================================
// CONFIGURACIÓN
// =========================================

const COOKIE_NAME = "ra_session";

// =========================================
// BASE64 URL
// =========================================

function base64UrlEncode(valor) {
  return Buffer.from(valor)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(valor) {
  let texto = String(valor || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (texto.length % 4) {
    texto += "=";
  }

  return Buffer.from(texto, "base64").toString(
    "utf8"
  );
}

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
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    const bufferRecibido = Buffer.from(
      firmaRecibida
    );

    const bufferEsperado = Buffer.from(
      firmaEsperada
    );

    if (
      bufferRecibido.length !==
      bufferEsperado.length
    ) {
      return null;
    }

    const firmaValida =
      crypto.timingSafeEqual(
        bufferRecibido,
        bufferEsperado
      );

    if (!firmaValida) {
      return null;
    }

    const payloadTexto =
      base64UrlDecode(payloadCodificado);

    const payload =
      JSON.parse(payloadTexto);

    return payload;
  } catch (error) {
    console.error(
      "Error verificando sesión:",
      error
    );

    return null;
  }
}

// =========================================
// LEER COOKIE
// =========================================

function obtenerCookie(request, nombre) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const indice = cookie.indexOf("=");

    if (indice === -1) continue;

    const clave = cookie.slice(0, indice);
    const valor = cookie.slice(indice + 1);

    if (clave === nombre) {
      return decodeURIComponent(valor);
    }
  }

  return null;
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

  const texto = await respuesta.text();

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
// GET PRODUCTOS MAYORISTAS
// =========================================

export async function GET(request) {
  try {
    // =====================================
    // 1. SESIÓN
    // =====================================

    const cookieValue =
      obtenerCookie(
        request,
        COOKIE_NAME
      );

    const sesion =
      verificarSesion(cookieValue);

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes una sesión válida.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================
    // 2. IDENTIFICAR CLIENTE
    // =====================================

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
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos identificar al cliente.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================
    // 3. VERIFICAR CLIENTE
    // =====================================

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
      cliente.activo !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu acceso no está autorizado.",
        },
        {
          status: 403,
        }
      );
    }

    if (!cliente.tienda_id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Primero debes crear tu tienda.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================
    // 4. PRODUCTOS
    // =====================================
    //
    // Esta API es PRIVADA.
    // Aquí sí podemos entregar costo.
    // =====================================

    const productosData =
      await supabaseRequest(
        `productos` +
          `?select=` +
          [
            "id",
            "referencia",
            "nombre",
            "categoria",
            "descripcion",
            "foto_url",
            "foto_url_2",
            "costo",
            "precio_detal",
            "precio_minimo",
            "activo",
            "created_at",
            "tiene_variantes",
          ].join(",") +
          `&activo=eq.true` +
          `&order=created_at.desc`
      );

    const productosBase =
      Array.isArray(productosData)
        ? productosData
        : [];

    // =====================================
    // 5. IDs DE PRODUCTOS CON VARIANTES
    // =====================================

    const idsConVariantes =
      productosBase
        .filter(
          (producto) =>
            producto.tiene_variantes ===
            true
        )
        .map((producto) =>
          Number(producto.id)
        )
        .filter((id) =>
          Number.isFinite(id)
        );

    // =====================================
    // 6. CARGAR VARIANTES
    // =====================================

    let variantesData = [];

    if (idsConVariantes.length > 0) {
      const ids =
        idsConVariantes.join(",");

      const variantes =
        await supabaseRequest(
          `producto_variantes` +
            `?select=` +
            [
              "id",
              "producto_id",
              "nombre_variante",
              "referencia",
              "foto_url",
              "foto_url_2",
              "costo",
              "precio_detal",
              "precio_minimo",
              "infoimagen",
              "activo",
              "orden",
            ].join(",") +
            `&producto_id=in.(${ids})` +
            `&activo=eq.true` +
            `&order=orden.asc`
        );

      variantesData =
        Array.isArray(variantes)
          ? variantes
          : [];
    }

    // =====================================
    // 7. UNIR PRODUCTOS + VARIANTES
    // =====================================

    const productos =
      productosBase.map(
        (producto) => {
          const variantes =
            variantesData
              .filter(
                (variante) =>
                  String(
                    variante.producto_id
                  ) ===
                  String(producto.id)
              )
              .sort(
                (a, b) =>
                  Number(a.orden || 0) -
                  Number(b.orden || 0)
              )
              .map(
                (variante) => ({
                  id:
                    variante.id,

                  producto_id:
                    variante.producto_id,

                  nombre_variante:
                    variante.nombre_variante,

                  referencia:
                    variante.referencia,

                  foto_url:
                    variante.foto_url,

                  foto_url_2:
                    variante.foto_url_2,

                  costo:
                    Number(
                      variante.costo || 0
                    ),

                  precio_detal:
                    Number(
                      variante.precio_detal ||
                        0
                    ),

                  precio_minimo:
                    Number(
                      variante.precio_minimo ||
                        0
                    ),

                  infoimagen:
                    variante.infoimagen ||
                    "",

                  activo:
                    variante.activo,

                  orden:
                    variante.orden,
                })
              );

          return {
            id:
              producto.id,

            referencia:
              producto.referencia,

            nombre:
              producto.nombre,

            categoria:
              producto.categoria || "",

            descripcion:
              producto.descripcion || "",

            foto_url:
              producto.foto_url || "",

            foto_url_2:
              producto.foto_url_2 || "",

            costo:
              Number(
                producto.costo || 0
              ),

            precio_detal:
              Number(
                producto.precio_detal || 0
              ),

            precio_minimo:
              Number(
                producto.precio_minimo || 0
              ),

            activo:
              producto.activo,

            created_at:
              producto.created_at,

            tiene_variantes:
              producto.tiene_variantes ===
                true &&
              variantes.length > 0,

            variantes:
              variantes,
          };
        }
      );

    // =====================================
    // 8. RESPUESTA
    // =====================================

    return NextResponse.json(
      {
        ok: true,

        productos,

        total:
          productos.length,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "ERROR PRODUCTOS MAYORISTAS:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          error?.message ||
          "No se pudieron cargar los productos.",
      },
      {
        status: 500,
      }
    );
  }
}
