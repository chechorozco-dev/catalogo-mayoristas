import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function crearFirma(valor, secreto) {
  return crypto
    .createHmac("sha256", secreto)
    .update(valor)
    .digest("base64url");
}

function verificarToken(token, secreto) {
  try {
    if (!token || !secreto) {
      return null;
    }

    const partes = token.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [payload, firmaRecibida] = partes;

    const firmaCorrecta = crearFirma(
      payload,
      secreto
    );

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

    const firmaValida =
      crypto.timingSafeEqual(
        bufferRecibido,
        bufferCorrecto
      );

    if (!firmaValida) {
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

    const ahora = Math.floor(
      Date.now() / 1000
    );

    if (datos.exp <= ahora) {
      return null;
    }

    return datos;
  } catch (error) {
    console.error(
      "Error verificando sesión:",
      error
    );

    return null;
  }
}

function crearTokenSesion(
  datos,
  secreto
) {
  const payload = Buffer.from(
    JSON.stringify(datos)
  ).toString("base64url");

  const firma = crearFirma(
    payload,
    secreto
  );

  return `${payload}.${firma}`;
}

function crearSlug(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request) {
  try {
    // =========================================
    // 1. VARIABLES
    // =========================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    const authSessionSecret =
      process.env.AUTH_SESSION_SECRET;

    // WATI
    const watiEndpoint =
      process.env.WATI_API_ENDPOINT;

    const watiToken =
      process.env.WATI_API_TOKEN;

    const watiChannelNumber =
      process.env.WATI_CHANNEL_NUMBER;

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
            "El servicio no está configurado correctamente.",
        },
        { status: 500 }
      );
    }

    const supabaseHeaders = {
      apikey: supabaseSecretKey,
      "Content-Type":
        "application/json",
    };

    // =========================================
    // 2. LEER SESIÓN
    // =========================================

    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        "ra_session"
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Debes iniciar sesión.",
        },
        { status: 401 }
      );
    }

    const sesion =
      verificarToken(
        token,
        authSessionSecret
      );

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu sesión venció. Inicia sesión nuevamente.",
        },
        { status: 401 }
      );
    }

    // =========================================
    // 3. LEER NOMBRE DE LA TIENDA
    // =========================================

    const body =
      await request.json();

    const nombreTienda =
      String(
        body.nombre_tienda || ""
      ).trim();

    if (
      nombreTienda.length < 2
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Escribe un nombre válido para tu tienda.",
        },
        { status: 400 }
      );
    }

    if (
      nombreTienda.length > 80
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El nombre de la tienda es demasiado largo.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 4. CONFIRMAR CLIENTE AUTORIZADO
    // =========================================

    const clienteResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/clientes_autorizados?id=eq.${encodeURIComponent(
          sesion.cliente_id
        )}&activo=eq.true&select=id,nombre,telefono,activo,tienda_id`,
        {
          method: "GET",
          headers:
            supabaseHeaders,
          cache: "no-store",
        }
      );

    if (
      !clienteResponse.ok
    ) {
      const errorTexto =
        await clienteResponse.text();

      console.error(
        "Error consultando cliente:",
        clienteResponse.status,
        errorTexto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos validar tu cuenta.",
        },
        { status: 500 }
      );
    }

    const clientes =
      await clienteResponse.json();

    if (
      !Array.isArray(clientes) ||
      clientes.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu número ya no está autorizado.",
        },
        { status: 403 }
      );
    }

    const cliente =
      clientes[0];

    // =========================================
    // 5. EVITAR SEGUNDA TIENDA
    // =========================================

    if (cliente.tienda_id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Ya tienes una tienda creada.",
          tienda_id:
            cliente.tienda_id,
        },
        { status: 409 }
      );
    }

    // =========================================
    // 6. GENERAR SLUG
    // =========================================

    let slugBase =
      crearSlug(nombreTienda);

    if (!slugBase) {
      slugBase = "mi-tienda";
    }

    let slug = slugBase;
    let contador = 2;

    while (true) {
      const slugResponse =
        await fetch(
          `${supabaseUrl}/rest/v1/tiendas?slug=eq.${encodeURIComponent(
            slug
          )}&select=id&limit=1`,
          {
            method: "GET",
            headers:
              supabaseHeaders,
            cache: "no-store",
          }
        );

      if (!slugResponse.ok) {
        const errorTexto =
          await slugResponse.text();

        console.error(
          "Error revisando slug:",
          errorTexto
        );

        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "No pudimos preparar el nombre de tu catálogo.",
          },
          { status: 500 }
        );
      }

      const existentes =
        await slugResponse.json();

      if (
        !Array.isArray(
          existentes
        ) ||
        existentes.length === 0
      ) {
        break;
      }

      slug =
        `${slugBase}-${contador}`;

      contador += 1;

      if (contador > 100) {
        slug =
          `${slugBase}-${Date.now()}`;

        break;
      }
    }

    // =========================================
    // 7. CREAR TIENDA
    // =========================================

    const crearResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/tiendas`,
        {
          method: "POST",

          headers: {
            ...supabaseHeaders,
            Prefer:
              "return=representation",
          },

          body: JSON.stringify({
            usuario_id: null,

            nombre_tienda:
              nombreTienda,

            slug,

            whatsapp:
              cliente.telefono,

            logo_url: null,

            activa: true,
          }),
        }
      );

    if (!crearResponse.ok) {
      const errorTexto =
        await crearResponse.text();

      console.error(
        "Error creando tienda:",
        crearResponse.status,
        errorTexto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos crear tu tienda.",
        },
        { status: 500 }
      );
    }

    const tiendasCreadas =
      await crearResponse.json();

    const tienda =
      tiendasCreadas?.[0];

    if (!tienda?.id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "La tienda fue creada pero no pudimos obtener sus datos.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 8. VINCULAR CLIENTE CON TIENDA
    // =========================================

    const vincularResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/clientes_autorizados?id=eq.${encodeURIComponent(
          cliente.id
        )}`,
        {
          method: "PATCH",

          headers: {
            ...supabaseHeaders,
            Prefer:
              "return=representation",
          },

          body: JSON.stringify({
            tienda_id:
              tienda.id,
          }),
        }
      );

    if (
      !vincularResponse.ok
    ) {
      const errorTexto =
        await vincularResponse.text();

      console.error(
        "Error vinculando tienda:",
        errorTexto
      );

      // Si falla el vínculo,
      // eliminamos la tienda recién creada
      // para no dejar registros huérfanos.

      await fetch(
        `${supabaseUrl}/rest/v1/tiendas?id=eq.${encodeURIComponent(
          tienda.id
        )}`,
        {
          method: "DELETE",
          headers:
            supabaseHeaders,
        }
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos vincular tu tienda a tu cuenta.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 9. ENVIAR BIENVENIDA POR WATI
    // =========================================

    /*
      IMPORTANTE:

      La tienda YA está creada y vinculada
      antes de llegar a este punto.

      Si WATI presenta algún problema,
      NO eliminamos la tienda ni devolvemos
      un error al cliente.
    */

    if (
      watiEndpoint &&
      watiToken &&
      watiChannelNumber &&
      cliente.telefono
    ) {
      try {
        const authorization =
          watiToken
            .trim()
            .toLowerCase()
            .startsWith("bearer ")
            ? watiToken.trim()
            : `Bearer ${watiToken.trim()}`;

        const baseWati =
          watiEndpoint.replace(
            /\/+$/,
            ""
          );

        const telefonoWati =
          String(
            cliente.telefono || ""
          ).replace(/\D/g, "");

       const enlaceTienda =
  `https://mi-catalogo-accesorios.vercel.app/${slug}`;

        const urlWati =
          `${baseWati}/api/v1/sendTemplateMessage` +
          `?whatsappNumber=${encodeURIComponent(
            telefonoWati
          )}`;

        const watiResponse =
          await fetch(
            urlWati,
            {
              method: "POST",

              headers: {
                Authorization:
                  authorization,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                template_name:
                  "tienda_creada",

                broadcast_name:
                  "tienda_creada_web",

                channel_number:
                  watiChannelNumber,

             parameters: [
  {
    name: "1",
    value: nombreTienda,
  },
  {
    name: "2",
    value: slug,
  },
],

                /*
                  BOTÓN DINÁMICO

                  La plantilla tiene:

                  https://mi-catalogo-accesorios.vercel.app/{{1}}

                  Por eso solamente enviamos
                  el slug al botón.
                */
                buttons: [
                  {
                    type: "url",
                    index: "0",
                    parameters: [
                      {
                        type: "text",
                        text: slug,
                      },
                    ],
                  },
                ],
              }),
            }
          );

        const watiTexto =
          await watiResponse.text();

        if (!watiResponse.ok) {
          console.error(
            "La tienda fue creada, pero WATI no pudo enviar la bienvenida:",
            watiResponse.status,
            watiTexto
          );
        } else {
          console.log(
            "Plantilla tienda_creada enviada correctamente."
          );
        }
      } catch (errorWati) {
        console.error(
          "La tienda fue creada, pero ocurrió un error enviando la bienvenida por WATI:",
          errorWati
        );
      }
    } else {
      console.warn(
        "La tienda fue creada, pero faltan variables de WATI para enviar la bienvenida."
      );
    }

    // =========================================
    // 10. ACTUALIZAR SESIÓN CON tienda_id
    // =========================================

    const ahora = Math.floor(
      Date.now() / 1000
    );

    const duracionSesion =
      60 * 60 * 24 * 30;

    const nuevaSesion = {
      cliente_id:
        cliente.id,

      telefono:
        cliente.telefono,

      nombre:
        cliente.nombre || "",

      tienda_id:
        tienda.id,

      iat: ahora,

      exp:
        ahora +
        duracionSesion,
    };

    const nuevoToken =
      crearTokenSesion(
        nuevaSesion,
        authSessionSecret
      );

    // =========================================
    // 11. RESPUESTA
    // =========================================

    const response =
      NextResponse.json({
        ok: true,

        mensaje:
          "Tu tienda fue creada correctamente.",

        tienda: {
          id:
            tienda.id,

          nombre_tienda:
            tienda.nombre_tienda,

          slug:
            tienda.slug,

          whatsapp:
            tienda.whatsapp,
        },
      });

    response.cookies.set({
      name: "ra_session",

      value: nuevoToken,

      httpOnly: true,

      secure: true,

      sameSite: "lax",

      path: "/",

      maxAge:
        duracionSesion,
    });

    return response;
  } catch (error) {
    console.error(
      "Error en crear tienda:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        mensaje:
          "Ocurrió un error inesperado al crear tu tienda.",
      },
      { status: 500 }
    );
  }
}
