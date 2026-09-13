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
      descripcion,
      foto_url,
      foto_url_2,
      precio_detal,
      activo,
      created_at
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
  // PREPARAR PRODUCTOS
  // =========================================

  const productos =
    (productosData || []).map(
      (producto) => ({
        id: producto.id,
        referencia:
          producto.referencia,
        nombre: producto.nombre,
        descripcion:
          producto.descripcion,
        foto_url:
          producto.foto_url,
        foto_url_2:
          producto.foto_url_2,

        // El catálogo público
        // solamente recibe precio sugerido
        precio:
          producto.precio_detal,

        created_at:
          producto.created_at,
      })
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
