"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import EditorTienda from "./components/EditorTienda";
import PanelAnuncios from "./components/PanelAnuncios";
import CompartirCatalogo from "./components/CompartirCatalogo";

export default function AdminPage() {
  const router =
    useRouter();

  const [
    cliente,
    setCliente,
  ] = useState(null);

  const [
    tienda,
    setTienda,
  ] = useState(null);

  const [
    anuncios,
    setAnuncios,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    cargandoAnuncios,
    setCargandoAnuncios,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    cerrando,
    setCerrando,
  ] = useState(false);

  const [
    seccionActiva,
    setSeccionActiva,
  ] = useState("inicio");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    try {
      /* SESIÓN */

      const sesionResponse =
        await fetch(
          "/api/auth/sesion",
          {
            method: "GET",
            cache:
              "no-store",
          }
        );

      const sesionData =
        await sesionResponse.json();

      if (
        !sesionResponse.ok ||
        !sesionData.autenticado
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      if (
        !sesionData.cliente
          ?.tienda_id
      ) {
        router.replace(
          "/crear-tienda"
        );

        return;
      }

      /* TIENDA */

      const tiendaResponse =
        await fetch(
          "/api/tiendas/mi-tienda",
          {
            method: "GET",
            cache:
              "no-store",
          }
        );

      const tiendaData =
        await tiendaResponse.json();

      if (
        tiendaData.necesita_tienda
      ) {
        router.replace(
          "/crear-tienda"
        );

        return;
      }

      if (
        !tiendaResponse.ok ||
        !tiendaData.ok
      ) {
        setMensaje(
          tiendaData.mensaje ||
            "No pudimos cargar tu tienda."
        );

        return;
      }

      setCliente(
        tiendaData.cliente ||
          sesionData.cliente
      );

      setTienda(
        tiendaData.tienda
      );

      await cargarAnuncios(
        false
      );
    } catch (error) {
      console.error(
        "Error cargando admin:",
        error
      );

      setMensaje(
        "No pudimos cargar tu catálogo."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarAnuncios(
    mostrarCarga = true
  ) {
    if (mostrarCarga) {
      setCargandoAnuncios(
        true
      );
    }

    try {
      const response =
        await fetch(
          "/api/anuncios",
          {
            method: "GET",
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        console.error(
          "No se pudieron cargar anuncios",
          data
        );

        return;
      }

      setAnuncios(
        Array.isArray(
          data.anuncios
        )
          ? data.anuncios
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando anuncios:",
        error
      );
    } finally {
      if (mostrarCarga) {
        setCargandoAnuncios(
          false
        );
      }
    }
  }

  async function cerrarSesion() {
    if (cerrando) {
      return;
    }

    setCerrando(true);

    try {
      await fetch(
        "/api/auth/cerrar-sesion",
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error(error);
    }

    router.replace(
      "/login"
    );

    router.refresh();
  }

  function verCatalogo() {
    if (!tienda) {
      return;
    }

    window.open(
      `/${tienda.slug}`,
      "_blank"
    );
  }

  function verProductos() {
    router.push(
      "/admin/productos"
    );
  }

  if (cargando) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          background:
            "#f7f7f8",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            textAlign:
              "center",
            color: "#777",
          }}
        >
          <div
            style={{
              fontSize:
                "30px",
              marginBottom:
                "10px",
            }}
          >
            ✨
          </div>

          Cargando tu
          catálogo...
        </div>
      </main>
    );
  }

  if (!tienda) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding: "25px",
          background:
            "#f7f7f8",
        }}
      >
        <div
          style={{
            background:
              "#fff",
            borderRadius:
              "18px",
            padding: "22px",
            maxWidth:
              "450px",
          }}
        >
          {mensaje ||
            "No pudimos cargar la tienda."}
        </div>
      </main>
    );
  }

  const anunciosActivos =
    anuncios.filter(
      (anuncio) =>
        anuncio.activo
    );

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f7f7f8",
        paddingBottom:
          "50px",
      }}
    >
      {/* =====================================
          ENCABEZADO
      ====================================== */}

      <header
        style={{
          position:
            "sticky",
          top: 0,
          zIndex: 20,
          background:
            "rgba(255,255,255,.96)",
          backdropFilter:
            "blur(14px)",
          borderBottom:
            "1px solid #eeeeee",
        }}
      >
        <div
          style={{
            maxWidth:
              "760px",
            margin:
              "0 auto",
            padding:
              "14px 18px",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#999",
                fontSize:
                  "10px",
                fontWeight:
                  "800",
                letterSpacing:
                  ".7px",
              }}
            >
              MI NEGOCIO
            </div>

            <div
              style={{
                marginTop:
                  "2px",
                fontSize:
                  "21px",
                fontWeight:
                  "900",
                color:
                  "#222",
              }}
            >
              Mi catálogo
            </div>
          </div>

          <button
            type="button"
            onClick={
              verCatalogo
            }
            style={{
              border:
                "none",
              background:
                "#222",
              color:
                "#fff",
              padding:
                "10px 13px",
              borderRadius:
                "11px",
              fontWeight:
                "800",
              fontSize:
                "12px",
              cursor:
                "pointer",
            }}
          >
            👁 Ver catálogo
          </button>
        </div>
      </header>

      <div
        style={{
          maxWidth:
            "760px",
          margin: "0 auto",
          padding:
            "18px",
          boxSizing:
            "border-box",
        }}
      >
        {/* MENSAJE */}

        {mensaje && (
          <div
            style={{
              marginBottom:
                "14px",
              padding:
                "13px 15px",
              borderRadius:
                "13px",
              background:
                mensaje.startsWith(
                  "✅"
                )
                  ? "#edf8f0"
                  : "#ffeded",
              color:
                mensaje.startsWith(
                  "✅"
                )
                  ? "#2f7945"
                  : "#9e4545",
              fontSize:
                "13px",
              fontWeight:
                "700",
              lineHeight:
                "1.45",
            }}
          >
            {mensaje}
          </div>
        )}

        {/* =====================================
            TARJETA TIENDA
        ====================================== */}

        <TarjetaTienda
          tienda={tienda}
          onEditar={() =>
            setSeccionActiva(
              "tienda"
            )
          }
          onVer={
            verCatalogo
          }
        />

        {/* =====================================
            NAVEGACIÓN
        ====================================== */}

        <div
          style={{
            display: "flex",
            gap: "7px",
            overflowX:
              "auto",
            padding:
              "3px 0 5px",
            margin:
              "15px 0 17px",
            scrollbarWidth:
              "none",
          }}
        >
          <BotonNavegacion
            activo={
              seccionActiva ===
              "inicio"
            }
            onClick={() =>
              setSeccionActiva(
                "inicio"
              )
            }
          >
            Inicio
          </BotonNavegacion>

          <BotonNavegacion
            activo={
              seccionActiva ===
              "tienda"
            }
            onClick={() =>
              setSeccionActiva(
                "tienda"
              )
            }
          >
            Mi tienda
          </BotonNavegacion>

          <BotonNavegacion
            activo={
              seccionActiva ===
              "anuncios"
            }
            onClick={() =>
              setSeccionActiva(
                "anuncios"
              )
            }
          >
            Avisos
          </BotonNavegacion>

          <BotonNavegacion
            activo={
              seccionActiva ===
              "compartir"
            }
            onClick={() =>
              setSeccionActiva(
                "compartir"
              )
            }
          >
            Compartir
          </BotonNavegacion>
        </div>

        {/* =====================================
            INICIO
        ====================================== */}

        {seccionActiva ===
          "inicio" && (
          <>
            <div
              style={{
                marginBottom:
                  "12px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    "20px",
                  color:
                    "#222",
                }}
              >
                Hola
                {cliente?.nombre
                  ? `, ${cliente.nombre}`
                  : ""}
              </h2>

              <p
                style={{
                  margin:
                    "4px 0 0",
                  color:
                    "#888",
                  fontSize:
                    "13px",
                }}
              >
                ¿Qué quieres
                hacer hoy?
              </p>
            </div>

            {/* ACCESOS */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap:
                  "10px",
                marginBottom:
                  "18px",
              }}
            >
              <AccesoRapido
                icono="💰"
                titulo="Productos"
                texto="Precios y ganancias"
                onClick={
                  verProductos
                }
              />

              <AccesoRapido
                icono="📢"
                titulo="Avisos"
                texto={`${anuncios.length} creados`}
                onClick={() =>
                  setSeccionActiva(
                    "anuncios"
                  )
                }
              />

              <AccesoRapido
                icono="🎨"
                titulo="Diseño"
                texto="Logo y colores"
                onClick={() =>
                  setSeccionActiva(
                    "tienda"
                  )
                }
              />

              <AccesoRapido
                icono="🔗"
                titulo="Compartir"
                texto="Enlace del catálogo"
                onClick={() =>
                  setSeccionActiva(
                    "compartir"
                  )
                }
              />
            </div>

            {/* AVISOS ACTIVOS */}

            <div
              style={{
                background:
                  "#fff",
                border:
                  "1px solid #e9e9e9",
                borderRadius:
                  "19px",
                padding:
                  "19px",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,.035)",
                marginBottom:
                  "14px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  gap:
                    "10px",
                  alignItems:
                    "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "17px",
                      fontWeight:
                        "900",
                    }}
                  >
                    Avisos
                    activos
                  </div>

                  <div
                    style={{
                      marginTop:
                        "3px",
                      color:
                        "#888",
                      fontSize:
                        "11px",
                    }}
                  >
                    Lo que ven
                    tus clientes.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSeccionActiva(
                      "anuncios"
                    )
                  }
                  style={{
                    border:
                      "none",
                    background:
                      "transparent",
                    color:
                      "#c16c77",
                    fontWeight:
                      "800",
                    cursor:
                      "pointer",
                  }}
                >
                  Administrar
                </button>
              </div>

              <div
                style={{
                  marginTop:
                    "14px",
                }}
              >
                {anunciosActivos.length ===
                0 ? (
                  <div
                    style={{
                      background:
                        "#f7f7f7",
                      borderRadius:
                        "12px",
                      padding:
                        "17px",
                      textAlign:
                        "center",
                      color:
                        "#999",
                      fontSize:
                        "12px",
                    }}
                  >
                    No tienes
                    avisos
                    publicados.
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",
                      gap:
                        "8px",
                    }}
                  >
                    {anunciosActivos
                      .slice(0, 2)
                      .map(
                        (
                          anuncio
                        ) => (
                          <AnuncioResumen
                            key={
                              anuncio.id
                            }
                            anuncio={
                              anuncio
                            }
                          />
                        )
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* PRODUCTOS */}

            <button
              type="button"
              onClick={
                verProductos
              }
              style={{
                width: "100%",
                border:
                  "1px solid #e9e9e9",
                background:
                  "#fff",
                borderRadius:
                  "19px",
                padding:
                  "18px",
                display: "flex",
                alignItems:
                  "center",
                gap:
                  "13px",
                textAlign:
                  "left",
                cursor:
                  "pointer",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,.035)",
              }}
            >
              <div
                style={{
                  width:
                    "46px",
                  height:
                    "46px",
                  borderRadius:
                    "14px",
                  background:
                    "#fff0f2",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize:
                    "21px",
                  flexShrink:
                    0,
                }}
              >
                💰
              </div>

              <div
                style={{
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize:
                      "16px",
                    fontWeight:
                      "900",
                    color:
                      "#222",
                  }}
                >
                  Productos y
                  precios
                </div>

                <div
                  style={{
                    marginTop:
                      "3px",
                    color:
                      "#888",
                    fontSize:
                      "12px",
                  }}
                >
                  Costos,
                  precios
                  sugeridos y
                  ganancias.
                </div>
              </div>

              <div
                style={{
                  width:
                    "36px",
                  height:
                    "36px",
                  borderRadius:
                    "50%",
                  background:
                    "#f5f5f5",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color:
                    "#555",
                  fontSize:
                    "18px",
                }}
              >
                →
              </div>
            </button>
          </>
        )}

        {/* =====================================
            MI TIENDA
        ====================================== */}

        {seccionActiva ===
          "tienda" && (
          <EditorTienda
            tienda={tienda}
            onActualizada={
              setTienda
            }
            setMensaje={
              setMensaje
            }
            onCancelar={() =>
              setSeccionActiva(
                "inicio"
              )
            }
          />
        )}

        {/* =====================================
            ANUNCIOS
        ====================================== */}

        {seccionActiva ===
          "anuncios" && (
          <PanelAnuncios
            anuncios={
              anuncios
            }
            cargando={
              cargandoAnuncios
            }
            recargar={() =>
              cargarAnuncios(
                true
              )
            }
            setMensaje={
              setMensaje
            }
          />
        )}

        {/* =====================================
            COMPARTIR
        ====================================== */}

        {seccionActiva ===
          "compartir" && (
          <CompartirCatalogo
            tienda={tienda}
            onVerCatalogo={
              verCatalogo
            }
          />
        )}

        {/* CERRAR SESIÓN */}

        <div
          style={{
            marginTop:
              "35px",
            textAlign:
              "center",
          }}
        >
          <button
            type="button"
            onClick={
              cerrarSesion
            }
            disabled={
              cerrando
            }
            style={{
              border: "none",
              background:
                "transparent",
              color: "#999",
              padding:
                "10px",
              fontSize:
                "12px",
              fontWeight:
                "700",
              cursor:
                "pointer",
            }}
          >
            {cerrando
              ? "Cerrando sesión..."
              : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </main>
  );
}

/* =====================================
   COMPONENTES PEQUEÑOS
===================================== */

function TarjetaTienda({
  tienda,
  onEditar,
  onVer,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border:
          "1px solid #e8e8e8",
        borderRadius: "21px",
        padding: "18px",
        boxShadow:
          "0 5px 18px rgba(0,0,0,.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius:
              "18px",
            border:
              "1px solid #eee",
            overflow: "hidden",
            background:
              "#fafafa",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            flexShrink: 0,
          }}
        >
          {tienda.logo_url ? (
            <img
              src={
                tienda.logo_url
              }
              alt="Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit:
                  "contain",
              }}
            />
          ) : (
            <span
              style={{
                fontSize:
                  "27px",
              }}
            >
              🏪
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "6px",
              marginBottom:
                "4px",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius:
                  "50%",
                background:
                  "#42a85b",
              }}
            />

            <span
              style={{
                color:
                  "#4c925d",
                fontSize:
                  "10px",
                fontWeight:
                  "800",
              }}
            >
              CATÁLOGO
              PUBLICADO
            </span>
          </div>

          <div
            style={{
              fontSize:
                "20px",
              lineHeight:
                "1.2",
              fontWeight:
                "900",
              color: "#222",
              overflowWrap:
                "anywhere",
            }}
          >
            {
              tienda.nombre_tienda
            }
          </div>

          {tienda.mensaje_portada && (
            <div
              style={{
                marginTop:
                  "5px",
                color: "#888",
                fontSize:
                  "11px",
                lineHeight:
                  "1.35",
              }}
            >
              {
                tienda.mensaje_portada
              }
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "8px",
          marginTop:
            "16px",
        }}
      >
        <button
          type="button"
          onClick={
            onEditar
          }
          style={{
            border:
              "none",
            background:
              "#d97883",
            color: "#fff",
            padding:
              "12px 8px",
            borderRadius:
              "11px",
            fontSize:
              "13px",
            fontWeight:
              "800",
            cursor:
              "pointer",
          }}
        >
          ✏️ Editar tienda
        </button>

        <button
          type="button"
          onClick={onVer}
          style={{
            border:
              "1px solid #e1e1e1",
            background:
              "#fff",
            color: "#555",
            padding:
              "12px 8px",
            borderRadius:
              "11px",
            fontSize:
              "13px",
            fontWeight:
              "800",
            cursor:
              "pointer",
          }}
        >
          👁 Vista cliente
        </button>
      </div>
    </div>
  );
}

function BotonNavegacion({
  activo,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        border: activo
          ? "1px solid #d97883"
          : "1px solid #e3e3e3",
        background: activo
          ? "#fff0f2"
          : "#fff",
        color: activo
          ? "#b9616c"
          : "#666",
        borderRadius:
          "999px",
        padding:
          "9px 14px",
        fontSize: "12px",
        fontWeight: "800",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function AccesoRapido({
  icono,
  titulo,
  texto,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border:
          "1px solid #e9e9e9",
        background: "#fff",
        borderRadius: "18px",
        padding: "16px",
        textAlign: "left",
        cursor: "pointer",
        boxShadow:
          "0 4px 14px rgba(0,0,0,.03)",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius:
            "13px",
          background:
            "#fff0f2",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontSize: "20px",
          marginBottom:
            "11px",
        }}
      >
        {icono}
      </div>

      <div
        style={{
          color: "#222",
          fontSize: "15px",
          fontWeight: "900",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          color: "#999",
          fontSize: "10px",
          marginTop: "3px",
        }}
      >
        {texto}
      </div>
    </button>
  );
}

function AnuncioResumen({
  anuncio,
}) {
  let icono = "📢";

  if (
    anuncio.tipo ===
    "NOVEDAD"
  ) {
    icono = "✨";
  }

  if (
    anuncio.tipo ===
    "URGENTE"
  ) {
    icono = "⚠️";
  }

  return (
    <div
      style={{
        background:
          anuncio.color_fondo ||
          "#fff4d6",
        color:
          anuncio.color_texto ||
          "#111",
        padding:
          "12px 13px",
        borderRadius:
          "12px",
        display: "flex",
        alignItems:
          "flex-start",
        gap: "8px",
      }}
    >
      <span>{icono}</span>

      <div>
        <div
          style={{
            fontSize:
              "12px",
            fontWeight:
              "900",
          }}
        >
          {anuncio.titulo}
        </div>

        {anuncio.mensaje && (
          <div
            style={{
              marginTop:
                "2px",
              fontSize:
                "11px",
              lineHeight:
                "1.35",
              opacity:
                0.78,
            }}
          >
            {anuncio.mensaje}
          </div>
        )}
      </div>
    </div>
  );
}