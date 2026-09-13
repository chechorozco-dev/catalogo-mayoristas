import { NextResponse } from "next/server";
import crypto from "crypto";

function limpiarTelefono(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function hashCodigo(codigo) {
  return crypto
    .createHash("sha256")
    .update(codigo)
    .digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();

    const telefono = limpiarTelefono(body.telefono);

    if (!telefono) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Escribe un número de teléfono válido.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    const watiEndpoint =
      process.env.WATI_API_ENDPOINT;

    const watiToken =
      process.env.WATI_API_TOKEN;

    const watiChannelNumber =
      process.env.WATI_CHANNEL_NUMBER;

    if (
      !supabaseUrl ||
      !supabaseSecretKey ||
      !watiEndpoint ||
      !watiToken ||
      !watiChannelNumber
    ) {
      console.error(
        "Faltan variables de entorno para autenticación."
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

    /*
      IMPORTANTE:
      Las nuevas claves sb_secret_ de Supabase
      se envían solamente como "apikey".
      NO como Authorization Bearer.
    */

    const supabaseHeaders = {
      apikey: supabaseSecretKey,
      "Content-Type": "application/json",
    };

    // ==========================================
    // 1. VERIFICAR CLIENTE AUTORIZADO
    // ==========================================

    const clienteResponse = await fetch(
      `${supabaseUrl}/rest/v1/clientes_autorizados?telefono=eq.${encodeURIComponent(
        telefono
      )}&activo=eq.true&select=id,telefono,nombre,activo`,
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
        "Error consultando cliente autorizado:",
        clienteResponse.status,
        errorTexto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos validar tu número en este momento.",
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

    // ==========================================
    // 2. EVITAR CÓDIGOS DEMASIADO SEGUIDOS
    // ==========================================

    const desdeHaceUnMinuto = new Date(
      Date.now() - 60 * 1000
    ).toISOString();

    const recientesResponse = await fetch(
      `${supabaseUrl}/rest/v1/codigos_acceso?telefono=eq.${encodeURIComponent(
        telefono
      )}&creado_en=gte.${encodeURIComponent(
        desdeHaceUnMinuto
      )}&select=id`,
      {
        method: "GET",
        headers: supabaseHeaders,
        cache: "no-store",
      }
    );

    if (!recientesResponse.ok) {
      const errorTexto =
        await recientesResponse.text();

      console.error(
        "Error consultando códigos recientes:",
        recientesResponse.status,
        errorTexto
      );
    } else {
      const recientes =
        await recientesResponse.json();

      if (
        Array.isArray(recientes) &&
        recientes.length > 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            mensaje:
              "Ya enviamos un código recientemente. Espera un minuto antes de solicitar otro.",
          },
          { status: 429 }
        );
      }
    }

    // ==========================================
    // 3. GENERAR CÓDIGO DE 4 DÍGITOS
    // ==========================================

    const codigo = crypto
      .randomInt(1000, 10000)
      .toString();

    const codigoHash =
      hashCodigo(codigo);

    const venceEn = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

    // ==========================================
    // 4. INVALIDAR CÓDIGOS ANTERIORES
    // ==========================================

    const invalidarResponse = await fetch(
      `${supabaseUrl}/rest/v1/codigos_acceso?telefono=eq.${encodeURIComponent(
        telefono
      )}&usado=eq.false`,
      {
        method: "PATCH",
        headers: {
          ...supabaseHeaders,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          usado: true,
        }),
      }
    );

    if (!invalidarResponse.ok) {
      const errorTexto =
        await invalidarResponse.text();

      console.error(
        "Error invalidando códigos anteriores:",
        invalidarResponse.status,
        errorTexto
      );
    }

    // ==========================================
    // 5. GUARDAR NUEVO CÓDIGO
    // ==========================================

    const guardarResponse = await fetch(
      `${supabaseUrl}/rest/v1/codigos_acceso`,
      {
        method: "POST",
        headers: {
          ...supabaseHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          telefono,
          codigo_hash: codigoHash,
          vence_en: venceEn,
          usado: false,
          intentos: 0,
        }),
      }
    );

    if (!guardarResponse.ok) {
      const errorTexto =
        await guardarResponse.text();

      console.error(
        "Error guardando código:",
        guardarResponse.status,
        errorTexto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos generar tu código.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 6. PREPARAR TOKEN DE WATI
    // ==========================================

    const authorization =
      watiToken
        .trim()
        .toLowerCase()
        .startsWith("bearer ")
        ? watiToken.trim()
        : `Bearer ${watiToken.trim()}`;

    const baseWati =
      watiEndpoint.replace(/\/+$/, "");

    const urlWati =
      `${baseWati}/api/v1/sendTemplateMessage` +
      `?whatsappNumber=${encodeURIComponent(
        telefono
      )}`;

    // ==========================================
    // 7. ENVIAR CÓDIGO POR WATI
    // ==========================================

    const watiResponse = await fetch(
      urlWati,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          template_name: "codigo_web",
          broadcast_name:
            "codigo_acceso_web",
          channel_number:
            watiChannelNumber,
          parameters: [
            {
              name: "1",
              value: codigo,
            },
          ],
        }),
      }
    );

    const watiTexto =
      await watiResponse.text();

    if (!watiResponse.ok) {
      console.error(
        "Error enviando código por WATI:",
        watiResponse.status,
        watiTexto
      );

      // Invalidar el código si WATI no pudo enviarlo
      await fetch(
        `${supabaseUrl}/rest/v1/codigos_acceso?telefono=eq.${encodeURIComponent(
          telefono
        )}&codigo_hash=eq.${encodeURIComponent(
          codigoHash
        )}`,
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
            "No pudimos enviar el código por WhatsApp.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 8. TODO CORRECTO
    // ==========================================

    return NextResponse.json({
      ok: true,
      mensaje:
        "Te enviamos un código de 4 dígitos por WhatsApp.",
    });
  } catch (error) {
    console.error(
      "Error en enviar-codigo:",
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
