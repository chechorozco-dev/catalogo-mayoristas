import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TiendaCliente from "./TiendaCliente";

export const dynamic = "force-dynamic";

/* =========================================
   METADATOS PARA WHATSAPP / REDES SOCIALES
========================================= */

export async function generateMetadata({ params }) {
  try {
    const { slug } = await params;

    const {
      data: tienda,
      error,
    } = await supabase
      .from("tiendas")
      .select(
        "nombre_tienda,slug,logo_url,mensaje_portada"
      )
      .eq("slug", slug)
      .eq("activa", true)
      .single();

    if (error || !tienda) {
      return {
        title: "Catálogo digital",
        description: "Catálogo digital de productos",
      };
    }

    const nombreTienda =
      tienda.nombre_tienda || "Catálogo digital";

    const descripcion =
      tienda.mensaje_portada ||
      `Descubre los productos de ${nombreTienda}`;

    const urlCatalogo =
      `https://mi-catalogo-accesorios.vercel.app/${encodeURIComponent(
        tienda.slug
      )}`;

    const imagen = tienda.logo_url || null;

    return {
      title: nombreTienda,

      description: descripcion,

      alternates: {
        canonical: urlCatalogo,
      },

      openGraph: {
        title: nombreTienda,
        description: descripcion,
        url: urlCatalogo,
        siteName: nombreTienda,
        type: "website",
        locale: "es_CO",

        ...(imagen
          ? {
              images: [
                {
                  url: imagen,
                  alt: nombreTienda,
                },
              ],
            }
          : {}),
      },

      twitter: {
        card: imagen
          ? "summary_large_image"
          : "summary",

        title: nombreTienda,
        description: descripcion,

        ...(imagen
          ? {
              images: [imagen],
            }
          : {}),
      },

      robots: {
        index: true,
        follow: true,
      },
    };
  } catch (error) {
    console.error(
      "ERROR GENERANDO METADATA:",
      error
    );

    return {
      title: "Catálogo digital",
      description: "Catálogo digital de productos",
    };
  }
}

/* =========================================
   PÁGINA DE LA TIENDA
========================================= */

export default async function TiendaPage({
  params,
}) {
  const { slug } = await params;

  // =========================================
  // 1. BUSCAR TIENDA
  // =========================================

  const {
    data: tienda,
    error: tiendaError,
  } = await supabase
    .from("tiendas")
   .select(
  "id,nombre_tienda,slug,whatsapp,logo_url,color_principal,color_fondo,mensaje_portada,instagram,facebook,tiktok,tipo_tienda,creado_en"
)
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  // =========================================
  // 2. CONFIGURACIÓN PRIVADA DEL SERVIDOR
  // =========================================
  //
  // IMPORTANTE:
  // SUPABASE_SECRET_KEY solamente se utiliza
  // en este archivo del servidor.
  //
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
  // 3. BUSCAR PRODUCTOS DESDE EL SERVIDOR
  // =========================================
  //
  // Usamos la clave secreta para poder leer
  // "costo" sin darle permiso público a esa
  // columna/tabla.
  //
  // El costo NO será enviado al navegador.
  // Solamente calcularemos el precio final.
  // =========================================

  let productosData = [];

  try {
    const urlProductos =
      `${supabaseUrl}` +
      `/rest/v1/productos` +
      `?select=` +
      [
        "id",
        "referencia",
        "nombre",
        "categoria",
        "descripcion",
        "foto_url",
        "foto_url_2",
        "precio_detal",
        "costo",
        "activo",
        "created_at",
        "tiene_variantes",
      ].join(",") +
      `&activo=eq.true` +
      `&order=created_at.desc`;

    const respuestaProductos =
      await fetch(urlProductos, {
        method: "GET",

        headers: {
          apikey: supabaseSecretKey,

          "Content-Type":
            "application/json",
        },

        cache: "no-store",
      });

    const textoProductos =
      await respuestaProductos.text();

    if (!respuestaProductos.ok) {
      console.error(
        "ERROR SUPABASE PRODUCTOS:",
        respuestaProductos.status,
        textoProductos
      );

      throw new Error(
        `Error cargando productos: ${respuestaProductos.status}`
      );
    }

    if (textoProductos) {
      const datosProductos =
        JSON.parse(textoProductos);

      if (Array.isArray(datosProductos)) {
        productosData = datosProductos;
      }
    }
  } catch (error) {
    console.error(
      "ERROR CARGANDO PRODUCTOS:",
      error
    );

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

        <p>
          No fue posible cargar los productos.
        </p>
      </main>
    );
  }
// =========================================
// VISIBILIDAD + PUBLICACIÓN DE PRODUCTOS
// =========================================
//
// REGLAS:
//
// 1. visible = false
//    Siempre oculta el producto.
//
// 2. Tienda RA:
//    Los productos nuevos aparecen inmediatamente.
//
// 3. Tienda CLIENTE:
//    Los productos nuevos esperan 24 horas.
//
// 4. Si el cliente pulsa "Publicar ahora":
//    publicar_anticipadamente = true
//    y aparece inmediatamente.
//
// 5. Después de 24 horas:
//    aparece automáticamente.
//
// 6. Si created_at no existe:
//    lo tratamos como producto antiguo.
// =========================================

try {
  const urlConfiguracionProductos =
    `${supabaseUrl}` +
    `/rest/v1/tienda_productos` +
    `?select=producto_id,visible,publicar_anticipadamente` +
    `&tienda_id=eq.${encodeURIComponent(
      tienda.id
    )}`;

  const respuestaConfiguracionProductos =
    await fetch(urlConfiguracionProductos, {
      method: "GET",

      headers: {
        apikey: supabaseSecretKey,

        "Content-Type":
          "application/json",
      },

      cache: "no-store",
    });

  const textoConfiguracionProductos =
    await respuestaConfiguracionProductos.text();

  if (!respuestaConfiguracionProductos.ok) {
    console.error(
      "ERROR CARGANDO CONFIGURACIÓN DE PRODUCTOS:",
      respuestaConfiguracionProductos.status,
      textoConfiguracionProductos
    );

    throw new Error(
      "No se pudo cargar la configuración de los productos."
    );
  }

  let configuracionProductos = [];

  if (textoConfiguracionProductos) {
    const datosConfiguracion =
      JSON.parse(
        textoConfiguracionProductos
      );

    if (Array.isArray(datosConfiguracion)) {
      configuracionProductos =
        datosConfiguracion;
    }
  }

  // -----------------------------------------
  // MAPA DE CONFIGURACIÓN POR PRODUCTO
  // -----------------------------------------

  const mapaConfiguracion =
    new Map();

  configuracionProductos.forEach(
    (registro) => {
      mapaConfiguracion.set(
        String(registro.producto_id),
        registro
      );
    }
  );

  // -----------------------------------------
  // ¿ES LA TIENDA PRINCIPAL DE RA?
  // -----------------------------------------

  const esTiendaRAParaPublicacion =
    String(
      tienda.tipo_tienda || ""
    )
      .trim()
      .toUpperCase() === "RA";

  const ahoraMs = Date.now();

  const VEINTICUATRO_HORAS_MS =
    24 * 60 * 60 * 1000;

  // -----------------------------------------
  // FILTRAR PRODUCTOS
  // -----------------------------------------

  productosData =
    productosData.filter(
      (producto) => {
        const configuracion =
          mapaConfiguracion.get(
            String(producto.id)
          );

        // -------------------------------------
        // 1. OCULTO MANUALMENTE
        // -------------------------------------

        if (
          configuracion?.visible === false
        ) {
          return false;
        }

        // -------------------------------------
        // 2. RA PUBLICA INMEDIATAMENTE
        // -------------------------------------

        if (esTiendaRAParaPublicacion) {
          return true;
        }

        // -------------------------------------
        // 3. PUBLICACIÓN ANTICIPADA
        // -------------------------------------

        if (
          configuracion
            ?.publicar_anticipadamente ===
          true
        ) {
          return true;
        }

        // -------------------------------------
        // 4. PRODUCTOS SIN FECHA
        //    SE CONSIDERAN ANTIGUOS
        // -------------------------------------

        if (!producto.created_at) {
          return true;
        }

        const fechaCreacionMs =
          new Date(
            producto.created_at
          ).getTime();

        // Si por alguna razón la fecha
        // no es válida, no ocultamos un
        // producto antiguo accidentalmente.
        if (
          !Number.isFinite(
            fechaCreacionMs
          )
        ) {
          return true;
        }

        // -------------------------------------
        // 5. CALCULAR EDAD DEL PRODUCTO
        // -------------------------------------

        const edadProductoMs =
          ahoraMs - fechaCreacionMs;

        // Si ya cumplió 24 horas,
        // aparece automáticamente.
        if (
          edadProductoMs >=
          VEINTICUATRO_HORAS_MS
        ) {
          return true;
        }

        // -------------------------------------
        // MENOS DE 24 HORAS:
        // TODAVÍA NO SE PUBLICA
        // -------------------------------------

        return false;
      }
    );
} catch (error) {
  console.error(
    "ERROR APLICANDO VISIBILIDAD Y PUBLICACIÓN:",
    error
  );

  // Si falla esta comprobación,
  // no mostramos productos por seguridad.
  productosData = [];
}
  // =========================================
  // 4. IDENTIFICAR PRODUCTOS CON VARIANTES
  // =========================================

  const productosConVariantes =
    productosData.filter(
      (producto) =>
        producto.tiene_variantes === true
    );

  const idsProductosConVariantes =
    productosConVariantes.map(
      (producto) => producto.id
    );

  // =========================================
  // 5. CARGAR VARIANTES DESDE EL SERVIDOR
  // =========================================

  let variantesData = [];

  if (
    idsProductosConVariantes.length > 0
  ) {
    try {
      const ids =
        idsProductosConVariantes
          .map((id) => Number(id))
          .filter((id) =>
            Number.isFinite(id)
          )
          .join(",");

      if (ids) {
        const urlVariantes =
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
            "costo",
            "activo",
            "orden",
          ].join(",") +
          `&producto_id=in.(${ids})` +
          `&activo=eq.true` +
          `&order=orden.asc`;

        const respuestaVariantes =
          await fetch(urlVariantes, {
            method: "GET",

            headers: {
              apikey: supabaseSecretKey,

              "Content-Type":
                "application/json",
            },

            cache: "no-store",
          });

        const textoVariantes =
          await respuestaVariantes.text();

        if (!respuestaVariantes.ok) {
          console.error(
            "ERROR SUPABASE VARIANTES:",
            respuestaVariantes.status,
            textoVariantes
          );

          throw new Error(
            `Error cargando variantes: ${respuestaVariantes.status}`
          );
        }

        if (textoVariantes) {
          const datosVariantes =
            JSON.parse(textoVariantes);

          if (
            Array.isArray(datosVariantes)
          ) {
            variantesData =
              datosVariantes;
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
          apikey: supabaseSecretKey,

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

    preciosPersonalizados = [];
  }

  // =========================================
  // 7. BUSCAR PRECIO PERSONALIZADO
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
            ) ===
            Number(productoId);

          if (!mismoProducto) {
            return false;
          }

          // PRODUCTO NORMAL

          if (
            varianteId === null ||
            varianteId === undefined
          ) {
            return (
              precio.variante_id === null ||
              precio.variante_id === undefined
            );
          }

          // VARIANTE

          return (
            Number(
              precio.variante_id
            ) ===
            Number(varianteId)
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
  // 8. IDENTIFICAR SI ES LA TIENDA DE RA
  // =========================================

  const esTiendaRA =
    String(
      tienda.tipo_tienda || ""
    )
      .trim()
      .toUpperCase() === "RA";

  // =========================================
  // 9. PREPARAR PRODUCTOS
  // =========================================

  const productos =
    productosData.map(
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
            .map(
              (variante) => {

                // ===============================
                // PRECIO PERSONALIZADO
                // ===============================

                const precioPersonalizado =
                  obtenerPrecioPersonalizado(
                    producto.id,
                    variante.id
                  );

                // ===============================
                // PRECIO FINAL DE LA VARIANTE
                // ===============================
                //
                // MAYORISTAS RA:
                // usa COSTO.
                //
                // TIENDA CLIENTE:
                // usa precio personalizado.
                // Si no tiene, precio_detal.
                // ===============================

                const precioFinal =
                  esTiendaRA
                    ? Number(
                        variante.costo || 0
                      )
                    : precioPersonalizado !== null
                      ? precioPersonalizado
                      : Number(
                          variante.precio_detal ||
                            0
                        );

                // IMPORTANTE:
                // Aquí NO devolvemos "costo".

                return {
                  id: variante.id,

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

                  precio:
                    precioFinal,

                  activo:
                    variante.activo,

                  orden:
                    variante.orden,
                };
              }
            );

        // =====================================
        // ¿REALMENTE TIENE VARIANTES?
        // =====================================

        const tieneVariantes =
          producto.tiene_variantes ===
            true &&
          variantesDelProducto.length >
            0;

        // =====================================
        // PRIMERA VARIANTE
        // =====================================

        const primeraVariante =
          tieneVariantes
            ? variantesDelProducto[0]
            : null;

        // =====================================
        // PRECIO PERSONALIZADO PRODUCTO NORMAL
        // =====================================

        const precioPersonalizadoProducto =
          obtenerPrecioPersonalizado(
            producto.id,
            null
          );

        // =====================================
        // PRECIO FINAL PRODUCTO NORMAL
        // =====================================
        //
        // MAYORISTAS RA:
        // usa COSTO.
        //
        // TIENDA CLIENTE:
        // usa precio personalizado.
        // Si no tiene, precio_detal.
        // =====================================

        const precioProductoNormal =
          esTiendaRA
            ? Number(
                producto.costo || 0
              )
            : precioPersonalizadoProducto !== null
              ? precioPersonalizadoProducto
              : Number(
                  producto.precio_detal ||
                    0
                );

        // =====================================
        // PRODUCTO QUE SE ENVÍA AL NAVEGADOR
        // =====================================
        //
        // IMPORTANTE:
        // NO enviamos:
        //
        // costo
        // precio_minimo
        // infoimagen
        //
        // Solamente enviamos "precio".
        // =====================================

        return {
          id: producto.id,

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
  // 10. CARGAR ANUNCIOS DE ESTA TIENDA
  // =========================================

  let anuncios = [];

  try {
    const ahora = new Date().toISOString();

    const urlAnuncios =
      `${supabaseUrl}` +
      `/rest/v1/anuncios_tienda` +
      `?select=` +
      [
        "id",
        "tipo",
        "titulo",
        "mensaje",
        "texto_boton",
        "enlace_boton",
        "color_fondo",
        "color_texto",
        "imagen_url",
        "fecha_inicio",
        "fecha_fin",
        "orden",
      ].join(",") +
      `&tienda_id=eq.${encodeURIComponent(
        tienda.id
      )}` +
      `&activo=eq.true` +
      `&order=orden.asc`;

    const respuestaAnuncios =
      await fetch(urlAnuncios, {
        method: "GET",

        headers: {
          apikey: supabaseSecretKey,

          "Content-Type":
            "application/json",
        },

        cache: "no-store",
      });

    const textoAnuncios =
      await respuestaAnuncios.text();

    if (!respuestaAnuncios.ok) {
      console.error(
        "ERROR SUPABASE ANUNCIOS:",
        respuestaAnuncios.status,
        textoAnuncios
      );

      throw new Error(
        `Error cargando anuncios: ${respuestaAnuncios.status}`
      );
    }

    if (textoAnuncios) {
      const datosAnuncios =
        JSON.parse(textoAnuncios);

      if (Array.isArray(datosAnuncios)) {
        anuncios = datosAnuncios.filter(
          (anuncio) => {
            const inicioValido =
              !anuncio.fecha_inicio ||
              anuncio.fecha_inicio <= ahora;

            const finValido =
              !anuncio.fecha_fin ||
              anuncio.fecha_fin >= ahora;

            return (
              inicioValido && finValido
            );
          }
        );
      }
    }
  } catch (error) {
    console.error(
      "ERROR CARGANDO ANUNCIOS:",
      error
    );

    anuncios = [];
  }

  // =========================================
  // 11. CATÁLOGO
  // =========================================

  return (
    <main>
      <TiendaCliente
      tipoTienda={
  tienda.tipo_tienda || "CLIENTE"
}
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
          tienda.color_principal ||
          "#000000"
        }

        colorFondo={
          tienda.color_fondo ||
          "#FFFFFF"
        }

        mensajePortada={
          tienda.mensaje_portada ||
          ""
        }

        instagram={
          tienda.instagram || ""
        }

        facebook={
          tienda.facebook || ""
        }

        tiktok={
          tienda.tiktok || ""
        }

                productos={
          productos
        }

        anuncios={
          anuncios
        }
      />
    </main>
  );
}
