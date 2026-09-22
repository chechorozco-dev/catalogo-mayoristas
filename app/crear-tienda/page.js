"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function crearSlugVistaPrevia(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const estilos = [
  {
    id: "morado",
    nombre: "Morado",
    principal: "#7C3AED",
    fondo: "#FFFFFF",
  },
  {
    id: "rosa",
    nombre: "Rosa",
    principal: "#D97883",
    fondo: "#FFF8F6",
  },
  {
    id: "negro",
    nombre: "Negro",
    principal: "#18181B",
    fondo: "#FFFFFF",
  },
  {
    id: "azul",
    nombre: "Azul",
    principal: "#2563EB",
    fondo: "#F8FAFC",
  },
  {
    id: "verde",
    nombre: "Verde",
    principal: "#16856A",
    fondo: "#FAF8F2",
  },
  {
    id: "dorado",
    nombre: "Dorado",
    principal: "#A67C38",
    fondo: "#FFFDF8",
  },
];

export default function CrearTiendaPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [cliente, setCliente] = useState(null);
  const [nombreTienda, setNombreTienda] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [estiloSeleccionado, setEstiloSeleccionado] =
    useState("morado");

  const [colorPrincipal, setColorPrincipal] =
    useState("#7C3AED");

  const [colorFondo, setColorFondo] =
    useState("#FFFFFF");

  useEffect(() => {
    revisarSesion();
  }, []);

  async function revisarSesion() {
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

      setCliente(data.cliente);

      if (data.cliente?.tienda_id) {
        router.replace("/admin");
        return;
      }

      setCargando(false);
    } catch (error) {
      console.error(error);
      router.replace("/login");
    }
  }

  const slugVistaPrevia = useMemo(() => {
    return crearSlugVistaPrevia(nombreTienda);
  }, [nombreTienda]);

  function seleccionarEstilo(estilo) {
    setEstiloSeleccionado(estilo.id);
    setColorPrincipal(estilo.principal);
    setColorFondo(estilo.fondo);
    setMensaje("");
  }

  function seleccionarPersonalizado() {
    setEstiloSeleccionado("personalizado");
    setMensaje("");
  }

  async function crearTienda(e) {
    e.preventDefault();

    const nombreLimpio = nombreTienda.trim();

    if (nombreLimpio.length < 2) {
      setMensaje(
        "Escribe un nombre válido para tu tienda."
      );
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const response = await fetch("/api/tiendas/crear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_tienda: nombreLimpio,
          color_principal: colorPrincipal,
          color_fondo: colorFondo,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (
          response.status === 409 &&
          data.tienda_id
        ) {
          router.replace("/admin");
          return;
        }

        setMensaje(
          data.mensaje ||
            "No pudimos crear tu tienda. Intenta nuevamente."
        );

        setGuardando(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      console.error(error);

      setMensaje(
        "Ocurrió un error inesperado. Intenta nuevamente."
      );

      setGuardando(false);
    }
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
        <p
          style={{
            fontSize: "18px",
            color: "#666",
          }}
        >
          Preparando tu catálogo...
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff8f6",
        padding: "40px 18px",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "22px",
            padding: "32px",
            boxShadow:
              "0 10px 35px rgba(0,0,0,0.08)",
          }}
        >
          {/* ENCABEZADO */}

          <div
            style={{
              marginBottom: "28px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#d97883",
                fontWeight: "700",
                letterSpacing: "1px",
                fontSize: "14px",
              }}
            >
              CONFIGURA TU CATÁLOGO
            </p>

            <h1
              style={{
                marginTop: "10px",
                marginBottom: "10px",
                fontSize: "34px",
                lineHeight: "1.1",
              }}
            >
              ¡Hola
              {cliente?.nombre
                ? `, ${cliente.nombre}`
                : ""}
              ! 👋
            </h1>

            <p
              style={{
                margin: 0,
                color: "#666",
                fontSize: "17px",
                lineHeight: "1.5",
              }}
            >
              Ponle nombre a tu tienda y elige los
              colores que mejor representen tu marca.
            </p>
          </div>

          <form onSubmit={crearTienda}>
            {/* NOMBRE */}

            <label
              style={{
                display: "block",
                fontWeight: "700",
                marginBottom: "8px",
                fontSize: "16px",
              }}
            >
              Nombre de tu tienda
            </label>

            <input
              type="text"
              value={nombreTienda}
              onChange={(e) => {
                setNombreTienda(e.target.value);
                setMensaje("");
              }}
              placeholder="Ej: Accesorios Tatiana"
              maxLength={80}
              autoFocus
              style={{
                width: "100%",
                padding: "15px 16px",
                borderRadius: "12px",
                border: "1px solid #ddd",
                fontSize: "17px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* URL */}

            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                borderRadius: "12px",
                background: "#f7f7f7",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#777",
                  fontSize: "14px",
                }}
              >
                Tu catálogo tendrá una dirección
                parecida a:
              </p>

              <div
                style={{
                  marginTop: "7px",
                  fontWeight: "700",
                  wordBreak: "break-all",
                  color: "#222",
                }}
              >
                {typeof window !== "undefined"
                  ? `${window.location.origin}/${
                      slugVistaPrevia ||
                      "nombre-de-tu-tienda"
                    }`
                  : `/${
                      slugVistaPrevia ||
                      "nombre-de-tu-tienda"
                    }`}
              </div>
            </div>

            {/* COLORES */}

            <div
              style={{
                marginTop: "30px",
              }}
            >
              <div
                style={{
                  fontWeight: "800",
                  fontSize: "18px",
                  marginBottom: "5px",
                }}
              >
                Elige el estilo de tu tienda
              </div>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#777",
                  lineHeight: "1.4",
                  fontSize: "14px",
                }}
              >
                Podrás cambiar estos colores después
                desde tu administrador.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "10px",
                }}
              >
                {estilos.map((estilo) => {
                  const seleccionado =
                    estiloSeleccionado === estilo.id;

                  return (
                    <button
                      key={estilo.id}
                      type="button"
                      onClick={() =>
                        seleccionarEstilo(estilo)
                      }
                      style={{
                        border: seleccionado
                          ? `2px solid ${estilo.principal}`
                          : "1px solid #e4e4e4",

                        background: "white",
                        borderRadius: "14px",
                        padding: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "11px",
                        textAlign: "left",
                        boxShadow: seleccionado
                          ? "0 4px 14px rgba(0,0,0,0.08)"
                          : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background:
                              estilo.principal,
                            border:
                              "1px solid rgba(0,0,0,0.08)",
                          }}
                        />

                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background:
                              estilo.fondo,
                            border:
                              "1px solid #ddd",
                            marginLeft: "-8px",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "700",
                            color: "#222",
                          }}
                        >
                          {estilo.nombre}
                        </div>
                      </div>

                      {seleccionado && (
                        <div
                          style={{
                            color:
                              estilo.principal,
                            fontWeight: "900",
                            fontSize: "18px",
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* PERSONALIZADO */}

                <button
                  type="button"
                  onClick={seleccionarPersonalizado}
                  style={{
                    border:
                      estiloSeleccionado ===
                      "personalizado"
                        ? `2px solid ${colorPrincipal}`
                        : "1px solid #e4e4e4",

                    background: "white",
                    borderRadius: "14px",
                    padding: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "28px",
                      borderRadius: "20px",
                      background:
                        "linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b, #10b981, #2563eb)",
                    }}
                  />

                  <div
                    style={{
                      fontWeight: "700",
                    }}
                  >
                    Personalizado
                  </div>

                  {estiloSeleccionado ===
                    "personalizado" && (
                    <div
                      style={{
                        marginLeft: "auto",
                        color: colorPrincipal,
                        fontWeight: "900",
                        fontSize: "18px",
                      }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* SELECTORES PERSONALIZADOS */}

            {estiloSeleccionado ===
              "personalizado" && (
              <div
                style={{
                  marginTop: "18px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  padding: "16px",
                  background: "#f8f8f8",
                  borderRadius: "14px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      fontSize: "14px",
                      marginBottom: "8px",
                    }}
                  >
                    Color principal
                  </label>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="color"
                      value={colorPrincipal}
                      onChange={(e) =>
                        setColorPrincipal(
                          e.target.value
                        )
                      }
                      style={{
                        width: "48px",
                        height: "42px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />

                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                      }}
                    >
                      {colorPrincipal.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      fontSize: "14px",
                      marginBottom: "8px",
                    }}
                  >
                    Color de fondo
                  </label>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="color"
                      value={colorFondo}
                      onChange={(e) =>
                        setColorFondo(
                          e.target.value
                        )
                      }
                      style={{
                        width: "48px",
                        height: "42px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />

                    <span
                      style={{
                        fontSize: "13px",
                        color: "#666",
                      }}
                    >
                      {colorFondo.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA PREVIA */}

            <div
              style={{
                marginTop: "28px",
              }}
            >
              <div
                style={{
                  fontWeight: "800",
                  fontSize: "16px",
                  marginBottom: "10px",
                }}
              >
                Vista previa
              </div>

              <div
                style={{
                  border: "1px solid #e7e7e7",
                  borderRadius: "18px",
                  overflow: "hidden",
                  background: colorFondo,
                  boxShadow:
                    "0 6px 20px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    background: colorPrincipal,
                    color: "white",
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "800",
                    fontSize: "17px",
                  }}
                >
                  {nombreTienda.trim() ||
                    "Tu tienda"}
                </div>

                <div
                  style={{
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "800",
                      fontSize: "20px",
                      color: "#222",
                      marginBottom: "14px",
                    }}
                  >
                    Nuestros productos
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    {[1, 2].map((item) => (
                      <div
                        key={item}
                        style={{
                          background: "white",
                          borderRadius: "12px",
                          overflow: "hidden",
                          border:
                            "1px solid rgba(0,0,0,0.07)",
                        }}
                      >
                        <div
                          style={{
                            height: "75px",
                            background: "#eeeeee",
                          }}
                        />

                        <div
                          style={{
                            padding: "10px",
                          }}
                        >
                          <div
                            style={{
                              height: "8px",
                              width: "75%",
                              background: "#ddd",
                              borderRadius: "10px",
                              marginBottom: "7px",
                            }}
                          />

                          <div
                            style={{
                              color:
                                colorPrincipal,
                              fontWeight: "800",
                              fontSize: "13px",
                            }}
                          >
                            $25.000
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    style={{
                      width: "100%",
                      marginTop: "16px",
                      border: "none",
                      borderRadius: "10px",
                      padding: "11px",
                      background:
                        colorPrincipal,
                      color: "white",
                      fontWeight: "800",
                    }}
                  >
                    Ver productos
                  </button>
                </div>
              </div>
            </div>

            {/* ERROR */}

            {mensaje && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "13px",
                  borderRadius: "10px",
                  background: "#ffeaea",
                  color: "#a33",
                  lineHeight: "1.4",
                }}
              >
                {mensaje}
              </div>
            )}

            {/* CREAR */}

            <button
              type="submit"
              disabled={guardando}
              style={{
                width: "100%",
                marginTop: "26px",
                border: "none",
                padding: "16px",
                borderRadius: "12px",
                background: colorPrincipal,
                color: "white",
                fontSize: "17px",
                fontWeight: "700",
                cursor: guardando
                  ? "not-allowed"
                  : "pointer",
                opacity: guardando ? 0.7 : 1,
                transition: "0.2s",
              }}
            >
              {guardando
                ? "Creando tu catálogo..."
                : "Crear mi catálogo"}
            </button>
          </form>

          <div
            style={{
              marginTop: "22px",
              paddingTop: "20px",
              borderTop: "1px solid #eee",
              color: "#777",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            El nombre y los colores que elijas podrán
            cambiarse después desde el administrador
            de tu catálogo.
          </div>
        </div>
      </div>
    </main>
  );
}
