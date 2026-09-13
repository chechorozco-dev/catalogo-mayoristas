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
    if (!token || !secreto) return null;

    const partes = token.split(".");

    if (partes.length !== 2) return null;

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

    const ahora = Math.floor(
      Date.now() / 1000
    );

    if (
      !datos.exp ||
      datos.exp <= ahora
    ) {
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

export async function GET() {
  try {
    const authSessionSecret =
      process.env.AUTH_SESSION_SECRET;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !authSessionSecret ||
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El servicio no está configurado correctamente.",
        },
        { status: 500 }
      );
    }

    const cookieStore =
      await cookies();

    const token =
      cookieStore.get("ra_session")?.value;

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
            "Debes iniciar sesión.",
        },
        { status: 401 }
      );
    }

    const headers = {
      apikey: supabaseSecretKey,
      "Content-Type":
        "application/json",
    };

    // Confirmar que siga autorizado
    const clienteResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/clientes_autorizados?id=eq.${encodeURIComponent(
          sesion.cliente_id
        )}&activo=eq.true&select=id,tienda_id`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    if (!clienteResponse.ok) {
      const texto =
        await clienteResponse.text();

      console.error(
        "Error validando cliente:",
        texto
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

    const cliente =
      clientes?.[0];

    if (!cliente) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "Tu cuenta ya no está autorizada.",
        },
        { status: 403 }
      );
    }

    // Traer los productos con costo privado
    const productosResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/productos?activo=eq.true&select=id,referencia,nombre,categoria,foto_url,foto_url_2,costo,precio_detal,activo,created_at_at&order=created_at.desc`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    if (!productosResponse.ok) {
      const texto =
        await productosResponse.text();

      console.error(
        "Error cargando productos:",
        texto
      );

      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No pudimos cargar los productos.",
        },
        { status: 500 }
      );
    }

    const productos =
      await productosResponse.json();

    return NextResponse.json({
      ok: true,
      productos:
        Array.isArray(productos)
          ? productos
          : [],
    });
  } catch (error) {
    console.error(
      "Error en productos mayoristas:",
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
