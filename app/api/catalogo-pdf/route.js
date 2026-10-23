import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import crypto from "crypto";
import sharp from "sharp";
import { fetchSupabasePaginado } from "../../../lib/supabasePagination";
import { fotosProducto, organizarFilasProductosPdf } from "../../../lib/catalogo/pdf-layout.mjs";
import {
  esSeleccionPdfValida, productoCoincidePdf, MAX_PRODUCTOS_PDF,
} from "../../../lib/catalogo/pdf-filtros.mjs";

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

function formatoPrecio(valor, moneda = "COP") {
  if (moneda === "USD") {
    return "US$ " + Number(valor || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
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

  const { paginar = false, ...opcionesFetch } = opciones;

  const response = await (paginar ? fetchSupabasePaginado : fetch)(
    `${SUPABASE_URL}/rest/v1/${ruta}`,
    {
      ...opcionesFetch,

      headers: {
        apikey:
          SUPABASE_SECRET_KEY,

        "Content-Type":
          "application/json",

        ...(opcionesFetch.headers || {}),
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
  cache: "no-store",
  signal: AbortSignal.timeout(9000),
  headers: {
    Accept: "image/png,image/jpeg,image/jpg,*/*",
    "User-Agent": "Mozilla/5.0",
  },
});

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";
    const longitud = Number(response.headers.get("content-length") || 0);
    if (longitud > 12 * 1024 * 1024) return null;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 12 * 1024 * 1024) return null;

    return { bytes };
  } catch (error) {
    console.error(
      "No se pudo descargar imagen:",
      url,
      error
    );

    return null;
  }
}


/**
 * Comprobación REAL de cada imagen: solo se contabiliza cuando
 * el enlace descarga, Sharp la decodifica y se convierte a JPEG.
 * Ningún URL falso puede reservar una columna en el PDF.
 */
async function descargarImagenOptimizada(url) {
  try {
    const descarga = await descargarImagen(url);
    if (!descarga) return null;
    return await sharp(Buffer.from(descarga.bytes), {
      limitInputPixels: 25_000_000,
    })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 79 })
      .toBuffer();
  } catch (error) {
    console.warn("Fotografía inaccesible para PDF:", error?.message || "Error de imagen");
    return null;
  }
}

// Mantiene la carga del logo de la portada compatible con el diseño actual.
async function insertarImagen(pdfDoc, pagina, url, x, y, ancho, alto) {
  const jpeg = await descargarImagenOptimizada(url);
  if (!jpeg) return false;
  try {
    const imagenPdf = await pdfDoc.embedJpg(jpeg);
    const dimensiones = imagenPdf.scale(1);
    const escala = Math.min(ancho / dimensiones.width, alto / dimensiones.height);
    const anchoFinal = dimensiones.width * escala;
    const altoFinal = dimensiones.height * escala;
    pagina.drawImage(imagenPdf, {
      x: x + (ancho - anchoFinal) / 2,
      y: y + (alto - altoFinal) / 2,
      width: anchoFinal,
      height: altoFinal,
    });
    return true;
  } catch (error) {
    console.warn("Logo no disponible en PDF:", error?.message || "Error");
    return false;
  }
}

/**
 * Hasta ocho descargas paralelas, sin descargar dos veces la misma URL.
 * Se prepara la selección completa antes de ordenar filas.
 * Las imágenes fallidas o duplicadas no cuentan para el diseño.
 */
async function prepararImagenesProductosPdf(productos, reportar) {
  const tareas = [];
  const fotos = productos.map((producto, productoIndex) => {
    const urls = fotosProducto(producto);
    urls.forEach((url, fotoIndex) => tareas.push({ productoIndex, fotoIndex, url }));
    return new Array(urls.length).fill(null);
  });
  if (tareas.length === 0) return productos.map(p => ({ ...p, imagenes_pdf: [] }));

  const cache = new Map();
  let proxima = 0;
  let completadas = 0;
  let ultimoPorcentaje = 28;

  async function trabajador() {
    while (proxima < tareas.length) {
      const tarea = tareas[proxima++];
      if (!cache.has(tarea.url)) cache.set(tarea.url, descargarImagenOptimizada(tarea.url));
      const jpeg = await cache.get(tarea.url);
      fotos[tarea.productoIndex][tarea.fotoIndex] = jpeg;
      completadas++;
      const porcentaje = 28 + Math.round((completadas * 52) / tareas.length);
      if (porcentaje > ultimoPorcentaje) {
        ultimoPorcentaje = porcentaje;
        reportar(porcentaje, "Comprobando imágenes: " + completadas + " de " + tareas.length);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(8, tareas.length) }, () => trabajador())
  );

  return productos.map((producto, i) => {
    const vistos = new Set();
    const imagenes_pdf = fotos[i].filter((jpeg) => {
      if (!jpeg) return false;
      const digest = crypto.createHash("sha256").update(jpeg).digest("hex");
      if (vistos.has(digest)) return false;
      vistos.add(digest);
      return true;
    });
    return { ...producto, imagenes_pdf };
  });
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
   LAYOUT: DOBLE FOTO O DOS PRODUCTOS DE UNA FOTO
========================================================= */

function dibujarNombrePrecio({ pagina, producto, x, y, ancho, fuenteBold, compacto }) {
  const tamanoNombre = compacto ? 8.2 : 9;
  const tamanoPrecio = compacto ? 9 : 10;
  const precio = formatoPrecio(producto.precio_pdf, producto.moneda);
  const anchoPrecio = fuenteBold.widthOfTextAtSize(precio, tamanoPrecio);
  let nombre = limpiarTextoPdf(producto.nombre || producto.referencia || "Producto");
  const anchoMaxNombre = compacto ? ancho - 10 : ancho - anchoPrecio - 22;

  if (fuenteBold.widthOfTextAtSize(nombre, tamanoNombre) > anchoMaxNombre) {
    while (nombre.length > 3 &&
      fuenteBold.widthOfTextAtSize(nombre + "...", tamanoNombre) > anchoMaxNombre) {
      nombre = nombre.slice(0, -1);
    }
    nombre += "...";
  }

  pagina.drawText(nombre, {
    x: x + 4,
    y: y + (compacto ? 19 : 10),
    size: tamanoNombre,
    font: fuenteBold,
    color: rgb(0.20, 0.20, 0.20),
  });

  pagina.drawText(precio, {
    x: x + ancho - anchoPrecio - 4,
    y: y + (compacto ? 5 : 9),
    size: tamanoPrecio,
    font: fuenteBold,
    color: rgb(0.12, 0.12, 0.12),
  });
}

async function dibujarFotoVerificada({ pdfDoc, pagina, jpeg, x, y, ancho, alto }) {
  pagina.drawRectangle({
    x, y: y - 4, width: ancho, height: alto + 8,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.91, 0.89, 0.87),
    borderWidth: 0.5,
  });
  const imagen = await pdfDoc.embedJpg(jpeg);
  const dimensiones = imagen.scale(1);
  const escala = Math.min((ancho - 8) / dimensiones.width, alto / dimensiones.height);
  const anchoFinal = dimensiones.width * escala;
  const altoFinal = dimensiones.height * escala;
  pagina.drawImage(imagen, {
    x: x + (ancho - anchoFinal) / 2,
    y: y + (alto - altoFinal) / 2,
    width: anchoFinal, height: altoFinal,
  });
}

async function dibujarFilaProductosPdf({ pdfDoc, pagina, fila, y, fuenteBold }) {
  const anchoPagina = pagina.getWidth();
  const margen = 24;
  const separacion = 10;
  const anchoColumna = (anchoPagina - margen * 2 - separacion) / 2;
  const altoFoto = 194;
  const yFoto = y + 34;
  const xColumna = (indice) => margen + indice * (anchoColumna + separacion);

  if (fila.tipo === "dos") {
    const producto = fila.productos[0];
    for (let i = 0; i < 2; i++) {
      await dibujarFotoVerificada({
        pdfDoc, pagina,
        jpeg: producto.imagenes_pdf[i],
        x: xColumna(i), y: yFoto, ancho: anchoColumna, alto: altoFoto,
      });
    }
    dibujarNombrePrecio({
      pagina, producto, x: margen, y,
      ancho: anchoPagina - margen * 2, fuenteBold, compacto: false,
    });
    return;
  }

  if (fila.tipo === "pareja") {
    for (let i = 0; i < 2; i++) {
      const producto = fila.productos[i];
      await dibujarFotoVerificada({
        pdfDoc, pagina,
        jpeg: producto.imagenes_pdf[0],
        x: xColumna(i), y: yFoto, ancho: anchoColumna, alto: altoFoto,
      });
      dibujarNombrePrecio({
        pagina, producto, x: xColumna(i), y,
        ancho: anchoColumna, fuenteBold, compacto: true,
      });
    }
    return;
  }

  // Si queda solo uno, no se coloca a la izquierda: queda centrado.
  const producto = fila.productos[0];
  const xCentro = (anchoPagina - anchoColumna) / 2;
  await dibujarFotoVerificada({
    pdfDoc, pagina, jpeg: producto.imagenes_pdf[0],
    x: xCentro, y: yFoto, ancho: anchoColumna, alto: altoFoto,
  });
  dibujarNombrePrecio({
    pagina, producto, x: xCentro, y,
    ancho: anchoColumna, fuenteBold, compacto: true,
  });
}

/* =========================================================
   CREAR PORTADA PREMIUM DEL CATÁLOGO
   VERSIÓN SEGURA - SIN drawSvgPath
========================================================= */

async function crearPortadaCatalogo({
  pdfDoc,
  tienda,
  categoriaPdf,
  fuente,
  fuenteBold,
}) {
  const anchoPagina = 595.28;
  const altoPagina = 841.89;
  /* =========================================================
   COLOR DE FONDO DE LA TIENDA PARA LAS PÁGINAS DE PRODUCTOS
========================================================= */

function convertirColorFondoPdf(hex) {
  const limpio = String(hex || "")
    .replace("#", "")
    .trim();

  if (!/^[0-9A-Fa-f]{6}$/.test(limpio)) {
    return rgb(1, 1, 1);
  }

  return rgb(
    parseInt(limpio.slice(0, 2), 16) / 255,
    parseInt(limpio.slice(2, 4), 16) / 255,
    parseInt(limpio.slice(4, 6), 16) / 255
  );
}

const colorFondoProductos =
  convertirColorFondoPdf(
    tienda?.color_fondo
  );

function crearPaginaProductos() {
  const pagina = pdfDoc.addPage([
    anchoPagina,
    altoPagina,
  ]);

  pagina.drawRectangle({
    x: 0,
    y: 0,
    width: anchoPagina,
    height: altoPagina,
    color: colorFondoProductos,
  });

  return pagina;
}

 const pagina = crearPaginaProductos();

  /* =====================================================
     COLOR PRINCIPAL DE LA TIENDA
  ===================================================== */

  function convertirHex(hex, fallback) {
    const limpio = String(hex || "")
      .replace("#", "")
      .trim();

    if (!/^[0-9A-Fa-f]{6}$/.test(limpio)) {
      return fallback;
    }

    return rgb(
      parseInt(limpio.slice(0, 2), 16) / 255,
      parseInt(limpio.slice(2, 4), 16) / 255,
      parseInt(limpio.slice(4, 6), 16) / 255
    );
  }

  const colorMarca = convertirHex(
    tienda?.color_principal,
    rgb(0.78, 0.55, 0.16)
  );

  const fondo = rgb(
    0.992,
    0.982,
    0.955
  );

  const beige = rgb(
    0.955,
    0.915,
    0.825
  );

  const beigeClaro = rgb(
    0.98,
    0.955,
    0.90
  );

  const textoOscuro = rgb(
    0.16,
    0.14,
    0.11
  );

  const textoSuave = rgb(
    0.40,
    0.36,
    0.31
  );

  /* =====================================================
     FONDO GENERAL
  ===================================================== */

  pagina.drawRectangle({
    x: 0,
    y: 0,
    width: anchoPagina,
    height: altoPagina,
    color: fondo,
  });

  /* =====================================================
     FRANJA SUPERIOR
  ===================================================== */

  pagina.drawRectangle({
    x: 0,
    y: altoPagina - 14,
    width: anchoPagina,
    height: 14,
    color: colorMarca,
  });

  /* =====================================================
     DECORACIÓN SUPERIOR IZQUIERDA
  ===================================================== */

  pagina.drawRectangle({
    x: 0,
    y: 748,
    width: 115,
    height: 80,
    color: beige,
  });

  pagina.drawRectangle({
    x: 0,
    y: 795,
    width: 62,
    height: 33,
    color: colorMarca,
    opacity: 0.75,
  });

  pagina.drawLine({
    start: {
      x: 35,
      y: 744,
    },
    end: {
      x: 155,
      y: 744,
    },
    thickness: 1,
    color: colorMarca,
  });

  /* =====================================================
     DECORACIÓN SUPERIOR DERECHA
  ===================================================== */

  pagina.drawRectangle({
    x: 480,
    y: 748,
    width: 115,
    height: 80,
    color: beigeClaro,
  });

  pagina.drawRectangle({
    x: 533,
    y: 795,
    width: 62,
    height: 33,
    color: colorMarca,
    opacity: 0.55,
  });

  pagina.drawLine({
    start: {
      x: 440,
      y: 744,
    },
    end: {
      x: 560,
      y: 744,
    },
    thickness: 1,
    color: colorMarca,
  });

  /* =====================================================
     LOGO DE LA TIENDA
  ===================================================== */

  if (tienda?.logo_url) {
    await insertarImagen(
      pdfDoc,
      pagina,
      tienda.logo_url,
      207,
      620,
      180,
      145
    );
  }

  /* =====================================================
     NOMBRE DE LA TIENDA
  ===================================================== */

  const nombreTienda = limpiarTextoPdf(
    tienda?.nombre_tienda || "Mi tienda"
  ).toUpperCase();

  let tamanoNombre = 28;

  let anchoNombre =
    fuenteBold.widthOfTextAtSize(
      nombreTienda,
      tamanoNombre
    );

  while (
    anchoNombre > 490 &&
    tamanoNombre > 17
  ) {
    tamanoNombre -= 1;

    anchoNombre =
      fuenteBold.widthOfTextAtSize(
        nombreTienda,
        tamanoNombre
      );
  }

  pagina.drawText(
    nombreTienda,
    {
      x:
        (anchoPagina - anchoNombre) /
        2,
      y: 570,
      size: tamanoNombre,
      font: fuenteBold,
      color: textoOscuro,
    }
  );

  /* =====================================================
     ADORNO DEBAJO DEL NOMBRE
  ===================================================== */

  pagina.drawLine({
    start: {
      x: 190,
      y: 540,
    },
    end: {
      x: 282,
      y: 540,
    },
    thickness: 1,
    color: colorMarca,
  });

  pagina.drawLine({
    start: {
      x: 313,
      y: 540,
    },
    end: {
      x: 405,
      y: 540,
    },
    thickness: 1,
    color: colorMarca,
  });

  pagina.drawRectangle({
    x: 293.5,
    y: 536,
    width: 8,
    height: 8,
    color: colorMarca,
  });

  /* =====================================================
     TÍTULO
  ===================================================== */

  const titulo =
    "CATÁLOGO DE PRODUCTOS";

  const anchoTitulo =
    fuenteBold.widthOfTextAtSize(
      titulo,
      16
    );

  pagina.drawText(
    titulo,
    {
      x:
        (anchoPagina - anchoTitulo) /
        2,
      y: 500,
      size: 16,
      font: fuenteBold,
      color: textoOscuro,
    }
  );

  /* =====================================================
     CATEGORÍA
  ===================================================== */

  const categoria =
    limpiarTextoPdf(
      categoriaPdf || "Productos"
    ).toUpperCase();

  let tamanoCategoria = 13;

  let anchoCategoria =
    fuenteBold.widthOfTextAtSize(
      categoria,
      tamanoCategoria
    );

  while (
    anchoCategoria > 220 &&
    tamanoCategoria > 9
  ) {
    tamanoCategoria -= 1;

    anchoCategoria =
      fuenteBold.widthOfTextAtSize(
        categoria,
        tamanoCategoria
      );
  }

  pagina.drawRectangle({
    x: 170,
    y: 443,
    width: 255,
    height: 43,
    color: beigeClaro,
    borderColor: colorMarca,
    borderWidth: 1,
  });

  pagina.drawText(
    categoria,
    {
      x:
        (anchoPagina -
          anchoCategoria) /
        2,
      y: 458,
      size: tamanoCategoria,
      font: fuenteBold,
      color: textoOscuro,
    }
  );

  /* =====================================================
     FRASE
  ===================================================== */

 const frase =
  "DESCUBRE NUESTRA COLECCIÓN";

  const anchoFrase =
    fuente.widthOfTextAtSize(
      frase,
      8
    );

  pagina.drawText(
    frase,
    {
      x:
        (anchoPagina -
          anchoFrase) /
        2,
      y: 413,
      size: 8,
      font: fuente,
      color: textoSuave,
    }
  );

  /* =====================================================
     ZONA DECORATIVA INFERIOR
  ===================================================== */

  pagina.drawRectangle({
    x: 0,
    y: 0,
    width: anchoPagina,
    height: 245,
    color: beigeClaro,
  });

  pagina.drawRectangle({
    x: 0,
    y: 0,
    width: anchoPagina,
    height: 150,
    color: fondo,
  });

  pagina.drawLine({
    start: {
      x: 0,
      y: 245,
    },
    end: {
      x: anchoPagina,
      y: 245,
    },
    thickness: 1.2,
    color: colorMarca,
  });

  pagina.drawLine({
    start: {
      x: 0,
      y: 150,
    },
    end: {
      x: anchoPagina,
      y: 150,
    },
    thickness: 0.7,
    color: colorMarca,
  });

  /* =====================================================
     DECORACIÓN TIPO JOYERÍA
  ===================================================== */

  const puntos = [
    [120, 198, 4],
    [150, 208, 3],
    [180, 198, 4],
    [210, 208, 3],
    [240, 198, 4],
    [270, 208, 3],
    [297.5, 198, 6],
    [325, 208, 3],
    [355, 198, 4],
    [385, 208, 3],
    [415, 198, 4],
    [445, 208, 3],
    [475, 198, 4],
  ];

  for (
    let i = 0;
    i < puntos.length;
    i++
  ) {
    const [
      x,
      y,
      radio,
    ] = puntos[i];

    pagina.drawCircle({
      x,
      y,
      size: radio,
      color: colorMarca,
    });

    if (
      i <
      puntos.length - 1
    ) {
      pagina.drawLine({
        start: {
          x: x + radio,
          y,
        },
        end: {
          x:
            puntos[i + 1][0] -
            puntos[i + 1][2],
          y:
            puntos[i + 1][1],
        },
        thickness: 0.7,
        color: colorMarca,
      });
    }
  }

  /* =====================================================
     WHATSAPP
  ===================================================== */

  if (tienda?.whatsapp) {
    const telefono =
      limpiarTextoPdf(
        tienda.whatsapp
      );

    const textoWhatsapp =
      `WHATSAPP  ${telefono}`;

    const anchoWhatsapp =
      fuenteBold.widthOfTextAtSize(
        textoWhatsapp,
        10
      );

    pagina.drawText(
      textoWhatsapp,
      {
        x:
          (anchoPagina -
            anchoWhatsapp) /
          2,
        y: 92,
        size: 10,
        font: fuenteBold,
        color: textoOscuro,
      }
    );
  }

  /* =====================================================
     PIE
  ===================================================== */

  pagina.drawLine({
    start: {
      x: 225,
      y: 64,
    },
    end: {
      x: 370,
      y: 64,
    },
    thickness: 0.6,
    color: colorMarca,
  });

  const textoPie =
    "CATÁLOGO DIGITAL";

  const anchoPie =
    fuente.widthOfTextAtSize(
      textoPie,
      7
    );

  pagina.drawText(
    textoPie,
    {
      x:
        (anchoPagina -
          anchoPie) /
        2,
      y: 43,
      size: 7,
      font: fuente,
      color: colorMarca,
    }
  );

  return pagina;
}
/* =========================================================
   POST
========================================================= */

async function generarCatalogoPdf(request, reportarProgreso = () => {}) {
  try {
    reportarProgreso(4, "Comprobando tu sesión");
    const body = await request.json().catch(() => ({}));

    const materialPdf = String(body?.material || "").trim();
    const tipoPdf = String(body?.tipo || "").trim();
    // Bloquea exportaciones accidentales de toda la base o de «Nuevos».
    if (!esSeleccionPdfValida(materialPdf, tipoPdf)) {
      return NextResponse.json({
        ok: false,
        mensaje: "Selecciona Rodio, Acero o Ambos y después un tipo de producto válido.",
      }, { status: 400 });
    }
    const categoriaPdf = `${tipoPdf} - ${materialPdf === "AMBOS" ? "Rodio y acero" : materialPdf}`;

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
   DATOS DE LA TIENDA PARA LA PORTADA
=============================================== */

const tiendaResponse =
  await supabaseFetch(
    `tiendas?id=eq.${tiendaId}&select=id,nombre_tienda,whatsapp,logo_url,color_principal,color_fondo,instagram,facebook,tiktok,tipo_tienda,moneda&limit=1`
  );

const tiendas =
  await tiendaResponse.json();

const tienda =
  tiendas?.[0] || null;

if (!tienda) {
  return NextResponse.json(
    {
      ok: false,
      mensaje:
        "No encontramos los datos de la tienda.",
    },
    {
      status: 404,
    }
  );
}
/* ===============================================
   IDENTIFICAR SI ES TIENDA RA
=============================================== */

const esTiendaRA =
  String(tienda?.tipo_tienda || "")
    .trim()
    .toUpperCase() === "RA";
    reportarProgreso(12, "Consultando productos de tu tienda");

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
  "solo_ra",
  "tiene_variantes",
].join(","),
          "&order=id.desc",
        ].join(""),
        { paginar: true }
      );

    const productos =
      await productosResponse.json();

    /* ===============================================
       4. VISIBILIDAD DE ESTA TIENDA
    =============================================== */

    const visibilidadResponse =
      await supabaseFetch(
        `tienda_productos?tienda_id=eq.${tiendaId}&select=producto_id,visible&order=producto_id.asc`,
        { paginar: true }
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
        `precios_tienda?tienda_id=eq.${tiendaId}&variante_id=is.null&select=producto_id,precio_sugerido,actualizado_en,id&order=actualizado_en.desc,id.desc`,
        { paginar: true }
      );

    const precios =
      await preciosResponse.json();

    const mapaPrecios =
      new Map();

    for (
      const fila of
      precios || []
    ) {
      if (!mapaPrecios.has(String(fila.producto_id))) {
        mapaPrecios.set(String(fila.producto_id), Number(fila.precio_sugerido));
      }
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

    // =====================================
    // PRODUCTOS EXCLUSIVOS DE RA
    // =====================================

    if (
      !esTiendaRA &&
      producto?.solo_ra === true
    ) {
      return false;
    }

    // =====================================
    // VISIBILIDAD DE ESTA TIENDA
    // =====================================

    if (
      mapaVisibilidad.has(String(producto.id)) &&
      mapaVisibilidad.get(String(producto.id)) === false
    ) {
      return false;
    }

    return true;
  }
);

/* Ambos filtros se aplican a la vez. No existe descarga global. */
productosFiltrados = productosFiltrados
  // No etiquetar importes COP como USD si faltan precios propios.
  .filter((producto) => esTiendaRA || tienda.moneda !== "USD" || mapaPrecios.has(String(producto.id)))
  .filter((producto) => productoCoincidePdf(producto, materialPdf, tipoPdf))
  .filter((producto) => fotosProducto(producto).length > 0);

const productosCatalogo = productosFiltrados
  .slice(0, MAX_PRODUCTOS_PDF)
  .map((producto) => ({
    ...producto,
    precio_pdf: mapaPrecios.has(String(producto.id))
      ? mapaPrecios.get(String(producto.id))
      : Number(producto.precio_detal || 0),
    moneda: esTiendaRA ? "COP" : (tienda.moneda === "USD" ? "USD" : "COP"),
  }));
    if (
      productosCatalogo.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No hay productos con fotografías para esta selección. Prueba otro material o tipo de producto.",
        },
        {
          status: 400,
        }
      );
    }

    reportarProgreso(24, "Organizando las fotografías");

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
    /* ===============================================
   PORTADA
=============================================== */

await crearPortadaCatalogo({
  pdfDoc,
  tienda,
  categoriaPdf,
  fuente,
  fuenteBold,
});
reportarProgreso(28, "Portada preparada; organizando productos");

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

  /* =====================================================
     Antes de dibujar, comprobar imagen real y organizar:
     - dos fotos válidas: una referencia, ambas columnas
     - una foto válida: parejas de referencias
     - sobrante individual: centrado
  ===================================================== */

  const productosVerificados = await prepararImagenesProductosPdf(
    productosCatalogo,
    reportarProgreso
  );

  const filas = organizarFilasProductosPdf(productosVerificados);
  if (filas.length === 0) {
    return NextResponse.json({
      ok: false,
      mensaje: "Las fotos de estos productos no se pudieron descargar. Comprueba los enlaces de las fotografías.",
    }, { status: 422 });
  }

  let ultimoPorcentaje = 80;

  for (let i = 0; i < filas.length; i++) {
    if (posicionEnPagina === 0) {
      pagina = pdfDoc.addPage([anchoPagina, altoPagina]);
      const hexFondo = String(tienda?.color_fondo || "#FFFFFF")
        .replace("#", "").trim();
      const colorFondoPagina = /^[0-9A-Fa-f]{6}$/.test(hexFondo)
        ? rgb(
            parseInt(hexFondo.slice(0, 2), 16) / 255,
            parseInt(hexFondo.slice(2, 4), 16) / 255,
            parseInt(hexFondo.slice(4, 6), 16) / 255
          )
        : rgb(1, 1, 1);
      pagina.drawRectangle({
        x: 0, y: 0,
        width: anchoPagina, height: altoPagina,
        color: colorFondoPagina,
      });
    }

    const y = altoPagina - margenSuperior - altoProducto -
      posicionEnPagina * (altoProducto + espacioVertical);

    await dibujarFilaProductosPdf({
      pdfDoc, pagina, fila: filas[i], y, fuenteBold,
    });

    posicionEnPagina = (posicionEnPagina + 1) % 3;

    const porcentaje = 80 + Math.round((i + 1) * 13 / filas.length);
    if (porcentaje > ultimoPorcentaje) {
      ultimoPorcentaje = porcentaje;
      reportarProgreso(
        porcentaje,
        "Organizando fichas: " + (i + 1) + " de " + filas.length
      );
    }
  }

  reportarProgreso(95, "Guardando las páginas del catálogo");


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
    reportarProgreso(99, "Preparando la descarga");

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


/* =========================================================
   DESCARGA CON PROGRESO: eventos JSON + PDF binario
   La respuesta tradicional application/pdf permanece disponible.
========================================================= */

export async function POST(request) {
  if (new URL(request.url).searchParams.get("progreso") !== "1") {
    return generarCatalogoPdf(request);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const enviar = (evento) => {
        if (!request.signal.aborted) {
          controller.enqueue(encoder.encode(JSON.stringify(evento) + "\n"));
        }
      };

      // No esperar esta promesa en start: el navegador recibe los
      // porcentajes mientras se generan las páginas en el servidor.
      void (async () => {
        try {
          const respuesta = await generarCatalogoPdf(
            request,
            (percent, etapa) => enviar({ type: "progress", percent, etapa })
          );
          if (!respuesta.ok) {
            const datos = await respuesta.json().catch(() => ({}));
            enviar({
              type: "error",
              mensaje: datos.mensaje || "No pudimos generar el catálogo PDF.",
            });
            return;
          }

          const pdf = new Uint8Array(await respuesta.arrayBuffer());
          enviar({ type: "pdf", length: pdf.byteLength });
          if (!request.signal.aborted) controller.enqueue(pdf);
        } catch (error) {
          console.error("Error transmitiendo el catálogo PDF:", error);
          try {
            enviar({ type: "error", mensaje: "No pudimos generar el catálogo PDF." });
          } catch {}
        } finally {
          try { controller.close(); } catch {}
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
