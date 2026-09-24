import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import crypto from "crypto";
import sharp from "sharp";

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
  cache: "no-store",
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
console.log(
  "IMAGEN DESCARGADA:",
  url,
  "TIPO:",
  contentType
);
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

/* PNG */

if (
  contentType.includes("png") ||
  String(url)
    .toLowerCase()
    .includes(".png")
) {
  imagenPdf =
    await pdfDoc.embedPng(bytes);
}

/* JPG / JPEG */

else if (
  contentType.includes("jpeg") ||
  contentType.includes("jpg") ||
  String(url)
    .toLowerCase()
    .includes(".jpg") ||
  String(url)
    .toLowerCase()
    .includes(".jpeg")
) {
  imagenPdf =
    await pdfDoc.embedJpg(bytes);
}

/* WEBP */

else if (
  contentType.includes("webp") ||
  String(url)
    .toLowerCase()
    .includes(".webp")
) {
  const pngConvertido =
    await sharp(
      Buffer.from(bytes)
    )
      .png()
      .toBuffer();

  imagenPdf =
    await pdfDoc.embedPng(
      pngConvertido
    );
}

/* OTROS FORMATOS */

else {
  console.error(
    "FORMATO DE IMAGEN NO COMPATIBLE:",
    contentType,
    url
  );

  return false;
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
   PRODUCTO CON DOS FOTOS
========================================================= */

async function dibujarProductoDosFotos({
  pdfDoc,
  pagina,
  producto,
  y,
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
    margen +
    anchoFoto +
    espacio;

  /* FOTO 1 */

  await insertarImagen(
    pdfDoc,
    pagina,
    producto.foto_url,
    x1,
    y,
    anchoFoto,
    altoFoto
  );

  /* FOTO 2 */

  await insertarImagen(
    pdfDoc,
    pagina,
    producto.foto_url_2,
    x2,
    y,
    anchoFoto,
    altoFoto
  );

  /* DATOS */

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

  /* NOMBRE */

  pagina.drawText(
    nombre,
    {
      x: x1 + 9,
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

  /* PRECIO */

  pagina.drawText(
    precio,
    {
      x:
        x2 +
        anchoFoto -
        72,
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
   PRODUCTO CON UNA SOLA FOTO
========================================================= */

async function dibujarProductoUnaFoto({
  pdfDoc,
  pagina,
  producto,
  y,
  fuenteBold,
}) {

  /* PRUEBA TEMPORAL */

  pagina.drawText(
    "UNA SOLA FOTO",
    {
      x: 230,
      y: y + 220,
      size: 14,
      font: fuenteBold,
      color: rgb(1, 0, 0),
    }
  );

  const anchoPagina =
    pagina.getWidth();

  /*
    La foto tendrá un área grande,
    pero NO se deformará.

    Dejamos 55 puntos de margen
    a cada lado.
  */

  const margenLateral = 55;

  const anchoArea =
    anchoPagina -
    margenLateral * 2;

  const altoArea = 235;

  const foto =
    producto.foto_url ||
    producto.foto_url_2;

  /*
    FOTO ÚNICA

    insertarImagen usa Math.min,
    por lo que mantiene la proporción
    y la centra automáticamente.
  */

  await insertarImagen(
    pdfDoc,
    pagina,
    foto,
    margenLateral,
    y,
    anchoArea,
    altoArea
  );

  /* DATOS */

  const nombre =
    recortarTexto(
      producto.nombre ||
        "Producto",
      45
    );

  const precio =
    formatoPrecio(
      producto.precio_pdf
    );

  /* NOMBRE */

  pagina.drawText(
    nombre,
    {
      x: margenLateral + 9,
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

  /* PRECIO */

  pagina.drawText(
    precio,
    {
      x:
        anchoPagina -
        margenLateral -
        72,
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
   CREAR PORTADA PREMIUM DEL CATÁLOGO
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

  const pagina = pdfDoc.addPage([
    anchoPagina,
    altoPagina,
  ]);

  /* =======================================================
     COLORES
  ======================================================= */

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
    tienda.color_principal,
    rgb(0.78, 0.55, 0.16)
  );

  const fondo = rgb(
    0.99,
    0.975,
    0.94
  );

  const fondoDoradoClaro = rgb(
    0.96,
    0.91,
    0.80
  );

  const doradoSuave = rgb(
    0.88,
    0.72,
    0.39
  );

  const textoOscuro = rgb(
    0.16,
    0.14,
    0.11
  );

  const textoSecundario = rgb(
    0.40,
    0.36,
    0.31
  );

  /* =======================================================
     FONDO GENERAL
  ======================================================= */

  pagina.drawRectangle({
    x: 0,
    y: 0,
    width: anchoPagina,
    height: altoPagina,
    color: fondo,
  });

  /* =======================================================
     DECORACIÓN SUPERIOR
  ======================================================= */

  pagina.drawSvgPath(
    `
      M 0 841
      L 190 841
      C 145 805 105 765 0 735
      Z
    `,
    {
      color: fondoDoradoClaro,
    }
  );

  pagina.drawSvgPath(
    `
      M 595 841
      L 455 841
      C 490 805 530 770 595 745
      Z
    `,
    {
      color: fondoDoradoClaro,
    }
  );

  pagina.drawSvgPath(
    `
      M 0 841
      L 105 841
      C 78 810 45 790 0 775
      Z
    `,
    {
      color: colorMarca,
      opacity: 0.85,
    }
  );

  pagina.drawSvgPath(
    `
      M 595 841
      L 520 841
      C 545 815 570 795 595 785
      Z
    `,
    {
      color: colorMarca,
      opacity: 0.70,
    }
  );

  /* LÍNEAS FINAS SUPERIORES */

  pagina.drawLine({
    start: {
      x: 0,
      y: 735,
    },
    end: {
      x: 145,
      y: 841,
    },
    thickness: 1.3,
    color: doradoSuave,
  });

  pagina.drawLine({
    start: {
      x: 450,
      y: 841,
    },
    end: {
      x: 595,
      y: 750,
    },
    thickness: 1.3,
    color: doradoSuave,
  });

  /* =======================================================
     LOGO
  ======================================================= */

  if (tienda.logo_url) {
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

  /* =======================================================
     NOMBRE DE LA TIENDA
  ======================================================= */

  const nombreTienda = limpiarTextoPdf(
    tienda.nombre_tienda || "Mi tienda"
  ).toUpperCase();

  let tamanoNombre = 29;

  let anchoNombre =
    fuenteBold.widthOfTextAtSize(
      nombreTienda,
      tamanoNombre
    );

  while (
    anchoNombre > 490 &&
    tamanoNombre > 18
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

  /* =======================================================
     SEPARADOR ELEGANTE
  ======================================================= */

  pagina.drawLine({
    start: {
      x: 185,
      y: 542,
    },
    end: {
      x: 278,
      y: 542,
    },
    thickness: 1,
    color: colorMarca,
  });

  pagina.drawLine({
    start: {
      x: 317,
      y: 542,
    },
    end: {
      x: 410,
      y: 542,
    },
    thickness: 1,
    color: colorMarca,
  });

  pagina.drawSvgPath(
    `
      M 297.5 535
      L 304.5 542
      L 297.5 549
      L 290.5 542
      Z
    `,
    {
      color: colorMarca,
    }
  );

  /* =======================================================
     CATÁLOGO DE PRODUCTOS
  ======================================================= */

  const titulo =
    "CATÁLOGO DE PRODUCTOS";

  const anchoTitulo =
    fuente.widthOfTextAtSize(
      titulo,
      15
    );

  pagina.drawText(
    titulo,
    {
      x:
        (anchoPagina - anchoTitulo) /
        2,
      y: 500,
      size: 15,
      font: fuente,
      color: textoSecundario,
    }
  );

  /* =======================================================
     CATEGORÍA
  ======================================================= */

  const categoria =
    limpiarTextoPdf(
      categoriaPdf || "Productos"
    ).toUpperCase();

  /* CAJA DE LA CATEGORÍA */

  pagina.drawRectangle({
    x: 172,
    y: 440,
    width: 251,
    height: 46,
    color: fondoDoradoClaro,
    borderColor: colorMarca,
    borderWidth: 1,
  });

  const anchoCategoria =
    fuenteBold.widthOfTextAtSize(
      categoria,
      13
    );

  pagina.drawText(
    categoria,
    {
      x:
        (anchoPagina -
          anchoCategoria) /
        2,
      y: 456,
      size: 13,
      font: fuenteBold,
      color: textoOscuro,
    }
  );

  /* =======================================================
     TEXTO DECORATIVO
  ======================================================= */

  const frase =
    "COLECCIÓN SELECCIONADA PARA TI";

  const anchoFrase =
    fuente.widthOfTextAtSize(
      frase,
      8
    );

  pagina.drawText(
    frase,
    {
      x:
        (anchoPagina - anchoFrase) /
        2,
      y: 410,
      size: 8,
      font: fuente,
      color: colorMarca,
    }
  );

  /* =======================================================
     DECORACIÓN INFERIOR
  ======================================================= */

  /* ONDA DORADA GRANDE */

  pagina.drawSvgPath(
    `
      M 0 285
      C 85 330
        165 325
        245 285
      C 335 240
        425 255
        595 320
      L 595 0
      L 0 0
      Z
    `,
    {
      color: fondoDoradoClaro,
    }
  );

  /* SEGUNDA ONDA CLARA */

  pagina.drawSvgPath(
    `
      M 0 215
      C 100 270
        190 245
        285 215
      C 390 180
        480 215
        595 270
      L 595 0
      L 0 0
      Z
    `,
    {
      color: rgb(
        0.995,
        0.985,
        0.955
      ),
    }
  );

  /* BORDE DORADO DE LA ONDA */

  pagina.drawSvgPath(
    `
      M 0 215
      C 100 270
        190 245
        285 215
      C 390 180
        480 215
        595 270
    `,
    {
      borderColor: colorMarca,
      borderWidth: 1.5,
    }
  );

  /* =======================================================
     DETALLE TIPO JOYERÍA
  ======================================================= */

  /*
    Cadena de pequeñas piezas doradas.
  */

  const puntos = [
    [92, 165, 5],
    [120, 178, 3],
    [148, 165, 5],
    [176, 180, 3],
    [204, 166, 5],
    [232, 181, 3],
    [260, 168, 5],
    [288, 182, 3],
    [316, 168, 5],
    [344, 181, 3],
    [372, 166, 5],
    [400, 180, 3],
    [428, 165, 5],
    [456, 178, 3],
    [484, 165, 5],
  ];

  for (
    const [x, y, radio] of puntos
  ) {
    pagina.drawCircle({
      x,
      y,
      size: radio,
      color: colorMarca,
    });
  }

  /* LÍNEAS ENTRE LAS PIEZAS */

  for (
    let i = 0;
    i < puntos.length - 1;
    i++
  ) {
    pagina.drawLine({
      start: {
        x: puntos[i][0] + 5,
        y: puntos[i][1],
      },
      end: {
        x: puntos[i + 1][0] - 5,
        y: puntos[i + 1][1],
      },
      thickness: 0.8,
      color: colorMarca,
    });
  }

  /* =======================================================
     WHATSAPP
  ======================================================= */

  if (tienda.whatsapp) {
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

  /* =======================================================
     PEQUEÑO DETALLE FINAL
  ======================================================= */

  pagina.drawLine({
    start: {
      x: 235,
      y: 65,
    },
    end: {
      x: 360,
      y: 65,
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
  /* ===============================================
     LOGO
  =============================================== */

if (tienda.logo_url) {
  const logoInsertado =
    await insertarImagen(
      pdfDoc,
      pagina,
      tienda.logo_url,
      197,
      610,
      200,
      130
    );

  if (!logoInsertado) {
    pagina.drawText(
      "LOGO NO PUDO CARGARSE",
      {
        x: 205,
        y: 670,
        size: 10,
        font: fuenteBold,
        color: rgb(0.8, 0.1, 0.1),
      }
    );
  }
} else {
  pagina.drawText(
    "LOGO_URL VACIO",
    {
      x: 235,
      y: 670,
      size: 10,
      font: fuenteBold,
      color: rgb(0.8, 0.1, 0.1),
    }
  );
}

  /* ===============================================
     NOMBRE DE LA TIENDA
  =============================================== */

  const nombreTienda =
    limpiarTextoPdf(
      tienda.nombre_tienda ||
        "Mi tienda"
    );

  const anchoNombre =
    fuenteBold.widthOfTextAtSize(
      nombreTienda,
      27
    );

  pagina.drawText(
    nombreTienda,
    {
      x:
        (anchoPagina -
          anchoNombre) /
        2,
      y: 555,
      size: 27,
      font: fuenteBold,
      color: rgb(
        0.12,
        0.12,
        0.12
      ),
    }
  );

  /* LÍNEA DECORATIVA */

  pagina.drawRectangle({
    x: 222,
    y: 525,
    width: 150,
    height: 3,
    color: colorPrincipal,
  });

  /* ===============================================
     TÍTULO
  =============================================== */

  const titulo =
    "CATÁLOGO DE PRODUCTOS";

  const anchoTitulo =
    fuenteBold.widthOfTextAtSize(
      titulo,
      17
    );

  pagina.drawText(
    titulo,
    {
      x:
        (anchoPagina -
          anchoTitulo) /
        2,
      y: 480,
      size: 17,
      font: fuenteBold,
      color: colorPrincipal,
    }
  );

  /* CATEGORÍA */

  const categoria =
    limpiarTextoPdf(
      categoriaPdf ||
        "Productos"
    ).toUpperCase();

  const anchoCategoria =
    fuenteBold.widthOfTextAtSize(
      categoria,
      12
    );

  pagina.drawText(
    categoria,
    {
      x:
        (anchoPagina -
          anchoCategoria) /
        2,
      y: 452,
      size: 12,
      font: fuenteBold,
      color: rgb(
        0.32,
        0.32,
        0.32
      ),
    }
  );

  /* ===============================================
     INFORMACIÓN DE CONTACTO
  =============================================== */

  let yContacto = 325;

  if (tienda.whatsapp) {
    const texto =
      `WhatsApp: ${limpiarTextoPdf(
        tienda.whatsapp
      )}`;

    const ancho =
      fuente.widthOfTextAtSize(
        texto,
        11
      );

    pagina.drawText(
      texto,
      {
        x:
          (anchoPagina -
            ancho) /
          2,
        y: yContacto,
        size: 11,
        font: fuente,
        color: rgb(
          0.20,
          0.20,
          0.20
        ),
      }
    );

    yContacto -= 26;
  }

  if (tienda.instagram) {
    const texto =
      `Instagram: ${limpiarTextoPdf(
        tienda.instagram
      )}`;

    const ancho =
      fuente.widthOfTextAtSize(
        texto,
        11
      );

    pagina.drawText(
      texto,
      {
        x:
          (anchoPagina -
            ancho) /
          2,
        y: yContacto,
        size: 11,
        font: fuente,
        color: rgb(
          0.20,
          0.20,
          0.20
        ),
      }
    );

    yContacto -= 26;
  }

  if (tienda.facebook) {
    const texto =
      `Facebook: ${limpiarTextoPdf(
        tienda.facebook
      )}`;

    const ancho =
      fuente.widthOfTextAtSize(
        texto,
        11
      );

    pagina.drawText(
      texto,
      {
        x:
          (anchoPagina -
            ancho) /
          2,
        y: yContacto,
        size: 11,
        font: fuente,
        color: rgb(
          0.20,
          0.20,
          0.20
        ),
      }
    );

    yContacto -= 26;
  }

  if (tienda.tiktok) {
    const texto =
      `TikTok: ${limpiarTextoPdf(
        tienda.tiktok
      )}`;

    const ancho =
      fuente.widthOfTextAtSize(
        texto,
        11
      );

    pagina.drawText(
      texto,
      {
        x:
          (anchoPagina -
            ancho) /
          2,
        y: yContacto,
        size: 11,
        font: fuente,
        color: rgb(
          0.20,
          0.20,
          0.20
        ),
      }
    );
  }

  /* ===============================================
     PIE DE PORTADA
  =============================================== */

  pagina.drawRectangle({
    x: 70,
    y: 105,
    width: anchoPagina - 140,
    height: 1,
    color: colorPrincipal,
  });

  const textoPie =
    "CATÁLOGO DIGITAL";

  const anchoPie =
    fuenteBold.widthOfTextAtSize(
      textoPie,
      9
    );

  pagina.drawText(
    textoPie,
    {
      x:
        (anchoPagina -
          anchoPie) /
        2,
      y: 75,
      size: 9,
      font: fuenteBold,
      color: colorPrincipal,
    }
  );

  return pagina;
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
   DATOS DE LA TIENDA PARA LA PORTADA
=============================================== */

const tiendaResponse =
  await supabaseFetch(
    `tiendas?id=eq.${tiendaId}&select=id,nombre_tienda,whatsapp,logo_url,color_principal,color_fondo,instagram,facebook,tiktok&limit=1`
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
/* JUEGOS */

if (categoriaPdf === "Juegos") {
  productosFiltrados = productosFiltrados.filter(
    (producto) => {
      const texto = normalizar(
        `${producto.nombre || ""} ${producto.categoria || ""}`
      );

      return (
        texto.includes("juego") ||
        texto.includes("juegos")
      );
    }
  );
}

/* TOBILLERAS */

if (categoriaPdf === "Tobilleras") {
  productosFiltrados = productosFiltrados.filter(
    (producto) => {
      const texto = normalizar(
        `${producto.nombre || ""} ${producto.categoria || ""}`
      );

      return (
        texto.includes("tobillera") ||
        texto.includes("tobilleras")
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
function tieneFotoReal(valor) {
  if (valor === null || valor === undefined) {
    return false;
  }

  const texto =
    String(valor).trim();

  if (
    texto === "" ||
    texto.toLowerCase() === "null" ||
    texto.toLowerCase() === "undefined"
  ) {
    return false;
  }

  return (
    texto.startsWith("http://") ||
    texto.startsWith("https://")
  );
}
const productosCatalogo = productosFiltrados
  .map((producto) => ({
    ...producto,

    precio_pdf: mapaPrecios.has(String(producto.id))
      ? mapaPrecios.get(String(producto.id))
      : Number(producto.precio_detal || 0),
  }))
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

  /* ===============================================
   SEPARAR PRODUCTOS
=============================================== */

const productosDosFotos =
  productosCatalogo.filter(
    (producto) =>
      tieneFotoReal(producto.foto_url) &&
      tieneFotoReal(producto.foto_url_2)
  );

const productosUnaFoto =
  productosCatalogo.filter(
    (producto) =>
      tieneFotoReal(producto.foto_url) &&
      !tieneFotoReal(producto.foto_url_2)
  );
/* ===============================================
   PRIMERO: PRODUCTOS CON DOS FOTOS
=============================================== */

pagina = null;
posicionEnPagina = 0;

for (
  let i = 0;
  i < productosDosFotos.length;
  i++
) {
  if (posicionEnPagina === 0) {
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
      (
        altoProducto +
        espacioVertical
      );

await dibujarProductoDosFotos({
    pdfDoc,
    pagina,
    producto:
      productosDosFotos[i],
    y,
    fuente,
    fuenteBold,
  });

  posicionEnPagina++;

  if (posicionEnPagina === 3) {
    posicionEnPagina = 0;
  }
}

/* ===============================================
   DESPUÉS: PRODUCTOS CON UNA SOLA FOTO

   Siempre comienzan en una página nueva.
=============================================== */

pagina = null;
posicionEnPagina = 0;

for (
  let i = 0;
  i < productosUnaFoto.length;
  i++
) {
  if (posicionEnPagina === 0) {
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
      (
        altoProducto +
        espacioVertical
      );

 await dibujarProductoUnaFoto({
    pdfDoc,
    pagina,
    producto:
      productosUnaFoto[i],
    y,
    fuente,
    fuenteBold,
  });

  posicionEnPagina++;

  if (posicionEnPagina === 3) {
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
