"use client";

import { useEffect, useState } from "react";
import { formatoPrecio } from "../../../../lib/catalogo/formatos.mjs";
import { leerPrecioEditable } from "../../../../lib/catalogo/monedas.mjs";

export default function BloquePrecios({
  costo,
  precio,
  moneda = "COP",
  productoId,
  varianteId = null,
  onPrecioActualizado,
}) {
  const costoNumero = Number(costo || 0);
  const precioPendiente = precio === null || precio === undefined;
  const precioNumero = precioPendiente ? null : Number(precio);
  const esUsd = moneda === "USD";

  const [editando, setEditando] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState(precioPendiente ? "" : String(precioNumero));
  const [guardando, setGuardando] = useState(false);
  const [errorPrecio, setErrorPrecio] = useState("");

  useEffect(() => {
    if (!editando) setNuevoPrecio(precioPendiente ? "" : String(precioNumero));
  }, [precioNumero, precioPendiente, editando]);

  async function guardarPrecio() {
    if (guardando) return;
    const precioGuardar = leerPrecioEditable(nuevoPrecio, moneda);
    if (!Number.isFinite(precioGuardar) || precioGuardar < 0) {
      setErrorPrecio(esUsd
        ? "Escribe dólares con hasta dos decimales, por ejemplo 2.40."
        : "Ingresa un precio válido en pesos.");
      return;
    }
    setGuardando(true);
    setErrorPrecio("");
    try {
      const response = await fetch("/api/precios-tienda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: Number(productoId),
          variante_id: varianteId == null ? null : Number(varianteId),
          precio_sugerido: precioGuardar,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.mensaje || "No pudimos guardar el precio.");
      }
      onPrecioActualizado?.(Number(data.precio_sugerido));
      setNuevoPrecio(String(data.precio_sugerido));
      setEditando(false);
    } catch (error) {
      console.error("Error guardando precio:", error);
      setErrorPrecio(error.message || "No pudimos guardar el precio.");
    } finally {
      setGuardando(false);
    }
  }

  function cancelarEdicion() {
    setNuevoPrecio(precioPendiente ? "" : String(precioNumero));
    setErrorPrecio("");
    setEditando(false);
  }

  return (
    <div className="product-prices-new">
      <div className="cost-box-new">
        <span className="price-label-new">Tu costo (COP)</span>
        <strong className="cost-new">{formatoPrecio(costoNumero, "COP")}</strong>
      </div>

      <div className="sale-box-new">
        <div className="sale-title-new">
          <span className="price-label-new">Precio de venta ({moneda})</span>
          {!editando && (
            <button
              type="button"
              className="edit-price-new"
              title="Editar precio de venta"
              aria-label="Editar precio de venta"
              onClick={() => {
                setNuevoPrecio(precioPendiente ? "" : String(precioNumero));
                setErrorPrecio("");
                setEditando(true);
              }}
            >
              Editar
            </button>
          )}
        </div>
        {!editando ? (
          <strong className="sale-price-new">{precioPendiente ? "Pendiente de definir precio" : formatoPrecio(precioNumero, moneda)}</strong>
        ) : (
          <div className="price-editor-new">
            <div className="price-input-new">
              <span>{esUsd ? "US$" : "$"}</span>
              <input
                type="text"
                aria-label={esUsd ? "Precio de venta en dólares" : "Precio de venta en pesos"}
                aria-invalid={Boolean(errorPrecio)}
                inputMode={esUsd ? "decimal" : "numeric"}
                placeholder={esUsd ? "2.40" : "13000"}
                value={nuevoPrecio}
                disabled={guardando}
                autoFocus
                onChange={(e) => {
                  setNuevoPrecio(e.target.value);
                  setErrorPrecio("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") guardarPrecio();
                  if (e.key === "Escape") cancelarEdicion();
                }}
              />
            </div>
            <div className="price-editor-actions-new">
              <button type="button" className="save-price-new" disabled={guardando} onClick={guardarPrecio}>
                {guardando ? "Guardando..." : "✓ Guardar"}
              </button>
              <button type="button" className="cancel-price-new" disabled={guardando} onClick={cancelarEdicion}>
                Cancelar
              </button>
            </div>
            {errorPrecio && <p className="price-error-new" role="alert">{errorPrecio}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
