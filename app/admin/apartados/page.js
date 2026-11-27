"use client";
import { useEffect, useRef, useState } from "react";
import { formatoPrecio as pesos } from "../../../lib/catalogo/formatos.mjs";
import {
  claveBorrador,
  claveCarrito,
  combinarCarrito,
  descontarConfirmados,
  leerGuardado,
} from "../../../lib/apartados/carrito.mjs";
import InstalarPortal from "../components/InstalarPortal";
import "../cliente-admin.css";
import "./apartados.css";

const api = "/api/apartados";
const fecha = (value) =>
  new Date(value).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const suma = (items) => items.reduce((n, p) => n + p.mayor * p.cantidad, 0);
async function pedir(url = api, body, signal) {
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal,
  });
  const data = await r.json();
  if (r.status === 401) {
    const carrito = new URLSearchParams(location.search).get("carrito") === "1";
    location.replace("/login?volver=apartados" + (carrito ? "&carrito=1" : ""));
  }
  if (!r.ok) {
    const e = new Error(data.mensaje || "No pudimos cargar tus apartados.");
    e.status = r.status;
    throw e;
  }
  return data;
}
function Foto({ p }) {
  return p.foto ? (
    <img className="ap-foto" src={p.foto} alt="" loading="lazy" />
  ) : (
    <span className="ap-foto ap-sin-foto" aria-hidden="true">
      RA
    </span>
  );
}
function Precios({ p }) {
  return (
    <div className="ap-precios">
      <span>
        Mayor <b>{pesos(p.mayor)}</b>
      </span>
      <span>
        Sugerido {p.sugerido > 0 ? pesos(p.sugerido) : "por consultar"}
      </span>
    </div>
  );
}
function Catalogo({ agregar, bloqueado }) {
  const [q, setQ] = useState(""),
    [offset, setOffset] = useState(0),
    [productos, setProductos] = useState([]),
    [carga, setCarga] = useState(true);
  const [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [aviso, setAviso] = useState("");
  useEffect(() => {
    const ctrl = new AbortController();
    setCarga(true);
    setError("");
    const timer = setTimeout(
      () =>
        pedir(
          api +
            "?modo=catalogo&q=" +
            encodeURIComponent(q) +
            "&offset=" +
            offset,
          null,
          ctrl.signal,
        )
          .then((d) => setProductos(d.productos))
          .catch((e) => {
            if (!ctrl.signal.aborted) setError(e.message);
          })
          .finally(() => {
            if (!ctrl.signal.aborted) setCarga(false);
          }),
      180,
    );
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [q, offset, revision]);
  return (
    <section className="ap-panel">
      <h2>Buscar productos para apartar</h2>
      <label className="ap-field">
        Referencia, letra o nombre
        <input
          type="search"
          maxLength={80}
          value={q}
          placeholder="Ej. RA7789 o collar letra"
          onChange={(e) => {
            setQ(e.target.value);
            setOffset(0);
          }}
        />
      </label>
      <div role="status" className="ap-live">
        {aviso}
      </div>
      {carga ? (
        <p role="status">Buscando productos…</p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRevision((v) => v + 1)}>Reintentar</button>
        </p>
      ) : (
        <>
          {!productos.length && (
            <p>No encontramos referencias disponibles para esa búsqueda.</p>
          )}
          <div className="ap-catalogo">
            {productos.slice(0, 24).map((p) => (
              <article className="ap-producto" key={p.clave}>
                <Foto p={p} />
                <div>
                  <small>{p.referencia}</small>
                  <strong>{p.nombre}</strong>
                  <Precios p={p} />
                </div>
                <button
                  disabled={bloqueado}
                  aria-label={"Agregar " + p.referencia}
                  onClick={() => {
                    agregar(p);
                    setAviso("Agregado a la selección: " + p.referencia);
                  }}
                >
                  + Agregar
                </button>
              </article>
            ))}
          </div>
          {(offset > 0 || productos.length > 24) && (
            <div className="ap-pag">
              <button
                disabled={!offset}
                onClick={() => setOffset((n) => Math.max(0, n - 24))}
              >
                Anterior
              </button>
              <span>Página {1 + offset / 24}</span>
              <button
                disabled={productos.length <= 24}
                onClick={() => setOffset((n) => n + 24)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Detalle({ doc, cerrar }) {
  return (
    <section className="ap-panel ap-detalle">
      <div className="ap-head">
        <div>
          <small>Detalle del apartado</small>
          <h2>{doc.codigo}</h2>
        </div>
        <button onClick={cerrar}>Volver a mis apartados</button>
      </div>
      <p>
        {doc.estado} · {fecha(doc.fecha)}
      </p>
      {doc.productos.map((p) => (
        <article key={p.id} className="ap-item">
          <Foto p={p} />
          <div>
            <small>
              {p.referencia} · {p.estado}
            </small>
            <strong>{p.nombre}</strong>
            <Precios p={p} />
          </div>
          <div className="ap-end">
            {p.cantidad} ud.<b>{pesos(p.mayor * p.cantidad)}</b>
          </div>
        </article>
      ))}
      <div className="ap-total">
        <span>Total al por mayor</span>
        <b>{pesos(suma(doc.productos))}</b>
      </div>
      {doc.abono > 0 && <p>Abono registrado · {pesos(doc.abono)}</p>}
      <a className="ca-primary ap-link" href={api + "?modo=pdf&id=" + doc.id}>
        Descargar PDF
      </a>
    </section>
  );
}
export default function Apartados() {
  const [resumen, setResumen] = useState(null),
    [items, setItems] = useState([]),
    [destino, setDestino] = useState(""),
    [detalle, setDetalle] = useState(null);
  const [error, setError] = useState(""),
    [mensaje, setMensaje] = useState(""),
    [acepto, setAcepto] = useState(false),
    [enviando, setEnviando] = useState(false),
    [pendiente, setPendiente] = useState(null);
  const [tab, setTab] = useState("seleccion"),
    [cargando, setCargando] = useState(true),
    [inicio, setInicio] = useState(0);
  const busy = useRef(false),
    versionDetalle = useRef(0);
  function elegirResumen(r, preferido) {
    setResumen(r);
    const abiertos = r.apartados.filter((a) => a.estado === "Abierto");
    setDestino(
      abiertos.some((a) => a.id === preferido)
        ? preferido
        : abiertos.length === 1
          ? abiertos[0].id
          : "",
    );
  }
  async function revisar(lista) {
    if (!lista.length) return [];
    const d = await pedir(api, {
      accion: "revisar",
      claves: lista.map((i) => i.clave),
    });
    const validos = new Map(d.productos.map((p) => [p.clave, p]));
    return lista.map((i) => ({
      ...i,
      ...validos.get(i.clave),
      disponible: validos.has(i.clave),
    }));
  }
  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const r = await pedir();
        const borrador = leerGuardado(claveBorrador(r.cliente), { items: [] });
        const url = new URL(location.href);
        const importar =
          !borrador.pendiente && url.searchParams.get("carrito") === "1";
        const lista = importar
          ? combinarCarrito(
              borrador.items,
              leerGuardado(claveCarrito(r.cliente), []),
            )
          : borrador.items;
        const actual = borrador.pendiente ? lista : await revisar(lista);
        if (!vivo) return;
        elegirResumen(r, borrador.pendiente?.destino);
        setItems(actual);
        setPendiente(borrador.pendiente || null);
        localStorage.setItem(
          claveBorrador(r.cliente),
          JSON.stringify({
            items: actual,
            pendiente: borrador.pendiente || null,
          }),
        );
        if (importar) {
          url.searchParams.delete("carrito");
          history.replaceState(history.state, "", url);
        }
        if (!actual.length && !r.apartados.length) setTab("buscar");
      } catch (e) {
        if (vivo && e.status !== 401) setError(e.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }
    cargar();
    return () => {
      vivo = false;
    };
  }, [inicio]);
  function guardar(lista, intento = null) {
    localStorage.setItem(
      claveBorrador(resumen.cliente),
      JSON.stringify({ items: lista, pendiente: intento }),
    );
    setItems(lista);
    setPendiente(intento);
    setAcepto(false);
  }
  function cambiar(lista) {
    if (!busy.current && !pendiente) {
      guardar(lista);
      setError("");
      setMensaje("");
    }
  }
  function agregar(p) {
    const encontrado = items.find((i) => i.clave === p.clave);
    if (encontrado?.cantidad >= 999 || (!encontrado && items.length >= 250)) {
      setError("Alcanzaste el límite de esta selección.");
      return;
    }
    cambiar(
      encontrado
        ? items.map((i) =>
            i.clave === p.clave
              ? { ...i, ...p, cantidad: i.cantidad + 1, disponible: true }
              : i,
          )
        : [...items, { ...p, cantidad: 1, disponible: true }],
    );
  }
  async function ver(id) {
    const version = ++versionDetalle.current;
    setError("");
    setMensaje("");
    try {
      const d = await pedir(api + "?modo=detalle&id=" + id);
      if (version === versionDetalle.current) {
        setDetalle(d);
        window.scrollTo(0, 0);
      }
    } catch (e) {
      if (version === versionDetalle.current) setError(e.message);
    }
  }
  async function confirmar() {
    if (busy.current || (!pendiente && !acepto)) return;
    busy.current = true;
    setEnviando(true);
    setError("");
    setMensaje("");
    let intento = pendiente || {
      accion: "apartar",
      solicitud: crypto.randomUUID(),
      destino: destino || null,
      compromiso: true,
      lineas: items.map(({ clave, cantidad, mayor }) => ({
        clave,
        cantidad,
        mayor,
      })),
    };
    let confirmado = false;
    try {
      const guardado = leerGuardado(claveBorrador(resumen.cliente), {
        items: [],
      });
      if (JSON.stringify(guardado.items) !== JSON.stringify(items)) {
        setMensaje(
          "Tu selección cambió en otra pestaña. Revísala antes de confirmar.",
        );
        setAcepto(false);
        setInicio((n) => n + 1);
        return;
      }
      intento = guardado.pendiente || intento;
      guardar(items, intento);
      const d = await pedir(api, intento);
      confirmado = true;
      // Clear only the units imported from the wholesale cart.
      const key = claveCarrito(resumen.cliente);
      localStorage.setItem(
        key,
        JSON.stringify(descontarConfirmados(leerGuardado(key, []), items)),
      );
      guardar([]);
      setTab("seleccion");
      const [r, doc] = await Promise.all([
        pedir(),
        pedir(api + "?modo=detalle&id=" + d.id),
      ]);
      elegirResumen(r, d.id);
      setDetalle(doc);
      setMensaje("Tus productos quedaron registrados en " + doc.codigo + ".");
      window.scrollTo(0, 0);
    } catch (e) {
      if (e.status === 401) return; // Keep the pending request across sign-in.
      if (confirmado) {
        setMensaje(
          "El apartado quedó registrado. Recarga para ver el detalle.",
        );
      } else if (e.status && e.status < 500) {
        guardar(items);
        setError(e.message);
        try {
          const [r, lista] = await Promise.all([pedir(), revisar(items)]);
          elegirResumen(r, destino);
          guardar(lista);
        } catch {}
      } else
        setError(
          "No recibimos la confirmación. Usa «Comprobar envío» para recuperar el resultado sin duplicar productos.",
        );
    } finally {
      busy.current = false;
      setEnviando(false);
    }
  }
  const abiertos =
    resumen?.apartados.filter((a) => a.estado === "Abierto") || [];
  const bloqueado = resumen?.bloqueado === true,
    fijo = enviando || Boolean(pendiente),
    noDisponibles = items.some((i) => !i.disponible);
  return (
    <main className="ca-shell ap-shell">
      <header className="ca-header">
        <div className="ca-header-inner">
          <a className="ap-back" href="/admin">
            ← Mi tienda
          </a>
          <InstalarPortal />
        </div>
      </header>
      <div className="ap-wrap">
        <h1>Mis apartados</h1>
        {cargando && <p role="status">Consultando tus apartados…</p>}
        {error && (
          <div role="alert" className="ca-notice ca-error">
            {error}{" "}
            {!resumen && (
              <button onClick={() => setInicio((n) => n + 1)}>
                Volver a intentar
              </button>
            )}
          </div>
        )}
        {mensaje && (
          <p role="status" className="ca-notice ca-success">
            {mensaje}
          </p>
        )}
        {resumen && !cargando && (
          <>
            {bloqueado && (
              <p className="ap-aviso">
                Tu cuenta tiene una penalización activa. Puedes consultar tus
                apartados y sus PDF. Habla con el equipo de RA para volver a
                apartar.
              </p>
            )}
            {detalle ? (
              <Detalle
                doc={detalle}
                cerrar={() => {
                  ++versionDetalle.current;
                  setDetalle(null);
                  setMensaje("");
                }}
              />
            ) : (
              <>
                {resumen.apartados.length > 0 && (
                  <section className="ap-panel">
                    <h2>Tus apartados con RA</h2>
                    <div className="ap-docs">
                      {resumen.apartados.map((a) => (
                        <button key={a.id} onClick={() => ver(a.id)}>
                          <span>
                            <b>{a.codigo}</b>
                            <small>
                              {fecha(a.fecha)} · {a.estado}
                            </small>
                          </span>
                          <span>
                            {a.unidades} ud. · {pesos(a.total)}{" "}
                            <b aria-hidden="true">›</b>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {(!bloqueado || pendiente) && (
                  <>
                    <nav className="ap-tabs" aria-label="Preparar apartado">
                      <button
                        aria-pressed={tab === "seleccion"}
                        onClick={() => setTab("seleccion")}
                      >
                        Mi selección (
                        {items.reduce((n, i) => n + i.cantidad, 0)})
                      </button>
                      <button
                        disabled={fijo}
                        aria-pressed={tab === "buscar"}
                        onClick={() => setTab("buscar")}
                      >
                        Buscar productos
                      </button>
                    </nav>
                    {tab === "buscar" && !fijo ? (
                      <>
                        <Catalogo agregar={agregar} bloqueado={bloqueado} />
                        {items.length > 0 && (
                          <button
                            className="ap-sticky ca-primary"
                            onClick={() => {
                              setTab("seleccion");
                              window.scrollTo(0, 0);
                            }}
                          >
                            Revisar selección · {pesos(suma(items))} →
                          </button>
                        )}
                      </>
                    ) : (
                      <section className="ap-panel">
                        <h2>
                          {abiertos.length
                            ? "Agregar a mi apartado"
                            : "Iniciar un apartado"}
                        </h2>
                        {!items.length ? (
                          <>
                            <p>
                              Elige los productos que quieres que RA te guarde.
                            </p>
                            <button
                              className="ca-primary"
                              onClick={() => setTab("buscar")}
                            >
                              Buscar productos
                            </button>{" "}
                            <a className="ap-back" href="/admin/productos">
                              Ir al carrito mayorista
                            </a>
                          </>
                        ) : (
                          <>
                            {items.map((i) => (
                              <article className="ap-item" key={i.clave}>
                                <Foto p={i} />
                                <div>
                                  <small>{i.referencia}</small>
                                  <strong>{i.nombre}</strong>
                                  <Precios p={i} />
                                  {!i.disponible && (
                                    <b className="ap-baja">Ya no disponible</b>
                                  )}
                                  <div className="ap-qty">
                                    <button
                                      aria-label={"Restar " + i.referencia}
                                      disabled={fijo || i.cantidad <= 1}
                                      onClick={() =>
                                        cambiar(
                                          items.map((x) =>
                                            x === i
                                              ? {
                                                  ...x,
                                                  cantidad: x.cantidad - 1,
                                                }
                                              : x,
                                          ),
                                        )
                                      }
                                    >
                                      −
                                    </button>
                                    <label>
                                      Cant.{" "}
                                      <input
                                        type="number"
                                        aria-label={
                                          "Cantidad de " + i.referencia
                                        }
                                        value={i.cantidad}
                                        min="1"
                                        max="999"
                                        disabled={fijo}
                                        onChange={(e) => {
                                          const n = Number(e.target.value);
                                          if (
                                            Number.isSafeInteger(n) &&
                                            n >= 1 &&
                                            n <= 999
                                          )
                                            cambiar(
                                              items.map((x) =>
                                                x === i
                                                  ? { ...x, cantidad: n }
                                                  : x,
                                              ),
                                            );
                                        }}
                                      />
                                    </label>
                                    <button
                                      aria-label={"Sumar " + i.referencia}
                                      disabled={fijo || i.cantidad >= 999}
                                      onClick={() => agregar(i)}
                                    >
                                      +
                                    </button>
                                    <button
                                      className="ap-quitar"
                                      disabled={fijo}
                                      onClick={() =>
                                        cambiar(items.filter((x) => x !== i))
                                      }
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                            <div className="ap-total">
                              <span>Total al por mayor</span>
                              <b>{pesos(suma(items))}</b>
                            </div>
                            {abiertos.length > 1 ? (
                              <label className="ap-field">
                                Apartado que recibirá los productos
                                <select
                                  disabled={fijo}
                                  value={destino}
                                  onChange={(e) => {
                                    setDestino(e.target.value);
                                    setAcepto(false);
                                  }}
                                >
                                  <option value="">
                                    Selecciona un apartado
                                  </option>
                                  {abiertos.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.codigo} · {fecha(a.fecha)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              abiertos.length === 1 && (
                                <p>
                                  Estas unidades se agregarán a{" "}
                                  <b>{abiertos[0].codigo}</b>.
                                </p>
                              )
                            )}
                            <div className="ap-compromiso">
                              <h3>Antes de apartar</h3>
                              <p>
                                Contamos como vendidos los productos que
                                confirmes y los guardamos para ti. Aparta solo
                                lo que estés seguro de comprar. Una vez
                                confirmado, únicamente el equipo de RA puede
                                retirar productos o cambiar cantidades.
                              </p>
                              <label>
                                <input
                                  type="checkbox"
                                  disabled={fijo}
                                  checked={acepto || Boolean(pendiente)}
                                  onChange={(e) => setAcepto(e.target.checked)}
                                />{" "}
                                Revisé las referencias y cantidades y me
                                comprometo a comprar estos productos.
                              </label>
                            </div>
                            <button
                              className="ca-primary ap-confirm"
                              disabled={
                                enviando ||
                                (!pendiente &&
                                  (!acepto ||
                                    bloqueado ||
                                    noDisponibles ||
                                    (abiertos.length > 0 && !destino)))
                              }
                              onClick={confirmar}
                            >
                              {enviando
                                ? "Confirmando…"
                                : pendiente
                                  ? "Comprobar envío"
                                  : abiertos.length
                                    ? "Confirmar y agregar a mi apartado"
                                    : "Confirmar e iniciar apartado"}
                            </button>
                          </>
                        )}
                      </section>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
