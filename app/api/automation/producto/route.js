import { NextResponse } from "next/server";

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
      "PRECIO SUGERIDO"
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
    ["foto_url", ["foto_url", "FOTO_URL", "IMAG URL", "imagen", "IMAGEN"]],
    ["foto_url_2", ["foto_url_2", "FOTO_URL_2", "IMAG URL 2", "imagen_2", "IMAGEN_2"]],
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
    ["costo", ["costo", "COSTO"]],
    ["precio_detal", ["precio_detal", "PRECIO_DETAL", "precioDetal", "PRECIO DETAL", "PRECIO SUGERIDO"]],
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
    configurado:
      Boolean(
        process.env
          .RA_AUTOMATION_SECRET
      ),
  });
}

export async function POST(request) {
  try {
    const secreto =
      process.env
        .RA_AUTOMATION_SECRET;

    const recibido =
      request.headers.get(
        "x-ra-automation-secret"
      );

    if (
      !secreto ||
      !recibido ||
      recibido !== secreto
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

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

    const body =
      await request.json();

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
