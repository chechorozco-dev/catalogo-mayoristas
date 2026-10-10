import { NextResponse } from "next/server";
import {
  constants,
  createPublicKey,
  verify as verifyCrypto,
} from "crypto";

const VERCEL_OWNER =
  "sergio-orozco";

const VERCEL_ISSUER =
  `https://oidc.vercel.com/${VERCEL_OWNER}`;

const VERCEL_AUDIENCE =
  `https://vercel.com/${VERCEL_OWNER}`;

const ALLOWED_CALLER_PROJECT =
  "ra-whatsapp-lab";

const ALLOWED_CALLER_ENVS =
  new Set([
    "production",
    "preview",
  ]);

function decodePart(value) {
  return JSON.parse(
    Buffer.from(
      value,
      "base64url"
    ).toString("utf8")
  );
}

async function verificarOidcVercel(
  request,
  tokenOverride = ""
) {
  /*
  | Mantener una llave manual como respaldo opcional.
  | No es necesaria para la operación normal entre
  | los dos proyectos de Vercel.
  */
  const legacySecret =
    process.env
      .RA_AUTOMATION_SECRET;

  const legacyReceived =
    request.headers.get(
      "x-ra-automation-secret"
    );

  if (
    legacySecret &&
    legacyReceived ===
      legacySecret
  ) {
    return {
      ok: true,
      via:
        "LEGACY_SECRET",
    };
  }

  const authorization =
    tokenOverride
      ? "Bearer " +
        tokenOverride
      : (
          request.headers.get(
            "authorization"
          ) || ""
        );

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return {
      ok: false,
      error:
        "Falta autenticación interna.",
    };
  }

  const token =
    authorization
      .slice(7)
      .trim();

  const parts =
    token.split(".");

  if (
    parts.length !== 3
  ) {
    return {
      ok: false,
      error:
        "Token interno inválido.",
    };
  }

  let header;
  let payload;

  try {
    header =
      decodePart(parts[0]);

    payload =
      decodePart(parts[1]);
  } catch {
    return {
      ok: false,
      error:
        "Token interno ilegible.",
    };
  }

  if (
    payload?.iss !==
      VERCEL_ISSUER
  ) {
    return {
      ok: false,
      error:
        "Emisor interno no autorizado.",
    };
  }

  const audiences =
    Array.isArray(
      payload?.aud
    )
      ? payload.aud
      : [payload?.aud];

  if (
    !audiences.includes(
      VERCEL_AUDIENCE
    )
  ) {
    return {
      ok: false,
      error:
        "Audiencia interna no autorizada.",
    };
  }

  const subject =
    String(
      payload?.sub ||
        ""
    );

  const prefix =
    `owner:${VERCEL_OWNER}:project:${ALLOWED_CALLER_PROJECT}:environment:`;

  if (
    !subject.startsWith(
      prefix
    )
  ) {
    return {
      ok: false,
      error:
        "Proyecto llamador no autorizado.",
    };
  }

  const environment =
    subject.slice(
      prefix.length
    );

  if (
    !ALLOWED_CALLER_ENVS.has(
      environment
    )
  ) {
    return {
      ok: false,
      error:
        "Entorno llamador no autorizado.",
    };
  }

  const now =
    Math.floor(
      Date.now() / 1000
    );

  if (
    typeof payload?.exp !==
      "number" ||
    payload.exp <= now
  ) {
    return {
      ok: false,
      error:
        "Token interno vencido.",
    };
  }

  if (
    typeof payload?.nbf ===
      "number" &&
    payload.nbf >
      now + 30
  ) {
    return {
      ok: false,
      error:
        "Token interno todavía no es válido.",
    };
  }

  const jwksResponse =
    await fetch(
      VERCEL_ISSUER +
        "/.well-known/jwks",
      {
        cache:
          "no-store",
      }
    );

  if (
    !jwksResponse.ok
  ) {
    return {
      ok: false,
      error:
        "No se pudo validar la identidad interna.",
    };
  }

  const jwks =
    await jwksResponse.json();

  const jwk =
    Array.isArray(
      jwks?.keys
    )
      ? jwks.keys.find(
          (item) =>
            item.kid ===
            header?.kid
        )
      : null;

  if (!jwk) {
    return {
      ok: false,
      error:
        "La llave de firma interna no existe.",
    };
  }

  const publicKey =
    createPublicKey({
      key:
        jwk,
      format:
        "jwk",
    });

  const signingInput =
    Buffer.from(
      parts[0] +
        "." +
        parts[1]
    );

  const signature =
    Buffer.from(
      parts[2],
      "base64url"
    );

  let valid = false;

  if (
    header?.alg ===
      "RS256"
  ) {
    valid =
      verifyCrypto(
        "RSA-SHA256",
        signingInput,
        publicKey,
        signature
      );
  } else if (
    header?.alg ===
      "PS256"
  ) {
    valid =
      verifyCrypto(
        "sha256",
        signingInput,
        {
          key:
            publicKey,
          padding:
            constants
              .RSA_PKCS1_PSS_PADDING,
          saltLength:
            32,
        },
        signature
      );
  } else if (
    header?.alg ===
      "ES256"
  ) {
    valid =
      verifyCrypto(
        "sha256",
        signingInput,
        {
          key:
            publicKey,
          dsaEncoding:
            "ieee-p1363",
        },
        signature
      );
  } else {
    return {
      ok: false,
      error:
        "Algoritmo de firma no permitido.",
    };
  }

  if (!valid) {
    return {
      ok: false,
      error:
        "Firma interna inválida.",
    };
  }

  return {
    ok: true,
    via:
      "VERCEL_OIDC",
    environment,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textoONull(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function numeroONull(valor) {
  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const numero = Number(
    String(valor)
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(numero)
    ? numero
    : null;
}

function booleano(valor, porDefecto = false) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return porDefecto;
  }

  if (typeof valor === "boolean") {
    return valor;
  }

  const normalizado =
    String(valor)
      .trim()
      .toUpperCase();

  return [
    "TRUE",
    "SI",
    "SÍ",
    "YES",
    "1",
    "ACTIVO",
  ].includes(normalizado);
}

function obtener(body, ...claves) {
  for (const clave of claves) {
    if (
      Object.prototype.hasOwnProperty.call(
        body || {},
        clave
      )
    ) {
      return body[clave];
    }
  }

  return undefined;
}

function limpiarProducto(body) {
  const referencia =
    String(
      obtener(
        body,
        "referencia",
        "REFERENCIA",
        "codigo",
        "CODIGO",
        "ref",
        "REF"
      ) ?? ""
    ).trim();

  const nombreRaw =
    obtener(
      body,
      "nombre",
      "NOMBRE",
      "producto",
      "PRODUCTO"
    );

  const precioDetalRaw =
    obtener(
      body,
      "precio_detal",
      "PRECIO_DETAL",
      "precioDetal",
      "PRECIO DETAL",
      "PRECIO SUGERIDO",
      "precio SUGERIDO",
      "precio_sugerido",
      "PRECIO_SUGERIDO"
    );

  const payload = {
    referencia,
  };

  if (nombreRaw !== undefined) {
    payload.nombre =
      String(nombreRaw ?? "").trim();
  }

  const camposTexto = [
    ["categoria", ["categoria", "CATEGORIA"]],
    ["descripcion", ["descripcion", "DESCRIPCION"]],
    ["foto_url", ["foto_url", "FOTO_URL", "IMAG URL", "imagen", "IMAGEN", "url_1", "URL_1"]],
    ["foto_url_2", ["foto_url_2", "FOTO_URL_2", "IMAG URL 2", "imagen_2", "IMAGEN_2", "url_2", "URL_2"]],
    ["infoimagen", ["infoimagen", "INFOIMAGEN", "INFO IMAGEN"]],
  ];

  for (const [destino, claves] of camposTexto) {
    const valor =
      obtener(
        body,
        ...claves
      );

    if (valor !== undefined) {
      payload[destino] =
        textoONull(valor);
    }
  }

  const camposNumero = [
    ["costo", ["costo", "COSTO", "precio", "PRECIO"]],
    ["precio_detal", ["precio_detal", "PRECIO_DETAL", "precioDetal", "PRECIO DETAL", "PRECIO SUGERIDO", "precio SUGERIDO", "precio_sugerido", "PRECIO_SUGERIDO"]],
    ["precio_minimo", ["precio_minimo", "PRECIO_MINIMO", "precioMinimo", "PRECIO MINIMO"]],
  ];

  for (const [destino, claves] of camposNumero) {
    const valor =
      obtener(
        body,
        ...claves
      );

    if (valor !== undefined) {
      payload[destino] =
        numeroONull(valor);
    }
  }

  const activoRaw =
    obtener(
      body,
      "activo",
      "ACTIVO",
      "MOSTRAR"
    );

  if (activoRaw !== undefined) {
    payload.activo =
      String(activoRaw)
        .trim()
        .toUpperCase() === "NO"
        ? false
        : booleano(
            activoRaw,
            true
          );
  }

  const soloRaRaw =
    obtener(
      body,
      "solo_ra",
      "SOLO_RA",
      "soloRa",
      "SOLO RA"
    );

  if (soloRaRaw !== undefined) {
    payload.solo_ra =
      booleano(
        soloRaRaw,
        false
      );
  }

  const variantesRaw =
    obtener(
      body,
      "tiene_variantes",
      "TIENE_VARIANTES",
      "tieneVariantes"
    );

  if (variantesRaw !== undefined) {
    payload.tiene_variantes =
      booleano(
        variantesRaw,
        false
      );
  }

  return {
    referencia,
    nombre:
      payload.nombre,
    precioDetal:
      precioDetalRaw === undefined
        ? undefined
        : payload.precio_detal,
    payload,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    servicio:
      "RA Automatizaciones · productos",
    autenticacion:
      "VERCEL_OIDC",
  });
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const internalToken =
      String(
        body?.__ra_oidc ||
          ""
      ).trim();

    const auth =
      await verificarOidcVercel(
        request,
        internalToken
      );

    if (!auth.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            auth.error ||
            "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    delete body.__ra_oidc;

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env
        .SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      throw new Error(
        "Falta configuración de Supabase."
      );
    }

    const accion =
      String(
        body?.accion ||
          body?.action ||
          ""
      )
        .trim()
        .toUpperCase();

    const eliminar =
      accion ===
        "ELIMINAR" ||
      accion ===
        "DELETE";

    const {
      referencia,
      nombre,
      precioDetal,
      payload,
    } = limpiarProducto(
      body
    );

    if (!referencia) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "La referencia es obligatoria.",
        },
        {
          status: 400,
        }
      );
    }

    const headersSupabase = {
      apikey:
        supabaseSecretKey,
      Authorization:
        "Bearer " +
        supabaseSecretKey,
      "Content-Type":
        "application/json",
    };

    const buscarResponse =
      await fetch(
        supabaseUrl +
          "/rest/v1/productos" +
          "?referencia=eq." +
          encodeURIComponent(
            referencia
          ) +
          "&select=*" +
          "&limit=1",
        {
          method: "GET",
          headers:
            headersSupabase,
          cache:
            "no-store",
        }
      );

    if (
      !buscarResponse.ok
    ) {
      const detalle =
        await buscarResponse.text();

      throw new Error(
        "No se pudo comprobar si el producto existe. " +
          detalle
      );
    }

    const encontrados =
      await buscarResponse.json();

    const existente =
      Array.isArray(
        encontrados
      )
        ? encontrados[0] ||
          null
        : null;

    if (eliminar) {
      if (!existente) {
        return NextResponse.json(
          {
            ok: false,
            accion:
              "NO_EXISTE",
            mensaje:
              "El producto no existe.",
          },
          {
            status: 404,
          }
        );
      }

      const eliminarResponse =
        await fetch(
          supabaseUrl +
            "/rest/v1/productos" +
            "?id=eq." +
            encodeURIComponent(
              existente.id
            ),
          {
            method:
              "DELETE",

            headers: {
              ...headersSupabase,
              Prefer:
                "return=representation",
            },
          }
        );

      const eliminarTexto =
        await eliminarResponse.text();

      if (
        !eliminarResponse.ok
      ) {
        throw new Error(
          "Supabase no pudo eliminar el producto. " +
            eliminarTexto
        );
      }

      const eliminados =
        eliminarTexto
          ? JSON.parse(
              eliminarTexto
            )
          : [];

      if (
        !Array.isArray(
          eliminados
        ) ||
        eliminados.length ===
          0
      ) {
        return NextResponse.json(
          {
            ok: false,
            accion:
              "NO_EXISTE",
            mensaje:
              "El producto no existe.",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        ok: true,
        accion:
          "ELIMINADO",
        mensaje:
          "Producto eliminado correctamente.",
        producto:
          eliminados[0],
      });
    }

    if (!existente) {
      if (!nombre) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "El nombre es obligatorio para crear un producto nuevo.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        precioDetal ===
          undefined ||
        precioDetal === null ||
        precioDetal < 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "El precio sugerido es obligatorio y debe ser válido para crear un producto nuevo.",
          },
          {
            status: 400,
          }
        );
      }

      const nuevo = {
        ...payload,
        nombre,
        precio_detal:
          precioDetal,
        activo:
          payload.activo !==
          undefined
            ? payload.activo
            : true,
        solo_ra:
          payload.solo_ra !==
          undefined
            ? payload.solo_ra
            : false,
        tiene_variantes:
          payload
            .tiene_variantes !==
          undefined
            ? payload
                .tiene_variantes
            : false,
        origen:
          "RA_AUTOMATION",
      };

      const crearResponse =
        await fetch(
          supabaseUrl +
            "/rest/v1/productos",
          {
            method:
              "POST",
            headers: {
              ...headersSupabase,
              Prefer:
                "return=representation",
            },
            body:
              JSON.stringify(
                nuevo
              ),
          }
        );

      const crearTexto =
        await crearResponse.text();

      if (
        !crearResponse.ok
      ) {
        throw new Error(
          "Supabase no pudo crear el producto. " +
            crearTexto
        );
      }

      const creados =
        crearTexto
          ? JSON.parse(
              crearTexto
            )
          : [];

      return NextResponse.json({
        ok: true,
        accion:
          "CREADO",
        mensaje:
          "Producto creado correctamente.",
        producto:
          creados?.[0] ||
          null,
      });
    }

    const cambios = {
      ...payload,
    };

    delete cambios.referencia;

    if (
      cambios.nombre === ""
    ) {
      delete cambios.nombre;
    }

    if (
      cambios.precio_detal !==
        undefined &&
      (
        cambios.precio_detal ===
          null ||
        cambios.precio_detal <
          0
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El precio sugerido no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      Object.keys(
        cambios
      ).length === 0
    ) {
      return NextResponse.json({
        ok: true,
        accion:
          "SIN_CAMBIOS",
        mensaje:
          "El producto ya existe y no llegaron campos para actualizar.",
        producto:
          existente,
      });
    }

    const actualizarResponse =
      await fetch(
        supabaseUrl +
          "/rest/v1/productos" +
          "?id=eq." +
          encodeURIComponent(
            existente.id
          ),
        {
          method:
            "PATCH",
          headers: {
            ...headersSupabase,
            Prefer:
              "return=representation",
          },
          body:
            JSON.stringify(
              cambios
            ),
        }
      );

    const actualizarTexto =
      await actualizarResponse.text();

    if (
      !actualizarResponse.ok
    ) {
      throw new Error(
        "Supabase no pudo actualizar el producto. " +
          actualizarTexto
      );
    }

    const actualizados =
      actualizarTexto
        ? JSON.parse(
            actualizarTexto
          )
        : [];

    return NextResponse.json({
      ok: true,
      accion:
        "ACTUALIZADO",
      mensaje:
        "Producto actualizado correctamente.",
      producto:
        actualizados?.[0] ||
        existente,
    });
  } catch (error) {
    console.error(
      "automation producto:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el producto.",
      },
      {
        status: 500,
      }
    );
  }
}
