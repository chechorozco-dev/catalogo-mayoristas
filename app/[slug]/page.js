import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";

function formatoPrecio(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

export default async function TiendaPage({ params }) {
  const { slug } = await params;

  // Buscar la tienda
  const { data: tienda, error: tiendaError } = await supabase
    .from("tiendas")
    .select("id, nombre_tienda, slug, whatsapp, logo_url")
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (tiendaError || !tienda) {
    notFound();
  }

  // Buscar los productos que este mayorista decidió mostrar
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
        precio_detal
      )
    `)
    .eq("tienda_id", tienda.id)
    .eq("visible", true);

  if (productosError) {
    console.error(productosError);
  }

  const productos = productosTienda || [];

  return (
    <main style={{ padding: "30px 20px", maxWidth: "1100px", margin: "auto" }}>
      <header style={{ marginBottom: "35px" }}>
        <p className="eyebrow">Catálogo digital</p>

        <h1 style={{ fontSize: "42px", marginBottom: "10px" }}>
          {tienda.nombre_tienda}
        </h1>

        <p style={{ color: "#666" }}>
          Descubre nuestros productos disponibles.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        {productos.map((item) => {
          const producto = item.productos;

          const precio =
            item.precio_personalizado ?? producto.precio_detal;

          return (
            <article
              key={producto.id}
              style={{
                background: "white",
                borderRadius: "18px",
                padding: "18px",
                boxShadow: "0 5px 25px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  height: "180px",
                  borderRadius: "14px",
                  background: "#f7efec",
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                {producto.foto_url ? (
                  <img
                    src={producto.foto_url}
                    alt={producto.nombre}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "14px",
                    }}
                  />
                ) : (
                  "Foto próximamente"
                )}
              </div>

              <small style={{ color: "#999" }}>
                {producto.referencia}
              </small>

              <h2 style={{ fontSize: "19px", margin: "5px 0" }}>
                {producto.nombre}
              </h2>

              <p
                style={{
                  fontSize: "21px",
                  fontWeight: "700",
                  margin: "8px 0",
                }}
              >
                {formatoPrecio(precio)}
              </p>

              <p style={{ color: "#777", fontSize: "14px" }}>
                {producto.descripcion}
              </p>
            </article>
          );
        })}
      </section>

      {productos.length === 0 && (
        <p>No hay productos disponibles actualmente.</p>
      )}
    </main>
  );
}
