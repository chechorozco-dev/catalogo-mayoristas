import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TiendaCliente from "./TiendaCliente";

export default async function TiendaPage({ params }) {
  const { slug } = await params;

  // Buscar la tienda
  const { data: tienda, error: tiendaError } = await supabase
    .from("tiendas")
    .select("id, nombre_tienda, slug, whatsapp")
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  // Cargar productos públicos
  // IMPORTANTE:
  // Aquí NO traemos la columna "costo"
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
        activo,
        created_at
      `)
      .eq("activo", true)
      .order("created_at", { ascending: false });

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

  // Convertimos precio_detal en "precio"
  // porque TiendaCliente ya trabaja con producto.precio
  const productos = (productosData || []).map((producto) => ({
    id: producto.id,
    referencia: producto.referencia,
    nombre: producto.nombre,
    categoria: producto.categoria,
    descripcion: producto.descripcion,
    foto_url: producto.foto_url,
    foto_url_2: producto.foto_url_2,
    precio: producto.precio_detal,
    created_at: producto.created_at,
  }));

  return (
    <main
      style={{
        padding: "40px 20px",
        maxWidth: "1250px",
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
