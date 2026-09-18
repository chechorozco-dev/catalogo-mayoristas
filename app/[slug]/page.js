import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TiendaCliente from "./TiendaCliente";

export const dynamic = "force-dynamic";

export default async function TiendaPage({ params }) {
  const { slug } = await params;

  // =========================================
  // 1. BUSCAR TIENDA
  // =========================================

  const {
    data: tienda,
    error: tiendaError,
  } = await supabase
    .from("tiendas")
    .select(`
      id,
      nombre_tienda,
      slug,
      whatsapp,
      logo_url,
      color_principal,
      color_fondo,
      mensaje_portada
    `)
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  // =========================================
  // 2. BUSCAR PRODUCTOS
  // =========================================

  const {
    data: productosData,
    error: productosError,
  } = await supabase
    .from("productos")
    .select(`
      id,
      referencia,
      nombre,
      categoria,
      descripcion,
      foto_url,
      foto_url_2,
      precio_detal,
      activo,
      created_at,
      tiene_variantes
    `)
    .eq("activo", true)
    .order("created_at", {
      ascending: false,
    });

  if (productosError) {
    return (
      <main
        style={{
          padding: "40px 20px",
          maxWidth: "900px",
          margin: "auto",
        }}
      >
        <h1>{tienda.nombre_tienda}</h1>

        <h2
          style={{
            color: "red",
          }}
        >
          Error cargando productos
        </h2>

        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f5f5f5",
            padding: "20px",
            borderRadius: "12px",
          }}
        >
          {JSON.stringify(
            productosError,
            null,
            2
          )}
        </pre>
      </main>
    );
  }

  // =========================================
  // 3. CONFIGURACIÓN SUPABASE SERVIDOR
  // =========================================
  //
  // Esta clave se usa únicamente en el servidor.
  // Nunca se envía al navegador.
  // =========================================

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY"
    );
  }

  // =========================================
  // 4. IDENTIFICAR PRODUCTOS CON VARIANTES
  // =========================================

  const productosConVariantes =
    (productosData || []).filter(
      (producto) =>
        producto.tiene_variantes === true
    );

  const idsProductosConVariantes =
    productosConVariantes.map(
      (producto) => producto.id
    );

  // =========================================
  // 5. CARGAR VARIANTES
  // =========================================

  let variantesData = [];

  if (idsProductosConVariantes.length > 0) {
    try {
      const ids =
        idsProductosConVariantes
          .map((id) => Number(id))
          .filter((id) =>
            Number.isFinite(id)
          )
          .join(",");

      if (ids) {
        const url =
          `${supabaseUrl}` +
          `/rest/v1/producto_variantes` +
          `?select=` +
          [
            "id",
            "producto_id",
            "nombre_variante",
            "referencia",
            "foto_url",
            "foto_url_2",
            "precio_detal",
            "activo",
            "orden",
          ].join(",") +
          `&producto_id=in.(${ids})` +
          `&activo=eq.true` +
          `&order=orden.asc`;

        const respuesta = await fetch(
          url,
          {
            method: "GET",

            headers: {
              apikey:
                supabaseSecretKey,

              "Content-Type":
                "application/json",
            },

            cache: "no-store",
          }
        );

        const texto =
          await respuesta.text();

        if (!respuesta.ok) {
          console.error(
            "ERROR SUPABASE VARIANTES:",
            respuesta.status,
            texto
          );

          throw new Error(
            `Error cargando variantes: ${respuesta.status}`
          );
        }

        if (texto) {
          const datos =
            JSON.parse(texto);

          if (Array.isArray(datos)) {
            variantesData = datos;
          }
        }
      }
    } catch (error) {
      console.error(
        "ERROR CARGANDO VARIANTES:",
        error
      );

      variantesData = [];
    }
  }

  // =========================================
  // 6. CARGAR PRECIOS PERSONALIZADOS
  //    DE ESTA TIENDA
  // =========================================
  //
  // Cada tienda puede tener:
  //
  // producto_id
  // variante_id
  // precio_sugerido
  //
  // Si NO existe precio personalizado,
  // utilizaremos precio_detal de RA.
  // =========================================

  let preciosPersonalizados = [];

  try {
    const urlPrecios =
      `${supabaseUrl}` +
      `/rest/v1/precios_tienda` +
      `?select=` +
      [
        "producto_id",
        "variante_id",
        "precio_sugerido",
        "actualizado_en",
      ].join(",") +
      `&tienda_id=eq.${encodeURIComponent(
        tienda.id
      )}` +
      `&order=actualizado_en.desc`;

    const respuestaPrecios =
      await fetch(urlPrecios, {
        method: "GET",

        headers: {
          apikey:
            supabaseSecretKey,

          "Content-Type":
            "application/json",
        },

        cache: "no-store",
      });

    const textoPrecios =
      await respuestaPrecios.text();

    if (!respuestaPrecios.ok) {
      console.error(
        "ERROR SUPABASE PRECIOS TIENDA:",
        respuestaPrecios.status,
        textoPrecios
      );

      throw new Error(
        `Error cargando precios personalizados: ${respuestaPrecios.status}`
      );
    }

    if (textoPrecios) {
      const datosPrecios =
        JSON.parse(textoPrecios);

      if (
        Array.isArray(datosPrecios)
      ) {
        preciosPersonalizados =
          datosPrecios;
      }
    }
  } catch (error) {
    console.error(
      "ERROR CARGANDO PRECIOS PERSONALIZADOS:",
      error
    );

    /*
      IMPORTANTE:

      Si por alguna razón falla esta consulta,
      NO dejamos el catálogo sin productos.

      Simplemente utilizaremos los precios
      generales de RA.
    */

    preciosPersonalizados = [];
  }

  // =========================================
  // 7. FUNCIÓN PARA BUSCAR PRECIO
  //    PERSONALIZADO
  // =========================================

  function obtenerPrecioPersonalizado(
    productoId,
    varianteId = null
  ) {
    const encontrado =
      preciosPersonalizados.find(
        (precio) => {
          const mismoProducto =
            Number(
              precio.producto_id
            ) === Number(productoId);

          if (!mismoProducto) {
            return false;
          }

          // PRODUCTO NORMAL
          if (
            varianteId === null ||
            varianteId === undefined
          ) {
            return (
              precio.variante_id ===
                null ||
              precio.variante_id ===
                undefined
            );
          }

          // VARIANTE
          return (
            Number(
              precio.variante_id
            ) === Number(varianteId)
          );
        }
      );

    if (!encontrado) {
      return null;
    }

    const precio =
      Number(
        encontrado.precio_sugerido
      );

    if (!Number.isFinite(precio)) {
      return null;
    }

    return precio;
  }

  // =========================================
  // 8. PREPARAR PRODUCTOS
  // =========================================

  const productos =
    (productosData || []).map(
      (producto) => {
        // =====================================
        // VARIANTES DEL PRODUCTO
        // =====================================

        const variantesDelProducto =
          variantesData
            .filter(
              (variante) =>
                String(
                  variante.producto_id
                ) ===
                String(producto.id)
            )
            .sort(
              (a, b) =>
                Number(
                  a.orden || 0
                ) -
                Number(
                  b.orden || 0
                )
            )
            .map((variante) => {
              // ===============================
              // PRECIO PERSONALIZADO VARIANTE
              // ===============================

              const precioPersonalizado =
                obtenerPrecioPersonalizado(
                  producto.id,
                  variante.id
                );

              const precioFinal =
                precioPersonalizado !== null
                  ? precioPersonalizado
                  : Number(
                      variante.precio_detal ||
                        0
                    );

              return {
                id:
                  variante.id,

                producto_id:
                  variante.producto_id,

                nombre_variante:
                  variante.nombre_variante,

                referencia:
                  variante.referencia,

                foto_url:
                  variante.foto_url,

                foto_url_2:
                  variante.foto_url_2,

                // =============================
                // PRECIO QUE VERÁ EL CLIENTE
                // =============================

                precio:
                  precioFinal,

                activo:
                  variante.activo,

                orden:
                  variante.orden,
              };
            });

        // =====================================
        // ¿REALMENTE TIENE VARIANTES?
        // =====================================

        const tieneVariantes =
          producto.tiene_variantes ===
            true &&
          variantesDelProducto.length > 0;

        // =====================================
        // PRIMERA VARIANTE
        // =====================================

        const primeraVariante =
          tieneVariantes
            ? variantesDelProducto[0]
            : null;

        // =====================================
        // PRECIO PRODUCTO NORMAL
        // =====================================

        const precioPersonalizadoProducto =
          obtenerPrecioPersonalizado(
            producto.id,
            null
          );

        const precioProductoNormal =
          precioPersonalizadoProducto !==
          null
            ? precioPersonalizadoProducto
            : Number(
                producto.precio_detal ||
                  0
              );

        // =====================================
        // PRODUCTO PARA EL CATÁLOGO
        // =====================================

        return {
          id:
            producto.id,

          referencia:
            primeraVariante?.referencia ||
            producto.referencia,

          nombre:
            producto.nombre,

          categoria:
            producto.categoria || "",

          descripcion:
            producto.descripcion || "",

          foto_url:
            primeraVariante?.foto_url ||
            producto.foto_url ||
            "",

          foto_url_2:
            primeraVariante?.foto_url_2 ||
            producto.foto_url_2 ||
            "",

          // ===================================
          // PRECIO QUE VERÁ EL CLIENTE FINAL
          // ===================================

          precio:
            primeraVariante
              ? Number(
                  primeraVariante.precio ||
                    0
                )
              : precioProductoNormal,

          created_at:
            producto.created_at,

          tiene_variantes:
            tieneVariantes,

          variantes:
            variantesDelProducto,
        };
      }
    );

  // =========================================
  // 9. CATÁLOGO
  // =========================================

  return (
    <main>
      <TiendaCliente
        nombreTienda={
          tienda.nombre_tienda
        }

        logoUrl={
          tienda.logo_url || ""
        }

        whatsapp={
          tienda.whatsapp || ""
        }

        colorPrincipal={
          tienda.color_principal || "#000000"
        }

        colorFondo={
          tienda.color_fondo || "#FFFFFF"
        }

        mensajePortada={
          tienda.mensaje_portada || ""
        }

        productos={
          productos
        }
      />
    </main>
  );
}
