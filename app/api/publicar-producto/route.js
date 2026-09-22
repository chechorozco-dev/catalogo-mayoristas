import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "ra_session";

function base64UrlDecode(valor) {
  let texto = String(valor || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (texto.length % 4) {
    texto += "=";
  }

  return Buffer.from(texto, "base64").toString("utf8");
}

function verificarSesion(cookieValue) {
  try {
    if (!cookieValue) return null;

    const partes = cookieValue.split(".");
    if (partes.length !== 2) return null;

    const [payloadCodificado, firmaRecibida] = partes;

    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) return null;

    const firmaEsperada = crypto
      .createHmac("sha256", secret)
      .update(payloadCodificado)
      .digest("base64url");

    const recibido = Buffer.from(firmaRecibida);
    const esperado = Buffer.from(firmaEsperada);

    if (recibido.length !== esperado.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(recibido, esperado)) {
      return null;
    }

    return JSON.parse(
      base64UrlDecode(payloadCodificado)
    );
  } catch (error) {
    console.error(
      "Error verificando sesión:",
      error
    );

    return null;
  }
}

function obtenerCookie(request, nombre) {
  return request.cookies.get(nombre)?.value || "";
}

async function supabaseRequest(
  ruta,
  opciones = {}
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Faltan variables de Supabase."
    );
  }

  const respuesta = await fetch(
    `${supabaseUrl}/rest/v1/${ruta}`,
    {
      ...opciones,

      headers: {
        apikey: secretKey,
        "Content-Type": "application/json",
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

export async function POST(request) {
  try {
    /* 1. VERIFICAR SESIÓN */

    const cookieValue =
      obtenerCookie(request, COOKIE_NAME);

    const sesion =
      verificarSesion(cookieValue);

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes una sesión válida.",
        },
        { status: 401 }
      );
    }

    /* 2. IDENTIFICAR AL CLIENTE */

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
            "No pudimos identificar tu cuenta.",
        },
        { status: 401 }
      );
    }

    const clientes =
      await supabaseRequest(
        `clientes_autorizados` +
          `?select=id,activo,tienda_id` +
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
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No encontramos una tienda válida.",
        },
        { status: 403 }
      );
    }

    /* 3. RECIBIR PRODUCTO */

    const body =
      await request.json();

    const productoId =
      Number(body?.producto_id);

    if (
      !Number.isFinite(productoId) ||
      productoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Producto no válido.",
        },
        { status: 400 }
      );
    }

    /* 4. VERIFICAR QUE EL PRODUCTO EXISTA */

    const productos =
      await supabaseRequest(
        `productos` +
          `?id=eq.${productoId}` +
          `&activo=eq.true` +
          `&select=id` +
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
        { status: 404 }
      );
    }

    /* 5. BUSCAR CONFIGURACIÓN EXISTENTE */

    const registros =
      await supabaseRequest(
        `tienda_productos` +
          `?tienda_id=eq.${encodeURIComponent(
            cliente.tienda_id
          )}` +
          `&producto_id=eq.${productoId}` +
          `&select=id,visible,precio_personalizado,publicar_anticipadamente` +
          `&limit=1`
      );

    const existente =
      Array.isArray(registros)
        ? registros[0]
        : null;

    /* 6. PUBLICAR ANTICIPADAMENTE */

    if (existente) {
      await supabaseRequest(
        `tienda_productos?id=eq.${existente.id}`,
        {
          method: "PATCH",

          headers: {
            Prefer: "return=representation",
          },

          body: JSON.stringify({
            publicar_anticipadamente: true,
          }),
        }
      );
    } else {
      await supabaseRequest(
        "tienda_productos",
        {
          method: "POST",

          headers: {
            Prefer: "return=representation",
          },

          body: JSON.stringify({
            tienda_id:
              cliente.tienda_id,

            producto_id:
              productoId,

            visible: true,

            publicar_anticipadamente:
              true,
          }),
        }
      );
    }

    return NextResponse.json({
      ok: true,
      producto_id: productoId,
      publicar_anticipadamente: true,
      mensaje:
        "Producto publicado correctamente.",
    });
  } catch (error) {
    console.error(
      "ERROR PUBLICANDO PRODUCTO:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          error?.message ||
          "No pudimos publicar el producto.",
      },
      { status: 500 }
    );
  }
}
