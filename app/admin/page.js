"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    // 1. Verificar si hay sesión iniciada
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

    // 2. Buscar la tienda que pertenece a este usuario
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
      setMensaje(
        "No se pudo copiar automáticamente el enlace."
      );
    }
  }

  function verCatalogo() {
    if (!tienda) return;

    window.open(`/${tienda.slug}`, "_blank");
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
          {/* CABECERA */}

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

          {mensaje && (
            <div
              style={{
                marginTop: "22px",
                padding: "14px",
                borderRadius: "10px",
                background: "#ffeaea",
                color: "#a33",
                lineHeight: "1.5",
              }}
            >
              {mensaje}
            </div>
          )}

          {tienda && (
            <>
              {/* INFORMACIÓN DE LA TIENDA */}

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
                  WhatsApp: {tienda.whatsapp}
                </p>
              </div>

              {/* ENLACE DEL CATÁLOGO */}

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
                  Este es el enlace que debes compartir con tus clientes para
                  que puedan ver tus productos.
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
                      background: copiado ? "#50a773" : "#d97883",
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

              {/* AVISO */}

              <div
                style={{
                  marginTop: "20px",
                  padding: "20px",
                  background: "#fff8f6",
                  borderRadius: "16px",
                  lineHeight: "1.5",
                }}
              >
                <strong>Tu catálogo está listo para compartir.</strong>

                <p
                  style={{
                    color: "#666",
                    marginBottom: 0,
                  }}
                >
                  Los productos del catálogo son administrados por la
                  plataforma. Desde aquí puedes consultar y compartir tu
                  catálogo con tus clientes.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
