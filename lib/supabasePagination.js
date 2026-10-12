import { negocioFetch } from "./negocioFetch.mjs";
/**
 * Lee tablas de Supabase/PostgREST en bloques.
 *
 * Supabase aplica un límite máximo de filas por petición (habitualmente
 * 1.000). Una respuesta de 200 no significa que estén todas las filas.
 * Esta función añade limit/offset, concatena cada bloque y conserva la
 * interfaz Response que usan los endpoints actuales.
 *
 * Utilizar únicamente en el servidor y solo para consultas GET de listas.
 * Nunca se debe enviar una clave secreta al navegador.
 */
export async function fetchSupabasePaginado(
  url,
  opciones = {},
  { tamanoBloque = 400, maxBloques = 125 } = {}
) {
  if (
    !Number.isInteger(tamanoBloque) ||
    tamanoBloque < 1 ||
    tamanoBloque > 1000 ||
    !Number.isInteger(maxBloques) ||
    maxBloques < 1
  ) {
    throw new Error("Configuración de paginación inválida.");
  }

  if (String(opciones.method || "GET").toUpperCase() !== "GET") {
    throw new Error("La paginación solo admite solicitudes GET.");
  }

  const urlBase = new URL(url);

  if (
    urlBase.searchParams.has("limit") ||
    urlBase.searchParams.has("offset")
  ) {
    throw new Error("La consulta paginada no debe incluir limit ni offset.");
  }

  const filas = [];

  for (let numeroBloque = 0; numeroBloque < maxBloques; numeroBloque++) {
    const urlBloque = new URL(urlBase);
    urlBloque.searchParams.set("limit", String(tamanoBloque));
    // El servidor puede imponer menos filas que las solicitadas;
    // el desplazamiento depende de las filas realmente recibidas.
    urlBloque.searchParams.set("offset", String(filas.length));

    const respuesta = await negocioFetch(urlBloque.toString(), {
      ...opciones,
      method: "GET",
    });

    // Se conserva el error original para que el llamador lo gestione.
    if (!respuesta.ok) {
      return respuesta;
    }

    const datos = await respuesta.json();

    if (!Array.isArray(datos)) {
      throw new Error("Supabase devolvió una lista inválida.");
    }

    filas.push(...datos);

    // No basta con que lleguen menos de 400: Supabase podría tener
    // configurado un límite menor. Paramos al llegar al total conocido
    // (Content-Range) o al recibir una página realmente vacía.
    const rango = respuesta.headers.get("content-range") || "";
    const totalTexto = rango.split("/")[1];
    const totalConocido =
      totalTexto && totalTexto !== "*" ? Number(totalTexto) : null;
    const termino =
      datos.length === 0 ||
      (Number.isFinite(totalConocido) && filas.length >= totalConocido);

    if (termino) {
      return new Response(JSON.stringify(filas), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Nunca devolver silenciosamente un catálogo incompleto.
  throw new Error("La consulta excedió el máximo de bloques permitido.");
}

/**
 * Evita crear URLs enormes al filtrar variantes por muchos producto_id.
 */
export function dividirEnBloques(lista, tamano = 80) {
  if (!Array.isArray(lista) || !Number.isInteger(tamano) || tamano < 1) {
    throw new Error("Parámetros de bloques inválidos.");
  }

  const bloques = [];

  for (let indice = 0; indice < lista.length; indice += tamano) {
    bloques.push(lista.slice(indice, indice + tamano));
  }

  return bloques;
}
