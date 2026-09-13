import { NextResponse } from "next/server";
import crypto from "crypto";

function limpiarTelefono(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function limpiarCodigo(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function hashCodigo(codigo) {
  return crypto
    .createHash("sha256")
    .update(codigo)
    .digest("hex");
}

function crearFirma(valor, secreto) {
  return crypto
    .createHmac("sha256", secreto)
    .update(valor)
    .digest("base64url");
}

function crearTokenSesion(datos, secreto) {
  const payload = Buffer.from(
    JSON.stringify(datos)
  ).toString("base64url");

  const firma = crearFirma(
    payload,
    secreto
  );

  return `${payload}.${firma}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const telefono =
      limpiarTelefono(body.telefono);

    const codigo =
      limpiarCodigo(body.codigo);

    if (!telefono) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Escribe un número de teléfono válido.",
        },
        { status: 400 }
      );
    }

    if (
      codigo.length !== 4 ||
      !/^\d{4}$/.test(codigo)
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El código debe tener 4 números.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    const authSessionSecret =
      process.env.AUTH_SESSION_SECRET;

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
            "El servicio de acceso no está configurado correctamente.",
        },
        { status: 500 }
      );
    }

    const supabaseHeaders = {
      apikey: supabaseSecretKey,
      "Content-Type":
        "application/json",
    };

    // ======================================
    // 1. CONFIRMAR QUE EL CLIENTE
    //    SIGA AUTORIZADO
    // ======================================

    const clienteResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/clientes_autorizados?telefono=eq.${encodeURIComponent(
          telefono
        )}&activo=eq.true&select=id,telefono,nombre,activo,tienda_id`,
        {
          method: "GET",
          headers: supabaseHeaders,
          cache: "no-store",
        }
      );

    if (!clienteResponse.ok) {
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
            "No pudimos validar tu acceso.",
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
            "Este número no está autorizado para ingresar.",
        },
        { status: 403 }
      );
    }

    const cliente = clientes[0];

    // ======================================
    // 2. BUSCAR EL ÚLTIMO CÓDIGO
    // ======================================

    const codigoResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/codigos_acceso?telefono=eq.${encodeURIComponent(
          telefono
        )}&usado=eq.false&select=id,telefono,codigo_hash,vence_en,usado,intentos,creado_en&order=creado_en.desc&limit=1`,
        {
          method: "GET",
          headers: supabaseHeaders,
          cache: "no-store",
        }
      );

    if (!codigoResponse.ok) {
      const errorTexto =
        await codigoResponse.text();

      console.error(
        "Error consultando código:",
        codigoResponse.status,
        errorTexto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos verificar el código.",
        },
        { status: 500 }
      );
    }

    const codigos =
      await codigoResponse.json();

    if (
      !Array.isArray(codigos) ||
      codigos.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El código es incorrecto o ya no está disponible.",
        },
        { status: 401 }
      );
    }

    const registro = codigos[0];

    // ======================================
    // 3. REVISAR INTENTOS
    // ======================================

    const intentosActuales =
      Number(registro.intentos || 0);

    if (intentosActuales >= 5) {
      await fetch(
        `${supabaseUrl}/rest/v1/codigos_acceso?id=eq.${registro.id}`,
        {
          method: "PATCH",
          headers: supabaseHeaders,
          body: JSON.stringify({
            usado: true,
          }),
        }
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Este código fue bloqueado. Solicita uno nuevo.",
        },
        { status: 429 }
      );
    }

    // ======================================
    // 4. REVISAR VENCIMIENTO
    // ======================================

    const fechaVencimiento =
      new Date(registro.vence_en);

    if (
      Number.isNaN(
        fechaVencimiento.getTime()
      ) ||
      fechaVencimiento.getTime() <
        Date.now()
    ) {
      await fetch(
        `${supabaseUrl}/rest/v1/codigos_acceso?id=eq.${registro.id}`,
        {
          method: "PATCH",
          headers: supabaseHeaders,
          body: JSON.stringify({
            usado: true,
          }),
        }
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El código ya venció. Solicita uno nuevo.",
        },
        { status: 401 }
      );
    }

    // ======================================
    // 5. COMPARAR CÓDIGO
    // ======================================

    const codigoHash =
      hashCodigo(codigo);

    const hashGuardado =
      String(
        registro.codigo_hash || ""
      );

    let codigoCorrecto = false;

    try {
      const bufferIngresado =
        Buffer.from(
          codigoHash,
          "utf8"
        );

      const bufferGuardado =
        Buffer.from(
          hashGuardado,
          "utf8"
        );

      if (
        bufferIngresado.length ===
        bufferGuardado.length
      ) {
        codigoCorrecto =
          crypto.timingSafeEqual(
            bufferIngresado,
            bufferGuardado
          );
      }
    } catch (error) {
      codigoCorrecto = false;
    }

    // ======================================
    // 6. SI ESTÁ MAL, SUMAR INTENTO
    // ======================================

    if (!codigoCorrecto) {
      const nuevosIntentos =
        intentosActuales + 1;

      await fetch(
        `${supabaseUrl}/rest/v1/codigos_acceso?id=eq.${registro.id}`,
        {
          method: "PATCH",
          headers: supabaseHeaders,
          body: JSON.stringify({
            intentos: nuevosIntentos,
            usado:
              nuevosIntentos >= 5,
          }),
        }
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            nuevosIntentos >= 5
              ? "Código incorrecto. Has alcanzado el máximo de intentos. Solicita uno nuevo."
              : `Código incorrecto. Te quedan ${
                  5 - nuevosIntentos
                } intentos.`,
        },
        { status: 401 }
      );
    }

    // ======================================
    // 7. MARCAR EL CÓDIGO COMO USADO
    // ======================================

    const marcarUsadoResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/codigos_acceso?id=eq.${registro.id}`,
        {
          method: "PATCH",
          headers: supabaseHeaders,
          body: JSON.stringify({
            usado: true,
          }),
        }
      );

    if (!marcarUsadoResponse.ok) {
      const errorTexto =
        await marcarUsadoResponse.text();

      console.error(
        "Error marcando código como usado:",
        errorTexto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos completar el inicio de sesión.",
        },
        { status: 500 }
      );
    }

    // ======================================
    // 8. CREAR SESIÓN PRIVADA
    // ======================================

    const ahora = Math.floor(
      Date.now() / 1000
    );

    const duracionSesion =
      60 * 60 * 24 * 30;

    const sesion = {
      cliente_id: cliente.id,
      telefono: cliente.telefono,
      nombre: cliente.nombre || "",
      tienda_id:
        cliente.tienda_id || null,
      iat: ahora,
      exp:
        ahora + duracionSesion,
    };

    const tokenSesion =
      crearTokenSesion(
        sesion,
        authSessionSecret
      );

    const response =
      NextResponse.json({
        ok: true,
        mensaje:
          "Código correcto. Inicio de sesión exitoso.",
        cliente: {
          nombre:
            cliente.nombre || "",
          telefono:
            cliente.telefono,
          tienda_id:
            cliente.tienda_id || null,
        },
      });

    // ======================================
    // 9. GUARDAR COOKIE SEGURA
    // ======================================

    response.cookies.set({
      name: "ra_session",
      value: tokenSesion,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: duracionSesion,
    });

    return response;
  } catch (error) {
    console.error(
      "Error en verificar-codigo:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        mensaje:
          "Ocurrió un error inesperado.",
      },
      { status: 500 }
    );
  }
}
