"use client";

import { useEffect, useState } from "react";
import { formatoPrecio } from "../../../../lib/catalogo/formatos.mjs";

export default function BloquePrecios({
  costo,
  precio,
  productoId,
  varianteId = null,
  onPrecioActualizado,
}) {
  const costoNumero = Number(costo || 0);
  const precioNumero = Number(precio || 0);

  const [editando, setEditando] = useState(false);

  const [nuevoPrecio, setNuevoPrecio] = useState(
    String(Math.round(precioNumero))
  );

  const [guardando, setGuardando] = useState(false);
  const [errorPrecio, setErrorPrecio] = useState("");

  useEffect(() => {
    if (!editando) {
      setNuevoPrecio(String(Math.round(precioNumero)));
    }
  }, [precioNumero, editando]);

  async function guardarPrecio() {
    const precioGuardar = Number(
      String(nuevoPrecio)
        .replace(/\./g, "")
        .replace(/,/g, "")
        .replace(/\s/g, "")
    );

    if (
      !Number.isFinite(precioGuardar) ||
      precioGuardar < 0
    ) {
      setErrorPrecio("Ingresa un precio válido.");
      return;
    }

    setGuardando(true);
    setErrorPrecio("");

    try {
      const response = await fetch(
        "/api/precios-tienda",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            producto_id: Number(productoId),

            variante_id:
              varianteId !== null &&
              varianteId !== undefined
                ? Number(varianteId)
                : null,

            precio_sugerido: Math.round(precioGuardar),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos guardar el precio."
        );
      }

      onPrecioActualizado?.(
        Number(data.precio_sugerido)
      );

      setNuevoPrecio(
        String(data.precio_sugerido)
      );

      setEditando(false);
    } catch (error) {
      console.error(
        "Error guardando precio:",
        error
      );

      setErrorPrecio(
        error.message ||
          "No pudimos guardar el precio."
      );
    } finally {
      setGuardando(false);
    }
  }

  function cancelarEdicion() {
    setNuevoPrecio(
      String(Math.round(precioNumero))
    );

    setErrorPrecio("");
    setEditando(false);
  }

  return (
    <div className="product-prices-new">

      {/* TU COSTO */}
      <div className="cost-box-new">
        <span className="price-label-new">
          Tu costo
        </span>

        <strong className="cost-new">
          {formatoPrecio(costoNumero)}
        </strong>
      </div>

      {/* PRECIO DE VENTA */}
      <div className="sale-box-new">

        <div className="sale-title-new">
          <span className="price-label-new">
            Precio de venta
          </span>

          {!editando && (
            <button
              type="button"
              className="edit-price-new"
              title="Editar precio de venta"
              onClick={() => {
                setNuevoPrecio(
                  String(Math.round(precioNumero))
                );

                setErrorPrecio("");
                setEditando(true);
              }}
            >
              ✏️
            </button>
          )}
        </div>

        {!editando ? (
          <strong className="sale-price-new">
            {formatoPrecio(precioNumero)}
          </strong>
        ) : (
          <div className="price-editor-new">

            <div className="price-input-new">
              <span>$</span>

              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={nuevoPrecio}
                disabled={guardando}
                autoFocus
                onChange={(e) => {
                  setNuevoPrecio(e.target.value);
                  setErrorPrecio("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    guardarPrecio();
                  }

                  if (e.key === "Escape") {
                    cancelarEdicion();
                  }
                }}
              />
            </div>

            <div className="price-editor-actions-new">
              <button
                type="button"
                className="save-price-new"
                disabled={guardando}
                onClick={guardarPrecio}
              >
                {guardando
                  ? "Guardando..."
                  : "✓ Guardar"}
              </button>

              <button
                type="button"
                className="cancel-price-new"
                disabled={guardando}
                onClick={cancelarEdicion}
              >
                Cancelar
              </button>
            </div>

            {errorPrecio && (
              <p className="price-error-new">
                {errorPrecio}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
