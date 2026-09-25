export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const {
  sesion_id,
  tienda_id,
  estado = "EN_PROCESO",
  productos = [],
  nombre_cliente = "",
  cedula_cliente = "",
  telefono_cliente = "",
  correo_cliente = "",
  direccion_cliente = "",
  ciudad = "",
  forma_pago = "",
} = body || {};

    // ========================================
    // VALIDACIONES BÁSICAS
    // ========================================

    if (!sesion_id || !tienda_id) {
      return Response.json(
        {
          ok: false,
          error:
            "Faltan sesion_id o tienda_id.",
        },
        {
          status: 400,
        }
      );
    }

    const estadosPermitidos = [
      "EN_PROCESO",
      "CHECKOUT",
      "COMPLETADO",
      "ABANDONADO",
    ];

    if (!estadosPermitidos.includes(estado)) {
      return Response.json(
        {
          ok: false,
          error: "Estado no válido.",
        },
        {
          status: 400,
        }
      );
    }

    const productosLimpios =
      Array.isArray(productos)
        ? productos.map((item) => ({
            producto_id:
              item.id_producto ||
              item.producto_id ||
              item.id ||
              null,

            variante_id:
              item.variante_id || null,

            nombre:
              String(item.nombre || "").slice(
                0,
                200
              ),

            referencia:
              String(
                item.referencia || ""
              ).slice(0, 100),

            variante:
              String(
                item.variante_nombre ||
                  item.variante ||
                  ""
              ).slice(0, 150),

            cantidad: Math.max(
              0,
              Number(item.cantidad || 0)
            ),

            precio: Math.max(
              0,
              Number(item.precio || 0)
            ),
          }))
        : [];

    const cantidadProductos =
      productosLimpios.reduce(
        (total, item) =>
          total +
          Number(item.cantidad || 0),
        0
      );

    const subtotal =
      productosLimpios.reduce(
        (total, item) =>
          total +
          Number(item.precio || 0) *
            Number(item.cantidad || 0),
        0
      );

    // ========================================
    // SUPABASE
    // ========================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      console.error(
        "Faltan variables de Supabase."
      );

      return Response.json(
        {
          ok: false,
          error:
            "Error de configuración del servidor.",
        },
        {
          status: 500,
        }
      );
    }

    const ahora =
      new Date().toISOString();

    // ========================================
    // BUSCAR SI YA EXISTE EL CARRITO
    // ========================================

    const urlBuscar =
      `${supabaseUrl}` +
      `/rest/v1/carritos_web` +
      `?select=id,estado` +
      `&sesion_id=eq.${encodeURIComponent(
        sesion_id
      )}` +
      `&tienda_id=eq.${encodeURIComponent(
        tienda_id
      )}` +
      `&limit=1`;

    const respuestaBuscar =
      await fetch(urlBuscar, {
        method: "GET",

        headers: {
          apikey: supabaseSecretKey,
          "Content-Type":
            "application/json",
        },

        cache: "no-store",
      });

    if (!respuestaBuscar.ok) {
      const texto =
        await respuestaBuscar.text();

      console.error(
        "ERROR BUSCANDO CARRITO:",
        respuestaBuscar.status,
        texto
      );

      throw new Error(
        "No se pudo buscar el carrito."
      );
    }

    const existentes =
      await respuestaBuscar.json();

    const carritoExistente =
      Array.isArray(existentes)
        ? existentes[0]
        : null;

    // ========================================
    // DATOS QUE GUARDAREMOS
    // ========================================

    const datos = {
      sesion_id:
        String(sesion_id).slice(0, 200),

      tienda_id,

      estado,

      productos: productosLimpios,

      cantidad_productos:
        cantidadProductos,

      subtotal,

      nombre_cliente:
  String(nombre_cliente || "").slice(0, 200) || null,

cedula_cliente:
  String(cedula_cliente || "").slice(0, 30) || null,

telefono_cliente:
  String(telefono_cliente || "").slice(0, 30) || null,

correo_cliente:
  String(correo_cliente || "").slice(0, 200) || null,

direccion_cliente:
  String(direccion_cliente || "").slice(0, 300) || null,

ciudad:
        String(ciudad || "").slice(
          0,
          200
        ) || null,

      forma_pago:
        String(forma_pago || "").slice(
          0,
          50
        ) || null,

      ultima_actividad: ahora,

      completado_en:
        estado === "COMPLETADO"
          ? ahora
          : null,
    };

    // ========================================
    // ACTUALIZAR SI YA EXISTE
    // ========================================

    if (carritoExistente?.id) {
      const urlActualizar =
        `${supabaseUrl}` +
        `/rest/v1/carritos_web` +
        `?id=eq.${encodeURIComponent(
          carritoExistente.id
        )}`;

      const respuestaActualizar =
        await fetch(urlActualizar, {
          method: "PATCH",

          headers: {
            apikey:
              supabaseSecretKey,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation",
          },

          body: JSON.stringify(datos),

          cache: "no-store",
        });

      const texto =
        await respuestaActualizar.text();

      if (!respuestaActualizar.ok) {
        console.error(
          "ERROR ACTUALIZANDO CARRITO:",
          respuestaActualizar.status,
          texto
        );

        throw new Error(
          "No se pudo actualizar el carrito."
        );
      }

      const actualizado =
        texto ? JSON.parse(texto) : [];

      return Response.json({
        ok: true,
        accion: "ACTUALIZADO",
        carrito:
          actualizado?.[0] || null,
      });
    }

    // ========================================
    // CREAR NUEVO CARRITO
    // ========================================

    const urlCrear =
      `${supabaseUrl}` +
      `/rest/v1/carritos_web`;

    const respuestaCrear =
      await fetch(urlCrear, {
        method: "POST",

        headers: {
          apikey: supabaseSecretKey,

          "Content-Type":
            "application/json",

          Prefer:
            "return=representation",
        },

        body: JSON.stringify(datos),

        cache: "no-store",
      });

    const textoCrear =
      await respuestaCrear.text();

    if (!respuestaCrear.ok) {
      console.error(
        "ERROR CREANDO CARRITO:",
        respuestaCrear.status,
        textoCrear
      );

      throw new Error(
        "No se pudo crear el carrito."
      );
    }

    const creado =
      textoCrear
        ? JSON.parse(textoCrear)
        : [];

    return Response.json({
      ok: true,
      accion: "CREADO",
      carrito: creado?.[0] || null,
    });
  } catch (error) {
    console.error(
      "ERROR SEGUIMIENTO CARRITO:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "No se pudo guardar el seguimiento del carrito.",
      },
      {
        status: 500,
      }
    );
  }
}