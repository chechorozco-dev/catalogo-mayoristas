import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TiendaCliente from "./TiendaCliente";

export default async function TiendaPage({ params }) {
  const { slug } = await params;

  // Buscar la tienda por su enlace
  const { data: tienda, error: tiendaError } = await supabase
    .from("tiendas")
    .select("id, nombre_tienda, slug, whatsapp")
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  // Traer TODOS los productos activos
  const { data: productosData, error: productosError } = await supabase
    .from("productos")
    .select(`
      id,
      referencia,
      nombre,
      categoria,
      descripcion,
      foto_url,
      foto_url_2,
      precio_detal
    `)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  if (productosError) {
    console.error("Error cargando productos:", productosError);
  }

  // Preparar productos para el catálogo
  const productos = (productosData || []).map((producto) => ({
    id: producto.id,
    referencia: producto.referencia,
    nombre: producto.nombre,
    categoria: producto.categoria,
    descripcion: producto.descripcion,
    foto_url: producto.foto_url,
    foto_url_2: producto.foto_url_2,
    precio: producto.precio_detal,
  }));

  return (
    <main
      style={{
        padding: "40px 20px",
        maxWidth: "1100px",
        margin: "auto",
      }}
    >
      <TiendaCliente
        nombreTienda={tienda.nombre_tienda}
        whatsapp={tienda.whatsapp}
        productos={productos}
      />
    </main>
  );
}
