// Identidad exacta de la tienda física RA Accesorios Villavo.
// Nunca se aplica a "mayoristas-ra" ni a tiendas CLIENTE, incluso si
// contienen la palabra Villavo en su nombre.
export const LOCAL_VILLAVO_ID = "5d21bcb7-6e0a-4e9a-9d3f-b78ae4af9f41";

export function esRaAccesoriosVillavo(tienda) {
  return Boolean(
    tienda &&
    String(tienda.id || "") === LOCAL_VILLAVO_ID &&
    String(tienda.slug || "").trim().toLowerCase() === "local-2" &&
    String(tienda.tipo_tienda || "").trim().toUpperCase() === "RA" &&
    String(tienda.negocio_id || "") === "38100510-1325-4d3c-9b6c-886552e82089"
  );
}

export function esFormaPagoLocalValida(pago) {
  return pago === "TRANSFERENCIA" || pago === "EFECTIVO";
}

export function totalesRetiroLocal(productos) {
  if (!Array.isArray(productos) || productos.length === 0) return null;
  let subtotal = 0;
  for (const item of productos) {
    const precio = Number(item.precio_unitario);
    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(precio) || precio < 0 ||
        !Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 999) return null;
    subtotal += precio * cantidad;
    if (!Number.isSafeInteger(subtotal) || subtotal > 1_000_000_000) return null;
  }
  return {
    subtotal_productos: subtotal,
    porcentaje_descuento: 0,
    descuento: 0,
    costo_envio_original: 0,
    envio_gratis: false,
    costo_envio_final: 0,
    total_pedido: subtotal,
  };
}
