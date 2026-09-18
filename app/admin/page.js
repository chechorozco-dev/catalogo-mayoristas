"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
const PALETAS_COLORES = [
  {
    nombre: "Elegante",
    principal: "#111111",
    fondo: "#FFFFFF",
  },
  {
    nombre: "Rosa",
    principal: "#B85C72",
    fondo: "#FFF1F4",
  },
  {
    nombre: "Dorado",
    principal: "#A67C32",
    fondo: "#FFF8E8",
  },
  {
    nombre: "Lila",
    principal: "#7656A8",
    fondo: "#F5F0FF",
  },
  {
    nombre: "Azul",
    principal: "#244A73",
    fondo: "#F0F6FC",
  },
  {
    nombre: "Verde",
    principal: "#47735A",
    fondo: "#F0F7F2",
  },
];
function obtenerColorTexto(hex = "#000000") {
  const color = String(hex).replace("#", "");

  if (color.length !== 6) {
    return "#FFFFFF";
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const luminosidad =
    (r * 299 + g * 587 + b * 114) / 1000;

  return luminosidad > 160
    ? "#111111"
    : "#FFFFFF";
}
export default function AdminPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState(null);
  const [tienda, setTienda] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const [previewLogo, setPreviewLogo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);

  const [nombreEditado, setNombreEditado] = useState("");
  const [whatsappEditado, setWhatsappEditado] = useState("");
  const [mensajePortada, setMensajePortada] = useState("");
  const [instagram, setInstagram] = useState("");
const [facebook, setFacebook] = useState("");
const [tiktok, setTiktok] = useState("");

const [colorPrincipal, setColorPrincipal] = useState("#000000");
const [colorFondo, setColorFondo] = useState("#FFFFFF");
const colorTextoPrincipal =
  obtenerColorTexto(colorPrincipal);

const colorTextoFondo =
  obtenerColorTexto(colorFondo);
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
      const sesionResponse = await fetch(
        "/api/auth/sesion",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const sesionData = await sesionResponse.json();

      if (
        !sesionResponse.ok ||
        !sesionData.autenticado
      ) {
        router.replace("/login");
        return;
      }

      if (!sesionData.cliente?.tienda_id) {
        router.replace("/crear-tienda");
        return;
      }

      const tiendaResponse = await fetch(
        "/api/tiendas/mi-tienda",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const tiendaData = await tiendaResponse.json();

      if (tiendaData.necesita_tienda) {
        router.replace("/crear-tienda");
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

      setCliente(tiendaData.cliente);
      setTienda(tiendaData.tienda);

      setNombreEditado(
        tiendaData.tienda.nombre_tienda || ""
      );

      setWhatsappEditado(
        tiendaData.tienda.whatsapp || ""
      );
setColorPrincipal(
  tiendaData.tienda.color_principal || "#000000"
);
setInstagram(
  tiendaData.tienda.instagram || ""
);

setFacebook(
  tiendaData.tienda.facebook || ""
);

setTiktok(
  tiendaData.tienda.tiktok || ""
);
setColorFondo(
  tiendaData.tienda.color_fondo || "#FFFFFF"
);
      setMensajePortada(
  tiendaData.tienda.mensaje_portada || ""
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
     VER PRECIOS
  ========================================= */

  function verProductosYPrecios() {
    router.push("/admin/productos");
  }

  /* =========================================
     COMPRIMIR IMAGEN
  ========================================= */

  async function comprimirImagen(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();

      lector.onload = (evento) => {
        const imagen = new Image();

        imagen.onload = () => {
          const canvas =
            document.createElement("canvas");

          const MAXIMO = 1200;

          let ancho = imagen.width;
          let alto = imagen.height;

          if (
            ancho > alto &&
            ancho > MAXIMO
          ) {
            alto = Math.round(
              (alto * MAXIMO) / ancho
            );

            ancho = MAXIMO;
          } else if (
            alto >= ancho &&
            alto > MAXIMO
          ) {
            ancho = Math.round(
              (ancho * MAXIMO) / alto
            );

            alto = MAXIMO;
          }

          canvas.width = ancho;
          canvas.height = alto;

          const contexto =
            canvas.getContext("2d");

          if (!contexto) {
            reject(
              new Error(
                "No pudimos procesar la imagen."
              )
            );

            return;
          }

          contexto.drawImage(
            imagen,
            0,
            0,
            ancho,
            alto
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    "No pudimos comprimir la imagen."
                  )
                );

                return;
              }

              const archivoComprimido =
                new File(
                  [blob],
                  `logo-${Date.now()}.webp`,
                  {
                    type: "image/webp",
                  }
                );

              resolve(
                archivoComprimido
              );
            },
            "image/webp",
            0.82
          );
        };

        imagen.onerror = () => {
          reject(
            new Error(
              "No pudimos leer la imagen."
            )
          );
        };

        imagen.src =
          evento.target.result;
      };

      lector.onerror = () => {
        reject(
          new Error(
            "No pudimos leer el archivo."
          )
        );
      };

      lector.readAsDataURL(archivo);
    });
  }

  /* =========================================
     SUBIR LOGO
  ========================================= */

  async function subirLogo(e) {
    const archivoOriginal =
      e.target.files?.[0];

    if (!archivoOriginal) return;

    setMensaje("");
    setSubiendoLogo(true);

    try {
      if (
        !archivoOriginal.type.startsWith(
          "image/"
        )
      ) {
        setMensaje(
          "Selecciona una imagen válida."
        );

        return;
      }

      /*
        Permitimos elegir fotos grandes.
        Luego la reducimos automáticamente.
      */

      let archivoFinal =
        archivoOriginal;

      try {
        archivoFinal =
          await comprimirImagen(
            archivoOriginal
          );
      } catch (error) {
        console.error(
          "No se pudo comprimir:",
          error
        );

        /*
          Si por alguna razón el navegador
          no puede comprimirla, intentamos
          usar el archivo original.
        */

        archivoFinal =
          archivoOriginal;
      }

      /*
        Esta es solo una segunda protección.
        Normalmente después de comprimir,
        el logo pesará mucho menos.
      */

      if (
        archivoFinal.size >
        5 * 1024 * 1024
      ) {
        setMensaje(
          "La imagen sigue siendo demasiado pesada. Prueba con otra foto."
        );

        return;
      }

      if (previewLogo) {
        URL.revokeObjectURL(
          previewLogo
        );
      }

      const vistaPrevia =
        URL.createObjectURL(
          archivoFinal
        );

      setPreviewLogo(
        vistaPrevia
      );

      const formData =
        new FormData();

      formData.append(
        "logo",
        archivoFinal
      );

      const response =
        await fetch(
          "/api/tiendas/logo",
          {
            method: "POST",
            body: formData,
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch (error) {
        console.error(
          "Respuesta inválida:",
          error
        );
      }

      if (
        !response.ok ||
        !data.ok
      ) {
        setMensaje(
          data.mensaje ||
            "No pudimos subir el logo."
        );

        setPreviewLogo("");

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
        "No pudimos procesar la foto. Prueba con otra imagen."
      );

      setPreviewLogo("");
    } finally {
      setSubiendoLogo(false);

      if (e.target) {
        e.target.value = "";
      }
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

  setColorPrincipal(
    tienda.color_principal || "#000000"
  );

  setColorFondo(
    tienda.color_fondo || "#FFFFFF"
  );
    setMensajePortada(
  tienda.mensaje_portada || ""
);
    setInstagram(tienda.instagram || "");
setFacebook(tienda.facebook || "");
setTiktok(tienda.tiktok || "");

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

  setColorPrincipal(
    tienda.color_principal || "#000000"
  );

  setColorFondo(
    tienda.color_fondo || "#FFFFFF"
  );
setMensajePortada(
  tienda.mensaje_portada || ""
);
 setInstagram(tienda?.instagram || "");
setFacebook(tienda?.facebook || "");
setTiktok(tienda?.tiktok || "");
  setMensaje("");
  setEditando(false);
}
  /* =========================================
     GUARDAR CAMBIOS
  ========================================= */

  async function guardarCambios(e) {
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

  color_principal:
    colorPrincipal,

  color_fondo:
    colorFondo,

  mensaje_portada:
    mensajePortada,
            instagram,
facebook,
tiktok,
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
        tiendaActualizada.nombre_tienda ||
          ""
      );

      setWhatsappEditado(
        tiendaActualizada.whatsapp ||
          ""
      );
setColorPrincipal(
  tiendaActualizada.color_principal || "#000000"
);

setColorFondo(
  tiendaActualizada.color_fondo || "#FFFFFF"
);
      setMensajePortada(
  tiendaActualizada.mensaje_portada || ""
);
      setInstagram(
  tiendaActualizada.instagram || ""
);

setFacebook(
  tiendaActualizada.facebook || ""
);

setTiktok(
  tiendaActualizada.tiktok || ""
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

  function mostrarWhatsapp(numero) {
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
        `${limpio.slice(0, 3)} ` +
        `${limpio.slice(3, 6)} ` +
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
          justifyContent: "center",
          background: "#fff8f6",
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
        background: "#fff8f6",
        padding: "25px 18px 50px",
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
          {/* ENCABEZADO */}

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
                  fontSize: "32px",
                }}
              >
                Mi catálogo
              </h1>

              <p
                style={{
                  marginTop: "8px",
                  marginBottom: 0,
                  color: "#777",
                  fontSize: "16px",
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

          {/* MENSAJE */}

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
              {!editando && (
  <div
    style={{
      marginTop: "24px",
      padding: "20px",
      background: "#f8f8f8",
      border: "1px solid #eeeeee",
      borderRadius: "18px",
    }}
  >
    {/* INFORMACIÓN PRINCIPAL */}

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* LOGO */}

      <div
        style={{
          width: "82px",
          height: "82px",
          flexShrink: 0,
          borderRadius: "18px",
          overflow: "hidden",
          background: "#ffffff",
          border: "1px solid #e2e2e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {previewLogo || tienda.logo_url ? (
          <img
            src={previewLogo || tienda.logo_url}
            alt="Logo de la tienda"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              fontSize: "11px",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "3px",
              }}
            >
              🖼️
            </div>

            Sin logo
          </div>
        )}
      </div>

      {/* NOMBRE Y WHATSAPP */}

      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            color: "#999",
            fontSize: "12px",
            fontWeight: "600",
            marginBottom: "4px",
          }}
        >
          TU TIENDA
        </div>

        <h2
          style={{
            margin: 0,
            color: "#222",
            fontSize: "23px",
            lineHeight: "1.2",
            overflowWrap: "anywhere",
          }}
        >
          {tienda.nombre_tienda}
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "7px",
            color: "#666",
            fontSize: "14px",
          }}
        >
          <span>💬</span>

          <span>
            {mostrarWhatsapp(tienda.whatsapp)}
          </span>
        </div>
      </div>
    </div>

    {/* SEPARADOR */}

    <div
      style={{
        height: "1px",
        background: "#e8e8e8",
        margin: "20px 0",
      }}
    />

    {/* ACCIONES */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: "10px",
      }}
    >
      {/* CAMBIAR LOGO */}

      <label
        style={{
          minHeight: "48px",
          padding: "11px 10px",
          borderRadius: "11px",
          background: "#222",
          color: "#fff",
          fontWeight: "700",
          fontSize: "14px",
          cursor: subiendoLogo
            ? "not-allowed"
            : "pointer",
          opacity: subiendoLogo ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          textAlign: "center",
        }}
      >
        <span>📷</span>

        <span>
          {subiendoLogo
            ? "Procesando..."
            : tienda.logo_url
              ? "Cambiar logo"
              : "Subir logo"}
        </span>

        <input
          type="file"
          accept="image/*"
          onChange={subirLogo}
          disabled={subiendoLogo}
          style={{
            display: "none",
          }}
        />
      </label>

      {/* EDITAR TIENDA */}

      <button
        type="button"
        onClick={empezarEdicion}
        style={{
          minHeight: "48px",
          border: "1px solid #d97883",
          padding: "11px 10px",
          borderRadius: "11px",
          background: "#ffffff",
          color: "#d97883",
          fontSize: "14px",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        ✏️ Editar tienda
      </button>
    </div>

    <p
      style={{
        margin: "13px 0 0",
        color: "#999",
        fontSize: "11px",
        lineHeight: "1.45",
        textAlign: "center",
      }}
    >
      Personaliza el nombre, logo y colores de la página
      que compartes con tus clientes.
    </p>
  </div>
)}

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
                
                    {/* =========================================
    INFORMACIÓN DE LA TIENDA
========================================= */}

<div
  style={{
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "18px",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "5px",
    }}
  >
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: "#fff0f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        flexShrink: 0,
      }}
    >
      🏪
    </div>

    <div>
      <div
        style={{
          fontSize: "17px",
          fontWeight: "800",
          color: "#222",
        }}
      >
        Información de mi tienda
      </div>

      <div
        style={{
          marginTop: "2px",
          fontSize: "12px",
          color: "#888",
        }}
      >
        Datos principales que verán tus clientes.
      </div>
    </div>
  </div>

  {/* NOMBRE */}

  <div
    style={{
      marginTop: "20px",
    }}
  >
    <label
      style={{
        display: "block",
        fontWeight: "700",
        fontSize: "14px",
        marginBottom: "2px",
      }}
    >
      Nombre de la tienda
    </label>

    <input
      type="text"
      value={nombreEditado}
      onChange={(e) =>
        setNombreEditado(e.target.value)
      }
      required
      style={estiloInput}
    />
  </div>

  {/* MENSAJE */}

  <div>
    <label
      style={{
        display: "block",
        fontWeight: "700",
        fontSize: "14px",
        marginBottom: "2px",
      }}
    >
      Mensaje de tu tienda
    </label>

    <textarea
      value={mensajePortada}
      onChange={(e) =>
        setMensajePortada(
          e.target.value.slice(0, 120)
        )
      }
      maxLength={120}
      rows={3}
      placeholder="Ej: ✨ Joyas que resaltan tu estilo"
      style={{
        ...estiloInput,
        minHeight: "88px",
        resize: "vertical",
        marginBottom: "6px",
        fontFamily: "inherit",
        lineHeight: "1.45",
      }}
    />

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "10px",
        color: "#888",
        fontSize: "11px",
        marginBottom: "18px",
      }}
    >
      <span>
        Aparecerá debajo del nombre de tu tienda.
      </span>

      <span
        style={{
          flexShrink: 0,
          fontWeight: "700",
        }}
      >
        {mensajePortada.length}/120
      </span>
    </div>
  </div>

  {/* WHATSAPP */}

  <div>
    <label
      style={{
        display: "block",
        fontWeight: "700",
        fontSize: "14px",
        marginBottom: "2px",
      }}
    >
      WhatsApp
    </label>

    <input
      type="tel"
      value={whatsappEditado}
      readOnly
      style={{
        ...estiloInput,
        marginBottom: "6px",
        background: "#f2f2f2",
        color: "#777",
        cursor: "not-allowed",
      }}
    />

    <div
      style={{
        display: "flex",
        gap: "5px",
        alignItems: "flex-start",
        color: "#888",
        fontSize: "11px",
        lineHeight: "1.4",
      }}
    >
      <span>🔒</span>

      <span>
        Este número está vinculado a tu cuenta y no puede modificarse.
      </span>
    </div>
  </div>
</div>


{/* =========================================
    REDES SOCIALES
========================================= */}

<div
  style={{
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "18px",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "5px",
    }}
  >
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: "#fff0f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        flexShrink: 0,
      }}
    >
      📱
    </div>

    <div>
      <div
        style={{
          fontSize: "17px",
          fontWeight: "800",
          color: "#222",
        }}
      >
        Redes sociales
      </div>

      <div
        style={{
          marginTop: "2px",
          fontSize: "12px",
          color: "#888",
        }}
      >
        Solo aparecerán las redes que configures.
      </div>
    </div>
  </div>

  {/* INSTAGRAM */}

  <div
    style={{
      marginTop: "20px",
    }}
  >
    <label
      style={{
        display: "block",
        fontWeight: "700",
        fontSize: "14px",
        marginBottom: "2px",
      }}
    >
      Instagram
    </label>

    <input
      type="text"
      value={instagram}
      onChange={(e) =>
        setInstagram(e.target.value)
      }
      placeholder="@mitienda"
      maxLength={200}
      style={estiloInput}
    />
  </div>

  {/* TIKTOK */}

  <div>
    <label
      style={{
        display: "block",
        fontWeight: "700",
        fontSize: "14px",
        marginBottom: "2px",
      }}
    >
      TikTok
    </label>

    <input
      type="text"
      value={tiktok}
      onChange={(e) =>
        setTiktok(e.target.value)
      }
      placeholder="@mitienda"
      maxLength={200}
      style={estiloInput}
    />
  </div>

  {/* FACEBOOK */}

  <div>
    <label
      style={{
        display: "block",
        fontWeight: "700",
        fontSize: "14px",
        marginBottom: "2px",
      }}
    >
      Facebook
    </label>

    <input
      type="text"
      value={facebook}
      onChange={(e) =>
        setFacebook(e.target.value)
      }
      placeholder="https://www.facebook.com/mitienda"
      maxLength={200}
      style={{
        ...estiloInput,
        marginBottom: "6px",
      }}
    />

    <div
      style={{
        color: "#888",
        fontSize: "11px",
        lineHeight: "1.4",
      }}
    >
      Pega el enlace completo de tu página o perfil de Facebook.
    </div>
  </div>
</div>
{/* PERSONALIZACIÓN DE COLORES */}

<div
  style={{
    marginTop: "8px",
    marginBottom: "22px",
    padding: "18px",
    background: "#ffffff",
    border: "1px solid #e5e5e5",
    borderRadius: "14px",
  }}
>
  <h3
    style={{
      margin: "0 0 6px",
      fontSize: "19px",
    }}
  >
    🎨 Colores de mi página
  </h3>

  <p
    style={{
      margin: "0 0 18px",
      color: "#777",
      fontSize: "14px",
      lineHeight: "1.5",
    }}
  >
    Personaliza el catálogo que compartes con tus clientes.
  </p>
{/* PALETAS PREDISEÑADAS */}

<div
  style={{
    marginBottom: "22px",
  }}
>
  <div
    style={{
      fontWeight: "700",
      marginBottom: "5px",
    }}
  >
    Combinaciones recomendadas
  </div>

  <div
    style={{
      color: "#888",
      fontSize: "13px",
      marginBottom: "12px",
    }}
  >
    Elige una combinación o personaliza los colores manualmente.
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(3, minmax(0, 1fr))",
      gap: "9px",
    }}
  >
    {PALETAS_COLORES.map((paleta) => {
      const seleccionada =
        colorPrincipal.toLowerCase() ===
          paleta.principal.toLowerCase() &&
        colorFondo.toLowerCase() ===
          paleta.fondo.toLowerCase();

      return (
        <button
          key={paleta.nombre}
          type="button"
          onClick={() => {
            setColorPrincipal(
              paleta.principal
            );

            setColorFondo(
              paleta.fondo
            );
          }}
          style={{
            padding: "10px 7px",
            borderRadius: "10px",
            border: seleccionada
              ? `2px solid ${paleta.principal}`
              : "1px solid #dddddd",
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "7px",
            }}
          >
            <div
              style={{
                width: "27px",
                height: "27px",
                borderRadius:
                  "50% 0 0 50%",
                background:
                  paleta.principal,
                border:
                  "1px solid rgba(0,0,0,0.12)",
              }}
            />

            <div
              style={{
                width: "27px",
                height: "27px",
                borderRadius:
                  "0 50% 50% 0",
                background:
                  paleta.fondo,
                border:
                  "1px solid rgba(0,0,0,0.12)",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#333333",
            }}
          >
            {paleta.nombre}
          </div>
        </button>
      );
    })}
  </div>
</div>
  {/* COLOR PRINCIPAL */}

  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "15px",
      marginBottom: "15px",
    }}
  >
    <div>
      <div style={{ fontWeight: "700" }}>
        Color principal
      </div>

      <div
        style={{
          color: "#888",
          fontSize: "13px",
          marginTop: "3px",
        }}
      >
        Botones y detalles
      </div>
    </div>

    <div
  style={{
    width: "64px",
    height: "52px",
    padding: "3px",
    border: "2px solid #d5d5d5",
    borderRadius: "14px",
    background: "#ffffff",
    boxSizing: "border-box",
  }}
>
  <input
    type="color"
    value={colorPrincipal}
    onChange={(e) =>
      setColorPrincipal(e.target.value)
    }
    style={{
      width: "100%",
      height: "100%",
      border: "none",
      padding: 0,
      background: "transparent",
      cursor: "pointer",
    }}
  />
</div>
</div>


  {/* COLOR DE FONDO */}

  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "15px",
    }}
  >
    <div>
      <div style={{ fontWeight: "700" }}>
        Color de fondo
      </div>

      <div
        style={{
          color: "#888",
          fontSize: "13px",
          marginTop: "3px",
        }}
      >
        Fondo general del catálogo
      </div>
    </div>

    <div
  style={{
    width: "64px",
    height: "52px",
    padding: "3px",
    border: "2px solid #d5d5d5",
    borderRadius: "14px",
    background: "#ffffff",
    boxSizing: "border-box",
  }}
>
  <input
    type="color"
    value={colorFondo}
    onChange={(e) =>
      setColorFondo(e.target.value)
    }
    style={{
      width: "100%",
      height: "100%",
      border: "none",
      padding: 0,
      background: "transparent",
      cursor: "pointer",
    }}
  />
</div>
  </div>

  {/* VISTA PREVIA */}

<div
  style={{
    marginTop: "22px",
  }}
>
  <div
    style={{
      fontWeight: "700",
      marginBottom: "8px",
    }}
  >
    Vista previa
  </div>

  <div
    style={{
      background: colorFondo,
      color: colorTextoFondo,
      border: "1px solid #ddd",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 5px 18px rgba(0,0,0,0.08)",
    }}
  >
    {/* MINI ENCABEZADO */}

    <div
      style={{
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        borderBottom: `2px solid ${colorPrincipal}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: 0,
        }}
      >
        {(previewLogo || tienda?.logo_url) ? (
          <img
            src={previewLogo || tienda.logo_url}
            alt=""
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              objectFit: "contain",
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          />
        ) : (
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: colorPrincipal,
              color: colorTextoPrincipal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              flexShrink: 0,
            }}
          >
            {(nombreEditado || "M")
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <div
          style={{
            fontWeight: "800",
            fontSize: "15px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {nombreEditado || "Mi tienda"}
        </div>
          {mensajePortada && (
  <div
    style={{
      marginTop: "3px",
      fontSize: "11px",
      lineHeight: "1.3",
      opacity: 0.75,
      whiteSpace: "normal",
    }}
  >
    {mensajePortada}
  </div>
)}
      </div>

      <div
        style={{
          fontSize: "20px",
        }}
      >
        🛒
      </div>
    </div>

    {/* MINI CATEGORÍAS */}

    <div
      style={{
        display: "flex",
        gap: "16px",
        padding: "11px 16px 8px",
        fontSize: "11px",
        fontWeight: "600",
      }}
    >
      <div
        style={{
          paddingBottom: "5px",
          borderBottom: `2px solid ${colorPrincipal}`,
        }}
      >
        Todos
      </div>

      <div>Aretes</div>

      <div>Juegos</div>
    </div>

    {/* MINI PRODUCTO */}

    <div
      style={{
        padding: "12px 16px 18px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 3px 12px rgba(0,0,0,0.09)",
        }}
      >
        <div
          style={{
            height: "95px",
            background:
              "linear-gradient(135deg, #f5f5f5, #e9e9e9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "35px",
          }}
        >
          ✨
        </div>

        <div
          style={{
            padding: "12px",
            color: "#222222",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#888888",
              marginBottom: "3px",
            }}
          >
            RA0000
          </div>

          <div
            style={{
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            Aretes dorados
          </div>

          <div
            style={{
              marginTop: "5px",
              marginBottom: "10px",
              fontSize: "15px",
              fontWeight: "800",
              color: colorPrincipal,
            }}
          >
            $25.000
          </div>

          <div
            style={{
              padding: "10px",
              borderRadius: "8px",
              textAlign: "center",
              background: colorPrincipal,
              color: colorTextoPrincipal,
              fontWeight: "700",
              fontSize: "13px",
            }}
          >
            Agregar al pedido
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

{/* CIERRA PERSONALIZACIÓN DE COLORES */}
</div>

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

              {/* ACCESOS PRINCIPALES */}

<div
  style={{
    display: "grid",
    gap: "14px",
    marginTop: "18px",
  }}
>
  {/* PRODUCTOS Y PRECIOS */}

  <div
    style={{
      padding: "20px",
      background: "#ffffff",
      border: "1px solid #e9e9e9",
      borderRadius: "18px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          flexShrink: 0,
          borderRadius: "14px",
          background: "#fff0f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "23px",
        }}
      >
        💰
      </div>

      <div style={{ flex: 1 }}>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            color: "#222",
          }}
        >
          Productos y precios
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "#777",
            fontSize: "14px",
            lineHeight: "1.45",
          }}
        >
          Consulta tus costos, precios sugeridos y
          ganancias.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={verProductosYPrecios}
      style={{
        width: "100%",
        marginTop: "16px",
        border: "none",
        padding: "14px",
        borderRadius: "11px",
        background: "#d97883",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "700",
        cursor: "pointer",
      }}
    >
      Ver productos y precios →
    </button>
  </div>

  {/* COMPARTIR CATÁLOGO */}

  <div
    style={{
      padding: "20px",
      background: "#ffffff",
      border: "1px solid #e9e9e9",
      borderRadius: "18px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          flexShrink: 0,
          borderRadius: "14px",
          background: "#fff0f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "23px",
        }}
      >
        🔗
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            color: "#222",
          }}
        >
          Compartir mi catálogo
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "#777",
            fontSize: "14px",
            lineHeight: "1.45",
          }}
        >
          Envía este enlace a tus clientes para que
          vean tus productos.
        </p>
      </div>
    </div>

    {/* ENLACE */}

    <div
      style={{
        marginTop: "16px",
        padding: "12px 14px",
        background: "#f7f7f7",
        borderRadius: "10px",
        color: "#555",
        fontSize: "13px",
        fontWeight: "600",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {typeof window !== "undefined"
        ? `${window.location.host}/${tienda.slug}`
        : `/${tienda.slug}`}
    </div>

    {/* BOTONES */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "9px",
        marginTop: "12px",
      }}
    >
      <button
        type="button"
        onClick={copiarEnlace}
        style={{
          border: "none",
          minHeight: "46px",
          padding: "11px 8px",
          borderRadius: "10px",
          background: copiado
            ? "#50a773"
            : "#d97883",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        {copiado
          ? "✓ Copiado"
          : "📋 Copiar enlace"}
      </button>

      <button
        type="button"
        onClick={verCatalogo}
        style={{
          border: "1px solid #d97883",
          minHeight: "46px",
          padding: "11px 8px",
          borderRadius: "10px",
          background: "#ffffff",
          color: "#d97883",
          fontSize: "14px",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        👁️ Ver catálogo
      </button>
    </div>
  </div>
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
