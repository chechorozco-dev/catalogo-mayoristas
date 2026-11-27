"use client";
import { useEffect, useRef, useState } from "react";
import { fechaApartado as fecha } from "../../../lib/apartados/fechas.mjs";
import { formatoPrecio as pesos } from "../../../lib/catalogo/formatos.mjs";
import {
  claveBorrador,
  claveCarrito,
  combinarCarrito,
  descontarConfirmados,
  leerGuardado,
} from "../../../lib/apartados/carrito.mjs";
import FichaCliente from "./FichaCliente";
import InstalarPortal from "../components/InstalarPortal";
import "../cliente-admin.css";
import "./apartados.css";

const api = "/api/apartados";
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
function Catalogo({
  agregar,
  bloqueado,
  porReferencia = false,
  revisarSeleccion,
}) {
  const [cantidades, setCantidades] = useState({});
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
    if (porReferencia && !q.trim()) {
      setProductos([]);
      setCarga(false);
      return;
    }
    const timer = setTimeout(
      () =>
        pedir(
          api +
            (porReferencia ? "?modo=referencia&q=" : "?modo=catalogo&q=") +
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
  }, [q, offset, revision, porReferencia]);
  return (
    <section className="ap-panel">
      <h2>
        {porReferencia
          ? "Anexar por referencia"
          : "Buscar productos para apartar"}
      </h2>
      <label className={"ap-field" + (porReferencia ? " ap-referencia" : "")}>
        {porReferencia
          ? "Referencia del accesorio"
          : "Referencia, letra o nombre"}
        <input
          type="search"
          maxLength={80}
          value={q}
          autoFocus={porReferencia}
          autoCapitalize="characters"
          placeholder={
            porReferencia ? "Ej. AC1057" : "Ej. RA7789 o collar letra"
          }
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
          {!productos.length && (!porReferencia || q.trim()) && (
            <p>No encontramos referencias disponibles para esa búsqueda.</p>
          )}
          <div className="ap-catalogo">
            {(porReferencia ? productos : productos.slice(0, 24)).map((p) => (
              <article className="ap-producto" key={p.clave}>
                <Foto p={p} />
                <div>
                  <small>{p.referencia}</small>
                  <strong>{p.nombre}</strong>
                  <Precios p={p} />
                </div>
                <div className="ap-elegir">
                  {porReferencia && (
                    <label className="ap-field">
                      Cantidad
                      <input
                        type="number"
                        min="1"
                        max="999"
                        step="1"
                        inputMode="numeric"
                        aria-label={"Unidades para anexar de " + p.referencia}
                        value={cantidades[p.clave] ?? 1}
                        onChange={(e) =>
                          setCantidades({
                            ...cantidades,
                            [p.clave]: e.target.value,
                          })
                        }
                      />
                    </label>
                  )}
                  <button
                    disabled={
                      bloqueado ||
                      (porReferencia &&
                        (!Number.isInteger(Number(cantidades[p.clave] ?? 1)) ||
                          Number(cantidades[p.clave] ?? 1) < 1 ||
                          Number(cantidades[p.clave] ?? 1) > 999))
                    }
                    aria-label={"Agregar " + p.referencia}
                    onClick={() => {
                      if (
                        !agregar(
                          p,
                          porReferencia ? Number(cantidades[p.clave] ?? 1) : 1,
                        )
                      )
                        return;
                      if (porReferencia) {
                        revisarSeleccion();
                        return;
                      }
                      setAviso("Agregado a la selección: " + p.referencia);
                    }}
                  >
                    {porReferencia ? "Agregar a mi selección" : "+ Agregar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!porReferencia && (offset > 0 || productos.length > 24) && (
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
function FichaApartado({ doc, completo = false }) {
  const unidades = completo
    ? doc.productos.reduce((n, p) => n + p.cantidad, 0)
    : doc.unidades;
  return (
    <>
      <div className="ap-identidad">
        <div>
          <small>Número de apartado</small>
          <h2>{doc.codigo}</h2>
        </div>
        <span className="ap-estado">{doc.estado}</span>
      </div>
      <dl className="ap-datos">
        <div>
          <dt>Forma de pago</dt>
          <dd>
            {{
              SIN_DEFINIR: "Por definir",
              CONTADO: "Contado",
              CONTADO_CON_ENVIO: "Contado con envío",
              PAGO_EN_CASA: "Pago en casa",
              RECOGE_EN_LOCAL: "Recoge en el local",
              COTIZACION: "Cotización",
            }[doc.forma_pago] ||
              (doc.forma_pago || "Por definir")
                .replaceAll("_", " ")
                .toLowerCase()}
          </dd>
        </div>
        <div>
          <dt>Fecha de inicio</dt>
          <dd>{fecha(doc.fecha)}</dd>
        </div>
        <div>
          <dt>Último producto agregado</dt>
          <dd>{fecha(doc.ultimo_producto_en)}</dd>
        </div>
        {completo && (
          <div>
            <dt>Vencimiento</dt>
            <dd>
              {doc.vence_en ? fecha(doc.vence_en) : "Sin fecha programada"}
            </dd>
          </div>
        )}
        <div>
          <dt>Unidades apartadas</dt>
          <dd>{unidades}</dd>
        </div>
        <div>
          <dt>Total al por mayor</dt>
          <dd>{pesos(completo ? suma(doc.productos) : doc.total)}</dd>
        </div>
      </dl>
    </>
  );
}
function TarjetaApartado({ doc, ver, agregar, guardarFicha }) {
  return (
    <article
      className="ap-panel ap-tarjeta"
      aria-label={"Apartado " + doc.codigo}
    >
      <FichaApartado doc={doc} />
      <FichaCliente doc={doc} pedir={pedir} guardar={guardarFicha} />
      <div className="ap-acciones">
        <button className="ca-primary" onClick={() => ver(doc.id)}>
          Ver detalles
        </button>
        {agregar && (
          <>
            <button onClick={() => agregar(doc.id, "referencia")}>
              Anexar por referencia
            </button>
            <button onClick={() => agregar(doc.id)}>Agregar productos</button>
          </>
        )}
      </div>
    </article>
  );
}
function DescargarPdf({ doc }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const href = api + "?modo=pdf&id=" + doc.id;
  async function descargar(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (cargando) return;
    setCargando(true);
    setError("");
    try {
      const r = await fetch(href, { cache: "no-store" });
      if (!r.ok) {
        const datos = await r.json().catch(() => ({}));
        throw Error(
          datos.mensaje || "No pudimos descargar el PDF. Inténtalo nuevamente.",
        );
      }
      const archivo = await r.blob(),
        url = URL.createObjectURL(archivo),
        enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "RA_" + doc.codigo + "_MEDIA_CARTA.pdf";
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }
  return (
    <>
      <a
        className="ca-outline ap-link"
        href={href}
        aria-busy={cargando}
        onClick={descargar}
      >
        {cargando ? "Preparando PDF…" : "Descargar PDF"}
      </a>
      {error && (
        <span role="alert" className="ca-error">
          {error}
        </span>
      )}
    </>
  );
}
function Detalle({ doc, cerrar, agregar, guardarFicha }) {
  return (
    <section className="ap-panel ap-detalle">
      <button className="ap-regresar" onClick={cerrar}>
        ← Volver a mis apartados
      </button>
      <FichaApartado doc={doc} completo />
      <FichaCliente doc={doc} pedir={pedir} guardar={guardarFicha} />
      <div className="ap-acciones">
        {agregar && (
          <>
            <button
              className="ca-primary"
              onClick={() => agregar(doc.id, "referencia")}
            >
              Anexar por referencia
            </button>
            <button onClick={() => agregar(doc.id)}>
              Agregar productos a {doc.codigo}
            </button>
          </>
        )}
        <DescargarPdf doc={doc} />
      </div>
      <h3 className="ap-titulo-productos">Productos de tu apartado</h3>
      {!doc.productos.length && (
        <p>Este apartado todavía no tiene productos registrados.</p>
      )}
      {doc.productos.map((p) => (
        <article key={p.id} className="ap-item">
          <Foto p={p} />
          <div>
            <small>
              {p.referencia} · {p.estado}
            </small>
            <strong>{p.nombre}</strong>
            <Precios p={p} />
            <small>
              {p.agregado_en
                ? "Agregado el " + fecha(p.agregado_en)
                : "Fecha de ingreso sin registrar"}
            </small>
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
    [enviando, setEnviando] = useState(false),
    [pendiente, setPendiente] = useState(null);
  const [tab, setTab] = useState("resumen"),
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
        if (!vivo) return;
        elegirResumen(r);
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
        setTab(
          borrador.pendiente || (importar && actual.length > 0)
            ? "seleccion"
            : "resumen",
        );
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
  }
  function cambiar(lista) {
    if (!busy.current && !pendiente) {
      guardar(lista);
      setError("");
      setMensaje("");
    }
  }
  function agregar(p, cantidad = 1) {
    if (
      busy.current ||
      pendiente ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > 999
    )
      return false;
    const encontrado = items.find((i) => i.clave === p.clave);
    if (
      (encontrado?.cantidad || 0) + cantidad > 999 ||
      (!encontrado && items.length >= 250)
    ) {
      setError("Alcanzaste el límite de esta selección.");
      return;
    }
    cambiar(
      encontrado
        ? items.map((i) =>
            i.clave === p.clave
              ? {
                  ...i,
                  ...p,
                  cantidad: i.cantidad + cantidad,
                  disponible: true,
                }
              : i,
          )
        : [...items, { ...p, cantidad, disponible: true }],
    );
    return true;
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
    if (
      busy.current ||
      (!pendiente &&
        (!items.length ||
          bloqueado ||
          noDisponibles ||
          (abiertos.length && !destino)))
    )
      return;
    busy.current = true;
    setEnviando(true);
    setError("");
    setMensaje("");
    let intento = pendiente || {
      accion: "apartar",
      solicitud: crypto.randomUUID(),
      destino: destino || null,
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
      setTab("resumen");
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
  const anteriores =
    resumen?.apartados.filter((a) => a.estado !== "Abierto") || [];
  const elegido = abiertos.find((a) => a.id === destino);
  function preparar(id, vista = "buscar") {
    if (bloqueado || fijo) return;
    ++versionDetalle.current;
    setDestino(id || "");
    setDetalle(null);
    setError("");
    setMensaje("");
    setTab(vista);
    window.scrollTo(0, 0);
  }
  function guardarFicha(id, ficha) {
    const actualizar = (doc) =>
      doc?.id === id
        ? {
            ...doc,
            ficha,
            destinatario:
              doc.destinatario && doc.destinatario === doc.ficha?.nombre
                ? ficha.nombre
                : doc.destinatario,
          }
        : doc;
    setDetalle(actualizar);
    setResumen((prev) => ({
      ...prev,
      apartados: prev.apartados.map(actualizar),
    }));
    setMensaje("Guardamos tus datos en WhatsApp Lab.");
    // Other documents may share the same contact or have their own recipient.
    pedir()
      .then((r) => setResumen(r))
      .catch(() => {});
  }
  function volver() {
    ++versionDetalle.current;
    setDetalle(null);
    setError("");
    setMensaje("");
    setTab("resumen");
    window.scrollTo(0, 0);
  }
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
                guardarFicha={guardarFicha}
                cerrar={volver}
                agregar={
                  detalle.estado === "Abierto" && !bloqueado && !fijo
                    ? preparar
                    : null
                }
              />
            ) : (
              <>
                {tab === "resumen" && (
                  <>
                    {abiertos.length === 0 ? (
                      <section className="ap-panel ap-inicio">
                        <h2>
                          {resumen.apartados.length
                            ? "No tienes un apartado abierto"
                            : "Todavía no tienes apartados"}
                        </h2>
                        {!bloqueado && (
                          <>
                            <p>
                              Elige tus productos y confirma la selección. Al
                              confirmar verás tu número APT y la fecha de
                              inicio.
                            </p>
                            <button
                              className="ca-primary"
                              onClick={() => preparar(null)}
                            >
                              Iniciar apartado
                            </button>
                          </>
                        )}
                      </section>
                    ) : (
                      <section aria-label="Apartados abiertos">
                        <h2 className="ap-subtitulo">
                          {abiertos.length === 1
                            ? "Tu apartado abierto"
                            : "Tus apartados abiertos"}
                        </h2>
                        {abiertos.map((a) => (
                          <TarjetaApartado
                            key={a.id}
                            doc={a}
                            guardarFicha={guardarFicha}
                            ver={ver}
                            agregar={!bloqueado && !fijo ? preparar : null}
                          />
                        ))}
                      </section>
                    )}
                    {!!items.length && !bloqueado && (
                      <div className="ap-borrador">
                        <span>Tienes productos pendientes de confirmar.</span>
                        <button onClick={() => setTab("seleccion")}>
                          Revisar mi selección
                        </button>
                      </div>
                    )}
                    {anteriores.length > 0 && (
                      <section aria-label="Historial de apartados">
                        <h2 className="ap-subtitulo">Historial de apartados</h2>
                        {anteriores.map((a) => (
                          <TarjetaApartado key={a.id} doc={a} ver={ver} />
                        ))}
                      </section>
                    )}
                  </>
                )}
                {tab !== "resumen" && (!bloqueado || pendiente) && (
                  <>
                    <div className="ap-flujo">
                      {!fijo && (
                        <button className="ap-regresar" onClick={volver}>
                          ← Volver a mis apartados
                        </button>
                      )}
                      <h2>
                        {elegido
                          ? "Agregar productos a " + elegido.codigo
                          : abiertos.length
                            ? "Agregar a un apartado"
                            : "Iniciar apartado"}
                      </h2>
                      {tab === "buscar" && (
                        <p>
                          Agrega las referencias que necesitas y abre «Revisar
                          selección» para confirmarlas.
                        </p>
                      )}
                    </div>
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
                    {(tab === "buscar" || tab === "referencia") && !fijo ? (
                      <>
                        <Catalogo
                          key={tab}
                          revisarSeleccion={() => {
                            setTab("seleccion");
                            window.scrollTo(0, 0);
                          }}
                          porReferencia={tab === "referencia"}
                          agregar={agregar}
                          bloqueado={bloqueado}
                        />
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
                        <h2>Revisa tu selección</h2>
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
                              <h3>Los guardamos para ti</h3>
                              <p>
                                Cuando confirmes, contaremos estos accesorios
                                como vendidos y te los guardaremos. Elige solo
                                los que quieras comprar y revisa las cantidades.
                                Si después necesitas algún ajuste, escríbenos y
                                te ayudamos.
                              </p>
                            </div>
                            <button
                              className="ca-primary ap-confirm"
                              disabled={
                                enviando ||
                                (!pendiente &&
                                  (bloqueado ||
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
