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
      console.error(
        "Error verificando acceso maestro:",
        error
      );

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

  function irProductos() {
    router.push("/admin-maestro/productos");
  }

  function irNuevoProducto() {
    router.push("/admin-maestro/productos/nuevo");
  }

  function irVariantes() {
    router.push("/admin-maestro/variantes");
  }

  function irNuevaVariante() {
    router.push("/admin-maestro/variantes/nuevo");
  }

  function irCarritos() {
    router.push("/admin-maestro/carritos");
  }

  function irAdminCliente() {
    router.push("/admin");
  }

  if (cargando) {
    return (
      <main style={paginaCargando}>
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

  return (
    <main style={pagina}>
      <div style={contenedor}>
        {/* =====================================
            ENCABEZADO
        ===================================== */}

        <header style={encabezado}>
          <div>
            <div style={badge}>
              ADMINISTRADOR MAESTRO
            </div>

            <h1 style={titulo}>
              Panel maestro
            </h1>

            <p style={saludo}>
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
              ...botonCerrar,
              cursor: cerrando
                ? "not-allowed"
                : "pointer",
              opacity: cerrando ? 0.6 : 1,
            }}
          >
            {cerrando
              ? "Cerrando..."
              : "Cerrar sesión"}
          </button>
        </header>

        {mensaje && (
          <div style={mensajeError}>
            {mensaje}
          </div>
        )}

        {/* =====================================
            TÍTULO ACCESOS
        ===================================== */}

        <div style={tituloSeccion}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              Accesos principales
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#777",
                lineHeight: "1.5",
              }}
            >
              Administra tus productos, pedidos y
              catálogo desde un solo lugar.
            </p>
          </div>
        </div>

        {/* =====================================
            CUADRÍCULA PRINCIPAL
        ===================================== */}

        <div style={grid}>
          {/* PRODUCTOS */}

          <section style={tarjeta}>
            <div
              style={{
                ...icono,
                background: "#fff0f2",
              }}
            >
              💎
            </div>

            <h2 style={tituloTarjeta}>
              Productos
            </h2>

            <p style={descripcion}>
              Administra el catálogo central y agrega
              nuevos productos para tus tiendas.
            </p>

            <div style={acciones}>
              <button
                type="button"
                onClick={irProductos}
                style={botonSecundario}
              >
                📦 Ver productos
              </button>

              <button
                type="button"
                onClick={irNuevoProducto}
                style={botonPrincipal}
              >
                ＋ Agregar producto
              </button>
            </div>
          </section>

          {/* VARIANTES */}

          <section style={tarjeta}>
            <div
              style={{
                ...icono,
                background: "#f2f1ff",
              }}
            >
              🔤
            </div>

            <h2 style={tituloTarjeta}>
              Productos con variantes
            </h2>

            <p style={descripcion}>
              Maneja productos con opciones como
              letras, colores o referencias diferentes.
            </p>

            <div style={acciones}>
              <button
                type="button"
                onClick={irVariantes}
                style={botonSecundario}
              >
                🔤 Ver variantes
              </button>

              <button
                type="button"
                onClick={irNuevaVariante}
                style={botonPrincipal}
              >
                ＋ Agregar con variantes
              </button>
            </div>
          </section>

          {/* CARRITOS */}

          <section style={tarjeta}>
            <div
              style={{
                ...icono,
                background: "#eef8ff",
              }}
            >
              🛒
            </div>

            <h2 style={tituloTarjeta}>
              Carritos en vivo
            </h2>

            <p style={descripcion}>
              Revisa los pedidos que están armando,
              los que llegaron al checkout y los
              completados.
            </p>

            <div style={acciones}>
              <button
                type="button"
                onClick={irCarritos}
                style={botonPrincipal}
              >
                🛒 Ver carritos en vivo
              </button>
            </div>
          </section>

          {/* MI CATÁLOGO */}

          <section style={tarjeta}>
            <div
              style={{
                ...icono,
                background: "#f1f8ee",
              }}
            >
              🏪
            </div>

            <h2 style={tituloTarjeta}>
              Mi catálogo
            </h2>

            <p style={descripcion}>
              Entra al administrador que utilizan tus
              clientes y revisa cómo funciona tu propia
              tienda.
            </p>

            <div style={acciones}>
              <button
                type="button"
                onClick={irAdminCliente}
                style={botonSecundario}
              >
                🏪 Ir a mi catálogo
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// =========================================
// ESTILOS
// =========================================

const pagina = {
  minHeight: "100vh",
  background: "#f6f7f9",
  padding: "24px 16px 60px",
};

const paginaCargando = {
  minHeight: "100vh",
  background: "#f6f7f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const contenedor = {
  maxWidth: "1100px",
  margin: "0 auto",
};

const encabezado = {
  background: "#111",
  color: "white",
  borderRadius: "24px",
  padding: "28px",
  boxShadow:
    "0 12px 35px rgba(0,0,0,0.12)",

  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap",
};

const badge = {
  display: "inline-block",
  background: "#d97883",
  padding: "6px 11px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
  marginBottom: "13px",
};

const titulo = {
  margin: 0,
  fontSize: "32px",
};

const saludo = {
  marginTop: "9px",
  marginBottom: 0,
  color: "#ccc",
  lineHeight: "1.5",
};

const botonCerrar = {
  border: "1px solid #444",
  background: "#222",
  color: "white",
  padding: "11px 16px",
  borderRadius: "10px",
  fontSize: "15px",
};

const mensajeError = {
  marginTop: "18px",
  padding: "14px",
  borderRadius: "12px",
  background: "#ffeaea",
  color: "#a33",
};

const tituloSeccion = {
  marginTop: "26px",
  marginBottom: "14px",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px",
};

const tarjeta = {
  background: "white",
  borderRadius: "20px",
  padding: "24px",
  boxShadow:
    "0 8px 30px rgba(0,0,0,0.055)",

  display: "flex",
  flexDirection: "column",
  minHeight: "290px",
};

const icono = {
  width: "52px",
  height: "52px",
  borderRadius: "15px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  fontSize: "25px",
  marginBottom: "15px",
};

const tituloTarjeta = {
  margin: 0,
  fontSize: "22px",
};

const descripcion = {
  marginTop: "8px",
  marginBottom: "22px",
  color: "#666",
  lineHeight: "1.6",
  flex: 1,
};

const acciones = {
  display: "grid",
  gap: "10px",
};

const botonPrincipal = {
  width: "100%",
  border: "none",
  padding: "14px 17px",
  borderRadius: "12px",
  background: "#d97883",
  color: "white",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
};

const botonSecundario = {
  width: "100%",
  border: "1px solid #ddd",
  padding: "14px 17px",
  borderRadius: "12px",
  background: "white",
  color: "#222",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
};
