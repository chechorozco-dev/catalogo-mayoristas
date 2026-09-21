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
    //    DIRECTAMENTE DESDE SUPABASE
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

      if (
        !Number.isInteger(productoId) ||
        productoId <= 0
      ) {
        throw new Error(
          "Uno de los productos no tiene un producto_id válido."
        );
      }

      // ----------------------------------------
      // CONSULTAR PRODUCTO PADRE
      // ----------------------------------------

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

      if (!respuestaProducto.ok) {
        const errorProducto =
          await respuestaProducto.text();

        console.error(
          "Error consultando producto:",
          errorProducto
        );

        throw new Error(
          `No se pudo consultar el producto ${productoId}.`
        );
      }

      const productosEncontrados =
        await respuestaProducto.json();

      const productoSupabase =
        productosEncontrados?.[0];

      if (!productoSupabase) {
        throw new Error(
          `No encontramos el producto ${productoId}.`
        );
      }

      let infoimagen =
        productoSupabase.infoimagen || "";

      // ----------------------------------------
      // SI TIENE VARIANTE:
      // PRIMERO USAMOS INFOIMAGEN DE LA VARIANTE
      // ----------------------------------------

      if (varianteId) {
        const respuestaVariante = await fetch(
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
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!respuestaVariante.ok) {
          const errorVariante =
            await respuestaVariante.text();

          console.error(
            "Error consultando variante:",
            errorVariante
          );

          throw new Error(
            `No se pudo consultar la variante ${varianteId}.`
          );
        }

        const variantesEncontradas =
          await respuestaVariante.json();

        const varianteSupabase =
          variantesEncontradas?.[0];

        if (!varianteSupabase) {
          throw new Error(
            `No encontramos la variante ${varianteId} del producto ${productoId}.`
          );
        }

        // La variante manda.
        // Si no tiene infoimagen,
        // usamos el del producto padre.
        infoimagen =
          varianteSupabase.infoimagen ||
          productoSupabase.infoimagen ||
          "";
      }

      // ----------------------------------------
      // CONSERVAMOS TODO LO QUE YA ENVÍA
      // LA PÁGINA Y SOLO AGREGAMOS INFOIMAGEN
      // ----------------------------------------

      productosCompletos.push({
        ...item,
        infoimagen,
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
      pedido_id: pedidoCreado.id,
      numero_pedido:
        pedidoCreado.numero_pedido,

      ...pedido,

      // Reemplazamos productos por la versión
      // enriquecida desde Supabase.
      productos: productosCompletos,
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
