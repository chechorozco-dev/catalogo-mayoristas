import { NextResponse } from "next/server";

export async function POST() {
  const response =
    NextResponse.json({
      ok: true,
      mensaje:
        "Sesión cerrada correctamente.",
    });

  response.cookies.set({
    name: "ra_session",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
