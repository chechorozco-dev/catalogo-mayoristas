import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET;
const MAKE_WEBHOOK_URL = process.env.MAKE_PEDIDOS_WEBHOOK_URL;

/* =========================================================
   RESPUESTAS
========================================================= */

function responder(data, status = 200) {
  return NextResponse.json(data, { status });
}

/* =========================================================
   DECODIFICAR BASE64 URL
========================================================= */

function base64UrlDecode(valor) {
  try {
    let texto = String(valor || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    while (texto.length % 4) {
      texto += "=";
    }

    return Buffer.from(texto, "base64").toString("utf8");
  } catch {
    return "";
  }
}

/* =========================================================
   COMPARACIÓN SEGURA
========================================================= */

function compararFirmas(a, b) {
  try {
    const bufferA = Buffer.from(String(a || ""));
    const bufferB = Buffer.from(String(b || ""));

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

/* =========================================================
   LEER SESIÓN ra_session

   Compatible con cookie:
   payload.firma

   El payload debe contener la información que ya utiliza
   tu sistema de autenticación.
========================================================= */

function obtenerSesion(request) {
  if (!SESSION_SECRET) {
    throw new Error(
      "Falta AUTH_SESSION_SECRET en las variables de entorno."
    );
  }

  const cookie = request.cookies.get("ra_session")?.value;

  if (!cookie) {
    return null;
  }

  const partes = cookie.split(".");

  if (partes.length !== 2) {
    return null;
  }

  const [payloadCodificado, firmaRecibida] = partes;

  const firmaEsperada = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadCodificado)
    .digest("base64url");

  if (!compararFirmas(firmaEsperada, firmaRecibida)) {
    return null;
  }

  try {
    const payloadTexto = base64UrlDecode(payloadCodificado);
    const payload = JSON.parse(payloadTexto);

    if (!payload || typeof payload !== "object") {
      return null;
    }

    /*
      Si tu sesión tiene fecha de vencimiento,
      verificamos formatos comunes.
    */

    const expiracion =
      payload.exp ||
      payload.expires_at ||
      payload.expira_en ||
      null;

    if (expiracion) {
      let fechaExpiracion;

      if (typeof expiracion === "number") {
        fechaExpiracion =
          expiracion > 1000000000000
            ? expiracion
            : expiracion * 1000;
      } else {
        fechaExpiracion = new Date(expiracion).getTime();
      }

      if (
        Number.isFinite(fechaExpiracion) &&
        Date.now() > fechaExpiracion
      ) {
        return null;
      }
    }

    return payload;
  } catch {
    return null;
  }
}

/* =========================================================
   CONSULTA SUPABASE REST

   IMPORTANTE:
   Con la nueva secret key de Supabase usamos apikey.
========================================================= */

async function supabaseGet(ruta) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Faltan las variables de entorno de Supabase."
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${ruta}`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const texto = await response.text();

  let data = null;

  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = texto;
  }

  if (!response.ok) {
    console.error("Error Supabase:", data);

    throw new Error(
      data?.message ||
        data?.error ||
        "Error consultando Supabase."
    );
  }

  return data;
}

/* =========================================================
   NORMALIZAR TELÉFONO
========================================================= */

function normalizarTelefono(telefono) {
  let numero = String(telefono || "").replace(/\D/g, "");

  if (!numero) return "";

  /*
    Si está guardado como número colombiano de 10 dígitos,
    agregamos 57.
  */

  if (numero.length === 10 && numero.startsWith("3")) {
    numero = `57${numero}`;
  }

  return numero;
}

/* =========================================================
   EXTRAER INFORMACIÓN DE LA SESIÓN

   Permitimos varios nombres porque la sesión existente
   puede guardar cliente_id, id, telefono, etc.
========================================================= */

function obtenerDatosSesion(sesion) {
  const cliente =
    sesion?.cliente && typeof sesion.cliente === "object"
      ? sesion.cliente
      : sesion;

  return {
    clienteId:
      cliente?.id ||
      cliente?.cliente_id ||
      sesion?.cliente_id ||
      sesion?.id ||
      null,

    tiendaId:
      cliente?.tienda_id ||
      sesion?.tienda_id ||
      null,

    telefono:
      normalizarTelefono(
        cliente?.telefono ||
          cliente?.phone ||
          sesion?.telefono ||
          sesion?.phone ||
          ""
      ),

    nombre:
      cliente?.nombre ||
      cliente?.nombre_cliente ||
      sesion?.nombre ||
      sesion?.nombre_cliente ||
      "",
  };
}

/* =========================================================
   BUSCAR CLIENTE AUTORIZADO

   Preferimos buscar por ID.
   Si la sesión no contiene ID, usamos teléfono.
========================================================= */

async function buscarClienteAutorizado(datosSesion) {
  const columnas =
    "id,nombre,telefono,activo,tienda_id,rol";

  if (datosSesion.clienteId) {
    const resultado = await supabaseGet(
      `clientes_autorizados?select=${columnas}&id=eq.${encodeURIComponent(
        datosSesion.clienteId
      )}&limit=1`
    );

    if (Array.isArray(resultado) && resultado.length) {
      return resultado[0];
    }
  }

  if (datosSesion.telefono) {
    /*
      Primero probamos exactamente como viene normalizado.
    */

    let resultado = await supabaseGet(
      `clientes_autorizados?select=${columnas}&telefono=eq.${encodeURIComponent(
        datosSesion.telefono
      )}&limit=1`
    );

    if (Array.isArray(resultado) && resultado.length) {
      return resultado[0];
    }

    /*
      Si en la tabla está guardado sin 57, probamos también
      los últimos 10 dígitos.
    */

    if (
      datosSesion.telefono.startsWith("57") &&
      datosSesion.telefono.length === 12
    ) {
      const telefono10 = datosSesion.telefono.slice(2);

      resultado = await supabaseGet(
        `clientes_autorizados?select=${columnas}&telefono=eq.${encodeURIComponent(
          telefono10
        )}&limit=1`
      );

      if (Array.isArray(resultado) && resultado.length) {
        return resultado[0];
      }
    }
  }

  return null;
}

/* =========================================================
   OBTENER PRODUCTO
========================================================= */

async function obtenerProducto(productoId) {
  const resultado = await supabaseGet(
    `productos?select=id,referencia,nombre,costo,precio_detal,infoimagen,foto_url,activo,tiene_variantes&id=eq.${encodeURIComponent(
      productoId
    )}&limit=1`
  );

  if (!Array.isArray(resultado) || !resultado.length) {
    return null;
  }

  return resultado[0];
}

/* =========================================================
   OBTENER VARIANTE
========================================================= */

async function obtenerVariante(productoId, varianteId) {
  const resultado = await supabaseGet(
    `producto_variantes?select=id,producto_id,nombre_variante,referencia,costo,precio_detal,infoimagen,foto_url,activo&id=eq.${encodeURIComponent(
      varianteId
    )}&producto_id=eq.${encodeURIComponent(
      productoId
    )}&limit=1`
  );

  if (!Array.isArray(resultado) || !resultado.length) {
    return null;
  }

  return resultado[0];
}

/* =========================================================
   REDONDEAR PESOS
========================================================= */

function pesos(valor) {
  return Math.round(Number(valor || 0));
}

/* =========================================================
   POST
========================================================= */

export async function POST(request) {
  try {
    /* -----------------------------------------------------
       1. VERIFICAR CONFIGURACIÓN
    ----------------------------------------------------- */

    if (!MAKE_WEBHOOK_URL) {
      console.error(
        "MAKE_PEDIDOS_WEBHOOK_URL no está configurada."
      );

      return responder(
        {
          ok: false,
          mensaje:
            "El sistema de pedidos todavía no está configurado.",
        },
        500
      );
    }

    /* -----------------------------------------------------
       2. VERIFICAR SESIÓN
    ----------------------------------------------------- */

    const sesion = obtenerSesion(request);

    if (!sesion) {
      return responder(
        {
          ok: false,
          mensaje:
            "Tu sesión venció. Inicia sesión nuevamente.",
        },
        401
      );
    }

    const datosSesion = obtenerDatosSesion(sesion);

    /* -----------------------------------------------------
       3. LEER BODY
    ----------------------------------------------------- */

    let body;

    try {
      body = await request.json();
    } catch {
      return responder(
        {
          ok: false,
          mensaje: "La solicitud no es válida.",
        },
        400
      );
    }

    const formaPago = String(
      body?.forma_pago || ""
    )
      .trim()
      .toUpperCase();

    if (
      formaPago !== "TRANSFERENCIA" &&
      formaPago !== "PAGO EN CASA"
    ) {
      return responder(
        {
          ok: false,
          mensaje:
            "Selecciona Transferencia o Pago en casa.",
        },
        400
      );
    }

    const itemsRecibidos = Array.isArray(body?.productos)
      ? body.productos
      : [];

    if (!itemsRecibidos.length) {
      return responder(
        {
          ok: false,
          mensaje:
            "Tu pedido no tiene productos.",
        },
        400
      );
    }

    if (itemsRecibidos.length > 500) {
      return responder(
        {
          ok: false,
          mensaje:
            "El pedido contiene demasiados productos.",
        },
        400
      );
    }

    /* -----------------------------------------------------
       4. BUSCAR CLIENTE REAL EN SUPABASE
    ----------------------------------------------------- */

    const cliente = await buscarClienteAutorizado(
      datosSesion
    );

    if (!cliente) {
      return responder(
        {
          ok: false,
          mensaje:
            "No pudimos identificar tu cuenta de cliente.",
        },
        403
      );
    }

    if (cliente.activo !== true) {
      return responder(
        {
          ok: false,
          mensaje:
            "Tu cuenta no está activa para realizar pedidos.",
        },
        403
      );
    }

    const telefonoCliente = normalizarTelefono(
      cliente.telefono || datosSesion.telefono
    );

    if (!telefonoCliente) {
      return responder(
        {
          ok: false,
          mensaje:
            "Tu cuenta no tiene un teléfono registrado.",
        },
        400
      );
    }

    /* -----------------------------------------------------
       5. VALIDAR Y RECONSTRUIR PRODUCTOS

       NO confiamos en:
       - costo enviado por navegador
       - precio enviado por navegador
       - referencia enviada por navegador
       - infoimagen enviada por navegador

       Todo se vuelve a consultar en Supabase.
    ----------------------------------------------------- */

    const productosFinales = [];

    for (const item of itemsRecibidos) {
      const productoId = Number(item?.producto_id);
      const varianteId =
        item?.variante_id !== null &&
        item?.variante_id !== undefined &&
        item?.variante_id !== ""
          ? Number(item.variante_id)
          : null;

      const cantidad = Math.floor(
        Number(item?.cantidad || 0)
      );

      if (
        !Number.isInteger(productoId) ||
        productoId <= 0
      ) {
        return responder(
          {
            ok: false,
            mensaje:
              "Uno de los productos del pedido no es válido.",
          },
          400
        );
      }

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0 ||
        cantidad > 999
      ) {
        return responder(
          {
            ok: false,
            mensaje:
              "Una de las cantidades del pedido no es válida.",
          },
          400
        );
      }

      const producto = await obtenerProducto(productoId);

      if (!producto || producto.activo !== true) {
        return responder(
          {
            ok: false,
            mensaje:
              "Uno de los productos ya no está disponible.",
          },
          400
        );
      }

      /* ---------------------------------------------------
         PRODUCTO CON VARIANTE
      --------------------------------------------------- */

      if (varianteId) {
        const variante = await obtenerVariante(
          productoId,
          varianteId
        );

        if (!variante || variante.activo !== true) {
          return responder(
            {
              ok: false,
              mensaje: `La variante seleccionada de ${
                producto.nombre || producto.referencia
              } ya no está disponible.`,
            },
            400
          );
        }

        const costoUnitario = pesos(variante.costo);
        const precioSugerido = pesos(
          variante.precio_detal
        );

        const subtotal = pesos(
          costoUnitario * cantidad
        );

        productosFinales.push({
          producto_id: producto.id,
          variante_id: variante.id,

          referencia:
            variante.referencia ||
            producto.referencia ||
            "",

          referencia_producto:
            producto.referencia || "",

          nombre: producto.nombre || "",

          variante:
            variante.nombre_variante || "",

          cantidad,

          costo_unitario: costoUnitario,

          precio_sugerido: precioSugerido,

          subtotal,

          /*
            INFOIMAGEN:
            Para variante usamos primero el infoimagen
            propio de la variante.

            Si por alguna razón está vacío, usamos el
            del producto padre como respaldo.
          */

          infoimagen:
            variante.infoimagen ||
            producto.infoimagen ||
            "",

          foto_url:
            variante.foto_url ||
            producto.foto_url ||
            "",
        });

        continue;
      }

      /* ---------------------------------------------------
         EVITAR PEDIR PRODUCTO PADRE SIN ELEGIR VARIANTE
      --------------------------------------------------- */

      if (producto.tiene_variantes === true) {
        return responder(
          {
            ok: false,
            mensaje: `Debes seleccionar una variante para ${
              producto.nombre || producto.referencia
            }.`,
          },
          400
        );
      }

      /* ---------------------------------------------------
         PRODUCTO NORMAL
      --------------------------------------------------- */

      const costoUnitario = pesos(producto.costo);
      const precioSugerido = pesos(
        producto.precio_detal
      );

      const subtotal = pesos(
        costoUnitario * cantidad
      );

      productosFinales.push({
        producto_id: producto.id,
        variante_id: null,

        referencia: producto.referencia || "",

        referencia_producto:
          producto.referencia || "",

        nombre: producto.nombre || "",

        variante: "",

        cantidad,

        costo_unitario: costoUnitario,

        precio_sugerido: precioSugerido,

        subtotal,

        infoimagen: producto.infoimagen || "",

        foto_url: producto.foto_url || "",
      });
    }

    /* -----------------------------------------------------
       6. CALCULAR SUBTOTAL
    ----------------------------------------------------- */

    const subtotal = pesos(
      productosFinales.reduce(
        (total, item) => total + item.subtotal,
        0
      )
    );

    /* -----------------------------------------------------
       7. DESCUENTO

       TRANSFERENCIA = 6%
       PAGO EN CASA   = 0%
    ----------------------------------------------------- */

    const porcentajeDescuento =
      formaPago === "TRANSFERENCIA" ? 6 : 0;

    const descuento =
      porcentajeDescuento > 0
        ? pesos(
            subtotal *
              (porcentajeDescuento / 100)
          )
        : 0;

    const totalProductos = pesos(
      subtotal - descuento
    );

    /* -----------------------------------------------------
       8. TOTALES POR PRODUCTO DESPUÉS DEL DESCUENTO

       Esto puede ser útil en Make/AppSheet.
    ----------------------------------------------------- */

    const productosWebhook = productosFinales.map(
      (item) => {
        const descuentoItem =
          porcentajeDescuento > 0
            ? pesos(
                item.subtotal *
                  (porcentajeDescuento / 100)
              )
            : 0;

        return {
          ...item,

          porcentaje_descuento:
            porcentajeDescuento,

          descuento: descuentoItem,

          total_con_descuento: pesos(
            item.subtotal - descuentoItem
          ),
        };
      }
    );

    /* -----------------------------------------------------
       9. CREAR IDENTIFICADOR DEL PEDIDO
    ----------------------------------------------------- */

    const pedidoId = `WEB-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    const fecha = new Date().toISOString();

    const totalUnidades = productosWebhook.reduce(
      (total, item) =>
        total + Number(item.cantidad || 0),
      0
    );

    /* -----------------------------------------------------
       10. PAYLOAD PARA MAKE
    ----------------------------------------------------- */

    const payloadMake = {
      evento: "NUEVO_PEDIDO_MAYORISTA_WEB",

      pedido_id: pedidoId,

      fecha,

      origen: "WEB_MAYORISTAS",

      cliente: {
        id: cliente.id,

        nombre:
          cliente.nombre ||
          datosSesion.nombre ||
          "",

        telefono: telefonoCliente,

        tienda_id:
          cliente.tienda_id ||
          datosSesion.tiendaId ||
          null,

        rol: cliente.rol || "",
      },

      pedido: {
        forma_pago: formaPago,

        subtotal,

        porcentaje_descuento:
          porcentajeDescuento,

        descuento,

        total_productos: totalProductos,

        /*
          El envío todavía no está calculado.
          Make/AppSheet podrá calcularlo después.
        */

        envio: null,

        total_final: null,

        total_unidades: totalUnidades,

        cantidad_referencias:
          productosWebhook.length,

        mensaje_envio:
          "El valor del envío no está incluido. El total final con el valor del envío será enviado al cliente por WhatsApp.",
      },

      productos: productosWebhook,
    };

    /* -----------------------------------------------------
       11. ENVIAR A MAKE
    ----------------------------------------------------- */

    const makeResponse = await fetch(
      MAKE_WEBHOOK_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payloadMake),

        cache: "no-store",
      }
    );

    const makeTexto = await makeResponse.text();

    if (!makeResponse.ok) {
      console.error(
        "Error webhook Make:",
        makeResponse.status,
        makeTexto
      );

      return responder(
        {
          ok: false,
          mensaje:
            "No pudimos registrar el pedido. Inténtalo nuevamente.",
        },
        502
      );
    }

    /* -----------------------------------------------------
       12. RESPUESTA A LA WEB
    ----------------------------------------------------- */

    return responder({
      ok: true,

      mensaje:
        "Pedido enviado correctamente.",

      pedido_id: pedidoId,

      forma_pago: formaPago,

      subtotal,

      porcentaje_descuento:
        porcentajeDescuento,

      descuento,

      total_productos: totalProductos,

      total_unidades: totalUnidades,

      mensaje_envio:
        "El valor del envío no está incluido. Te enviaremos por WhatsApp el total final con el valor del envío.",
    });
  } catch (error) {
    console.error(
      "ERROR ENVIANDO PEDIDO:",
      error
    );

    return responder(
      {
        ok: false,
        mensaje:
          "Ocurrió un error al procesar el pedido.",
      },
      500
    );
  }
}
