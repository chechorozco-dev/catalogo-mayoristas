import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TiendaCliente from "./TiendaCliente";

export default async function TiendaPage({ params }) {
  const { slug } = await params;

  const { data: tienda, error: tiendaError } = await supabase
    .from("tiendas")
    .select("id, nombre_tienda, slug, whatsapp")
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  const { data: productosTienda, error: productosError } = await supabase
    .from("tienda_productos")
    .select(`
      precio_personalizado,
      visible,
      productos (
        id,
        referencia,
        nombre,
        categoria,
        descripcion,
        foto_url,
        foto_url_2,
        precio_detal
      )
    `)
    .eq("tienda_id", tienda.id)
    .eq("visible", true);

  if (productosError) {
    console.error(productosError);
  }

  const productos = (productosTienda || []).map((item) => ({
    id: item.productos.id,
    referencia: item.productos.referencia,
    nombre: item.productos.nombre,
    categoria: item.productos.categoria,
    descripcion: item.productos.descripcion,
    foto_url: item.productos.foto_url,
    foto_url_2: item.productos.foto_url_2,
    precio:
      item.precio_personalizado ??
      item.productos.precio_detal,
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
