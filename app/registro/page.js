"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

function crearSlug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function RegistroPage() {
  const [nombreTienda, setNombreTienda] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [enlaceCatalogo, setEnlaceCatalogo] = useState("");
  const [copiado, setCopiado] = useState(false);

  const [cargando, setCargando] = useState(false);

  async function registrar(e) {
    e.preventDefault();

    setMensaje("");
    setEnlaceCatalogo("");
    setCopiado(false);
    setCargando(true);

    const slug = crearSlug(nombreTienda);

    let numero = whatsapp.replace(/\D/g, "");

    if (numero.length === 10 && numero.startsWith("3")) {
      numero = "57" + numero;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          crear_tienda: "true",
          nombre_tienda: nombreTienda,
          slug,
          whatsapp: numero,
        },
      },
    });

    if (error) {
      setMensaje("Error: " + error.message);
      setCargando(false);
      return;
    }

    const enlaceCompleto = `${window.location.origin}/${slug}`;

    setEnlaceCatalogo(enlaceCompleto);

    setCargando(false);
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(enlaceCatalogo);

      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 2500);
    } catch (error) {
      alert("No se pudo copiar el enlace.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "25px",
        background: "#fff8f6",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "white",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "10px",
          }}
        >
          Crea tu catálogo
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Configura tu tienda y comparte tu catálogo con tus clientes.
        </p>

        <form onSubmit={registrar}>
          <label>Nombre de tu tienda</label>

          <input
            type="text"
            value={nombreTienda}
            onChange={(e) => setNombreTienda(e.target.value)}
            required
            placeholder="Ej: Accesorios Laura"
            style={estiloInput}
          />

          <label>WhatsApp</label>

          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
            placeholder="Ej: 3101234567"
            style={estiloInput}
          />

          <label>Correo electrónico</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
            style={estiloInput}
          />

          <label>Contraseña</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            style={estiloInput}
          />

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%",
              border: "none",
              padding: "15px",
              borderRadius: "12px",
              background: "#d97883",
              color: "white",
              fontSize: "16px",
              fontWeight: "700",
              cursor: cargando ? "not-allowed" : "pointer",
              marginTop: "8px",
              opacity: cargando ? 0.7 : 1,
            }}
          >
            {cargando ? "Creando..." : "Crear mi catálogo"}
          </button>
        </form>

        {mensaje && (
          <div
            style={{
              marginTop: "20px",
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

        {enlaceCatalogo && (
          <div
            style={{
              marginTop: "24px",
              padding: "22px",
              borderRadius: "16px",
              background: "#f7f7f7",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "23px",
                fontWeight: "700",
                marginBottom: "10px",
              }}
            >
              ✅ ¡Tu catálogo fue creado!
            </div>

            <p
              style={{
                fontSize: "16px",
                lineHeight: "1.5",
                color: "#555",
                marginBottom: "15px",
              }}
            >
              Este es el enlace que debes compartir con tus clientes para que
              puedan ver tu catálogo:
            </p>

            <div
              style={{
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "15px",
                fontWeight: "600",
                wordBreak: "break-all",
                marginBottom: "12px",
              }}
            >
              {enlaceCatalogo}
            </div>

            <button
              type="button"
              onClick={copiarEnlace}
              style={{
                width: "100%",
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
                : "📋 Copiar enlace para compartir"}
            </button>
          </div>
        )}
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
