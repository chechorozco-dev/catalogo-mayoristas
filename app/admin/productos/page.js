"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ProductosMayoristaPage() {
  const router = useRouter();

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    setCargando(true);
    setError("");

    // Verificar que el mayorista tenga sesión iniciada
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace("/login");
      return;
    }

    // Traer productos con los dos precios
    const { data, error: productosError } = await supabase
      .from("productos")
      .select(`
        id,
        referencia,
        nombre,
        foto_url,
        foto_url_2,
        costo,
        precio_detal,
        activo,
        created_at
      `)
      .eq("activo", true)
      .order("created_at", { ascending: false });

    if (productosError) {
      console.error(productosError);
      setError("No se pudieron cargar los productos.");
      setCargando(false);
      return;
    }

    setProductos(data || []);
    setCargando(false);
  }

  function formatoPrecio(valor) {
    const numero = Number(valor || 0);

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(numero);
  }

  function volver() {
    router.push("/admin");
  }

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#fff8f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <p style={{ fontSize: "18px", color: "#666" }}>
          Cargando productos...
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff8f6",
        padding: "25px 16px 60px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* ENCABEZADO */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                color: "#171717",
              }}
            >
              Productos y precios
            </h1>

            <p
              style={{
                marginTop: "7px",
                marginBottom: 0,
                color: "#666",
                fontSize: "16px",
              }}
            >
              Consulta tu costo y el precio sugerido de venta.
            </p>
          </div>

          <button
            type="button"
            onClick={volver}
            style={{
              border: "1px solid #ddd",
              background: "white",
              padding: "11px 17px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            ← Volver
          </button>
        </div>

        {/* AVISO */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "25px",
            border: "1px solid #eee",
          }}
        >
          <strong>💡 Información para tu negocio</strong>

          <p
            style={{
              color: "#666",
              marginBottom: 0,
              lineHeight: "1.5",
            }}
          >
            Tu costo es el precio que pagas por el producto. El precio sugerido
            es el valor recomendado para venderlo a tus clientes.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#ffeaea",
              color: "#a33",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* PRODUCTOS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "18px",
          }}
        >
          {productos.map((producto) => {
            const costo = Number(producto.costo || 0);
            const precio = Number(producto.precio_detal || 0);
            const ganancia = precio - costo;

            return (
              <div
                key={producto.id}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid #eee",
                  boxShadow: "0 5px 18px rgba(0,0,0,0.05)",
                }}
              >
                {/* FOTO */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    background: "#f5f5f5",
                    overflow: "hidden",
                  }}
                >
                  {producto.foto_url ? (
                    <img
                      src={producto.foto_url}
                      alt={producto.nombre || producto.referencia}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                      }}
                    >
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* INFORMACIÓN */}
                <div style={{ padding: "17px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#888",
                      fontSize: "13px",
                      fontWeight: "700",
                    }}
                  >
                    {producto.referencia}
                  </p>

                  <h2
                    style={{
                      marginTop: "6px",
                      marginBottom: "17px",
                      fontSize: "17px",
                      lineHeight: "1.3",
                    }}
                  >
                    {producto.nombre}
                  </h2>

                  {/* COSTO */}
                  <div
                    style={{
                      paddingBottom: "12px",
                      marginBottom: "12px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                        fontSize: "13px",
                      }}
                    >
                      Tu costo
                    </p>

                    <strong
                      style={{
                        display: "block",
                        marginTop: "3px",
                        fontSize: "21px",
                        color: "#d97883",
                      }}
                    >
                      {formatoPrecio(costo)}
                    </strong>
                  </div>

                  {/* PRECIO SUGERIDO */}
                  <div
                    style={{
                      paddingBottom: "12px",
                      marginBottom: "12px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                        fontSize: "13px",
                      }}
                    >
                      Precio sugerido
                    </p>

                    <strong
                      style={{
                        display: "block",
                        marginTop: "3px",
                        fontSize: "21px",
                        color: "#222",
                      }}
                    >
                      {formatoPrecio(precio)}
                    </strong>
                  </div>

                  {/* GANANCIA */}
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                        fontSize: "13px",
                      }}
                    >
                      Ganancia sugerida
                    </p>

                    <strong
                      style={{
                        display: "block",
                        marginTop: "3px",
                        fontSize: "18px",
                        color: ganancia >= 0 ? "#318553" : "#c43b3b",
                      }}
                    >
                      {formatoPrecio(ganancia)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!error && productos.length === 0 && (
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "15px",
              textAlign: "center",
              color: "#666",
            }}
          >
            No hay productos disponibles.
          </div>
        )}
      </div>
    </main>
  );
}
