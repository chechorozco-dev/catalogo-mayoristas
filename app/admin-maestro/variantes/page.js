"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function VariantesPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState(null);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    setError("");

    try {
      // ==========================================
      // 1. COMPROBAR SESIÓN MAESTRO
      // ==========================================

      const respuestaSesion = await fetch("/api/auth/sesion", {
        method: "GET",
        cache: "no-store",
      });

      const sesion = await respuestaSesion.json();

      if (!respuestaSesion.ok || !sesion.autenticado) {
        router.replace("/login");
        return;
      }

      if (sesion.cliente?.rol !== "MAESTRO") {
        router.replace("/admin");
        return;
      }

      // ==========================================
      // 2. CARGAR PRODUCTOS CON VARIANTES
      // ==========================================

      const respuesta = await fetch(
        "/api/admin-maestro/variantes",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos cargar los productos con variantes."
        );
      }

      setProductos(
        Array.isArray(data.productos) ? data.productos : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Ocurrió un error cargando los productos."
      );
    } finally {
      setCargando(false);
    }
  }

  // ==========================================
  // FILTRAR
  // ==========================================

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return productos;
    }

    return productos.filter((producto) => {
      const contenido = [
        producto.referencia,
        producto.nombre,
        producto.categoria,
        producto.descripcion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [productos, busqueda]);

  // ==========================================
  // ELIMINAR PRODUCTO CON SUS VARIANTES
  // ==========================================

  async function eliminarProducto(producto) {
    if (!producto?.id) return;

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar "${producto.nombre}"?\n\nTambién se eliminarán todas sus variantes.`
    );

    if (!confirmar) return;

    setEliminando(producto.id);
    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        `/api/admin-maestro/variantes?id=${encodeURIComponent(
          producto.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos eliminar el producto."
        );
      }

      setProductos((actuales) =>
        actuales.filter(
          (item) => String(item.id) !== String(producto.id)
        )
      );

      setMensaje("Producto eliminado correctamente.");

      setTimeout(() => {
        setMensaje("");
      }, 3500);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Ocurrió un error eliminando el producto."
      );
    } finally {
      setEliminando(null);
    }
  }

  // ==========================================
  // FORMATO DINERO
  // ==========================================

  function dinero(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return "$ 0";
    }

    return `$ ${new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(numero)}`;
  }

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <main style={estilos.pagina}>
        <div style={estilos.cargando}>
          Cargando productos con variantes...
        </div>
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <div style={estilos.contenedor}>
        {/* =====================================
            VOLVER
        ===================================== */}

        <button
          type="button"
          onClick={() => router.push("/admin-maestro")}
          style={estilos.volver}
        >
          ← Volver al Panel Maestro
        </button>

        {/* =====================================
            ENCABEZADO
        ===================================== */}

        <section style={estilos.encabezado}>
          <div style={estilos.insignia}>
            ADMINISTRADOR MAESTRO
          </div>

          <div style={estilos.encabezadoFila}>
            <div>
              <h1 style={estilos.titulo}>
                Productos con variantes
              </h1>

              <p style={estilos.subtitulo}>
                Administra productos que tienen varias opciones,
                como letras, colores, tamaños o diseños.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin-maestro/variantes/nuevo"
                )
              }
              style={estilos.botonNuevo}
            >
              ＋ Agregar producto
            </button>
          </div>
        </section>

        {/* =====================================
            MENSAJES
        ===================================== */}

        {mensaje && (
          <div style={estilos.mensajeExito}>
            ✅ {mensaje}
          </div>
        )}

        {error && (
          <div style={estilos.mensajeError}>
            ⚠️ {error}
          </div>
        )}

        {/* =====================================
            BUSCADOR
        ===================================== */}

        <section style={estilos.buscadorCaja}>
          <div>
            <strong style={{ fontSize: "18px" }}>
              🔎 Buscar producto
            </strong>

            <p style={estilos.ayuda}>
              Puedes buscar por referencia, nombre o categoría.
            </p>
          </div>

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ejemplo: letras, dijes, RA5000..."
            style={estilos.input}
          />
        </section>

        {/* =====================================
            CONTADOR
        ===================================== */}

        <div style={estilos.contador}>
          <strong>
            {productosFiltrados.length}
          </strong>{" "}
          {productosFiltrados.length === 1
            ? "producto encontrado"
            : "productos encontrados"}
        </div>

        {/* =====================================
            SIN PRODUCTOS
        ===================================== */}

        {productosFiltrados.length === 0 && (
          <section style={estilos.vacio}>
            <div style={{ fontSize: "50px" }}>🔤</div>

            <h2 style={{ marginBottom: "8px" }}>
              No hay productos con variantes
            </h2>

            <p style={estilos.ayuda}>
              Crea el primero desde el Panel Maestro.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin-maestro/variantes/nuevo"
                )
              }
              style={{
                ...estilos.botonNuevo,
                marginTop: "15px",
              }}
            >
              ＋ Crear producto con variantes
            </button>
          </section>
        )}

        {/* =====================================
            PRODUCTOS
        ===================================== */}

        {productosFiltrados.length > 0 && (
          <section style={estilos.grid}>
            {productosFiltrados.map((producto) => {
              const variantes = Array.isArray(
                producto.variantes
              )
                ? producto.variantes
                : [];

              const foto =
                producto.foto_url ||
                variantes.find(
                  (variante) => variante.foto_url
                )?.foto_url ||
                "";

              return (
                <article
                  key={producto.id}
                  style={estilos.tarjeta}
                >
                  {/* FOTO */}

                  <div style={estilos.fotoCaja}>
                    {foto ? (
                      <img
                        src={foto}
                        alt={producto.nombre || "Producto"}
                        style={estilos.foto}
                      />
                    ) : (
                      <div style={estilos.sinFoto}>
                        <span style={{ fontSize: "42px" }}>
                          🔤
                        </span>

                        <span>Sin fotografía</span>
                      </div>
                    )}

                    <div
                      style={{
                        ...estilos.estado,
                        ...(producto.activo === false
                          ? estilos.inactivo
                          : estilos.activo),
                      }}
                    >
                      ●{" "}
                      {producto.activo === false
                        ? "Inactivo"
                        : "Activo"}
                    </div>
                  </div>

                  {/* INFORMACIÓN */}

                  <div style={estilos.informacion}>
                    {producto.referencia && (
                      <div style={estilos.referencia}>
                        {producto.referencia}
                      </div>
                    )}

                    <h2 style={estilos.nombreProducto}>
                      {producto.nombre ||
                        "Producto sin nombre"}
                    </h2>

                    {producto.categoria && (
                      <div style={estilos.categoria}>
                        {producto.categoria}
                      </div>
                    )}

                    {/* VARIANTES */}

                    <div style={estilos.resumenVariantes}>
                      <span>
                        🔤{" "}
                        <strong>{variantes.length}</strong>{" "}
                        {variantes.length === 1
                          ? "variante"
                          : "variantes"}
                      </span>
                    </div>

                    {variantes.length > 0 && (
                      <div style={estilos.listaVariantes}>
                        {variantes
                          .slice(0, 6)
                          .map((variante) => (
                            <div
                              key={variante.id}
                              style={estilos.varianteMini}
                            >
                              {variante.foto_url ? (
                                <img
                                  src={variante.foto_url}
                                  alt={
                                    variante.nombre_variante ||
                                    ""
                                  }
                                  style={
                                    estilos.varianteFoto
                                  }
                                />
                              ) : (
                                <div
                                  style={
                                    estilos.varianteSinFoto
                                  }
                                >
                                  🔤
                                </div>
                              )}

                              <div
                                style={{
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={
                                    estilos.varianteNombre
                                  }
                                >
                                  {variante.nombre_variante ||
                                    "Variante"}
                                </div>

                                {variante.referencia && (
                                  <div
                                    style={
                                      estilos.varianteReferencia
                                    }
                                  >
                                    {variante.referencia}
                                  </div>
                                )}
                              </div>

                              {variante.precio_detal != null && (
                                <strong
                                  style={{
                                    fontSize: "12px",
                                  }}
                                >
                                  {dinero(
                                    variante.precio_detal
                                  )}
                                </strong>
                              )}
                            </div>
                          ))}

                        {variantes.length > 6 && (
                          <div
                            style={estilos.masVariantes}
                          >
                            + {variantes.length - 6} más
                          </div>
                        )}
                      </div>
                    )}

                    {/* BOTONES */}

                    <div style={estilos.botones}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/admin-maestro/variantes/${producto.id}`
                          )
                        }
                        style={estilos.botonEditar}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        type="button"
                        disabled={
                          eliminando === producto.id
                        }
                        onClick={() =>
                          eliminarProducto(producto)
                        }
                        style={{
                          ...estilos.botonEliminar,
                          opacity:
                            eliminando === producto.id
                              ? 0.5
                              : 1,
                          cursor:
                            eliminando === producto.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {eliminando === producto.id
                          ? "Eliminando..."
                          : "🗑️ Eliminar"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

// ======================================================
// ESTILOS
// ======================================================

const estilos = {
  pagina: {
    minHeight: "100vh",
    background: "#f6f7f9",
    padding: "30px 16px 60px",
    fontFamily:
      'Arial, Helvetica, sans-serif',
  },

  contenedor: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  cargando: {
    maxWidth: "700px",
    margin: "100px auto",
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    textAlign: "center",
    fontSize: "18px",
  },

  volver: {
    border: "none",
    background: "transparent",
    padding: "5px 0",
    marginBottom: "20px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  encabezado: {
    background: "#111",
    color: "white",
    borderRadius: "24px",
    padding: "30px",
    marginBottom: "20px",
  },

  insignia: {
    display: "inline-block",
    background: "#d97883",
    borderRadius: "999px",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: "900",
    marginBottom: "15px",
  },

  encabezadoFila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "20px",
    flexWrap: "wrap",
  },

  titulo: {
    fontSize: "34px",
    margin: 0,
  },

  subtitulo: {
    color: "#ddd",
    marginTop: "8px",
    marginBottom: 0,
    lineHeight: "1.5",
  },

  botonNuevo: {
    border: "none",
    background: "#d97883",
    color: "white",
    borderRadius: "12px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  mensajeExito: {
    background: "#e8f8ee",
    color: "#16783a",
    borderRadius: "14px",
    padding: "16px",
    fontWeight: "700",
    marginBottom: "18px",
  },

  mensajeError: {
    background: "#ffeaea",
    color: "#b52b2b",
    borderRadius: "14px",
    padding: "16px",
    fontWeight: "700",
    marginBottom: "18px",
  },

  buscadorCaja: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
    alignItems: "center",
    boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
  },

  ayuda: {
    color: "#777",
    lineHeight: "1.5",
    marginTop: "6px",
    marginBottom: 0,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "16px",
    outline: "none",
  },

  contador: {
    margin: "20px 2px 14px",
    color: "#555",
  },

  vacio: {
    background: "white",
    borderRadius: "20px",
    padding: "50px 20px",
    textAlign: "center",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },

  tarjeta: {
    background: "white",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
    border: "1px solid #eee",
  },

  fotoCaja: {
    height: "270px",
    position: "relative",
    background: "#f3f3f3",
  },

  foto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  sinFoto: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "center",
    justifyContent: "center",
    color: "#888",
  },

  estado: {
    position: "absolute",
    top: "14px",
    right: "14px",
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: "800",
  },

  activo: {
    background: "#e7f8eb",
    color: "#087b35",
  },

  inactivo: {
    background: "#ffe8e8",
    color: "#b52b2b",
  },

  informacion: {
    padding: "20px",
  },

  referencia: {
    color: "#d97883",
    fontWeight: "900",
    fontSize: "14px",
    marginBottom: "7px",
  },

  nombreProducto: {
    margin: 0,
    fontSize: "21px",
    lineHeight: "1.25",
  },

  categoria: {
    display: "inline-block",
    marginTop: "10px",
    background: "#f2f2f2",
    color: "#666",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
  },

  resumenVariantes: {
    marginTop: "18px",
    paddingTop: "15px",
    borderTop: "1px solid #eee",
    color: "#555",
  },

  listaVariantes: {
    marginTop: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  varianteMini: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    background: "#f8f8f8",
    borderRadius: "10px",
    padding: "7px",
  },

  varianteFoto: {
    width: "42px",
    height: "42px",
    borderRadius: "8px",
    objectFit: "cover",
    flexShrink: 0,
  },

  varianteSinFoto: {
    width: "42px",
    height: "42px",
    borderRadius: "8px",
    background: "#eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  varianteNombre: {
    fontWeight: "800",
    fontSize: "13px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  varianteReferencia: {
    color: "#888",
    fontSize: "11px",
    marginTop: "2px",
  },

  masVariantes: {
    textAlign: "center",
    color: "#777",
    fontSize: "12px",
    padding: "5px",
  },

  botones: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "18px",
    paddingTop: "16px",
    borderTop: "1px solid #eee",
  },

  botonEditar: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: "11px",
    padding: "12px 10px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
  },

  botonEliminar: {
    border: "1px solid #ffcaca",
    background: "#fff3f3",
    color: "#c33131",
    borderRadius: "11px",
    padding: "12px 10px",
    fontWeight: "800",
    fontSize: "14px",
  },
};
