// Reglas existentes de publicación diferida de 24 horas.
// No modificar sin verificar primero la visibilidad de revendedores.

export function estadoPublicacionProducto(
  producto,
  tienda
) {
  // Si no conocemos la fecha del producto,
  // no hay período de espera.
  if (!producto?.created_at) {
    return {
      enEspera: false,
      horasRestantes: 0,
    };
  }

  // La tienda RA nunca necesita esperar.
  if (tienda?.tipo_tienda === "RA") {
    return {
      enEspera: false,
      horasRestantes: 0,
    };
  }

  const fechaProducto =
    new Date(producto.created_at).getTime();

  const fechaTienda =
    tienda?.creado_en
      ? new Date(tienda.creado_en).getTime()
      : null;

  // Si el producto ya existía cuando se creó
  // la tienda, debe aparecer inmediatamente.
  if (
    Number.isFinite(fechaProducto) &&
    Number.isFinite(fechaTienda) &&
    fechaProducto <= fechaTienda
  ) {
    return {
      enEspera: false,
      horasRestantes: 0,
    };
  }

  // Si el cliente ya decidió publicarlo,
  // tampoco mostramos el aviso.
  if (
    producto.publicar_anticipadamente === true
  ) {
    return {
      enEspera: false,
      horasRestantes: 0,
    };
  }

  const ahora = Date.now();

  const horasTranscurridas =
    (ahora - fechaProducto) /
    (1000 * 60 * 60);

  const horasRestantes =
    Math.max(
      0,
      Math.ceil(24 - horasTranscurridas)
    );

  return {
    enEspera:
      horasTranscurridas >= 0 &&
      horasTranscurridas < 24,

    horasRestantes,
  };
}
export function claveProducto(productoId, varianteId = null) {
  return varianteId
    ? `producto-${productoId}-variante-${varianteId}`
    : `producto-${productoId}`;
}
