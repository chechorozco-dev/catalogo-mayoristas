export async function POST(request) {
  try {
    const pedido = await request.json();

    // ========================================
    // 1. VALIDAR PRODUCTOS RECIBIDOS
    // ========================================

    const productosRecibidos = Array.isArray(
      pedido?.productos
    )
      ? pedido.productos
      : [];

    if (!productosRecibidos.length) {
      return Response.json(
        {
          ok: false,
          error: "El pedido no tiene productos.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
// 2. COMPLETAR PRODUCTOS CON INFOIMAGEN
//    SIN BLOQUEAR EL PEDIDO SI EL PRODUCTO
//    YA FUE RETIRADO O ELIMINADO
// ========================================

const productosCompletos = [];

for (const item of productosRecibidos) {
  const productoId = Number(item?.producto_id);

  const varianteId =
    item?.variante_id !== null &&
    item?.variante_id !== undefined &&
    item?.variante_id !== ""
      ? Number(item.variante_id)
      : null;

  const productoIdValido =
    Number.isInteger(productoId) &&
    productoId > 0;

  const varianteIdValido =
    varianteId === null ||
    (
      Number.isInteger(varianteId) &&
      varianteId > 0
    );

  // Si ya venía alguna información de imagen,
  // la conservamos como respaldo.
  let infoimagen =
    item?.infoimagen || "";

  let productoDisponible = false;

  let varianteDisponible =
    varianteId !== null
      ? false
      : null;

  // ========================================
  // SI EL ID YA NO ES VÁLIDO
  // NO DETENEMOS EL PEDIDO
  // ========================================

  if (!productoIdValido) {
    console.warn(
      "Producto del carrito sin producto_id válido. Se enviará igualmente:",
      item?.referencia || item?.nombre || item
    );

    productosCompletos.push({
      ...item,

      infoimagen,

      producto_disponible: false,

      variante_disponible:
        varianteId !== null
          ? false
          : null,

      producto_retirado: true,
    });

    continue;
  }

  // ========================================
  // CONSULTAR PRODUCTO PADRE
  // ========================================

  try {
    const respuestaProducto = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/productos?select=id,infoimagen&id=eq.${encodeURIComponent(
        productoId
      )}&limit=1`,
      {
        method: "GET",

        headers: {
          apikey:
            process.env.SUPABASE_SECRET_KEY,

          Accept: "application/json",
        },

        cache: "no-store",
      }
    );

    if (respuestaProducto.ok) {
      const productosEncontrados =
        await respuestaProducto.json();

      const productoSupabase =
        productosEncontrados?.[0];

      if (productoSupabase) {
        productoDisponible = true;

        infoimagen =
          productoSupabase.infoimagen ||
          infoimagen ||
          "";

        // ========================================
        // CONSULTAR VARIANTE
        // ========================================

        if (
          varianteId !== null &&
          varianteIdValido
        ) {
          try {
            const respuestaVariante =
              await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/producto_variantes?select=id,producto_id,infoimagen&id=eq.${encodeURIComponent(
                  varianteId
                )}&producto_id=eq.${encodeURIComponent(
                  productoId
                )}&limit=1`,
                {
                  method: "GET",

                  headers: {
                    apikey:
                      process.env.SUPABASE_SECRET_KEY,

                    Accept:
                      "application/json",
                  },

                  cache: "no-store",
                }
              );

            if (respuestaVariante.ok) {
              const variantesEncontradas =
                await respuestaVariante.json();

              const varianteSupabase =
                variantesEncontradas?.[0];

              if (varianteSupabase) {
                varianteDisponible = true;

                // La variante manda.
                // Si no tiene infoimagen,
                // usamos la del producto padre.
                infoimagen =
                  varianteSupabase.infoimagen ||
                  productoSupabase.infoimagen ||
                  infoimagen ||
                  "";
              } else {
                console.warn(
                  `La variante ${varianteId} ya no existe. El pedido continuará.`
                );
              }
            } else {
              const errorVariante =
                await respuestaVariante.text();

              console.error(
                `No se pudo consultar la variante ${varianteId}, pero el pedido continuará:`,
                errorVariante
              );
            }
          } catch (errorVariante) {
            console.error(
              `Error consultando variante ${varianteId}. El pedido continuará:`,
              errorVariante
            );
          }
        }
      } else {
        console.warn(
          `El producto ${productoId} ya no existe en Supabase. El pedido continuará con los datos guardados en el carrito.`
        );
      }
    } else {
      const errorProducto =
        await respuestaProducto.text();

      console.error(
        `No se pudo consultar el producto ${productoId}, pero el pedido continuará:`,
        errorProducto
      );
    }
  } catch (errorProducto) {
    console.error(
      `Error consultando producto ${productoId}. El pedido continuará:`,
      errorProducto
    );
  }

  // ========================================
  // SI EL PRODUCTO O VARIANTE YA NO EXISTEN,
  // CONSERVAMOS LOS DATOS QUE VENÍAN
  // DEL CARRITO
  // ========================================

  productosCompletos.push({
    ...item,

    infoimagen,

    producto_disponible:
      productoDisponible,

    variante_disponible:
      varianteDisponible,

    producto_retirado:
      !productoDisponible,
  });
}
    // ========================================
    // 3. CREAR NÚMERO ÚNICO DEL PEDIDO
    // ========================================

    const respuestaSupabase = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pedidos?select=id,numero_pedido`,
      {
        method: "POST",
        headers: {
          apikey:
            process.env.SUPABASE_SECRET_KEY,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );

    if (!respuestaSupabase.ok) {
      const errorSupabase =
        await respuestaSupabase.text();

      console.error(
        "Error creando número de pedido:",
        errorSupabase
      );

      throw new Error(
        "No se pudo generar el número del pedido."
      );
    }

    const pedidosCreados =
      await respuestaSupabase.json();

    const pedidoCreado =
      pedidosCreados?.[0];

    if (!pedidoCreado?.numero_pedido) {
      throw new Error(
        "Supabase no devolvió el número del pedido."
      );
    }

    // ========================================
    // 4. ARMAR PEDIDO COMPLETO
    // ========================================

    const pedidoCompleto = {
  ...pedido,

  pedido_id: pedidoCreado.id,

  numero_pedido:
    pedidoCreado.numero_pedido,

  productos:
    productosCompletos,
};

    // ========================================
    // 5. ENVIAR PEDIDO A MAKE
    // ========================================

    const respuestaMake = await fetch(
      "https://hook.us2.make.com/wax9zylhd6f1qp6yvth29pw5y3kppdhw",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          pedidoCompleto
        ),
        cache: "no-store",
      }
    );

    if (!respuestaMake.ok) {
      const errorMake =
        await respuestaMake.text();

      console.error(
        "Error enviando a Make:",
        errorMake
      );

      throw new Error(
        `Make respondió con estado ${respuestaMake.status}`
      );
    }

    // ========================================
    // 6. DEVOLVER NÚMERO A LA PÁGINA
    // ========================================

    return Response.json({
      ok: true,
      pedido_id: pedidoCreado.id,
      numero_pedido:
        pedidoCreado.numero_pedido,
    });
  } catch (error) {
    console.error(
      "Error enviando pedido:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "No se pudo enviar el pedido.",
      },
      {
        status: 500,
      }
    );
  }
}
