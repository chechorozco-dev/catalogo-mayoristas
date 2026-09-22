import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

const AUTH_SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET;

/* =========================================================
   UTILIDADES
========================================================= */

function formatoPrecio(valor) {
  return `$ ${Math.round(Number(valor || 0))
    .toLocaleString("es-CO")}`;
}

function base64UrlDecode(valor) {
  let texto = String(valor || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (texto.length % 4) {
    texto += "=";
  }

  return Buffer.from(
    texto,
    "base64"
  ).toString("utf8");
}

function verificarSesion(cookieSesion) {
  if (
    !cookieSesion ||
    !AUTH_SESSION_SECRET
  ) {
    return null;
  }

  try {
    const partes =
      cookieSesion.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [
      payloadCodificado,
      firmaRecibida,
    ] = partes;

    const firmaEsperada = crypto
      .createHmac(
        "sha256",
        AUTH_SESSION_SECRET
      )
      .update(payloadCodificado)
      .digest("base64url");

    const bufferEsperado =
      Buffer.from(firmaEsperada);

    const bufferRecibido =
      Buffer.from(firmaRecibida);

    if (
      bufferEsperado.length !==
      bufferRecibido.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        bufferEsperado,
        bufferRecibido
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      base64UrlDecode(
        payloadCodificado
      )
    );

    return payload;
  } catch (error) {
    console.error(
      "Error verificando sesión:",
      error
    );

    return null;
  }
}

function obtenerCookie(request, nombre) {
  return (
    request.cookies.get(nombre)?.value ||
    ""
  );
}

/* =========================================================
   SUPABASE
========================================================= */

async function supabaseFetch(
  ruta,
  opciones = {}
) {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SECRET_KEY
  ) {
    throw new Error(
      "Faltan variables de Supabase."
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${ruta}`,
    {
      ...opciones,

      headers: {
        apikey:
          SUPABASE_SECRET_KEY,

        "Content-Type":
          "application/json",

        ...(opciones.headers || {}),
      },

      cache: "no-store",
    }
  );

  if (!response.ok) {
    const texto =
      await response.text();

    throw new Error(
      `Supabase ${response.status}: ${texto}`
    );
  }

  return response;
}

/* =========================================================
   IMÁGENES
========================================================= */

async function descargarImagen(url) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      cache: "force-cache",
    });

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    const bytes =
      await response.arrayBuffer();

    return {
      bytes,
      contentType,
    };
  } catch (error) {
    console.error(
      "No se pudo descargar imagen:",
      url,
      error
    );

    return null;
  }
}

async function insertarImagen(
  pdfDoc,
  pagina,
  url,
  x,
  y,
  ancho,
  alto
) {
  if (!url) return false;

  try {
    const imagenDescargada =
      await descargarImagen(url);

    if (!imagenDescargada) {
      return false;
    }

    const {
      bytes,
      contentType,
    } = imagenDescargada;

    let imagenPdf = null;

    if (
      contentType.includes("png") ||
      String(url)
        .toLowerCase()
        .includes(".png")
    ) {
      imagenPdf =
        await pdfDoc.embedPng(bytes);
    } else {
      imagenPdf =
        await pdfDoc.embedJpg(bytes);
    }

    const dimensiones =
      imagenPdf.scale(1);

    const escala = Math.max(
      ancho / dimensiones.width,
      alto / dimensiones.height
    );

    const anchoFinal =
      dimensiones.width * escala;

    const altoFinal =
      dimensiones.height * escala;

    const xFinal =
      x +
      (ancho - anchoFinal) / 2;

    const yFinal =
      y +
      (alto - altoFinal) / 2;

    pagina.drawImage(imagenPdf, {
      x: xFinal,
      y: yFinal,
      width: anchoFinal,
      height: altoFinal,
    });

    return true;
  } catch (error) {
    console.error(
      "Error insertando imagen:",
      url,
      error
    );

    return false;
  }
}

/* =========================================================
   TEXTO SEGURO
========================================================= */

function limpiarTextoPdf(texto) {
  return String(texto || "")
    .replace(/[^\x20-\x7EÀ-ÿ]/g, "")
    .trim();
}

function recortarTexto(
  texto,
  maximo = 34
) {
  const limpio =
    limpiarTextoPdf(texto);

  if (limpio.length <= maximo) {
    return limpio;
  }

  return `${limpio.slice(
    0,
    maximo - 3
  )}...`;
}

/* =========================================================
   CREAR UNA FILA DEL CATÁLOGO
========================================================= */

async function dibujarProducto({
  pdfDoc,
  pagina,
  producto,
  y,
  fuente,
  fuenteBold,
}) {
  const margen = 24;

  const espacio = 6;

  const anchoPagina =
    pagina.getWidth();

  const anchoDisponible =
    anchoPagina -
    margen * 2;

  const anchoFoto =
    (anchoDisponible -
      espacio) /
    2;

  const altoFoto = 235;

  const x1 = margen;

  const x2 =
    margen +
    anchoFoto +
    espacio;

  /* FONDOS */

  pagina.drawRectangle({
    x: x1,
    y,
    width: anchoFoto,
    height: altoFoto,
    color: rgb(
      0.97,
      0.97,
      0.97
    ),
  });

  pagina.drawRectangle({
    x: x2,
    y,
    width: anchoFoto,
    height: altoFoto,
    color: rgb(
      0.97,
      0.97,
      0.97
    ),
  });

  /* IMÁGENES */

  const foto1 =
    producto.foto_url || "";

  const foto2 =
    producto.foto_url_2 || "";

  await insertarImagen(
    pdfDoc,
    pagina,
    foto1,
    x1,
    y,
    anchoFoto,
    altoFoto
  );

  /*
    Si no existe segunda foto,
    repetimos la primera temporalmente.

    Más adelante podemos cambiar esto
    por otro diseño especial.
  */

  await insertarImagen(
    pdfDoc,
    pagina,
    foto2 || foto1,
    x2,
    y,
    anchoFoto,
    altoFoto
  );

  /* SOMBRA INFERIOR PARA TEXTO */

  pagina.drawRectangle({
    x: x1,
    y,
    width: anchoFoto,
    height: 42,
    color: rgb(
      1,
      1,
      1
    ),
    opacity: 0.9,
  });

  pagina.drawRectangle({
    x: x2,
    y,
    width: anchoFoto,
    height: 42,
    color: rgb(
      1,
      1,
      1
    ),
    opacity: 0.9,
  });

  const referencia =
    recortarTexto(
      producto.referencia ||
        "Sin referencia",
      24
    );

  const nombre =
    recortarTexto(
      producto.nombre ||
        "Producto",
      30
    );

  const precio =
    formatoPrecio(
      producto.precio_pdf
    );

  /* IZQUIERDA */

  pagina.drawText(
    referencia,
    {
      x: x1 + 9,
      y: y + 26,
      size: 9,
      font: fuenteBold,
      color: rgb(
        0.12,
        0.12,
        0.12
      ),
    }
  );

  pagina.drawText(
    nombre,
    {
      x: x1 + 9,
      y: y + 12,
      size: 7,
      font: fuente,
      color: rgb(
        0.32,
        0.32,
        0.32
      ),
    }
  );

  /* DERECHA */

  pagina.drawText(
    referencia,
    {
      x: x2 + 9,
      y: y + 26,
      size: 9,
      font: fuenteBold,
      color: rgb(
        0.12,
        0.12,
        0.12
      ),
    }
  );

  pagina.drawText(
    precio,
    {
      x:
        x2 +
        anchoFoto -
        72,
      y: y + 11,
      size: 10,
      font: fuenteBold,
      color: rgb(
        0.12,
        0.12,
        0.12
      ),
    }
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(request) {
  try {
    /* ===============================================
       1. VERIFICAR SESIÓN
    =============================================== */

    const cookieSesion =
      obtenerCookie(
        request,
        "ra_session"
      );

    const sesion =
      verificarSesion(
        cookieSesion
      );

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu sesión no es válida.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      La sesión puede guardar distintos
      nombres dependiendo de cómo quedó
      tu login.

      Primero intentamos obtener teléfono.
    */

    const telefono =
      sesion.telefono ||
      sesion.phone ||
      sesion.whatsapp ||
      "";

    if (!telefono) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos identificar tu cuenta.",
        },
        {
          status: 401,
        }
      );
    }

    /* ===============================================
       2. BUSCAR TIENDA DEL CLIENTE
    =============================================== */

    const clienteResponse =
      await supabaseFetch(
        `clientes_autorizados?telefono=eq.${encodeURIComponent(
          telefono
        )}&activo=eq.true&select=id,nombre,telefono,tienda_id,rol&limit=1`
      );

    const clientes =
      await clienteResponse.json();

    const cliente =
      clientes?.[0];

    if (
      !cliente ||
      !cliente.tienda_id
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No encontramos la tienda asociada a tu cuenta.",
        },
        {
          status: 403,
        }
      );
    }

    const tiendaId =
      cliente.tienda_id;

    /* ===============================================
       3. PRODUCTOS GLOBALES
    =============================================== */

    const productosResponse =
      await supabaseFetch(
        [
          "productos",
          "?activo=eq.true",
          "&select=",
          [
            "id",
            "referencia",
            "nombre",
            "categoria",
            "foto_url",
            "foto_url_2",
            "precio_detal",
            "tiene_variantes",
          ].join(","),
          "&order=id.desc",
        ].join("")
      );

    const productos =
      await productosResponse.json();

    /* ===============================================
       4. VISIBILIDAD DE ESTA TIENDA
    =============================================== */

    const visibilidadResponse =
      await supabaseFetch(
        `tienda_productos?tienda_id=eq.${tiendaId}&select=producto_id,visible`
      );

    const visibilidades =
      await visibilidadResponse.json();

    const mapaVisibilidad =
      new Map();

    for (
      const fila of
      visibilidades || []
    ) {
      mapaVisibilidad.set(
        String(
          fila.producto_id
        ),
        fila.visible !== false
      );
    }

    /* ===============================================
       5. PRECIOS PERSONALIZADOS
    =============================================== */

    const preciosResponse =
      await supabaseFetch(
        `precios_tienda?tienda_id=eq.${tiendaId}&variante_id=is.null&select=producto_id,precio_sugerido`
      );

    const precios =
      await preciosResponse.json();

    const mapaPrecios =
      new Map();

    for (
      const fila of
      precios || []
    ) {
      mapaPrecios.set(
        String(
          fila.producto_id
        ),
        Number(
          fila.precio_sugerido ||
            0
        )
      );
    }

    /* ===============================================
       6. FILTRAR PRODUCTOS VISIBLES
    =============================================== */

  const productosCatalogo =
  (productos || [])
    .filter((producto) => {
          if (
            mapaVisibilidad.has(
              String(producto.id)
            )
          ) {
            return (
              mapaVisibilidad.get(
                String(
                  producto.id
                )
              ) !== false
            );
          }

          /*
            Si no existe fila en
            tienda_productos,
            el producto es visible
            por defecto.
          */

          return true;
        })
        .map((producto) => ({
          ...producto,

          precio_pdf:
            mapaPrecios.has(
              String(producto.id)
            )
              ? mapaPrecios.get(
                  String(
                    producto.id
                  )
                )
              : Number(
                  producto.precio_detal ||
                    0
                ),
               }))
        .slice(0, 6);
    if (
      productosCatalogo.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No tienes productos visibles para generar el catálogo.",
        },
        {
          status: 400,
        }
      );
    }

    /* ===============================================
       7. CREAR PDF
    =============================================== */

    const pdfDoc =
      await PDFDocument.create();

    const fuente =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

    const fuenteBold =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );

    /*
      A4:
      595.28 × 841.89 puntos

      3 referencias por página.
      Cada referencia usa dos fotos.
    */

    const anchoPagina =
      595.28;

    const altoPagina =
      841.89;

    const margenSuperior = 35;

    const altoProducto = 235;

    const espacioVertical = 18;

    let pagina = null;

    let posicionEnPagina = 0;

    for (
      let i = 0;
      i <
      productosCatalogo.length;
      i++
    ) {
      if (
        posicionEnPagina === 0
      ) {
        pagina =
          pdfDoc.addPage([
            anchoPagina,
            altoPagina,
          ]);
      }

      const y =
        altoPagina -
        margenSuperior -
        altoProducto -
        posicionEnPagina *
          (altoProducto +
            espacioVertical);

      await dibujarProducto({
        pdfDoc,
        pagina,
        producto:
          productosCatalogo[i],
        y,
        fuente,
        fuenteBold,
      });

      posicionEnPagina++;

      if (
        posicionEnPagina === 3
      ) {
        posicionEnPagina = 0;
      }
    }

    /* ===============================================
       8. METADATOS
    =============================================== */

    pdfDoc.setTitle(
      "Catálogo de productos"
    );

    pdfDoc.setAuthor(
      cliente.nombre ||
        "Catálogo"
    );

    pdfDoc.setCreator(
      "RA Catálogos"
    );

    /* ===============================================
       9. GUARDAR
    =============================================== */

    const pdfBytes =
      await pdfDoc.save({
        useObjectStreams: true,
      });

    return new Response(
      Buffer.from(pdfBytes),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            'attachment; filename="catalogo-productos.pdf"',

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "ERROR GENERANDO CATÁLOGO PDF:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          error.message ||
          "No pudimos generar el catálogo PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
