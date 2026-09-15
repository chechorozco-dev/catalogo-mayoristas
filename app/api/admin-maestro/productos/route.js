import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

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

    if (
      !crypto.timingSafeEqual(
        bufferRecibido,
        bufferCorrecto
      )
    ) {
      return null;
    }

    const datos = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    const ahora = Math.floor(Date.now() / 1000);

    if (!datos.exp || datos.exp <= ahora) {
      return null;
    }

    return datos;
  } catch (error) {
    console.error("Error verificando token:", error);
    return null;
  }
}

function textoONull(valor) {
  const texto = String(valor || "").trim();

  return texto || null;
}

function numeroONull(valor) {
  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
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
            "Faltan variables de configuración.",
        },
        { status: 500 }
      );
    }

    /* =====================================
       1. VERIFICAR COOKIE
    ===================================== */

    const cookieStore = await cookies();

    const token =
      cookieStore.get("ra_session")?.value;

    const sesion = verificarToken(
      token,
      authSessionSecret
    );

    if (!sesion?.cliente_id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Sesión no válida.",
        },
        { status: 401 }
      );
    }

    const headersSupabase = {
      apikey: supabaseSecretKey,
      "Content-Type": "application/json",
    };

    /* =====================================
       2. COMPROBAR ROL EN BASE DE DATOS
       No confiamos únicamente en la cookie.
    ===================================== */

    const clienteResponse = await fetch(
      `${supabaseUrl}/rest/v1/clientes_autorizados?id=eq.${encodeURIComponent(
        sesion.cliente_id
      )}&activo=eq.true&select=id,rol`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!clienteResponse.ok) {
      const detalle = await clienteResponse.text();

      console.error(
        "Error comprobando maestro:",
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos comprobar tus permisos.",
        },
        { status: 500 }
      );
    }

    const clientes = await clienteResponse.json();

    const cliente = clientes?.[0];

    if (cliente?.rol !== "MAESTRO") {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes permiso para crear productos.",
        },
        { status: 403 }
      );
    }

    /* =====================================
       3. LEER PRODUCTO
    ===================================== */

    const body = await request.json();

    const referencia =
      String(body.referencia || "").trim();

    const nombre =
      String(body.nombre || "").trim();

    if (!referencia) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "La referencia es obligatoria.",
        },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El nombre del producto es obligatorio.",
        },
        { status: 400 }
      );
    }

    const precioDetal =
      numeroONull(body.precio_detal);

    if (precioDetal === null || precioDetal < 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El precio sugerido no es válido.",
        },
        { status: 400 }
      );
    }

    /* =====================================
       4. REVISAR REFERENCIA DUPLICADA
    ===================================== */

    const duplicadoResponse = await fetch(
      `${supabaseUrl}/rest/v1/productos?referencia=eq.${encodeURIComponent(
        referencia
      )}&select=id,referencia&limit=1`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!duplicadoResponse.ok) {
      const detalle = await duplicadoResponse.text();

      console.error(
        "Error revisando referencia:",
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos comprobar la referencia.",
        },
        { status: 500 }
      );
    }

    const duplicados =
      await duplicadoResponse.json();

    if (
      Array.isArray(duplicados) &&
      duplicados.length > 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Ya existe un producto con esa referencia.",
        },
        { status: 409 }
      );
    }

    /* =====================================
       5. CREAR PRODUCTO
    ===================================== */

    const nuevoProducto = {
      referencia,
      nombre,

      categoria:
        textoONull(body.categoria),

      descripcion:
        textoONull(body.descripcion),

      foto_url:
        textoONull(body.foto_url),

      foto_url_2:
        textoONull(body.foto_url_2),

      precio_detal: precioDetal,

      precio_minimo:
        numeroONull(body.precio_minimo),

      costo:
        numeroONull(body.costo),

      infoimagen:
        textoONull(body.infoimagen),

      activo:
        body.activo !== false,

      origen:
        "PANEL_MAESTRO",

      tiene_variantes:
        false,
    };

    const crearResponse = await fetch(
      `${supabaseUrl}/rest/v1/productos`,
      {
        method: "POST",

        headers: {
          ...headersSupabase,
          Prefer: "return=representation",
        },

        body: JSON.stringify(nuevoProducto),
      }
    );

    if (!crearResponse.ok) {
      const detalle = await crearResponse.text();

      console.error(
        "Error creando producto:",
        crearResponse.status,
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Supabase no pudo crear el producto.",
          detalle,
        },
        { status: 500 }
      );
    }

    const productosCreados =
      await crearResponse.json();

    return NextResponse.json({
      ok: true,
      mensaje: "Producto creado correctamente.",
      producto:
        productosCreados?.[0] || null,
    });
  } catch (error) {
    console.error(
      "Error creando producto manual:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error creando el producto.",
      },
      { status: 500 }
    );
  }
}