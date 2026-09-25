"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminMaestroPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    verificarAcceso();
  }, []);

  async function verificarAcceso() {
    setCargando(true);
    setMensaje("");

    try {
      const response = await fetch("/api/auth/sesion", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.autenticado) {
        router.replace("/login");
        return;
      }

      if (data.cliente?.rol !== "MAESTRO") {
        router.replace("/admin");
        return;
      }

      setCliente(data.cliente);
      setCargando(false);
    } catch (error) {
      console.error("Error verificando acceso maestro:", error);

      setMensaje(
        "No pudimos comprobar tu acceso al administrador maestro."
      );

      setCargando(false);
    }
  }

  async function cerrarSesion() {
    if (cerrando) return;

    setCerrando(true);

    try {
      await fetch("/api/auth/cerrar-sesion", {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
    }

    router.replace("/login");
    router.refresh();
  }

  // =====================================================
  // NAVEGACIÓN PRODUCTOS NORMALES
  // =====================================================

  function irProductos() {
    router.push("/admin-maestro/productos");
  }

  function irNuevoProducto() {
    router.push("/admin-maestro/productos/nuevo");
  }

  // =====================================================
  // NAVEGACIÓN PRODUCTOS CON VARIANTES
  // =====================================================

  function irVariantes() {
    router.push("/admin-maestro/variantes");
  }

  function irNuevaVariante() {
    router.push("/admin-maestro/variantes/nuevo");
  }

  // =====================================================
  // ADMINISTRADOR COMO CLIENTE
  // =====================================================

  function irAdminCliente() {
    router.push("/admin");
  }
// =====================================================
// CARRITOS EN VIVO
// =====================================================

function irCarritos() {
  router.push("/admin-maestro/carritos");
}
  // =====================================================
  // CARGANDO
  // =====================================================

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f6f7f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "18px",
            color: "#666",
          }}
        >
          Cargando administrador maestro...
        </p>
      </main>
    );
  }

  // =====================================================
  // PÁGINA
  // =====================================================

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7f9",
        padding: "24px 16px 50px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* =================================================
            ENCABEZADO
        ================================================= */}

        <div
          style={{
            background: "#111",
            color: "white",
            borderRadius: "22px",
            padding: "26px",
            boxShadow: "0 12px 35px rgba(0,0,0,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  background: "#d97883",
                  padding: "6px 11px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: "800",
                  marginBottom: "13px",
                }}
              >
                ADMINISTRADOR MAESTRO
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "32px",
                }}
              >
                Panel maestro
              </h1>

              <p
                style={{
                  marginTop: "9px",
                  marginBottom: 0,
                  color: "#ccc",
                  lineHeight: "1.5",
                }}
              >
                {cliente?.nombre
                  ? `Hola, ${cliente.nombre}`
                  : "Administrador"}
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              disabled={cerrando}
              style={{
                border: "1px solid #444",
                background: "#222",
                color: "white",
                padding: "11px 16px",
                borderRadius: "10px",
                cursor: cerrando ? "not-allowed" : "pointer",
                opacity: cerrando ? 0.6 : 1,
                fontSize: "15px",
              }}
            >
              {cerrando ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>

        {/* =================================================
            MENSAJE DE ERROR
        ================================================= */}

        {mensaje && (
          <div
            style={{
              marginTop: "18px",
              padding: "14px",
              borderRadius: "12px",
              background: "#ffeaea",
              color: "#a33",
            }}
          >
            {mensaje}
          </div>
        )}

        {/* =================================================
            PRODUCTOS NORMALES
        ================================================= */}

        <section
          style={{
            background: "white",
            marginTop: "20px",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "15px",
              background: "#fff0f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "25px",
              marginBottom: "15px",
            }}
          >
            💎
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
            }}
          >
            Productos
          </h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: "22px",
              color: "#666",
              lineHeight: "1.6",
            }}
          >
            Administra el catálogo central. Los productos que agregues aquí
            podrán aparecer en los catálogos de tus clientes mayoristas.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={irProductos}
              style={botonSecundario}
            >
              📦 Ver todos los productos
            </button>

            <button
              type="button"
              onClick={irNuevoProducto}
              style={botonPrincipal}
            >
              ＋ Agregar producto manual
            </button>
          </div>
        </section>

        {/* =================================================
            PRODUCTOS CON VARIANTES
        ================================================= */}

        <section
          style={{
            background: "white",
            marginTop: "16px",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "15px",
              background: "#f2f1ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "25px",
              marginBottom: "15px",
            }}
          >
            🔤
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
            }}
          >
            Productos con variantes
          </h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: "22px",
              color: "#666",
              lineHeight: "1.6",
            }}
          >
            Aquí podremos manejar productos como dijes de letras, donde un
            mismo producto tiene opciones A, B, C, D... y cada opción puede
            tener su propio código, foto, precio e información interna.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={irVariantes}
              style={botonSecundario}
            >
              🔤 Ver productos con variantes
            </button>

            <button
              type="button"
              onClick={irNuevaVariante}
              style={botonPrincipal}
            >
              ＋ Agregar producto con variantes
            </button>
          </div>
        </section>
{/* =================================================
    CARRITOS EN VIVO
================================================= */}

<section
  style={{
    background: "white",
    marginTop: "16px",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
  }}
>
  <div
    style={{
      width: "52px",
      height: "52px",
      borderRadius: "15px",
      background: "#eef8ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "25px",
      marginBottom: "15px",
    }}
  >
    🛒
  </div>

  <h2
    style={{
      margin: 0,
      fontSize: "24px",
    }}
  >
    Carritos en vivo
  </h2>

  <p
    style={{
      marginTop: "8px",
      marginBottom: "22px",
      color: "#666",
      lineHeight: "1.6",
    }}
  >
    Revisa los pedidos que los clientes están armando,
    los que llegaron al checkout y los que ya fueron
    completados.
  </p>

  <button
    type="button"
    onClick={irCarritos}
    style={botonPrincipal}
  >
    🛒 Ver carritos en vivo
  </button>
</section>
        {/* =================================================
            INFORMACIÓN PARA PEDIDOS
        ================================================= */}

        <section
          style={{
            background: "white",
            marginTop: "16px",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "15px",
              background: "#eef8ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "25px",
              marginBottom: "15px",
            }}
          >
            🔗
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
            }}
          >
            Información para pedidos
          </h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#666",
              lineHeight: "1.6",
            }}
          >
            Conservaremos INFOIMAGEN y los códigos internamente para que más
            adelante podamos enviar toda esa información por webhook cuando
            tus clientes hagan pedidos. Estos datos no necesitan mostrarse
            en el catálogo público.
          </p>
        </section>

        {/* =================================================
            MI CATÁLOGO COMO CLIENTE
        ================================================= */}

        <section
          style={{
            marginTop: "16px",
            padding: "22px",
            borderRadius: "20px",
            border: "1px solid #e5e5e5",
            background: "white",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
            }}
          >
            Mi catálogo como cliente
          </h2>

          <p
            style={{
              marginTop: "7px",
              marginBottom: "17px",
              color: "#777",
              lineHeight: "1.5",
            }}
          >
            También puedes entrar al mismo administrador que utilizan tus
            clientes para revisar tu tienda.
          </p>

          <button
            type="button"
            onClick={irAdminCliente}
            style={botonSecundario}
          >
            🏪 Ir a mi catálogo
          </button>
        </section>
      </div>
    </main>
  );
}

// =====================================================
// ESTILOS DE BOTONES
// =====================================================

const botonPrincipal = {
  width: "100%",
  border: "none",
  padding: "15px 18px",
  borderRadius: "12px",
  background: "#d97883",
  color: "white",
  fontSize: "16px",
  fontWeight: "800",
  cursor: "pointer",
};

const botonSecundario = {
  width: "100%",
  border: "1px solid #ddd",
  padding: "15px 18px",
  borderRadius: "12px",
  background: "white",
  color: "#222",
  fontSize: "16px",
  fontWeight: "700",
  cursor: "pointer",
};
