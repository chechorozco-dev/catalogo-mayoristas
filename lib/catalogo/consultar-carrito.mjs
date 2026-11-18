import { fetchSupabasePaginado, dividirEnBloques } from "../supabasePagination.js";
import { identidadItemCarrito } from "./carrito-disponibilidad.mjs";
import { estadoPublicacionProducto } from "./publicacion.mjs";

async function leerFilas(ruta) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("No pudimos comprobar los productos del carrito.");
  const respuesta = await fetchSupabasePaginado(`${url}/rest/v1/${ruta}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!respuesta.ok) throw new Error("No pudimos comprobar los productos del carrito.");
  return respuesta.json();
}

// Consultas pequeñas y sin costos, acotadas al negocio y la tienda reales.
// Una falla de conexión nunca se interpreta como un producto retirado.
export async function consultarDisponibilidadCarrito(tienda, items) {
  if (!tienda?.id || !tienda.negocio_id || !Array.isArray(items) || items.length > 500) {
    throw new Error("No pudimos comprobar los productos del carrito.");
  }
  const identidades = items.map(identidadItemCarrito);
  const esId = valor => Number.isSafeInteger(valor) && valor > 0;
  const ids = [...new Set(identidades.map(item => item.producto_id).filter(esId))];
  const variantesIds = [...new Set(identidades.map(item => item.variante_id).filter(esId))];
  const negocio = `&negocio_id=eq.${encodeURIComponent(tienda.negocio_id)}`;
  const leerBloques = async (valores, ruta) => {
    const filas = [];
    for (const bloque of dividirEnBloques(valores, 80)) {
      filas.push(...await leerFilas(ruta + `&id=in.(${bloque.join(",")})` + negocio + "&order=id.asc"));
    }
    return filas;
  };
  const [productos, configuraciones, variantes] = await Promise.all([
    leerBloques(ids, "productos?select=id,activo,solo_ra,created_at,infoimagen"),
    (async () => {
      const filas = [];
      for (const bloque of dividirEnBloques(ids, 80)) {
        filas.push(...await leerFilas("tienda_productos?select=producto_id,visible,publicar_anticipadamente" +
          `&tienda_id=eq.${encodeURIComponent(tienda.id)}&producto_id=in.(${bloque.join(",")})` +
          negocio + "&order=producto_id.asc"));
      }
      return filas;
    })(),
    leerBloques(variantesIds, "producto_variantes?select=id,producto_id,activo,infoimagen"),
  ]);
  const porProducto = new Map(productos.map(item => [Number(item.id), item]));
  const porConfiguracion = new Map(configuraciones.map(item => [Number(item.producto_id), item]));
  const porVariante = new Map(variantes.map(item => [Number(item.id), item]));
  const esRa = tienda.tipo_tienda === "RA";
  const retirados = [];
  const disponibles = [];
  items.forEach((item, indice) => {
    const identidad = identidades[indice];
    const producto = porProducto.get(identidad.producto_id);
    const configuracion = porConfiguracion.get(identidad.producto_id);
    const variante = porVariante.get(identidad.variante_id);
    const publicado = producto?.activo === true && configuracion?.visible !== false &&
      (esRa || producto.solo_ra !== true) &&
      !estadoPublicacionProducto({ ...producto,
        publicar_anticipadamente: configuracion?.publicar_anticipadamente }, tienda).enEspera;
    const variantePublicada = identidad.variante_id === null ||
      (variante?.activo === true && Number(variante.producto_id) === identidad.producto_id);
    if (!esId(identidad.producto_id) || !publicado || !variantePublicada) {
      retirados.push({ ...identidad });
    } else {
      disponibles.push({ item, producto, variante });
    }
  });
  return { retirados, disponibles };
}
