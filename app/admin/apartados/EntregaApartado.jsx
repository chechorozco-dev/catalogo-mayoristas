"use client";
import { useState } from "react";
import {
  pagosApartado,
  empresasApartado,
  empresasDisponibles,
  entregaValida,
} from "../../../lib/apartados/entrega.mjs";

export function CamposEntrega({ valor, total, cambiar, disabled }) {
  const empresas = empresasDisponibles(valor.forma_pago, total);
  return (
    <div className="ap-form-grid">
      <label className="ap-field">
        Forma de pago
        <select
          required
          disabled={disabled}
          value={valor.forma_pago || ""}
          onChange={(e) => {
            const pago = e.target.value;
            cambiar({
              forma_pago: pago,
              transportadora: empresasDisponibles(pago, total).includes(
                valor.transportadora,
              )
                ? valor.transportadora
                : null,
            });
          }}
        >
          <option value="">Elige la forma de pago</option>
          {Object.entries(pagosApartado).map(([codigo, nombre]) => (
            <option key={codigo} value={codigo}>
              {nombre}
            </option>
          ))}
        </select>
      </label>
      {empresas.length > 0 && (
        <label className="ap-field">
          Transportadora
          <select
            required
            disabled={disabled}
            value={
              empresas.includes(valor.transportadora)
                ? valor.transportadora
                : ""
            }
            onChange={(e) =>
              cambiar({ ...valor, transportadora: e.target.value || null })
            }
          >
            <option value="">Elige la transportadora</option>
            {empresas.map((codigo) => (
              <option key={codigo} value={codigo}>
                {empresasApartado[codigo]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function EditarEntrega({ doc, total, pedir, actualizar }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  if (doc.estado !== "Abierto") return null;
  const actual = {
    forma_pago: doc.forma_pago || "SIN_DEFINIR",
    transportadora: doc.transportadora || null,
  };
  async function cargarVigente() {
    const vigente = await pedir("/api/apartados?modo=detalle&id=" + doc.id);
    actualizar(vigente, false);
    setValor({
      forma_pago: pagosApartado[vigente.forma_pago] ? vigente.forma_pago : "",
      transportadora: vigente.transportadora || null,
    });
    setEditando(vigente.estado === "Abierto");
  }
  async function abrir() {
    setGuardando(true);
    setError("");
    try {
      await cargarVigente();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }
  async function guardar(e) {
    e.preventDefault();
    if (guardando || !entregaValida(valor, total)) return;
    setGuardando(true);
    setError("");
    try {
      const respuesta = await pedir("/api/apartados", {
        accion: "guardar_entrega",
        destino: doc.id,
        entrega: valor,
        antes: actual,
      });
      actualizar(respuesta, true);
      setEditando(false);
    } catch (e) {
      setError(e.message);
      if (e.status === 409) {
        try {
          await cargarVigente();
        } catch {
          /* Keep the form available for another attempt. */
        }
      }
    } finally {
      setGuardando(false);
    }
  }
  if (!editando)
    return (
      <>
        <button disabled={guardando} onClick={abrir}>
          {guardando ? "Cargando…" : "Editar pago y transportadora"}
        </button>
        {error && <p className="ca-notice ca-error" role="alert">{error}</p>}
      </>
    );
  return (
    <form className="ap-editor ap-entrega" onSubmit={guardar}>
      <h3>Pago y entrega</h3>
      <CamposEntrega
        valor={valor}
        total={total}
        cambiar={setValor}
        disabled={guardando}
      />
      {error && (
        <p className="ca-notice ca-error" role="alert">
          {error}
        </p>
      )}
      <div className="ap-acciones">
        <button
          className="ca-primary"
          type="submit"
          disabled={guardando || !entregaValida(valor, total)}
        >
          {guardando ? "Guardando…" : "Guardar pago y entrega"}
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={() => setEditando(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
