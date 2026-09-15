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
   OBTENER CONFIGURACIÓN
========================================================= */

function obtenerConfiguracion() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  const authSessionSecret =
    process.env.AUTH_SESSION_SECRET;

  return {
    supabaseUrl,
    supabaseSecretKey,
    authSessionSecret,
  };
}

/* =========================================================
   VERIFICAR ADMINISTRADOR MAESTRO
========================================================= */

async function verificarAdministradorMaestro() {
  const {
    supabaseUrl,
    supabaseSecretKey,
    authSessionSecret,
  } = obtenerConfiguracion();

  if (
    !supabaseUrl ||
    !supabaseSecretKey ||
    !authSessionSecret
  ) {
    return {
      ok: false,
      status: 500,
      mensaje:
        "Faltan variables de configuración del servidor.",
    };
  }

  const headersSupabase = {
    apikey: supabaseSecretKey,
    "Content-Type": "application/json",
  };

  const cookieStore = await cookies();

  const token =
    cookieStore.get("ra_session")?.value;

  const sesion = verificarToken(
    token,
    authSessionSecret
  );

  if (!sesion?.cliente_id) {
    return {
      ok: false,
      status: 401,
      mensaje: "Sesión no válida.",
    };
  }

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

    return {
      ok: false,
      status: 500,
      mensaje:
        "No pudimos comprobar tus permisos.",
    };
  }

  const clientes =
    await clienteResponse.json();

  const cliente = clientes?.[0];

  if (!cliente || cliente.rol !== "MAESTRO") {
    return {
      ok: false,
      status: 403,
      mensaje:
        "No tienes permiso para realizar esta acción.",
    };
  }

  return {
    ok: true,
    cliente,
    sesion,
    supabaseUrl,
    supabaseSecretKey,
    headersSupabase,
  };
}

/* =========================================================
   GET
   LISTAR PRODUCTOS CON VARIANTES
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       1. VERIFICAR ADMINISTRADOR
    ===================================================== */

    const acceso =
      await verificarAdministradorMaestro();

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: acceso.mensaje,
        },
        {
          status: acceso.status,
        }
      );
    }

    const {
      supabaseUrl,
      headersSupabase,
    } = acceso;

    /* =====================================================
       2. BUSCAR PRODUCTOS CON VARIANTES
    ===================================================== */

    const productosResponse = await fetch(
      `${supabaseUrl}/rest/v1/productos` +
        `?tiene_variantes=eq.true` +
        `&select=id,referencia,nombre,categoria,descripcion,foto_url,foto_url_2,costo,precio_detal,precio_minimo,infoimagen,activo,origen,tiene_variantes,created_at` +
        `&order=id.desc`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!productosResponse.ok) {
      const detalle =
        await productosResponse.text();

      console.error(
        "Error cargando productos con variantes:",
        productosResponse.status,
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos cargar los productos con variantes.",
          detalle,
        },
        {
          status: 500,
        }
      );
    }

    const productos =
      await productosResponse.json();

    /* =====================================================
       3. SI NO HAY PRODUCTOS
    ===================================================== */

    if (
      !Array.isArray(productos) ||
      productos.length === 0
    ) {
      return NextResponse.json({
        ok: true,
        productos: [],
        cantidad: 0,
      });
    }

    /* =====================================================
       4. BUSCAR VARIANTES DE CADA PRODUCTO
    ===================================================== */

    const productosConVariantes =
      await Promise.all(
        productos.map(async (producto) => {
          try {
            const variantesResponse = await fetch(
              `${supabaseUrl}/rest/v1/producto_variantes` +
                `?producto_id=eq.${encodeURIComponent(
                  producto.id
                )}` +
                `&select=id,producto_id,nombre_variante,referencia,foto_url,foto_url_2,costo,precio_detal,precio_minimo,infoimagen,activo,orden,creado_en` +
                `&order=orden.asc`,
              {
                method: "GET",
                headers: headersSupabase,
                cache: "no-store",
              }
            );

            if (!variantesResponse.ok) {
              const detalle =
                await variantesResponse.text();

              console.error(
                `Error cargando variantes del producto ${producto.id}:`,
                detalle
              );

              return {
                ...producto,
                variantes: [],
              };
            }

            const variantes =
              await variantesResponse.json();

            return {
              ...producto,
              variantes: Array.isArray(variantes)
                ? variantes
                : [],
            };
          } catch (error) {
            console.error(
              `Error cargando variantes del producto ${producto.id}:`,
              error
            );

            return {
              ...producto,
              variantes: [],
            };
          }
        })
      );

    /* =====================================================
       5. RESPUESTA
    ===================================================== */

    return NextResponse.json({
      ok: true,
      productos: productosConVariantes,
      cantidad: productosConVariantes.length,
    });
  } catch (error) {
    console.error(
      "Error general cargando productos con variantes:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error cargando los productos con variantes.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   CREAR PRODUCTO CON VARIANTES
========================================================= */

export async function POST(request) {
  try {
    /* =====================================================
       1. VERIFICAR ADMINISTRADOR
    ===================================================== */

    const acceso =
      await verificarAdministradorMaestro();

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: acceso.mensaje,
        },
        {
          status: acceso.status,
        }
      );
    }

    const {
      supabaseUrl,
      headersSupabase,
    } = acceso;

    /* =====================================================
       2. LEER INFORMACIÓN ENVIADA
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
       3. VALIDAR PRODUCTO
    ===================================================== */

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El nombre del producto es obligatorio.",
        },
        {
          status: 400,
        }
      );
    }

    if (variantes.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Debes agregar por lo menos una variante.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       4. VALIDAR VARIANTES
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
          {
            status: 400,
          }
        );
      }

      if (!referencia) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `La variante ${i + 1} no tiene referencia.`,
          },
          {
            status: 400,
          }
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
          {
            status: 400,
          }
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
          {
            status: 400,
          }
        );
      }

      if (!variante.foto_url) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              `La variante ${i + 1} necesita una foto principal.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /* =====================================================
       5. COMPROBAR REFERENCIAS CONTRA PRODUCTOS NORMALES
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
          {
            status: 500,
          }
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
          {
            status: 409,
          }
        );
      }
    }

    /* =====================================================
       6. COMPROBAR REFERENCIAS CONTRA OTRAS VARIANTES
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
          {
            status: 500,
          }
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
          {
            status: 409,
          }
        );
      }
    }

    /* =====================================================
       7. CREAR PRODUCTO PADRE
    ===================================================== */

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
        {
          status: 500,
        }
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
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       8. PREPARAR VARIANTES
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
       9. GUARDAR TODAS LAS VARIANTES
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
        {
          status: 500,
        }
      );
    }

    const variantesCreadas =
      await crearVariantesResponse.json();

    /* =====================================================
       10. RESPUESTA CORRECTA
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
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   ELIMINAR PRODUCTO Y SUS VARIANTES
========================================================= */

export async function DELETE(request) {
  try {
    /* =====================================================
       1. VERIFICAR ADMINISTRADOR
    ===================================================== */

    const acceso =
      await verificarAdministradorMaestro();

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: acceso.mensaje,
        },
        {
          status: acceso.status,
        }
      );
    }

    const {
      supabaseUrl,
      headersSupabase,
    } = acceso;

    /* =====================================================
       2. OBTENER ID
    ===================================================== */

    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No recibimos el ID del producto.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       3. COMPROBAR QUE SEA PRODUCTO CON VARIANTES
    ===================================================== */

    const comprobarResponse = await fetch(
      `${supabaseUrl}/rest/v1/productos` +
        `?id=eq.${encodeURIComponent(id)}` +
        `&tiene_variantes=eq.true` +
        `&select=id,nombre,tiene_variantes` +
        `&limit=1`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!comprobarResponse.ok) {
      const detalle =
        await comprobarResponse.text();

      console.error(
        "Error comprobando producto:",
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos comprobar el producto.",
        },
        {
          status: 500,
        }
      );
    }

    const encontrados =
      await comprobarResponse.json();

    const producto =
      encontrados?.[0];

    if (!producto) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El producto con variantes no existe.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       4. ELIMINAR VARIANTES
    ===================================================== */

    const eliminarVariantesResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/producto_variantes` +
          `?producto_id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: headersSupabase,
        }
      );

    if (!eliminarVariantesResponse.ok) {
      const detalle =
        await eliminarVariantesResponse.text();

      console.error(
        "Error eliminando variantes:",
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos eliminar las variantes del producto.",
          detalle,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       5. ELIMINAR PRODUCTO PADRE
    ===================================================== */

    const eliminarProductoResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/productos` +
          `?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: headersSupabase,
        }
      );

    if (!eliminarProductoResponse.ok) {
      const detalle =
        await eliminarProductoResponse.text();

      console.error(
        "Error eliminando producto padre:",
        detalle
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Las variantes fueron eliminadas, pero no pudimos eliminar el producto principal.",
          detalle,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       6. RESPUESTA
    ===================================================== */

    return NextResponse.json({
      ok: true,
      mensaje:
        "Producto con variantes eliminado correctamente.",
      id,
    });
  } catch (error) {
    console.error(
      "Error general eliminando producto con variantes:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error eliminando el producto con variantes.",
      },
      {
        status: 500,
      }
    );
  }
}
