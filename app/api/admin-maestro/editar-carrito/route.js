import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ========================================
// VERIFICAR TOKEN DE SESIÓN
// ========================================

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

    const bufferRecibido =
      Buffer.from(firmaRecibida);

    const bufferCorrecto =
      Buffer.from(firmaCorrecta);

    if (
      bufferRecibido.length !==
      bufferCorrecto.length
    ) {
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
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8")
    );

    if (!datos.exp) {
      return null;
    }

    const ahora =
      Math.floor(Date.now() / 1000);

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

// ========================================
// EDITAR CARRITO
// ========================================

export async function POST(request) {
  try {
    // ========================================
    // 1. VALIDAR SESIÓN MAESTRO
    // ========================================

    const secreto =
      process.env.AUTH_SESSION_SECRET;

    if (!secreto) {
      return Response.json(
        {
          ok: false,
          error:
            "Falta AUTH_SESSION_SECRET.",
        },
        {
          status: 500,
        }
      );
    }

    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        "ra_session"
      )?.value;

    const sesion =
      verificarToken(
        token,
        secreto
      );

    if (!sesion) {
      return Response.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      sesion.rol !== "MAESTRO"
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "No tienes permiso para editar carritos.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================
    // 2. RECIBIR DATOS
    // ========================================

    const body =
      await request.json();

    const {
      carrito_id,
      nombre_cliente = "",
      cedula_cliente = "",
      telefono_cliente = "",
      correo_cliente = "",
      direccion_cliente = "",
      ciudad_id = "",
      forma_pago = "",
      estado = "EN_PROCESO",
      productos = [],
    } = body || {};

    if (!carrito_id) {
      return Response.json(
        {
          ok: false,
          error:
            "Falta carrito_id.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
    // 3. VALIDAR ESTADO
    // ========================================

    const estadosPermitidos = [
      "EN_PROCESO",
      "CHECKOUT",
      "COMPLETADO",
      "ABANDONADO",
    ];

    if (
      !estadosPermitidos.includes(
        estado
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Estado no válido.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
    // 4. SUPABASE
    // ========================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecret =
      process.env
        .SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecret
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Supabase no está configurado.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================
    // 5. COMPROBAR QUE EL CARRITO EXISTE
    // ========================================

    const respuestaCarrito =
      await fetch(
        `${supabaseUrl}/rest/v1/carritos_web?select=id,estado,completado_en&id=eq.${encodeURIComponent(
          carrito_id
        )}&limit=1`,
        {
          method: "GET",

          headers: {
            apikey:
              supabaseSecret,

            Accept:
              "application/json",
          },

          cache: "no-store",
        }
      );

    if (
      !respuestaCarrito.ok
    ) {
      throw new Error(
        "No se pudo consultar el carrito."
      );
    }

    const carritos =
      await respuestaCarrito.json();

    const carritoExistente =
      carritos?.[0];

    if (!carritoExistente) {
      return Response.json(
        {
          ok: false,
          error:
            "No encontramos el carrito.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================
    // 6. VALIDAR CIUDAD OFICIAL
    // ========================================

    let ciudadDepartamento =
      null;

    if (ciudad_id) {
      const respuestaCiudad =
        await fetch(
          `${supabaseUrl}/rest/v1/ciudades_envio?select=ciudad_id,ciudad_departamento&id=eq.${encodeURIComponent(
            ciudad_id
          )}&limit=1`,
          {
            method: "GET",

            headers: {
              apikey:
                supabaseSecret,

              Accept:
                "application/json",
            },

            cache: "no-store",
          }
        );

      /*
        Algunas tablas pueden no usar
        "id" sino "ciudad_id".

        Si la primera consulta no devuelve
        ciudad, hacemos la consulta correcta
        por ciudad_id.
      */

      let ciudades = [];

      if (
        respuestaCiudad.ok
      ) {
        ciudades =
          await respuestaCiudad.json();
      }

      if (!ciudades?.[0]) {
        const respuestaCiudadId =
          await fetch(
            `${supabaseUrl}/rest/v1/ciudades_envio?select=ciudad_id,ciudad_departamento&ciudad_id=eq.${encodeURIComponent(
              ciudad_id
            )}&limit=1`,
            {
              method: "GET",

              headers: {
                apikey:
                  supabaseSecret,

                Accept:
                  "application/json",
              },

              cache: "no-store",
            }
          );

        if (
          respuestaCiudadId.ok
        ) {
          ciudades =
            await respuestaCiudadId.json();
        }
      }

      const ciudad =
        ciudades?.[0];

      if (!ciudad) {
        return Response.json(
          {
            ok: false,
            error:
              "La ciudad seleccionada no es válida.",
          },
          {
            status: 400,
          }
        );
      }

      ciudadDepartamento =
        ciudad.ciudad_departamento ||
        null;
    }

    // ========================================
    // 7. LIMPIAR PRODUCTOS
    // ========================================

    const productosLimpios =
      Array.isArray(productos)
        ? productos
            .map((item) => {
              const cantidad =
                Math.max(
                  0,
                  Number(
                    item.cantidad ||
                      0
                  )
                );

              const precio =
                Math.max(
                  0,
                  Number(
                    item.precio ??
                      item.precio_unitario ??
                      0
                  )
                );

              return {
                producto_id:
                  item.producto_id ||
                  item.id_producto ||
                  item.id ||
                  null,

                variante_id:
                  item.variante_id ||
                  null,

                nombre:
                  String(
                    item.nombre || ""
                  ).slice(
                    0,
                    200
                  ),

                referencia:
                  String(
                    item.referencia ||
                      ""
                  ).slice(
                    0,
                    100
                  ),

                variante:
                  String(
                    item.variante ||
                      item.variante_nombre ||
                      ""
                  ).slice(
                    0,
                    150
                  ),

                cantidad,

                precio,
              };
            })
            .filter(
              (item) =>
                item.cantidad > 0
            )
        : [];

    // ========================================
    // 8. RECALCULAR CANTIDAD Y SUBTOTAL
    // ========================================

    const cantidadProductos =
      productosLimpios.reduce(
        (total, item) =>
          total +
          Number(
            item.cantidad || 0
          ),
        0
      );

    const subtotal =
      productosLimpios.reduce(
        (total, item) =>
          total +
          Number(
            item.precio || 0
          ) *
            Number(
              item.cantidad || 0
            ),
        0
      );

    // ========================================
    // 9. PREPARAR ACTUALIZACIÓN
    // ========================================

    const ahora =
      new Date().toISOString();

    let completadoEn = null;

    if (
      estado === "COMPLETADO"
    ) {
      completadoEn =
        carritoExistente.completado_en ||
        ahora;
    }

    const datosActualizar = {
      nombre_cliente:
        String(
          nombre_cliente || ""
        ).slice(
          0,
          200
        ) || null,

      cedula_cliente:
        String(
          cedula_cliente || ""
        ).slice(
          0,
          30
        ) || null,

      telefono_cliente:
        String(
          telefono_cliente || ""
        ).slice(
          0,
          30
        ) || null,

      correo_cliente:
        String(
          correo_cliente || ""
        ).slice(
          0,
          200
        ) || null,

      direccion_cliente:
        String(
          direccion_cliente || ""
        ).slice(
          0,
          300
        ) || null,

      ciudad:
        ciudadDepartamento,

      forma_pago:
        String(
          forma_pago || ""
        ).slice(
          0,
          50
        ) || null,

      estado,

      productos:
        productosLimpios,

      cantidad_productos:
        cantidadProductos,

      subtotal,

      ultima_actividad:
        ahora,

      completado_en:
        completadoEn,
    };

    // ========================================
    // 10. ACTUALIZAR EN SUPABASE
    // ========================================

    const respuestaActualizar =
      await fetch(
        `${supabaseUrl}/rest/v1/carritos_web?id=eq.${encodeURIComponent(
          carrito_id
        )}`,
        {
          method: "PATCH",

          headers: {
            apikey:
              supabaseSecret,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation",
          },

          body:
            JSON.stringify(
              datosActualizar
            ),

          cache: "no-store",
        }
      );

    const texto =
      await respuestaActualizar.text();

    if (
      !respuestaActualizar.ok
    ) {
      console.error(
        "Error actualizando carrito:",
        texto
      );

      throw new Error(
        "No se pudo actualizar el carrito."
      );
    }

    const actualizado =
      texto
        ? JSON.parse(texto)
        : [];

    // ========================================
    // 11. RESPUESTA
    // ========================================

    return Response.json({
      ok: true,

      mensaje:
        "Carrito actualizado correctamente.",

      carrito:
        actualizado?.[0] ||
        null,
    });
  } catch (error) {
    console.error(
      "ERROR EDITANDO CARRITO:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error?.message ||
          "No se pudo editar el carrito.",
      },
      {
        status: 500,
      }
    );
  }
}
