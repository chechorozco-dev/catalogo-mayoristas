import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

/* =========================================================
   VERIFICAR SESIÓN
========================================================= */

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

/* =========================================================
   UTILIDADES
========================================================= */

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

  return Number.isFinite(numero)
    ? numero
    : null;
}

/* =========================================================
   POST
   CREAR PRODUCTO CON VARIANTES
========================================================= */

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
            "Faltan variables de configuración del servidor.",
        },
        { status: 500 }
      );
    }

    const headersSupabase = {
      apikey: supabaseSecretKey,
      "Content-Type": "application/json",
    };

    /* =====================================================
       1. VERIFICAR COOKIE
    ===================================================== */

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

    /* =====================================================
       2. COMPROBAR QUE SEA ADMINISTRADOR MAESTRO
    ===================================================== */

    const clienteResponse = await fetch(
      `${supabaseUrl}/rest/v1/clientes_autorizados` +
        `?id=eq.${encodeURIComponent(
          sesion.cliente_id
        )}` +
        `&activo=eq.true` +
        `&select=id,nombre,telefono,rol`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!clienteResponse.ok) {
      const detalle =
        await clienteResponse.text();

      console.error(
        "Error comprobando administrador maestro:",
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

    const clientes =
      await clienteResponse.json();

    const cliente = clientes?.[0];

    if (!cliente || cliente.rol !== "MAESTRO") {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes permiso para crear productos con variantes.",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       3. LEER INFORMACIÓN ENVIADA
    ===================================================== */

    const body = await request.json();

    const nombre =
      String(body.nombre || "").trim();

    const categoria =
      textoONull(body.categoria);

    const descripcion =
      textoONull(body.descripcion);

    const activo =
      body.activo !== false;

    const variantes =
      Array.isArray(body.variantes)
        ? body.variantes
        : [];

    /* =====================================================
       4. VALIDAR PRODUCTO
    ===================================================== */

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

    if (variantes.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Debes agregar por lo menos una variante.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       5. VALIDAR VARIANTES
    ===================================================== */

    const referenciasRecibidas = new Set();

    for (
      let i = 0;
      i < variantes.length;
      i++
    ) {
      const variante = variantes[i];

      const nombreVariante =
        String(
          variante.nombre_variante || ""
        ).trim();

      const referencia =
        String(
          variante.referencia || ""
        ).trim();

      if (!nombreVariante) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `La variante ${i + 1} no tiene nombre.`,
          },
          { status: 400 }
        );
      }

      if (!referencia) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `La variante ${i + 1} no tiene referencia.`,
          },
          { status: 400 }
        );
      }

      const referenciaNormalizada =
        referencia.toUpperCase();

      if (
        referenciasRecibidas.has(
          referenciaNormalizada
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `La referencia ${referencia} está repetida entre las variantes.`,
          },
          { status: 400 }
        );
      }

      referenciasRecibidas.add(
        referenciaNormalizada
      );

      const precio =
        numeroONull(
          variante.precio_detal
        );

      if (
        precio === null ||
        precio < 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `El precio sugerido de la variante ${i + 1} no es válido.`,
          },
          { status: 400 }
        );
      }

      if (!variante.foto_url) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `La variante ${i + 1} necesita una foto principal.`,
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       6. COMPROBAR REFERENCIAS CONTRA PRODUCTOS NORMALES
    ===================================================== */

    for (const variante of variantes) {
      const referencia =
        String(
          variante.referencia || ""
        ).trim();

      const revisarProducto =
        await fetch(
          `${supabaseUrl}/rest/v1/productos` +
            `?referencia=eq.${encodeURIComponent(
              referencia
            )}` +
            `&select=id,referencia` +
            `&limit=1`,
          {
            method: "GET",
            headers: headersSupabase,
            cache: "no-store",
          }
        );

      if (!revisarProducto.ok) {
        const detalle =
          await revisarProducto.text();

        console.error(
          "Error revisando referencia en productos:",
          detalle
        );

        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "No pudimos comprobar las referencias.",
          },
          { status: 500 }
        );
      }

      const encontrados =
        await revisarProducto.json();

      if (
        Array.isArray(encontrados) &&
        encontrados.length > 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `Ya existe un producto con la referencia ${referencia}.`,
          },
          { status: 409 }
        );
      }
    }

    /* =====================================================
       7. COMPROBAR REFERENCIAS CONTRA OTRAS VARIANTES
    ===================================================== */

    for (const variante of variantes) {
      const referencia =
        String(
          variante.referencia || ""
        ).trim();

      const revisarVariante =
        await fetch(
          `${supabaseUrl}/rest/v1/producto_variantes` +
            `?referencia=eq.${encodeURIComponent(
              referencia
            )}` +
            `&select=id,referencia` +
            `&limit=1`,
          {
            method: "GET",
            headers: headersSupabase,
            cache: "no-store",
          }
        );

      if (!revisarVariante.ok) {
        const detalle =
          await revisarVariante.text();

        console.error(
          "Error revisando referencia de variante:",
          detalle
        );

        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "No pudimos comprobar las referencias de las variantes.",
          },
          { status: 500 }
        );
      }

      const encontrados =
        await revisarVariante.json();

      if (
        Array.isArray(encontrados) &&
        encontrados.length > 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `Ya existe una variante con la referencia ${referencia}.`,
          },
          { status: 409 }
        );
      }
    }

    /* =====================================================
       8. CREAR PRODUCTO PADRE
    ===================================================== */

    /*
      IMPORTANTE:

      productos.id es BIGINT.
      producto_variantes.producto_id también es BIGINT.

      Por eso ahora sí son compatibles.
    */

    const primeraVariante =
      variantes[0];

    const productoPrincipal = {
      referencia:
        String(
          primeraVariante.referencia
        ).trim(),

      nombre,

      categoria,

      descripcion,

      foto_url:
        textoONull(
          primeraVariante.foto_url
        ),

      foto_url_2:
        textoONull(
          primeraVariante.foto_url_2
        ),

      costo:
        numeroONull(
          primeraVariante.costo
        ),

      precio_detal:
        numeroONull(
          primeraVariante.precio_detal
        ),

      precio_minimo:
        numeroONull(
          primeraVariante.precio_minimo
        ),

      infoimagen:
        textoONull(
          primeraVariante.infoimagen
        ),

      activo,

      origen:
        "PANEL_MAESTRO",

      tiene_variantes:
        true,
    };

    const crearProductoResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/productos`,
        {
          method: "POST",

          headers: {
            ...headersSupabase,
            Prefer:
              "return=representation",
          },

          body: JSON.stringify(
            productoPrincipal
          ),
        }
      );

    if (!crearProductoResponse.ok) {
      const detalle =
        await crearProductoResponse.text();

      console.error(
        "Error creando producto padre:",
        crearProductoResponse.status,
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos crear el producto principal.",
          detalle,
        },
        { status: 500 }
      );
    }

    const productosCreados =
      await crearProductoResponse.json();

    const productoCreado =
      productosCreados?.[0];

    if (!productoCreado?.id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Supabase creó el producto pero no devolvió su ID.",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       9. PREPARAR VARIANTES
    ===================================================== */

    const variantesParaGuardar =
      variantes.map(
        (variante, indice) => ({
          producto_id:
            productoCreado.id,

          nombre_variante:
            String(
              variante.nombre_variante || ""
            ).trim(),

          referencia:
            String(
              variante.referencia || ""
            ).trim(),

          foto_url:
            textoONull(
              variante.foto_url
            ),

          foto_url_2:
            textoONull(
              variante.foto_url_2
            ),

          costo:
            numeroONull(
              variante.costo
            ),

          precio_detal:
            numeroONull(
              variante.precio_detal
            ),

          precio_minimo:
            numeroONull(
              variante.precio_minimo
            ),

          infoimagen:
            textoONull(
              variante.infoimagen
            ),

          activo:
            variante.activo !== false,

          orden:
            Number.isInteger(
              variante.orden
            )
              ? variante.orden
              : indice,
        })
      );

    /* =====================================================
       10. GUARDAR TODAS LAS VARIANTES
    ===================================================== */

    const crearVariantesResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/producto_variantes`,
        {
          method: "POST",

          headers: {
            ...headersSupabase,
            Prefer:
              "return=representation",
          },

          body: JSON.stringify(
            variantesParaGuardar
          ),
        }
      );

    if (!crearVariantesResponse.ok) {
      const detalle =
        await crearVariantesResponse.text();

      console.error(
        "Error creando variantes:",
        crearVariantesResponse.status,
        detalle
      );

      /*
        Como el producto padre ya se creó,
        intentamos eliminarlo para no dejar
        un producto incompleto.
      */

      try {
        await fetch(
          `${supabaseUrl}/rest/v1/productos` +
            `?id=eq.${encodeURIComponent(
              productoCreado.id
            )}`,
          {
            method: "DELETE",
            headers: headersSupabase,
          }
        );
      } catch (errorEliminar) {
        console.error(
          "No se pudo limpiar producto incompleto:",
          errorEliminar
        );
      }

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El producto se creó, pero ocurrió un error guardando sus variantes.",
          detalle,
        },
        { status: 500 }
      );
    }

    const variantesCreadas =
      await crearVariantesResponse.json();

    /* =====================================================
       11. RESPUESTA CORRECTA
    ===================================================== */

    return NextResponse.json({
      ok: true,

      mensaje:
        "Producto con variantes creado correctamente.",

      producto:
        productoCreado,

      variantes:
        variantesCreadas,

      cantidad_variantes:
        variantesCreadas.length,
    });
  } catch (error) {
    console.error(
      "Error general creando producto con variantes:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error creando el producto con variantes.",
      },
      { status: 500 }
    );
  }
}
