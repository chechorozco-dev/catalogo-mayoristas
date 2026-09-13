import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function verificarToken(token, secreto) {
  try {
    if (!token || !secreto) return null;

    const partes = token.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [payload, firmaRecibida] = partes;

    const firmaCorrecta = crypto
      .createHmac("sha256", secreto)
      .update(payload)
      .digest("base64url");

    const bufferRecibido = Buffer.from(firmaRecibida);
    const bufferCorrecto = Buffer.from(firmaCorrecta);

    if (bufferRecibido.length !== bufferCorrecto.length) {
      return null;
    }

    const firmaValida = crypto.timingSafeEqual(
      bufferRecibido,
      bufferCorrecto
    );

    if (!firmaValida) {
      return null;
    }

    const datos = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (!datos.exp) {
      return null;
    }

    const ahora = Math.floor(Date.now() / 1000);

    if (datos.exp <= ahora) {
      return null;
    }

    return datos;
  } catch (error) {
    console.error("Error verificando sesión:", error);
    return null;
  }
}

export async function GET() {
  try {
    const secreto = process.env.AUTH_SESSION_SECRET;

    if (!secreto) {
      console.error("Falta AUTH_SESSION_SECRET");

      return NextResponse.json(
        {
          ok: false,
          autenticado: false,
          mensaje: "El servicio de acceso no está configurado.",
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const token = cookieStore.get("ra_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          ok: true,
          autenticado: false,
        },
        { status: 401 }
      );
    }

    const sesion = verificarToken(token, secreto);

    if (!sesion) {
      const respuesta = NextResponse.json(
        {
          ok: true,
          autenticado: false,
        },
        { status: 401 }
      );

      respuesta.cookies.set({
        name: "ra_session",
        value: "",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return respuesta;
    }

    return NextResponse.json({
      ok: true,
      autenticado: true,

      cliente: {
        id: sesion.cliente_id,
        nombre: sesion.nombre || "",
        telefono: sesion.telefono,
        tienda_id: sesion.tienda_id || null,
      },
    });
  } catch (error) {
    console.error("Error obteniendo sesión:", error);

    return NextResponse.json(
      {
        ok: false,
        autenticado: false,
        mensaje: "No pudimos consultar la sesión.",
      },
      { status: 500 }
    );
  }
}
