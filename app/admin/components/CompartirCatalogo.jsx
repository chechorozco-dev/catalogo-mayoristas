"use client";

import { useState } from "react";

export default function CompartirCatalogo({
  tienda,
  onVerCatalogo,
}) {
  const [
    copiado,
    setCopiado,
  ] = useState(false);

  async function copiarEnlace() {
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
      try {
        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          enlace;

        textarea.style.position =
          "fixed";

        textarea.style.opacity =
          "0";

        document.body.appendChild(
          textarea
        );

        textarea.select();

        document.execCommand(
          "copy"
        );

        textarea.remove();

        setCopiado(true);

        setTimeout(() => {
          setCopiado(false);
        }, 2500);
      } catch {
        alert(
          "No se pudo copiar el enlace."
        );
      }
    }
  }

  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontSize: "21px",
          color: "#222",
        }}
      >
        Compartir catálogo
      </h2>

      <p
        style={{
          margin:
            "4px 0 15px",
          color: "#888",
          fontSize: "13px",
        }}
      >
        Envía este enlace a
        tus clientes para que
        vean tus productos.
      </p>

      <div
        style={{
          background: "#fff",
          border:
            "1px solid #e9e9e9",
          borderRadius: "20px",
          padding: "20px",
          boxShadow:
            "0 5px 18px rgba(0,0,0,.04)",
        }}
      >
        <div
          style={{
            width: "54px",
            height: "54px",
            borderRadius:
              "16px",
            background:
              "#fff0f2",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            fontSize: "25px",
          }}
        >
          🔗
        </div>

        <div
          style={{
            marginTop: "15px",
            fontWeight: "900",
            fontSize: "17px",
          }}
        >
          Tu enlace
        </div>

        <div
          style={{
            marginTop: "9px",
            padding: "14px",
            background:
              "#f6f6f6",
            borderRadius:
              "11px",
            color: "#555",
            fontSize: "13px",
            fontWeight: "700",
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace:
              "nowrap",
          }}
        >
          {typeof window !==
          "undefined"
            ? `${window.location.host}/${tienda.slug}`
            : `/${tienda.slug}`}
        </div>

        <button
          type="button"
          onClick={
            copiarEnlace
          }
          style={{
            width: "100%",
            marginTop: "13px",
            border: "none",
            padding: "14px",
            borderRadius:
              "11px",
            background:
              copiado
                ? "#4fa56d"
                : "#d97883",
            color: "#fff",
            fontWeight: "800",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {copiado
            ? "✓ Enlace copiado"
            : "📋 Copiar enlace"}
        </button>

        <button
          type="button"
          onClick={
            onVerCatalogo
          }
          style={{
            width: "100%",
            marginTop: "9px",
            border:
              "1px solid #ddd",
            padding: "13px",
            borderRadius:
              "11px",
            background: "#fff",
            color: "#555",
            fontWeight: "800",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          👁 Ver catálogo como
          cliente
        </button>
      </div>
    </div>
  );
}