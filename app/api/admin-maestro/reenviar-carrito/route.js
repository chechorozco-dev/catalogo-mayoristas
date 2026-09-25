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
    // ========================================

    const productosCompletos = [];

    for (const item of productosCarrito) {
      const productoId =
        Number(item?.producto_id);

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
          "Uno de los productos del carrito no tiene un producto_id válido."
        );
      }

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

      if (!respuestaProducto.ok) {
        throw new Error(
          `No se pudo consultar el producto ${productoId}.`
        );
      }

      const productos =
        await respuestaProducto.json();

      const productoSupabase =
        productos?.[0];

      if (!productoSupabase) {
        throw new Error(
          `No encontramos el producto ${productoId}.`
        );
      }

      let infoimagen =
        productoSupabase.infoimagen || "";

      if (varianteId) {
        const respuestaVariante = await fetch(
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

        if (!respuestaVariante.ok) {
          throw new Error(
            `No se pudo consultar la variante ${varianteId}.`
          );
        }

        const variantes =
          await respuestaVariante.json();

        const variante =
          variantes?.[0];

        if (!variante) {
          throw new Error(
            `No encontramos la variante ${varianteId}.`
          );
        }

        infoimagen =
          variante.infoimagen ||
          productoSupabase.infoimagen ||
          "";
      }

      const cantidad =
        Number(item.cantidad || 0);

      const precio =
        Number(
          item.precio ??
            item.precio_unitario ??
            0
        );

      productosCompletos.push({
        producto_id: productoId,
        variante_id: varianteId,

        nombre:
          item.nombre || "",

        referencia:
          item.referencia || "",

        variante:
          item.variante || "",

        cantidad,

        precio_unitario: precio,

        subtotal:
          precio * cantidad,

        infoimagen,
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