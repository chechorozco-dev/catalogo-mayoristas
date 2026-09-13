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

export default function CrearTiendaPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [cliente, setCliente] = useState(null);
  const [nombreTienda, setNombreTienda] = useState("");
  const [mensaje, setMensaje] = useState("");

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

  async function crearTienda(e) {
    e.preventDefault();

    const nombreLimpio = nombreTienda.trim();

    if (nombreLimpio.length < 2) {
      setMensaje("Escribe un nombre válido para tu tienda.");
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
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (response.status === 409 && data.tienda_id) {
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
          maxWidth: "620px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "22px",
            padding: "32px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
          }}
        >
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
              ¡Hola{cliente?.nombre ? `, ${cliente.nombre}` : ""}! 👋
            </h1>

            <p
              style={{
                margin: 0,
                color: "#666",
                fontSize: "17px",
                lineHeight: "1.5",
              }}
            >
              Elige el nombre con el que quieres presentar tu tienda a tus
              clientes.
            </p>
          </div>

          <form onSubmit={crearTienda}>
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
                Tu catálogo tendrá una dirección parecida a:
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
                      slugVistaPrevia || "nombre-de-tu-tienda"
                    }`
                  : `/${slugVistaPrevia || "nombre-de-tu-tienda"}`}
              </div>
            </div>

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

            <button
              type="submit"
              disabled={guardando}
              style={{
                width: "100%",
                marginTop: "22px",
                border: "none",
                padding: "16px",
                borderRadius: "12px",
                background: "#d97883",
                color: "white",
                fontSize: "17px",
                fontWeight: "700",
                cursor: guardando ? "not-allowed" : "pointer",
                opacity: guardando ? 0.7 : 1,
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
            El nombre que elijas podrá cambiarse después desde el
            administrador de tu catálogo.
          </div>
        </div>
      </div>
    </main>
  );
}
