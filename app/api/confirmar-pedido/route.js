export async function POST(request) {
  try {
    const pedido = await request.json();

    // ========================================
    // 1. CREAR NÚMERO ÚNICO DEL PEDIDO
    // ========================================

    const respuestaSupabase = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pedidos?select=id,numero_pedido`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );

    if (!respuestaSupabase.ok) {
      const errorSupabase =
        await respuestaSupabase.text();

      console.error(
        "Error creando número de pedido:",
        errorSupabase
      );

      throw new Error(
        "No se pudo generar el número del pedido."
      );
    }

    const pedidosCreados =
      await respuestaSupabase.json();

    const pedidoCreado = pedidosCreados?.[0];

    if (!pedidoCreado?.numero_pedido) {
      throw new Error(
        "Supabase no devolvió el número del pedido."
      );
    }

    // ========================================
    // 2. AGREGAR ID Y NÚMERO AL PEDIDO
    // ========================================

    const pedidoCompleto = {
      pedido_id: pedidoCreado.id,
      numero_pedido: pedidoCreado.numero_pedido,
      ...pedido,
    };

    // ========================================
    // 3. ENVIAR PEDIDO A MAKE
    // ========================================

    const respuestaMake = await fetch(
      "https://hook.us2.make.com/wax9zylhd6f1qp6yvth29pw5y3kppdhw",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pedidoCompleto),
      }
    );

    if (!respuestaMake.ok) {
      throw new Error(
        `Make respondió con estado ${respuestaMake.status}`
      );
    }

    // ========================================
    // 4. DEVOLVER NÚMERO A LA PÁGINA
    // ========================================

    return Response.json({
      ok: true,
      pedido_id: pedidoCreado.id,
      numero_pedido: pedidoCreado.numero_pedido,
    });
  } catch (error) {
    console.error(
      "Error enviando pedido:",
      error
    );

    return Response.json(
      {
        ok: false,
        error: "No se pudo enviar el pedido.",
      },
      {
        status: 500,
      }
    );
  }
}