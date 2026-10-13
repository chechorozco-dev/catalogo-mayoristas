import { NextResponse } from "next/server";

// La activación inicial ya se completó. Mantener el endpoint cerrado,
// incluso en despliegues de prueba y versiones compartidas.
export async function POST() {
  return NextResponse.json({ ok: false, mensaje: "La activación inicial ya fue completada." }, { status: 410 });
}
