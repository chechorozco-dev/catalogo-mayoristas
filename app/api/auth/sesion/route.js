import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verificarToken } from "../../../../lib/apartados/sesion.mjs";

export const runtime = "nodejs";

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

    const rol =
      sesion.rol === "MAESTRO"
        ? "MAESTRO"
        : "CLIENTE";

    return NextResponse.json({
      ok: true,
      autenticado: true,

      cliente: {
        id: sesion.cliente_id,
        nombre: sesion.nombre || "",
        telefono: sesion.telefono || "",
        tienda_id: sesion.tienda_id || null,
        rol,
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
