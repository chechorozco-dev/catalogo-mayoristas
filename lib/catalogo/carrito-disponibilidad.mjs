// La identidad incluye la variante: retirar un color no debe quitar los demás.
export function identidadItemCarrito(item) {
  return {
    producto_id: Number(item?.producto_id || item?.id_producto || item?.id),
    variante_id: item?.variante_id == null || item.variante_id === ""
      ? null : Number(item.variante_id),
  };
}

export function claveItemCarrito(item) {
  const { producto_id, variante_id } = identidadItemCarrito(item);
  return `${producto_id}:${variante_id === null ? "" : variante_id}`;
}

export function quitarProductosRetirados(carrito, retirados) {
  const claves = new Set(retirados.map(claveItemCarrito));
  const siguiente = carrito.filter(item => !claves.has(claveItemCarrito(item)));
  return siguiente.length === carrito.length ? carrito : siguiente;
}

export function ajustarPedidoSinRetirados(pedido, retirados) {
  const productos = quitarProductosRetirados(pedido.productos, retirados);
  if (productos === pedido.productos) return pedido;
  const subtotal = productos.reduce((total, item) =>
    total + Number(item.precio_unitario || 0) * Number(item.cantidad || 0), 0);
  const tarifa = Number(pedido.valores.costo_envio_original || 0);
  const porcentaje = Number(pedido.valores.porcentaje_descuento || 0);
  const descuento = Math.round(subtotal * porcentaje / 100);
  const envioGratis = pedido.modalidad_entrega !== "RECOGER" && subtotal > 400000 && tarifa < 18000;
  const envio = pedido.modalidad_entrega === "RECOGER" || envioGratis ? 0 : tarifa;
  return { ...pedido, productos, valores: { ...pedido.valores,
    subtotal_productos: subtotal, descuento, envio_gratis: envioGratis,
    costo_envio_final: envio, total_pedido: subtotal - descuento + envio,
  } };
}

// Si retiran una referencia justo al pulsar Confirmar, se vuelve a enviar
// únicamente el carrito vigente. El servidor aún no creó ningún pedido.
export async function confirmarCarritoVigente(inicial, enviar, alRetirar) {
  let pedido = inicial;
  for (let intento = 0; intento < 4; intento++) {
    const respuesta = await enviar(pedido);
    const datos = await respuesta.json();
    if (respuesta.status === 409 && datos.codigo === "CARRITO_ACTUALIZADO" && Array.isArray(datos.retirados)) {
      const siguiente = ajustarPedidoSinRetirados(pedido, datos.retirados);
      if (siguiente !== pedido) {
        alRetirar(datos.retirados);
        pedido = siguiente;
        if (!pedido.productos.length) return { pedido, vacio: true };
        continue;
      }
    }
    if (!respuesta.ok || !datos.ok) {
      const error = new Error(datos.error || "No pudimos confirmar tu pedido. Vuelve a intentar.");
      error.mensajeCliente = datos.error;
      throw error;
    }
    return { pedido, datos };
  }
  throw new Error("No pudimos confirmar tu pedido. Vuelve a intentar.");
}
