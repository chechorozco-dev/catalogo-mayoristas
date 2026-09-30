import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verificarToken(token, secreto) {
  try {
    if (!token || !secreto) return null;

    const partes = token.split(".");
    if (partes.length !== 2) return null;

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

    if (!datos.exp) return null;

    const ahora = Math.floor(Date.now() / 1000);

    if (datos.exp <= ahora) {
      return null;
    }

    return datos;
  } catch (error) {
    console.error(
      "Error verificando sesión maestro:",
      error
    );

    return null;
  }
}

export async function POST(request) {
  try {
    // ========================================
    // 1. VERIFICAR ADMINISTRADOR MAESTRO
    // ========================================

    const secreto =
      process.env.AUTH_SESSION_SECRET;

    if (!secreto) {
      return Response.json(
        {
          ok: false,
          error: "Falta AUTH_SESSION_SECRET.",
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const token =
      cookieStore.get("ra_session")?.value;

    const sesion =
      verificarToken(token, secreto);

    if (!sesion) {
      return Response.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    if (sesion.rol !== "MAESTRO") {
      return Response.json(
        {
          ok: false,
          error:
            "No tienes permiso para reenviar pedidos.",
        },
        { status: 403 }
      );
    }

    // ========================================
    // 2. RECIBIR ID DEL CARRITO
    // ========================================

    const body = await request.json();

    const carritoId = body?.carrito_id;

    if (!carritoId) {
      return Response.json(
        {
          ok: false,
          error: "Falta carrito_id.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecret =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecret) {
      throw new Error(
        "Supabase no está configurado."
      );
    }

    // ========================================
    // 3. CONSULTAR CARRITO COMPLETO
    // ========================================

    const respuestaCarrito = await fetch(
      `${supabaseUrl}/rest/v1/carritos_web?select=*&id=eq.${encodeURIComponent(
        carritoId
      )}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: supabaseSecret,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!respuestaCarrito.ok) {
      throw new Error(
        "No se pudo consultar el carrito."
      );
    }

    const carritos =
      await respuestaCarrito.json();

    const carrito = carritos?.[0];

    if (!carrito) {
      return Response.json(
        {
          ok: false,
          error: "No encontramos el carrito.",
        },
        { status: 404 }
      );
    }

    const productosCarrito =
      Array.isArray(carrito.productos)
        ? carrito.productos
        : [];

    if (!productosCarrito.length) {
      return Response.json(
        {
          ok: false,
          error:
            "El carrito no tiene productos.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // 4. CONSULTAR CIUDAD
    // ========================================

    let ciudadEncontrada = null;

    if (carrito.ciudad) {
      const respuestaCiudad = await fetch(
        `${supabaseUrl}/rest/v1/ciudades_envio?select=ciudad_id,ciudad_departamento,tiempo_estimado,costo_envio,pago_en_casa,activa&ciudad_departamento=eq.${encodeURIComponent(
          carrito.ciudad
        )}&limit=1`,
        {
          method: "GET",
          headers: {
            apikey: supabaseSecret,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (respuestaCiudad.ok) {
        const ciudades =
          await respuestaCiudad.json();

        ciudadEncontrada =
          ciudades?.[0] || null;
      }
    }

    // ========================================
// 5. COMPLETAR PRODUCTOS CON INFOIMAGEN
//    SIN BLOQUEAR EL REENVÍO SI EL PRODUCTO
//    O LA VARIANTE YA NO EXISTEN
// ========================================

const productosCompletos = [];

for (const item of productosCarrito) {
  // El carrito puede venir de distintas versiones
  // de la tienda, por eso aceptamos:
  // producto_id, id_producto o id.
  const productoIdOriginal =
    item?.producto_id ??
    item?.id_producto ??
    item?.id ??
    null;

  const productoId =
    Number(productoIdOriginal);

  const productoIdValido =
    Number.isInteger(productoId) &&
    productoId > 0;

  const varianteIdOriginal =
    item?.variante_id !== null &&
    item?.variante_id !== undefined &&
    item?.variante_id !== ""
      ? item.variante_id
      : null;

  const varianteId =
    varianteIdOriginal !== null
      ? Number(varianteIdOriginal)
      : null;

  const varianteIdValido =
    varianteId === null ||
    (
      Number.isInteger(varianteId) &&
      varianteId > 0
    );

  // ========================================
  // DATOS GUARDADOS EN EL CARRITO
  // ========================================

  const cantidad =
    Number(item?.cantidad || 0);

  const precio =
    Number(
      item?.precio ??
      item?.precio_unitario ??
      0
    );

  // Si el producto fue borrado,
  // intentamos conservar alguna imagen
  // que haya quedado guardada en el carrito.
  let infoimagen =
    item?.infoimagen ||
    item?.foto_url ||
    "";

  let productoDisponible = false;

  let varianteDisponible =
    varianteIdOriginal !== null
      ? false
      : null;

  // ========================================
  // CONSULTAR PRODUCTO SOLO SI EL ID ES VÁLIDO
  // ========================================

  if (productoIdValido) {
    try {
      const respuestaProducto = await fetch(
        `${supabaseUrl}/rest/v1/productos?select=id,infoimagen&id=eq.${encodeURIComponent(
          productoId
        )}&limit=1`,
        {
          method: "GET",
          headers: {
            apikey: supabaseSecret,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (respuestaProducto.ok) {
        const productos =
          await respuestaProducto.json();

        const productoSupabase =
          productos?.[0];

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
            varianteIdOriginal !== null &&
            varianteIdValido
          ) {
            try {
              const respuestaVariante =
                await fetch(
                  `${supabaseUrl}/rest/v1/producto_variantes?select=id,producto_id,infoimagen&id=eq.${encodeURIComponent(
                    varianteId
                  )}&producto_id=eq.${encodeURIComponent(
                    productoId
                  )}&limit=1`,
                  {
                    method: "GET",
                    headers: {
                      apikey: supabaseSecret,
                      Accept: "application/json",
                    },
                    cache: "no-store",
                  }
                );

              if (respuestaVariante.ok) {
                const variantes =
                  await respuestaVariante.json();

                const variante =
                  variantes?.[0];

                if (variante) {
                  varianteDisponible = true;

                  infoimagen =
                    variante.infoimagen ||
                    productoSupabase.infoimagen ||
                    infoimagen ||
                    "";
                } else {
                  console.warn(
                    `La variante ${varianteId} ya no existe. El pedido será reenviado igualmente.`
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
            `El producto ${productoId} ya no existe. El pedido será reenviado usando la información guardada en el carrito.`
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
  } else {
    console.warn(
      "Producto del carrito sin producto_id válido. Se reenviará igualmente:",
      item?.referencia ||
      item?.nombre ||
      productoIdOriginal
    );
  }

  // ========================================
  // NORMALIZAR PRODUCTO PARA MAKE
  // ========================================

  productosCompletos.push({
    producto_id:
      productoIdValido
        ? productoId
        : null,

    // Conservamos lo que originalmente
    // tenía el carrito por seguridad.
    producto_id_original:
      productoIdOriginal,

    variante_id:
      varianteId !== null &&
      varianteIdValido
        ? varianteId
        : null,

    variante_id_original:
      varianteIdOriginal,

    nombre:
      item?.nombre || "",

    referencia:
      item?.referencia || "",

    variante:
      item?.variante ||
      item?.variante_nombre ||
      "",

    cantidad,

    precio_unitario:
      precio,

    subtotal:
      precio * cantidad,

    infoimagen,

    foto_url:
      item?.foto_url || "",

    foto_url_2:
      item?.foto_url_2 || "",

    producto_disponible:
      productoDisponible,

    variante_disponible:
      varianteDisponible,

    producto_retirado:
      !productoDisponible,
  });
}

    // ========================================
    // 6. CALCULAR VALORES
    // ========================================

    const subtotalProductos =
      productosCompletos.reduce(
        (total, item) =>
          total +
          Number(item.subtotal || 0),
        0
      );

    const formaPago =
      carrito.forma_pago || "";

    const esTransferencia =
      formaPago === "TRANSFERENCIA";

    const porcentajeDescuento =
      esTransferencia ? 6 : 0;

    const descuento =
      esTransferencia
        ? Math.round(
            subtotalProductos * 0.06
          )
        : 0;

    const costoEnvioOriginal =
      ciudadEncontrada?.costo_envio !==
        null &&
      ciudadEncontrada?.costo_envio !==
        undefined
        ? Number(
            ciudadEncontrada.costo_envio
          )
        : 0;

    const envioGratis =
      subtotalProductos > 400000 &&
      costoEnvioOriginal < 18000;

    const costoEnvioFinal =
      envioGratis
        ? 0
        : costoEnvioOriginal;

    const totalPedido =
      subtotalProductos -
      descuento +
      costoEnvioFinal;

    // ========================================
    // 7. CREAR NUEVO NÚMERO DE PEDIDO
    // ========================================

    const respuestaPedido = await fetch(
      `${supabaseUrl}/rest/v1/pedidos?select=id,numero_pedido`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecret,
          "Content-Type":
            "application/json",
          Prefer:
            "return=representation",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );

    if (!respuestaPedido.ok) {
      const errorPedido =
        await respuestaPedido.text();

      console.error(
        "Error creando pedido:",
        errorPedido
      );

      throw new Error(
        "No se pudo generar el número del pedido."
      );
    }

    const pedidos =
      await respuestaPedido.json();

    const pedidoCreado =
      pedidos?.[0];

    if (!pedidoCreado?.numero_pedido) {
      throw new Error(
        "No se generó el número del pedido."
      );
    }

    // ========================================
    // 8. ARMAR MISMA ESTRUCTURA DE MAKE
    // ========================================

    const pedidoCompleto = {
      pedido_id: pedidoCreado.id,

      numero_pedido:
        pedidoCreado.numero_pedido,

      cliente: {
        nombre:
          carrito.nombre_cliente || "",

        cedula:
          carrito.cedula_cliente || "",

        whatsapp:
          carrito.telefono_cliente || "",

        correo:
          carrito.correo_cliente || "",

        direccion:
          carrito.direccion_cliente || "",

        ciudad_id:
          ciudadEncontrada?.ciudad_id || "",

        ciudad_departamento:
          ciudadEncontrada
            ?.ciudad_departamento ||
          carrito.ciudad ||
          "",

        tiempo_estimado:
          ciudadEncontrada
            ?.tiempo_estimado || "",
      },

      pago: {
        forma_pago: formaPago,
      },

      valores: {
        subtotal_productos:
          subtotalProductos,

        porcentaje_descuento:
          porcentajeDescuento,

        descuento,

        costo_envio_original:
          costoEnvioOriginal,

        envio_gratis: envioGratis,

        costo_envio_final:
          costoEnvioFinal,

        total_pedido:
          totalPedido,
      },

      productos:
        productosCompletos,
    };

    // ========================================
    // 9. ENVIAR A MAKE
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
        "Error reenviando a Make:",
        errorMake
      );

      throw new Error(
        `Make respondió con estado ${respuestaMake.status}.`
      );
    }

    // ========================================
    // 10. RESPUESTA
    // ========================================

    return Response.json({
      ok: true,

      mensaje:
        "Pedido reenviado correctamente.",

      pedido_id:
        pedidoCreado.id,

      numero_pedido:
        pedidoCreado.numero_pedido,

      total_pedido:
        totalPedido,
    });
  } catch (error) {
    console.error(
      "ERROR REENVIANDO CARRITO:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error?.message ||
          "No se pudo reenviar el pedido.",
      },
      {
        status: 500,
      }
    );
  }
}