import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

// ======================================================
// VERIFICAR TOKEN DE SESIÓN
// ======================================================

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

    const firmaValida = crypto.timingSafeEqual(
      bufferRecibido,
      bufferCorrecto
    );

    if (!firmaValida) {
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

// ======================================================
// LIMPIAR TEXTO
// ======================================================

function textoONull(valor) {
  const texto = String(valor ?? "").trim();

  return texto || null;
}

// ======================================================
// LIMPIAR NÚMERO
// ======================================================

function numeroONull(valor) {
  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const numero = Number(
    String(valor)
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(numero) ? numero : null;
}

// ======================================================
// COMPROBAR ADMINISTRADOR MAESTRO
// ======================================================

async function comprobarMaestro({
  supabaseUrl,
  supabaseSecretKey,
  clienteId,
}) {
  const respuesta = await fetch(
    `${supabaseUrl}/rest/v1/clientes_autorizados` +
      `?id=eq.${encodeURIComponent(clienteId)}` +
      `&activo=eq.true` +
      `&select=id,nombre,telefono,rol`,
    {
      method: "GET",

      headers: {
        apikey: supabaseSecretKey,
        "Content-Type": "application/json",
      },

      cache: "no-store",
    }
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text();

    console.error(
      "Error comprobando administrador maestro:",
      detalle
    );

    return {
      ok: false,
      errorServidor: true,
    };
  }

  const clientes = await respuesta.json();

  const cliente = clientes?.[0];

  if (!cliente || cliente.rol !== "MAESTRO") {
    return {
      ok: false,
      errorServidor: false,
    };
  }

  return {
    ok: true,
    cliente,
  };
}

// ======================================================
// POST
// CREAR PRODUCTO CON VARIANTES
// ======================================================

export async function POST(request) {
  try {
    // ==================================================
    // 1. VARIABLES DE ENTORNO
    // ==================================================

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
      console.error(
        "Faltan variables de entorno."
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Falta configuración del servidor.",
        },
        { status: 500 }
      );
    }

    // ==================================================
    // 2. VERIFICAR SESIÓN
    // ==================================================

    const cookieStore = await cookies();

    const token =
      cookieStore.get("ra_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Debes iniciar sesión.",
        },
        { status: 401 }
      );
    }

    const sesion = verificarToken(
      token,
      authSessionSecret
    );

    if (!sesion?.cliente_id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu sesión no es válida o expiró.",
        },
        { status: 401 }
      );
    }

    // ==================================================
    // 3. COMPROBAR QUE SEA MAESTRO
    // ==================================================

    const comprobacion =
      await comprobarMaestro({
        supabaseUrl,
        supabaseSecretKey,
        clienteId: sesion.cliente_id,
      });

    if (!comprobacion.ok) {
      if (comprobacion.errorServidor) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "No pudimos comprobar tus permisos.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes permiso para crear productos con variantes.",
        },
        { status: 403 }
      );
    }

    // ==================================================
    // 4. RECIBIR INFORMACIÓN
    // ==================================================

    const body = await request.json();

    const referencia =
      String(body.referencia || "").trim();

    const nombre =
      String(body.nombre || "").trim();

    const categoria =
      textoONull(body.categoria);

    const descripcion =
      textoONull(body.descripcion);

    const fotoUrl =
      textoONull(body.foto_url);

    const fotoUrl2 =
      textoONull(body.foto_url_2);

    const costo =
      numeroONull(body.costo);

    const precioDetal =
      numeroONull(body.precio_detal);

    const precioMinimo =
      numeroONull(body.precio_minimo);

    const infoimagen =
      textoONull(body.infoimagen);

    const activo =
      body.activo !== false;

    const variantes =
      Array.isArray(body.variantes)
        ? body.variantes
        : [];

    // ==================================================
    // 5. VALIDACIONES DEL PRODUCTO
    // ==================================================

    if (!referencia) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "La referencia del producto es obligatoria.",
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

    if (variantes.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Debes crear por lo menos 2 variantes.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 6. VALIDAR CADA VARIANTE
    // ==================================================

    const variantesLimpias = [];

    for (
      let indice = 0;
      indice < variantes.length;
      indice++
    ) {
      const variante = variantes[indice];

      const nombreVariante =
        String(
          variante.nombre_variante ||
            variante.nombre ||
            ""
        ).trim();

      if (!nombreVariante) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `La variante ${indice + 1} necesita un nombre.`,
          },
          { status: 400 }
        );
      }

      variantesLimpias.push({
        nombre_variante: nombreVariante,

        referencia:
          textoONull(variante.referencia),

        foto_url:
          textoONull(variante.foto_url),

        foto_url_2:
          textoONull(variante.foto_url_2),

        costo:
          numeroONull(variante.costo),

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
          Number.isFinite(
            Number(variante.orden)
          )
            ? Number(variante.orden)
            : indice + 1,
      });
    }

    // ==================================================
    // 7. COMPROBAR REFERENCIA PRINCIPAL DUPLICADA
    // ==================================================

    const respuestaDuplicado =
      await fetch(
        `${supabaseUrl}/rest/v1/productos` +
          `?referencia=eq.${encodeURIComponent(
            referencia
          )}` +
          `&select=id,referencia` +
          `&limit=1`,
        {
          method: "GET",

          headers: {
            apikey: supabaseSecretKey,
            "Content-Type":
              "application/json",
          },

          cache: "no-store",
        }
      );

    if (!respuestaDuplicado.ok) {
      const detalle =
        await respuestaDuplicado.text();

      console.error(
        "Error comprobando referencia:",
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
      await respuestaDuplicado.json();

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

    // ==================================================
    // 8. CREAR PRODUCTO PRINCIPAL
    // ==================================================

    const productoPrincipal = {
      referencia,
      nombre,
      categoria,
      descripcion,

      foto_url: fotoUrl,
      foto_url_2: fotoUrl2,

      costo,
      precio_detal: precioDetal,
      precio_minimo: precioMinimo,

      infoimagen,

      activo,

      origen: "PANEL_MAESTRO",

      tiene_variantes: true,
    };

    const respuestaProducto =
      await fetch(
        `${supabaseUrl}/rest/v1/productos`,
        {
          method: "POST",

          headers: {
            apikey: supabaseSecretKey,
            "Content-Type":
              "application/json",
            Prefer:
              "return=representation",
          },

          body: JSON.stringify(
            productoPrincipal
          ),
        }
      );

    if (!respuestaProducto.ok) {
      const detalle =
        await respuestaProducto.text();

      console.error(
        "Error creando producto principal:",
        respuestaProducto.status,
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
      await respuestaProducto.json();

    const producto =
      productosCreados?.[0];

    if (!producto?.id) {
      console.error(
        "Supabase creó el producto pero no devolvió ID."
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El producto fue creado pero no pudimos obtener su identificador.",
        },
        { status: 500 }
      );
    }

    // ==================================================
    // 9. PREPARAR VARIANTES
    // ==================================================

    const variantesParaGuardar =
      variantesLimpias.map(
        (variante, indice) => ({
          producto_id: producto.id,

          nombre_variante:
            variante.nombre_variante,

          referencia:
            variante.referencia,

          foto_url:
            variante.foto_url,

          foto_url_2:
            variante.foto_url_2,

          costo:
            variante.costo,

          precio_detal:
            variante.precio_detal,

          precio_minimo:
            variante.precio_minimo,

          infoimagen:
            variante.infoimagen,

          activo:
            variante.activo,

          orden:
            variante.orden || indice + 1,
        })
      );

    // ==================================================
    // 10. CREAR VARIANTES
    // ==================================================

    const respuestaVariantes =
      await fetch(
        `${supabaseUrl}/rest/v1/producto_variantes`,
        {
          method: "POST",

          headers: {
            apikey: supabaseSecretKey,
            "Content-Type":
              "application/json",
            Prefer:
              "return=representation",
          },

          body: JSON.stringify(
            variantesParaGuardar
          ),
        }
      );

    if (!respuestaVariantes.ok) {
      const detalle =
        await respuestaVariantes.text();

      console.error(
        "Error creando variantes:",
        respuestaVariantes.status,
        detalle
      );

      // ================================================
      // LIMPIEZA:
      // Si fallan las variantes eliminamos el producto
      // principal para no dejar un producto incompleto.
      // ================================================

      try {
        await fetch(
          `${supabaseUrl}/rest/v1/productos` +
            `?id=eq.${encodeURIComponent(
              producto.id
            )}`,
          {
            method: "DELETE",

            headers: {
              apikey:
                supabaseSecretKey,
              "Content-Type":
                "application/json",
            },
          }
        );
      } catch (errorLimpieza) {
        console.error(
          "No pudimos limpiar el producto incompleto:",
          errorLimpieza
        );
      }

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos guardar las variantes.",
          detalle,
        },
        { status: 500 }
      );
    }

    const variantesCreadas =
      await respuestaVariantes.json();

    // ==================================================
    // 11. RESPUESTA FINAL
    // ==================================================

    return NextResponse.json({
      ok: true,

      mensaje:
        "Producto con variantes creado correctamente.",

      producto,

      variantes:
        variantesCreadas,

      cantidad_variantes:
        variantesCreadas.length,
    });
  } catch (error) {
    console.error(
      "Error creando producto con variantes:",
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
