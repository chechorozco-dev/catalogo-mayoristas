"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [tienda, setTienda] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [copiado, setCopiado] = useState(false);

  const [editando, setEditando] = useState(false);
  const [nombreEditado, setNombreEditado] = useState("");
  const [whatsappEditado, setWhatsappEditado] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(sessionError);
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    const user = session.user;

    setUsuario(user);

    const { data: tiendaEncontrada, error: tiendaError } = await supabase
      .from("tiendas")
      .select(
        "id, usuario_id, nombre_tienda, slug, whatsapp, logo_url, activa, creado_en"
      )
      .eq("usuario_id", user.id)
      .single();

    if (tiendaError) {
      console.error("Error buscando tienda:", tiendaError);

      setMensaje(
        "No pudimos encontrar la tienda asociada a esta cuenta."
      );

      setCargando(false);
      return;
    }

    setTienda(tiendaEncontrada);
    setNombreEditado(tiendaEncontrada.nombre_tienda || "");
    setWhatsappEditado(tiendaEncontrada.whatsapp || "");

    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  async function copiarEnlace() {
    if (!tienda) return;

    const enlace = `${window.location.origin}/${tienda.slug}`;

    try {
      await navigator.clipboard.writeText(enlace);

      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 2500);
    } catch (error) {
      setMensaje("No se pudo copiar automáticamente el enlace.");
    }
  }

  function verCatalogo() {
    if (!tienda) return;

    window.open(`/${tienda.slug}`, "_blank");
  }

  // NUEVO:
  // Lleva al mayorista a la zona privada
  // donde puede ver costo + precio sugerido.
  function verProductosYPrecios() {
    router.push("/admin/productos");
  }

  function empezarEdicion() {
    if (!tienda) return;

    setNombreEditado(tienda.nombre_tienda || "");
    setWhatsappEditado(tienda.whatsapp || "");
    setMensaje("");
    setEditando(true);
  }

  function cancelarEdicion() {
    if (!tienda) return;

    setNombreEditado(tienda.nombre_tienda || "");
    setWhatsappEditado(tienda.whatsapp || "");
    setMensaje("");
    setEditando(false);
  }

  async function guardarCambios(e) {
    e.preventDefault();

    if (!tienda) return;

    setMensaje("");
    setGuardando(true);

    const nombreLimpio = nombreEditado.trim();

    if (!nombreLimpio) {
      setMensaje("El nombre de la tienda no puede quedar vacío.");
      setGuardando(false);
      return;
    }

    let numero = whatsappEditado.replace(/\D/g, "");

    if (numero.length === 10 && numero.startsWith("3")) {
      numero = "57" + numero;
    }

    if (numero.length < 10) {
      setMensaje("Escribe un número de WhatsApp válido.");
      setGuardando(false);
      return;
    }

    const { data: tiendaActualizada, error } = await supabase
      .from("tiendas")
      .update({
        nombre_tienda: nombreLimpio,
        whatsapp: numero,
      })
      .eq("id", tienda.id)
      .eq("usuario_id", usuario.id)
      .select(
        "id, usuario_id, nombre_tienda, slug, whatsapp, logo_url, activa, creado_en"
      )
      .single();

    if (error) {
      console.error("Error actualizando tienda:", error);

      setMensaje(
        "No se pudieron guardar los cambios. Revisa los permisos de Supabase."
      );

      setGuardando(false);
      return;
    }

    setTienda(tiendaActualizada);
    setNombreEditado(tiendaActualizada.nombre_tienda || "");
    setWhatsappEditado(tiendaActualizada.whatsapp || "");

    setEditando(false);
    setGuardando(false);

    setMensaje("✅ Datos de la tienda actualizados correctamente.");
  }

  function mostrarWhatsapp(numero) {
    if (!numero) return "";

    let limpio = numero.replace(/\D/g, "");

    if (limpio.startsWith("57") && limpio.length === 12) {
      limpio = limpio.slice(2);
    }

    if (limpio.length === 10) {
      return `+57 ${limpio.slice(0, 3)} ${limpio.slice(
        3,
        6
      )} ${limpio.slice(6)}`;
    }

    return numero;
  }

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
            boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
          }}
        >
          {/* ENCABEZADO */}
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
                {usuario?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              style={{
                border: "1px solid #ddd",
                background: "white",
                padding: "11px 16px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Cerrar sesión
            </button>
          </div>

          {/* MENSAJES */}
          {mensaje && (
            <div
              style={{
                marginTop: "22px",
                padding: "14px",
                borderRadius: "10px",
                background: mensaje.startsWith("✅")
                  ? "#eef9f1"
                  : "#ffeaea",
                color: mensaje.startsWith("✅")
                  ? "#287a42"
                  : "#a33",
                lineHeight: "1.5",
              }}
            >
              {mensaje}
            </div>
          )}

          {tienda && (
            <>
              {/* DATOS DE LA TIENDA */}
              {!editando && (
                <div
                  style={{
                    marginTop: "30px",
                    padding: "24px",
                    background: "#f7f7f7",
                    borderRadius: "16px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#777",
                      fontSize: "14px",
                    }}
                  >
                    Tu tienda
                  </p>

                  <h2
                    style={{
                      marginTop: "5px",
                      marginBottom: "8px",
                      fontSize: "27px",
                    }}
                  >
                    {tienda.nombre_tienda}
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: "#666",
                    }}
                  >
                    WhatsApp: {mostrarWhatsapp(tienda.whatsapp)}
                  </p>

                  <button
                    type="button"
                    onClick={empezarEdicion}
                    style={{
                      width: "100%",
                      marginTop: "18px",
                      border: "1px solid #d97883",
                      padding: "13px",
                      borderRadius: "10px",
                      background: "white",
                      color: "#d97883",
                      fontSize: "16px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Editar datos de mi tienda
                  </button>
                </div>
              )}

              {/* EDICIÓN */}
              {editando && (
                <div
                  style={{
                    marginTop: "30px",
                    padding: "24px",
                    background: "#f7f7f7",
                    borderRadius: "16px",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "20px",
                      fontSize: "24px",
                    }}
                  >
                    Editar datos de mi tienda
                  </h2>

                  <form onSubmit={guardarCambios}>
                    <label
                      style={{
                        fontWeight: "600",
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

                    <label
                      style={{
                        fontWeight: "600",
                      }}
                    >
                      WhatsApp
                    </label>

                    <input
                      type="tel"
                      value={whatsappEditado}
                      onChange={(e) =>
                        setWhatsappEditado(e.target.value)
                      }
                      required
                      style={estiloInput}
                    />

                    <button
                      type="submit"
                      disabled={guardando}
                      style={{
                        width: "100%",
                        border: "none",
                        padding: "14px",
                        borderRadius: "10px",
                        background: "#d97883",
                        color: "white",
                        fontSize: "16px",
                        fontWeight: "700",
                        cursor: guardando
                          ? "not-allowed"
                          : "pointer",
                        opacity: guardando ? 0.7 : 1,
                      }}
                    >
                      {guardando
                        ? "Guardando..."
                        : "💾 Guardar cambios"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelarEdicion}
                      disabled={guardando}
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        border: "1px solid #ddd",
                        padding: "14px",
                        borderRadius: "10px",
                        background: "white",
                        color: "#666",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </form>
                </div>
              )}

              {/* NUEVA ZONA PRIVADA DE PRECIOS */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "24px",
                  background: "#222",
                  color: "white",
                  borderRadius: "16px",
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    fontSize: "22px",
                  }}
                >
                  Tus precios de mayorista
                </h2>

                <p
                  style={{
                    marginTop: 0,
                    marginBottom: "18px",
                    color: "#ddd",
                    lineHeight: "1.5",
                  }}
                >
                  Consulta tu costo, el precio sugerido de venta y
                  la ganancia sugerida de cada producto.
                </p>

                <button
                  type="button"
                  onClick={verProductosYPrecios}
                  style={{
                    width: "100%",
                    border: "none",
                    padding: "15px",
                    borderRadius: "10px",
                    background: "#d97883",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  💰 Ver productos y precios
                </button>
              </div>

              {/* ENLACE PÚBLICO */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "24px",
                  border: "1px solid #eee",
                  borderRadius: "16px",
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    fontSize: "22px",
                  }}
                >
                  Enlace de tu catálogo
                </h2>

                <p
                  style={{
                    color: "#666",
                    lineHeight: "1.5",
                    marginTop: 0,
                  }}
                >
                  Este es el enlace que debes compartir con tus
                  clientes para que puedan ver tus productos y el
                  precio de venta.
                </p>

                <div
                  style={{
                    background: "#f7f7f7",
                    padding: "14px",
                    borderRadius: "10px",
                    wordBreak: "break-all",
                    fontWeight: "600",
                    marginTop: "15px",
                  }}
                >
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/${tienda.slug}`
                    : `/${tienda.slug}`}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={copiarEnlace}
                    style={{
                      border: "none",
                      padding: "14px",
                      borderRadius: "10px",
                      background: copiado
                        ? "#50a773"
                        : "#d97883",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    {copiado
                      ? "✓ Enlace copiado"
                      : "📋 Copiar enlace"}
                  </button>

                  <button
                    type="button"
                    onClick={verCatalogo}
                    style={{
                      border: "1px solid #d97883",
                      padding: "14px",
                      borderRadius: "10px",
                      background: "white",
                      color: "#d97883",
                      fontSize: "16px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    👁️ Ver mi catálogo
                  </button>
                </div>
              </div>

              {/* INFORMACIÓN */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "20px",
                  background: "#fff8f6",
                  borderRadius: "16px",
                  lineHeight: "1.5",
                }}
              >
                <strong>
                  Tu catálogo está listo para compartir.
                </strong>

                <p
                  style={{
                    color: "#666",
                    marginBottom: 0,
                  }}
                >
                  Los productos del catálogo son administrados por
                  la plataforma. Desde aquí puedes consultar tus
                  precios, actualizar los datos de tu tienda y
                  compartir tu catálogo con tus clientes.
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
