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

   const escala = Math.min(
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
    anchoPagina - margen * 2;

  const anchoFoto =
    (anchoDisponible - espacio) / 2;

  const altoFoto = 235;

  const x1 = margen;

  const x2 =
    margen + anchoFoto + espacio;

  const foto1 =
    producto.foto_url || "";

  const foto2 =
    producto.foto_url_2 || "";

  const tieneDosFotos =
    Boolean(foto1) &&
    Boolean(foto2);

  /* ===============================================
     FONDOS
  =============================================== */

  if (tieneDosFotos) {
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
  } else {
    pagina.drawRectangle({
      x: margen,
      y,
      width: anchoDisponible,
      height: altoFoto,
      color: rgb(
        0.97,
        0.97,
        0.97
      ),
    });
  }

  /* ===============================================
     IMÁGENES
  =============================================== */

  if (tieneDosFotos) {
    // FOTO 1
    await insertarImagen(
      pdfDoc,
      pagina,
      foto1,
      x1,
      y,
      anchoFoto,
      altoFoto
    );

    // FOTO 2
    await insertarImagen(
      pdfDoc,
      pagina,
      foto2,
      x2,
      y,
      anchoFoto,
      altoFoto
    );
  } else {
    // PRODUCTO CON UNA SOLA FOTO
    // Utiliza todo el ancho disponible
    // y queda centrado.
    await insertarImagen(
      pdfDoc,
      pagina,
      foto1 || foto2,
      margen,
      y,
      anchoDisponible,
      altoFoto
    );
  }

  /* ===============================================
     DATOS DEL PRODUCTO
  =============================================== */

  const nombre =
    recortarTexto(
      producto.nombre ||
        "Producto",
      40
    );

  const precio =
    formatoPrecio(
      producto.precio_pdf
    );

  /* ===============================================
     NOMBRE
  =============================================== */

  pagina.drawText(
    nombre,
    {
      x: margen + 9,
      y: y + 9,
      size: 7,
      font: fuenteBold,
      color: rgb(
        0.20,
        0.20,
        0.20
      ),
    }
  );

  /* ===============================================
     PRECIO
  =============================================== */

  const xPrecio =
    tieneDosFotos
      ? x2 +
        anchoFoto -
        72
      : margen +
        anchoDisponible -
        72;

  pagina.drawText(
    precio,
    {
      x: xPrecio,
      y: y + 9,
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
    const body = await request.json().catch(() => ({}));

    const categoriaPdf =
      String(
        body?.categoria ||
          "Todos los productos"
      ).trim();

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

 function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

let productosFiltrados = (productos || []).filter(
  (producto) => {
    // Primero respetamos la visibilidad de la tienda.
    if (
      mapaVisibilidad.has(String(producto.id)) &&
      mapaVisibilidad.get(String(producto.id)) === false
    ) {
      return false;
    }

    return true;
  }
);

/* FILTRAR SEGÚN LA CATEGORÍA ELEGIDA */

if (categoriaPdf === "Accesorios en Rodio") {
  productosFiltrados = productosFiltrados.filter(
    (producto) => {
      const texto = normalizar(
        `${producto.nombre || ""} ${producto.referencia || ""} ${producto.categoria || ""}`
      );

      return texto.includes("rodio");
    }
  );
}

if (categoriaPdf === "Accesorios en Acero") {
  productosFiltrados = productosFiltrados.filter(
    (producto) => {
      const texto = normalizar(
        `${producto.nombre || ""} ${producto.referencia || ""} ${producto.categoria || ""}`
      );

      return texto.includes("acero");
    }
  );
}

if (categoriaPdf === "Aretes") {
  productosFiltrados = productosFiltrados.filter(
    (producto) => {
      const texto = normalizar(producto.nombre);

      return (
        texto.includes("arete") ||
        texto.includes("aretes")
      );
    }
  );
}

if (categoriaPdf === "Candongas") {
  productosFiltrados = productosFiltrados.filter(
    (producto) =>
      normalizar(producto.nombre).includes("candonga")
  );
}

if (categoriaPdf === "Collares") {
  productosFiltrados = productosFiltrados.filter(
    (producto) => {
      const texto = normalizar(producto.nombre);

      return (
        texto.includes("collar") ||
        texto.includes("cadena")
      );
    }
  );
}

if (categoriaPdf === "Pulseras") {
  productosFiltrados = productosFiltrados.filter(
    (producto) =>
      normalizar(producto.nombre).includes("pulsera")
  );
}

if (categoriaPdf === "Anillos") {
  productosFiltrados = productosFiltrados.filter(
    (producto) =>
      normalizar(producto.nombre).includes("anillo")
  );
}

if (categoriaPdf === "Topos y maxitopos") {
  productosFiltrados = productosFiltrados.filter(
    (producto) => {
      const texto = normalizar(producto.nombre);

      return (
        texto.includes("topo") ||
        texto.includes("maxitopo")
      );
    }
  );
}

/*
  POR AHORA:
  "Todos los productos" no aplica filtro adicional.

  Dejamos "Nuevos" para después porque necesitamos
  manejarlo por fecha y no quiero mezclar ese cambio
  con esta primera prueba.
*/

const productosCatalogo = productosFiltrados
  .map((producto) => ({
    ...producto,

    precio_pdf: mapaPrecios.has(String(producto.id))
      ? mapaPrecios.get(String(producto.id))
      : Number(producto.precio_detal || 0),
  }))
  .sort((a, b) => {
    const aTieneDosFotos =
      Boolean(a.foto_url) &&
      Boolean(a.foto_url_2);

    const bTieneDosFotos =
      Boolean(b.foto_url) &&
      Boolean(b.foto_url_2);

    // Los productos con dos fotos primero.
    // Los productos con una sola foto al final.
    if (aTieneDosFotos && !bTieneDosFotos) {
      return -1;
    }

    if (!aTieneDosFotos && bTieneDosFotos) {
      return 1;
    }

    return 0;
  })
  .slice(0, 150);
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

    const espacioVertical = 4;

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
