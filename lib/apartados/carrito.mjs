export const claveCarrito = (id) => "ra_pedido_mayorista:" + id;
export const claveBorrador = (id) => "ra_apartado_borrador:" + id;
export const claveWeb = (item) =>
  "w:" + item.producto_id + ":" + (item.variante_id || 0);
export function leerGuardado(key, fallback) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
}
export function combinarCarrito(items, carrito) {
  const porClave = new Map(items.map((item) => [item.clave, item]));
  for (const item of carrito) {
    const clave = claveWeb(item),
      anterior = porClave.get(clave);
    const extra = Math.max(
      0,
      (anterior?.cantidad || 0) - (anterior?.desdeCarrito || 0),
    );
    porClave.set(clave, {
      ...anterior,
      clave,
      nombre: item.nombre,
      referencia: item.referencia,
      foto: item.foto_url,
      mayor: item.costo,
      cantidad: extra + item.cantidad,
      desdeCarrito: item.cantidad,
    });
  }
  return [...porClave.values()];
}
export function descontarConfirmados(carrito, items) {
  const cantidades = new Map(
    items.map((i) => [i.clave, Math.min(i.cantidad, i.desdeCarrito || 0)]),
  );
  return carrito
    .map((i) => ({
      ...i,
      cantidad: i.cantidad - (cantidades.get(claveWeb(i)) || 0),
    }))
    .filter((i) => i.cantidad > 0);
}

export function actualizarSeleccion(items, productos) {
  const porClave = new Map(productos.map((p) => [p.clave, p]));
  return items
    .filter((i) => porClave.has(i.clave))
    .map((i) => ({
      ...i,
      ...porClave.get(i.clave),
      disponible: true,
    }));
}
