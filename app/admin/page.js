"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [cliente, setCliente] =
    useState(null);

  const [tienda, setTienda] =
    useState(null);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [cerrando, setCerrando] =
    useState(false);

  const [subiendoLogo, setSubiendoLogo] =
    useState(false);

  const [previewLogo, setPreviewLogo] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [copiado, setCopiado] =
    useState(false);

  const [editando, setEditando] =
    useState(false);

  const [
    nombreEditado,
    setNombreEditado,
  ] = useState("");

  const [
    whatsappEditado,
    setWhatsappEditado,
  ] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  /* =========================================
     CARGAR DATOS
  ========================================= */

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    try {
      // 1. Verificar sesión por WhatsApp
      const sesionResponse =
        await fetch(
          "/api/auth/sesion",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const sesionData =
        await sesionResponse.json();

      if (
        !sesionResponse.ok ||
        !sesionData.autenticado
      ) {
        router.replace("/login");
        return;
      }

      // 2. Si todavía no tiene tienda
      if (
        !sesionData.cliente?.tienda_id
      ) {
        router.replace(
          "/crear-tienda"
        );

        return;
      }

      // 3. Cargar tienda
      const tiendaResponse =
        await fetch(
          "/api/tiendas/mi-tienda",
          {
            method: "GET",
            cache: "no-store",
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

        setCargando(false);
        return;
      }

      setCliente(
        tiendaData.cliente
      );

      setTienda(
        tiendaData.tienda
      );

      setNombreEditado(
        tiendaData.tienda
          .nombre_tienda || ""
      );

      setWhatsappEditado(
        tiendaData.tienda
          .whatsapp || ""
      );

      setCargando(false);
    } catch (error) {
      console.error(
        "Error cargando administrador:",
        error
      );

      setMensaje(
        "No pudimos cargar tu catálogo."
      );

      setCargando(false);
    }
  }

  /* =========================================
     CERRAR SESIÓN
  ========================================= */

  async function cerrarSesion() {
    if (cerrando) return;

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

    router.replace("/login");
    router.refresh();
  }

  /* =========================================
     COPIAR ENLACE
  ========================================= */

  async function copiarEnlace() {
    if (!tienda) return;

    const enlace =
      `${window.location.origin}/${tienda.slug}`;

    try {
      await navigator.clipboard.writeText(
        enlace
      );

      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 2500);
    } catch (error) {
      setMensaje(
        "No se pudo copiar automáticamente el enlace."
      );
    }
  }

  /* =========================================
     VER CATÁLOGO
  ========================================= */

  function verCatalogo() {
    if (!tienda) return;

    window.open(
      `/${tienda.slug}`,
      "_blank"
    );
  }

  /* =========================================
     PRECIOS MAYORISTAS
  ========================================= */

  function verProductosYPrecios() {
    router.push(
      "/admin/productos"
    );
  }

  /* =========================================
     SUBIR LOGO
  ========================================= */

  async function subirLogo(e) {
    const archivo =
      e.target.files?.[0];

    if (!archivo) return;

    setMensaje("");

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type
      )
    ) {
      setMensaje(
        "El logo debe ser JPG, PNG o WEBP."
      );

      e.target.value = "";
      return;
    }

    if (
      archivo.size >
      2 * 1024 * 1024
    ) {
      setMensaje(
        "El logo no puede pesar más de 2 MB."
      );

      e.target.value = "";
      return;
    }

    // Vista previa inmediata
    const vistaPrevia =
      URL.createObjectURL(
        archivo
      );

    setPreviewLogo(
      vistaPrevia
    );

    setSubiendoLogo(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "logo",
        archivo
      );

      const response =
        await fetch(
          "/api/tiendas/logo",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setMensaje(
          data.mensaje ||
            "No pudimos subir el logo."
        );

        setPreviewLogo("");

        e.target.value = "";

        return;
      }

      setTienda(
        (actual) => ({
          ...actual,
          logo_url:
            data.logo_url,
        })
      );

      setPreviewLogo("");

      setMensaje(
        "✅ Logo actualizado correctamente."
      );
    } catch (error) {
      console.error(
        "Error subiendo logo:",
        error
      );

      setMensaje(
        "No pudimos subir el logo."
      );

      setPreviewLogo("");
    } finally {
      setSubiendoLogo(false);

      e.target.value = "";
    }
  }

  /* =========================================
     EDITAR DATOS
  ========================================= */

  function empezarEdicion() {
    if (!tienda) return;

    setNombreEditado(
      tienda.nombre_tienda || ""
    );

    setWhatsappEditado(
      tienda.whatsapp || ""
    );

    setMensaje("");

    setEditando(true);
  }

  function cancelarEdicion() {
    if (!tienda) return;

    setNombreEditado(
      tienda.nombre_tienda || ""
    );

    setWhatsappEditado(
      tienda.whatsapp || ""
    );

    setMensaje("");

    setEditando(false);
  }

  /* =========================================
     GUARDAR CAMBIOS
  ========================================= */

  async function guardarCambios(
    e
  ) {
    e.preventDefault();

    if (!tienda) return;

    setMensaje("");
    setGuardando(true);

    try {
      const response =
        await fetch(
          "/api/tiendas/mi-tienda",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              nombre_tienda:
                nombreEditado,

              whatsapp:
                whatsappEditado,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setMensaje(
          data.mensaje ||
            "No pudimos guardar los cambios."
        );

        return;
      }

      const tiendaActualizada =
        data.tienda;

      setTienda(
        tiendaActualizada
      );

      setNombreEditado(
        tiendaActualizada
          .nombre_tienda || ""
      );

      setWhatsappEditado(
        tiendaActualizada
          .whatsapp || ""
      );

      setEditando(false);

      setMensaje(
        "✅ Datos de la tienda actualizados correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  }

  /* =========================================
     MOSTRAR WHATSAPP
  ========================================= */

  function mostrarWhatsapp(
    numero
  ) {
    if (!numero) return "";

    let limpio =
      String(numero).replace(
        /\D/g,
        ""
      );

    if (
      limpio.startsWith("57") &&
      limpio.length === 12
    ) {
      limpio =
        limpio.slice(2);
    }

    if (
      limpio.length === 10
    ) {
      return (
        `+57 ` +
        `${limpio.slice(
          0,
          3
        )} ` +
        `${limpio.slice(
          3,
          6
        )} ` +
        `${limpio.slice(6)}`
      );
    }

    return numero;
  }

  /* =========================================
     CARGANDO
  ========================================= */

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",

          display: "flex",

          alignItems: "center",

          justifyContent:
            "center",

          background:
            "#fff8f6",

          padding: "20px",
        }}
      >
        <p
          style={{
            fontSize: "18px",

            color: "#666",
          }}
        >
          Cargando tu catálogo...
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",

        background:
          "#fff8f6",

        padding:
          "25px 18px 50px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",

          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "white",

            borderRadius: "20px",

            padding: "25px",

            boxShadow:
              "0 10px 35px rgba(0,0,0,0.08)",
          }}
        >
          {/* =========================
              ENCABEZADO
          ========================= */}

          <div
            style={{
              display: "flex",

              justifyContent:
                "space-between",

              alignItems:
                "flex-start",

              gap: "20px",

              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,

                  fontSize:
                    "32px",
                }}
              >
                Mi catálogo
              </h1>

              <p
                style={{
                  marginTop:
                    "8px",

                  marginBottom:
                    0,

                  color:
                    "#777",

                  fontSize:
                    "16px",
                }}
              >
                {cliente?.nombre
                  ? `Hola, ${cliente.nombre}`
                  : mostrarWhatsapp(
                      cliente?.telefono
                    )}
              </p>
            </div>

            <button
              type="button"

              onClick={
                cerrarSesion
              }

              disabled={
                cerrando
              }

              style={{
                border:
                  "1px solid #ddd",

                background:
                  "white",

                padding:
                  "11px 16px",

                borderRadius:
                  "10px",

                cursor:
                  cerrando
                    ? "not-allowed"
                    : "pointer",

                fontSize:
                  "15px",

                opacity:
                  cerrando
                    ? 0.6
                    : 1,
              }}
            >
              {cerrando
                ? "Cerrando..."
                : "Cerrar sesión"}
            </button>
          </div>

          {/* =========================
              MENSAJES
          ========================= */}

          {mensaje && (
            <div
              style={{
                marginTop:
                  "22px",

                padding:
                  "14px",

                borderRadius:
                  "10px",

                background:
                  mensaje.startsWith(
                    "✅"
                  )
                    ? "#eef9f1"
                    : "#ffeaea",

                color:
                  mensaje.startsWith(
                    "✅"
                  )
                    ? "#287a42"
                    : "#a33",

                lineHeight:
                  "1.5",
              }}
            >
              {mensaje}
            </div>
          )}

          {tienda && (
            <>
              {/* =========================
                  DATOS DE TIENDA
              ========================= */}

              {!editando && (
                <div
                  style={{
                    marginTop:
                      "30px",

                    padding:
                      "24px",

                    background:
                      "#f7f7f7",

                    borderRadius:
                      "16px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,

                      color:
                        "#777",

                      fontSize:
                        "14px",
                    }}
                  >
                    Tu tienda
                  </p>

                  <h2
                    style={{
                      marginTop:
                        "5px",

                      marginBottom:
                        "8px",

                      fontSize:
                        "27px",
                    }}
                  >
                    {
                      tienda.nombre_tienda
                    }
                  </h2>

                  <p
                    style={{
                      margin: 0,

                      color:
                        "#666",
                    }}
                  >
                    WhatsApp:{" "}
                    {mostrarWhatsapp(
                      tienda.whatsapp
                    )}
                  </p>

                  {/* =========================
                      LOGO
                  ========================= */}

                  <div
                    style={{
                      marginTop:
                        "22px",

                      padding:
                        "20px",

                      borderRadius:
                        "14px",

                      background:
                        "white",

                      border:
                        "1px solid #eee",

                      textAlign:
                        "center",
                    }}
                  >
                    <p
                      style={{
                        marginTop:
                          0,

                        marginBottom:
                          "14px",

                        fontWeight:
                          "700",

                        fontSize:
                          "16px",
                      }}
                    >
                      Logo de tu tienda
                    </p>

                    <div
                      style={{
                        width:
                          "130px",

                        height:
                          "130px",

                        margin:
                          "0 auto 16px",

                        borderRadius:
                          "18px",

                        overflow:
                          "hidden",

                        border:
                          "1px solid #ddd",

                        background:
                          "#f7f7f7",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",
                      }}
                    >
                      {previewLogo ||
                      tienda.logo_url ? (
                        <img
                          src={
                            previewLogo ||
                            tienda.logo_url
                          }

                          alt="Logo de la tienda"

                          style={{
                            width:
                              "100%",

                            height:
                              "100%",

                            objectFit:
                              "cover",

                            display:
                              "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            textAlign:
                              "center",

                            color:
                              "#999",

                            fontSize:
                              "13px",

                            padding:
                              "10px",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "30px",

                              marginBottom:
                                "5px",
                            }}
                          >
                            🖼️
                          </div>

                          Sin logo
                        </div>
                      )}
                    </div>

                    <label
                      style={{
                        display:
                          "inline-block",

                        padding:
                          "12px 18px",

                        borderRadius:
                          "10px",

                        background:
                          "#222",

                        color:
                          "white",

                        fontWeight:
                          "700",

                        cursor:
                          subiendoLogo
                            ? "not-allowed"
                            : "pointer",

                        opacity:
                          subiendoLogo
                            ? 0.7
                            : 1,
                      }}
                    >
                      {subiendoLogo
                        ? "Subiendo..."
                        : tienda.logo_url
                          ? "📷 Cambiar logo"
                          : "📷 Subir logo"}

                      <input
                        type="file"

                        accept="image/jpeg,image/png,image/webp"

                        onChange={
                          subirLogo
                        }

                        disabled={
                          subiendoLogo
                        }

                        style={{
                          display:
                            "none",
                        }}
                      />
                    </label>

                    <p
                      style={{
                        marginTop:
                          "12px",

                        marginBottom:
                          0,

                        color:
                          "#888",

                        fontSize:
                          "12px",
                      }}
                    >
                      Elige una foto desde tu celular.
                      JPG, PNG o WEBP. Máximo 2 MB.
                    </p>
                  </div>

                  {/* BOTÓN EDITAR */}

                  <button
                    type="button"

                    onClick={
                      empezarEdicion
                    }

                    style={{
                      width:
                        "100%",

                      marginTop:
                        "18px",

                      border:
                        "1px solid #d97883",

                      padding:
                        "13px",

                      borderRadius:
                        "10px",

                      background:
                        "white",

                      color:
                        "#d97883",

                      fontSize:
                        "16px",

                      fontWeight:
                        "700",

                      cursor:
                        "pointer",
                    }}
                  >
                    ✏️ Editar datos de mi tienda
                  </button>
                </div>
              )}

              {/* =========================
                  EDICIÓN
              ========================= */}

              {editando && (
                <div
                  style={{
                    marginTop:
                      "30px",

                    padding:
                      "24px",

                    background:
                      "#f7f7f7",

                    borderRadius:
                      "16px",
                  }}
                >
                  <h2
                    style={{
                      marginTop:
                        0,

                      marginBottom:
                        "20px",

                      fontSize:
                        "24px",
                    }}
                  >
                    Editar datos de mi tienda
                  </h2>

                  <form
                    onSubmit={
                      guardarCambios
                    }
                  >
                    <label
                      style={{
                        fontWeight:
                          "600",
                      }}
                    >
                      Nombre de la tienda
                    </label>

                    <input
                      type="text"

                      value={
                        nombreEditado
                      }

                      onChange={(
                        e
                      ) =>
                        setNombreEditado(
                          e.target
                            .value
                        )
                      }

                      required

                      style={
                        estiloInput
                      }
                    />

                    <label
                      style={{
                        fontWeight:
                          "600",
                      }}
                    >
                      WhatsApp
                    </label>

                    <input
                      type="tel"

                      value={
                        whatsappEditado
                      }

                      onChange={(
                        e
                      ) =>
                        setWhatsappEditado(
                          e.target
                            .value
                        )
                      }

                      required

                      style={
                        estiloInput
                      }
                    />

                    <button
                      type="submit"

                      disabled={
                        guardando
                      }

                      style={{
                        width:
                          "100%",

                        border:
                          "none",

                        padding:
                          "14px",

                        borderRadius:
                          "10px",

                        background:
                          "#d97883",

                        color:
                          "white",

                        fontSize:
                          "16px",

                        fontWeight:
                          "700",

                        cursor:
                          guardando
                            ? "not-allowed"
                            : "pointer",

                        opacity:
                          guardando
                            ? 0.7
                            : 1,
                      }}
                    >
                      {guardando
                        ? "Guardando..."
                        : "💾 Guardar cambios"}
                    </button>

                    <button
                      type="button"

                      onClick={
                        cancelarEdicion
                      }

                      disabled={
                        guardando
                      }

                      style={{
                        width:
                          "100%",

                        marginTop:
                          "10px",

                        border:
                          "1px solid #ddd",

                        padding:
                          "14px",

                        borderRadius:
                          "10px",

                        background:
                          "white",

                        color:
                          "#666",

                        fontSize:
                          "16px",

                        fontWeight:
                          "600",

                        cursor:
                          "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </form>
                </div>
              )}

              {/* =========================
                  PRECIOS MAYORISTAS
              ========================= */}

              <div
                style={{
                  marginTop:
                    "20px",

                  padding:
                    "24px",

                  background:
                    "#222",

                  color:
                    "white",

                  borderRadius:
                    "16px",
                }}
              >
                <h2
                  style={{
                    marginTop:
                      0,

                    marginBottom:
                      "8px",

                    fontSize:
                      "22px",
                  }}
                >
                  Tus precios de mayorista
                </h2>

                <p
                  style={{
                    marginTop:
                      0,

                    marginBottom:
                      "18px",

                    color:
                      "#ddd",

                    lineHeight:
                      "1.5",
                  }}
                >
                  Consulta tu costo, el precio sugerido de venta y la ganancia de cada producto.
                </p>

                <button
                  type="button"

                  onClick={
                    verProductosYPrecios
                  }

                  style={{
                    width:
                      "100%",

                    border:
                      "none",

                    padding:
                      "15px",

                    borderRadius:
                      "10px",

                    background:
                      "#d97883",

                    color:
                      "white",

                    fontSize:
                      "16px",

                    fontWeight:
                      "700",

                    cursor:
                      "pointer",
                  }}
                >
                  💰 Ver productos y precios
                </button>
              </div>

              {/* =========================
                  ENLACE CATÁLOGO
              ========================= */}

              <div
                style={{
                  marginTop:
                    "20px",

                  padding:
                    "24px",

                  border:
                    "1px solid #eee",

                  borderRadius:
                    "16px",
                }}
              >
                <h2
                  style={{
                    marginTop:
                      0,

                    marginBottom:
                      "8px",

                    fontSize:
                      "22px",
                  }}
                >
                  Enlace de tu catálogo
                </h2>

                <p
                  style={{
                    color:
                      "#666",

                    lineHeight:
                      "1.5",

                    marginTop:
                      0,
                  }}
                >
                  Este es el enlace que debes compartir con tus clientes para que puedan ver tus productos y el precio de venta.
                </p>

                <div
                  style={{
                    background:
                      "#f7f7f7",

                    padding:
                      "14px",

                    borderRadius:
                      "10px",

                    wordBreak:
                      "break-all",

                    fontWeight:
                      "600",

                    marginTop:
                      "15px",
                  }}
                >
                  {typeof window !==
                  "undefined"
                    ? `${window.location.origin}/${tienda.slug}`
                    : `/${tienda.slug}`}
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",

                    gap:
                      "10px",

                    marginTop:
                      "14px",
                  }}
                >
                  <button
                    type="button"

                    onClick={
                      copiarEnlace
                    }

                    style={{
                      border:
                        "none",

                      padding:
                        "14px",

                      borderRadius:
                        "10px",

                      background:
                        copiado
                          ? "#50a773"
                          : "#d97883",

                      color:
                        "white",

                      fontSize:
                        "16px",

                      fontWeight:
                        "700",

                      cursor:
                        "pointer",
                    }}
                  >
                    {copiado
                      ? "✓ Enlace copiado"
                      : "📋 Copiar enlace"}
                  </button>

                  <button
                    type="button"

                    onClick={
                      verCatalogo
                    }

                    style={{
                      border:
                        "1px solid #d97883",

                      padding:
                        "14px",

                      borderRadius:
                        "10px",

                      background:
                        "white",

                      color:
                        "#d97883",

                      fontSize:
                        "16px",

                      fontWeight:
                        "700",

                      cursor:
                        "pointer",
                    }}
                  >
                    👁️ Ver mi catálogo
                  </button>
                </div>
              </div>

              {/* =========================
                  INFORMACIÓN
              ========================= */}

              <div
                style={{
                  marginTop:
                    "20px",

                  padding:
                    "20px",

                  background:
                    "#fff8f6",

                  borderRadius:
                    "16px",

                  lineHeight:
                    "1.5",
                }}
              >
                <strong>
                  Tu catálogo está listo para compartir.
                </strong>

                <p
                  style={{
                    color:
                      "#666",

                    marginBottom:
                      0,
                  }}
                >
                  Los productos del catálogo son administrados por la plataforma. Desde aquí puedes consultar tus precios, actualizar los datos de tu tienda, subir tu logo y compartir tu catálogo con tus clientes.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const estiloInput = {
  width: "100%",

  padding: "14px",

  marginTop: "7px",

  marginBottom: "18px",

  borderRadius: "10px",

  border: "1px solid #ddd",

  fontSize: "16px",

  boxSizing: "border-box",
};
