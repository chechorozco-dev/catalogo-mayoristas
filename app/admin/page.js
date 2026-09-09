"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    comprobarSesion();
  }, []);

  async function comprobarSesion() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setUsuario(session.user);
    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p>Cargando...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff8f6",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "25px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                }}
              >
                Mi catálogo
              </h1>

              <p
                style={{
                  color: "#666",
                  marginBottom: 0,
                }}
              >
                {usuario?.email}
              </p>
            </div>

            <button
              onClick={cerrarSesion}
              style={{
                border: "1px solid #ddd",
                background: "white",
                padding: "11px 16px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>

          <div
            style={{
              marginTop: "30px",
              padding: "25px",
              background: "#f7f7f7",
              borderRadius: "15px",
            }}
          >
            <h2>Administración de productos</h2>

            <p style={{ color: "#666" }}>
              Aquí aparecerán tus productos y las opciones para agregar,
              editar y eliminar productos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
