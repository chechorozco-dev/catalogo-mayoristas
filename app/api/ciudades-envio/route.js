import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error:
            "Faltan las variables de entorno de Supabase.",
        },
        { status: 500 }
      );
    }

    const respuesta = await fetch(
      `${supabaseUrl}/rest/v1/ciudades_envio?select=ciudad_id,ciudad_departamento,tiempo_estimado,costo_envio&order=ciudad_departamento.asc`,
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
        },
        cache: "no-store",
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();

      console.error(
        "Error consultando ciudades_envio:",
        detalle
      );

      return NextResponse.json(
        {
          error: "No se pudieron cargar las ciudades.",
        },
        { status: respuesta.status }
      );
    }

    const ciudades = await respuesta.json();

    return NextResponse.json({
      ciudades,
    });
  } catch (error) {
    console.error(
      "Error en API ciudades-envio:",
      error
    );

    return NextResponse.json(
      {
        error: "Error interno cargando las ciudades.",
      },
      { status: 500 }
    );
  }
}