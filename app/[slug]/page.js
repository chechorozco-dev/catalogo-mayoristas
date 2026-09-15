import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TiendaCliente from "./TiendaCliente";

export default async function TiendaPage({ params }) {
  const { slug } = await params;

  // =========================================
  // TIENDA
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
      logo_url
    `)
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  // =========================================
  // PRODUCTOS
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
  // IDS DE PRODUCTOS CON VARIANTES
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
  // CARGAR VARIANTES
  // =========================================

  let variantesData = [];

  if (idsProductosConVariantes.length > 0) {
    const {
      data,
      error: variantesError,
    } = await supabase
      .from("producto_variantes")
      .select(`
        id,
        producto_id,
        nombre_variante,
        referencia,
        foto_url,
        foto_url_2,
        precio_detal,
        activo,
        orden
      `)
      .in(
        "producto_id",
        idsProductosConVariantes
      )
      .eq("activo", true)
      .order("orden", {
        ascending: true,
      });

    if (variantesError) {
      console.error(
        "Error cargando variantes:",
        variantesError
      );
    } else {
      variantesData = data || [];
    }
  }

  // =========================================
  // PREPARAR PRODUCTOS
  // =========================================

  const productos =
    (productosData || []).map(
      (producto) => {
        const tieneVariantes =
          producto.tiene_variantes === true;

        // =====================================
        // VARIANTES DEL PRODUCTO
        // =====================================

        const variantes = tieneVariantes
          ? variantesData
              .filter(
                (variante) =>
                  String(
                    variante.producto_id
                  ) ===
                  String(producto.id)
              )
              .map((variante) => ({
                id: variante.id,

                nombre_variante:
                  variante.nombre_variante,

                referencia:
                  variante.referencia,

                foto_url:
                  variante.foto_url,

                foto_url_2:
                  variante.foto_url_2,

                // IMPORTANTE:
                // Al catálogo público solamente
                // enviamos el precio sugerido.
                precio:
                  variante.precio_detal,

                activo:
                  variante.activo,

                orden:
                  variante.orden,
              }))
          : [];

        // =====================================
        // PRIMERA VARIANTE
        // =====================================

        const primeraVariante =
          variantes.length > 0
            ? variantes[0]
            : null;

        // =====================================
        // PRODUCTO PARA EL CATÁLOGO
        // =====================================

        return {
          id: producto.id,

          referencia:
            primeraVariante?.referencia ||
            producto.referencia,

          nombre:
            producto.nombre,

          categoria:
            producto.categoria,

          descripcion:
            producto.descripcion,

          foto_url:
            primeraVariante?.foto_url ||
            producto.foto_url,

          foto_url_2:
            primeraVariante?.foto_url_2 ||
            producto.foto_url_2,

          // ===================================
          // PRECIO PÚBLICO
          // ===================================

          precio:
            primeraVariante?.precio ??
            producto.precio_detal,

          created_at:
            producto.created_at,

          // ===================================
          // VARIANTES
          // ===================================

          tiene_variantes:
            tieneVariantes &&
            variantes.length > 0,

          variantes,
        };
      }
    );

  // =========================================
  // CATÁLOGO
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
          tienda.whatsapp
        }
        productos={
          productos
        }
      />
    </main>
  );
}
