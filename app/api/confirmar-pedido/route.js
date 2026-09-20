export async function POST(request) {
  try {
    const pedido = await request.json();

    const respuestaMake = await fetch(
      "https://hook.us2.make.com/wax9zylhd6f1qp6yvth29pw5y3kppdhw",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pedido),
      }
    );

    if (!respuestaMake.ok) {
      throw new Error(
        `Make respondió con estado ${respuestaMake.status}`
      );
    }

    return Response.json({
      ok: true,
    });
  } catch (error) {
    console.error("Error enviando pedido:", error);

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