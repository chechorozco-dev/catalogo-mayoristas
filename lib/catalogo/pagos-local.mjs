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

// El método de pago NO se elige en la página principal de Villavo.
// Se confirma posteriormente por WhatsApp, tanto para retiro como envío.
export const PAGO_POR_ACORDAR = "POR_ACORDAR";

export function esFormaPagoLocalValida(pago, modalidad = "RECOGER") {
  return ["RECOGER", "ENVIO"].includes(modalidad) && pago === PAGO_POR_ACORDAR;
}

export function totalesRetiroLocal(productos) {
  return calcularTotalesVillavo(productos, "RECOGER", 0);
}

export function calcularTotalesVillavo(productos, modalidad, costoEnvioNormal = 0) {
  if (modalidad !== "RECOGER" && modalidad !== "ENVIO") return null;
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
  const envio = modalidad === "RECOGER" ? 0 : Number(costoEnvioNormal);
  if (!Number.isSafeInteger(envio) || envio < 0 || envio > 500000) return null;
  // Igual que la principal: envío gratis por mercancía superior a 400.000
  // y tarifa de transporte inferior a 18.000.
  const envioGratis = modalidad === "ENVIO" && subtotal > 400000 && envio < 18000;
  const envioFinal = envioGratis ? 0 : envio;
  return {
    subtotal_productos: subtotal,
    porcentaje_descuento: 0,
    descuento: 0,
    costo_envio_original: envio,
    envio_gratis: envioGratis,
    costo_envio_final: envioFinal,
    total_pedido: subtotal + envioFinal,
  };
}
