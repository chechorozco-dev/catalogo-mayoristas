"use client";

import { useEffect, useId, useState } from "react";

const campos = [
  ["nombre", "Nombre", "text", 100],
  ["cedula", "Cédula o documento", "text", 32],
  ["telefono_llamadas", "Teléfono para llamadas", "tel", 24],
  ["correo", "Correo electrónico", "email", 254],
  ["direccion", "Dirección", "text", 250],
  ["punto_referencia", "Destinatario o punto de referencia", "text", 250],
];
function ciudadActual(ficha) {
  const { ciudad, departamento } = ficha;
  return [
    ciudad,
    departamento && !ciudad?.toLowerCase().includes(departamento.toLowerCase())
      ? departamento
      : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function Ciudad({ ficha, valor, elegir, pedir }) {
  const [consulta, setConsulta] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [error, setError] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cambiar, setCambiar] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    setOpciones([]);
    setError("");
    const q = consulta.trim();
    if (!cambiar || q.length < 2) {
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(() => {
      pedir(
        "/api/apartados?modo=ciudades&q=" + encodeURIComponent(q),
        null,
        ctrl.signal,
      )
        .then((d) => {
          if (!ctrl.signal.aborted) setOpciones(d.ciudades);
        })
        .catch(() => {
          if (!ctrl.signal.aborted)
            setError(
              "No pudimos buscar ciudades. Vuelve a escribir el nombre.",
            );
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setBuscando(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [consulta, cambiar, pedir]);
  return (
    <div className="ap-ciudad">
      <span>Ciudad y departamento</span>
      <div className="ap-acciones">
        <strong>
          {valor.etiqueta || ciudadActual(ficha) || "Sin registrar"}
        </strong>
        <button
          type="button"
          onClick={() => {
            setCambiar(!cambiar);
            setConsulta("");
          }}
        >
          {cambiar ? "Cerrar búsqueda" : "Buscar ciudad"}
        </button>
      </div>
      {cambiar && (
        <>
          <label className="ap-field">
            Nombre de la ciudad
            <input
              autoFocus
              type="search"
              maxLength={80}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Ej. Villavicencio"
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <div role="status">
            {buscando
              ? "Buscando…"
              : !error && consulta.trim().length >= 2 && !opciones.length
                ? "No encontramos esa ciudad."
                : ""}
          </div>
          <div className="ap-ciudades">
            {opciones.map((c) => (
              <button
                type="button"
                key={c.ciudad_id}
                onClick={() => {
                  elegir({ id: c.ciudad_id, etiqueta: c.ciudad_departamento });
                  setCambiar(false);
                  setConsulta("");
                }}
              >
                {c.ciudad_departamento}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Editar({ doc, pedir, guardar, cerrar }) {
  const [antes] = useState(doc.ficha);
  const [valores, setValores] = useState(antes);
  const [ciudad, setCiudad] = useState({
    id: antes.ciudad_id || "",
    etiqueta: "",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    const cambios = {};
    const originales = {};
    for (const campo of [...campos.map(([k]) => k), "ciudad_id"]) {
      const valor =
        campo === "ciudad_id" ? ciudad.id : (valores[campo] || "").trim();
      if (valor !== (antes[campo] || "")) {
        cambios[campo] = valor;
        originales[campo] = antes[campo] || "";
      }
    }
    if (!Object.keys(cambios).length) {
      cerrar();
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const ficha = await pedir("/api/apartados", {
        accion: "guardar_ficha",
        destino: doc.id,
        cambios,
        antes: originales,
      });
      guardar(doc.id, ficha);
      cerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <form onSubmit={enviar} className="ap-editor">
      <p>
        Estos datos se guardan en tu ficha de RA y nuestro equipo los verá en
        WhatsApp Lab.
      </p>
      <fieldset disabled={enviando}>
        <legend className="ap-sr">Datos del cliente</legend>
        <div className="ap-form-grid">
          {campos.map(([campo, label, tipo, max]) => (
            <label className="ap-field" key={campo}>
              {label}
              <input
                type={tipo}
                maxLength={max}
                required={campo === "nombre"}
                value={valores[campo] || ""}
                onChange={(e) =>
                  setValores({ ...valores, [campo]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
        <Ciudad ficha={antes} valor={ciudad} elegir={setCiudad} pedir={pedir} />
        {error && (
          <p role="alert" className="ca-notice ca-error">
            {error}
          </p>
        )}
        <div className="ap-acciones">
          <button className="ca-primary" type="submit">
            {enviando ? "Guardando…" : "Guardar mis datos"}
          </button>
          <button type="button" onClick={cerrar}>
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export default function FichaCliente({ doc, pedir, guardar }) {
  const [editando, setEditando] = useState(false);
  const id = useId();
  const f = doc.ficha;
  if (!f) return null;
  const datos = [
    ["Nombre", f.nombre],
    ["WhatsApp", f.whatsapp],
    ["Teléfono para llamadas", f.telefono_llamadas],
    ["Cédula o documento", f.cedula],
    ["Ciudad", ciudadActual(f)],
    ["Dirección", f.direccion],
    ["Destinatario o punto de referencia", f.punto_referencia],
    ["Correo electrónico", f.correo],
  ];
  if (
    doc.destinatario &&
    doc.destinatario.trim().toLowerCase() !== f.nombre?.trim().toLowerCase()
  )
    datos.push(["Nombre en este apartado", doc.destinatario]);
  return (
    <section className="ap-cliente" aria-labelledby={id}>
      <div className="ap-identidad">
        <h3 id={id}>Datos del cliente</h3>
        {doc.estado === "Abierto" && !editando && (
          <button onClick={() => setEditando(true)}>Editar mis datos</button>
        )}
      </div>
      {editando ? (
        <Editar
          doc={doc}
          pedir={pedir}
          guardar={guardar}
          cerrar={() => setEditando(false)}
        />
      ) : (
        <dl className="ap-contacto">
          {datos
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
      )}
    </section>
  );
}
