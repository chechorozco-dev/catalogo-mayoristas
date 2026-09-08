import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TiendaCliente from "./TiendaCliente";

export default async function TiendaPage({ params }) {
  const { slug } = await params;

  // Buscar tienda
  const { data: tienda, error: tiendaError } = await supabase
    .from("tiendas")
    .select("id, nombre_tienda, slug, whatsapp")
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  // Traer todos los productos activos
  const { data: productosData, error: productosError } =
    await supabase
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
        activo
      `)
      .eq("activo", true);

  // Mostrar el error directamente para poder identificarlo
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

        <h2 style={{ color: "red" }}>
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
          {JSON.stringify(productosError, null, 2)}
        </pre>
      </main>
    );
  }

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
