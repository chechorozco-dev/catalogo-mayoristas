"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e) {
    e.preventDefault();

    setMensaje("");
    setCargando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error);

      setMensaje(
        "No pudimos iniciar sesión. Revisa tu correo y contraseña."
      );

      setCargando(false);
      return;
    }

    if (data.user) {
      router.push("/admin");
      router.refresh();
    }

    setCargando(false);
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
          maxWidth: "430px",
          background: "white",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: "30px",
            marginBottom: "10px",
          }}
        >
          Administrar catálogo
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "25px",
            lineHeight: "1.5",
          }}
        >
          Ingresa con el correo y la contraseña que utilizaste al crear tu
          catálogo.
        </p>

        <form onSubmit={iniciarSesion}>
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
            placeholder="Tu contraseña"
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
            {cargando ? "Ingresando..." : "Ingresar a mi catálogo"}
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

        <div
          style={{
            textAlign: "center",
            marginTop: "22px",
          }}
        >
          <span style={{ color: "#777" }}>
            ¿Todavía no tienes catálogo?
          </span>

          <br />

          <button
            type="button"
            onClick={() => router.push("/registro")}
            style={{
              background: "none",
              border: "none",
              color: "#d97883",
              fontWeight: "700",
              cursor: "pointer",
              marginTop: "5px",
              fontSize: "15px",
            }}
          >
            Crear mi catálogo
          </button>
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
