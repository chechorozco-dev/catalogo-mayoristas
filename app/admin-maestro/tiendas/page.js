"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const PERIODOS = [7, 30, 90];

function dinero(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function numero(valor) {
  return new Intl.NumberFormat("es-CO").format(Number(valor || 0));
}

function fecha(valor) {
  if (!valor) return "Sin actividad en el período";
  const date = new Date(valor);
  if (!Number.isFinite(date.getTime())) return "Sin actividad en el período";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

function enlaceWhatsapp(valor) {
  let numero = String(valor || "").replace(/\D/g, "");
  if (numero.length === 10 && numero.startsWith("3")) numero = "57" + numero;
  return /^\d{10,15}$/.test(numero) ? `https://wa.me/${numero}` : "";
}

function esRA(tienda) {
  return String(tienda.tipo || "").toUpperCase() === "RA";
}

export default function ResumenTiendasMaestro() {
  const router = useRouter();
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("TODAS");
  const [tipo, setTipo] = useState("TODOS");
  const [orden, setOrden] = useState("ACTIVIDAD");

  useEffect(() => {
    let vivo = true;
    let controlador = null;

    async function cargar(inicial = false) {
      if (controlador) controlador.abort();
      controlador = new AbortController();
      if (inicial) setCargando(true);
      else setActualizando(true);

      try {
        const respuesta = await fetch(
          `/api/admin-maestro/tiendas?dias=${dias}`,
          { cache: "no-store", signal: controlador.signal }
        );

        if (respuesta.status === 401) {
          router.replace("/login");
          return;
        }
        if (respuesta.status === 403) {
          router.replace("/admin");
          return;
        }

        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) {
          throw new Error(json.error || "No pudimos cargar las tiendas.");
        }
        if (vivo) {
          setDatos(json);
          setError("");
        }
      } catch (err) {
        if (vivo && err.name !== "AbortError") {
          setError(err.message || "Error de conexión.");
        }
      } finally {
        if (vivo) {
          setCargando(false);
          setActualizando(false);
        }
      }
    }

    cargar(true);

    // Actualización liviana, únicamente cuando esta pestaña está visible.
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, 60000);

    // Permite el botón de actualizar sin crear otro temporizador.
    const actualizarManual = () => cargar(false);
    window.addEventListener("actualizar-resumen-tiendas", actualizarManual);

    return () => {
      vivo = false;
      if (controlador) controlador.abort();
      clearInterval(intervalo);
      window.removeEventListener("actualizar-resumen-tiendas", actualizarManual);
    };
  }, [dias, router]);

  const tiendasFiltradas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");

    const lista = (datos?.tiendas || []).filter((t) => {
      if (estado === "ACTIVAS" && !t.activa) return false;
      if (estado === "INACTIVAS" && t.activa) return false;
      if (tipo === "RA" && !esRA(t)) return false;
      if (tipo === "CLIENTES" && esRA(t)) return false;

      return (
        !consulta ||
        [t.nombre, t.slug, t.whatsapp].some((x) =>
          String(x || "").toLocaleLowerCase("es").includes(consulta)
        )
      );
    });

    return lista.sort((a, b) => {
      if (orden === "CARRITOS") return b.carritos - a.carritos;
      if (orden === "CHECKOUT") return b.checkout - a.checkout;
      if (orden === "COMPLETADOS") return b.completados - a.completados;
      if (orden === "NOMBRE") return a.nombre.localeCompare(b.nombre, "es");

      const aFecha = Date.parse(a.ultimaActividad || "") || 0;
      const bFecha = Date.parse(b.ultimaActividad || "") || 0;
      return bFecha - aFecha || a.nombre.localeCompare(b.nombre, "es");
    });
  }, [datos, busqueda, estado, tipo, orden]);

  function actualizar() {
    window.dispatchEvent(new Event("actualizar-resumen-tiendas"));
  }

  const resumen = datos?.resumen || {};
  const periodo = datos?.dias || dias;

  return (
    <main className={styles.pagina}>
      <div className={styles.contenedor}>
        <button className={styles.volver} onClick={() => router.push("/admin-maestro")}>
          ← Volver al panel maestro
        </button>

        <header className={styles.encabezado}>
          <div>
            <span className={styles.badge}>ADMINISTRADOR MAESTRO</span>
            <h1>🏪 Todas mis tiendas</h1>
            <p>Un solo lugar para revisar tus tiendas, accesos y carritos.</p>
          </div>
          <button
            type="button"
            className={styles.botonActualizar}
            disabled={cargando || actualizando}
            onClick={actualizar}
          >
            {actualizando ? "Actualizando…" : "↻ Actualizar"}
          </button>
        </header>

        <div className={styles.periodos} aria-label="Período de actividad">
          <strong>Actividad de los últimos:</strong>
          {PERIODOS.map((periodoOpcion) => (
            <button
              key={periodoOpcion}
              type="button"
              className={dias === periodoOpcion ? styles.periodoActivo : styles.periodo}
              aria-pressed={dias === periodoOpcion}
              onClick={() => setDias(periodoOpcion)}
            >
              {periodoOpcion} días
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className={styles.error}>
            {error} {datos && "Se mantienen los últimos datos cargados."}
          </div>
        )}

        {cargando && !datos ? (
          <div className={styles.cargando}>Consultando tus tiendas y carritos…</div>
        ) : (
          <>
            <div className={styles.resumen}>
              <div className={styles.resumenCaja}>
                <span>Tiendas registradas</span>
                <strong>{numero(resumen.totalTiendas)}</strong>
                <small>{numero(resumen.tiendasActivas)} activas · {numero(resumen.tiendasInactivas)} inactivas</small>
              </div>
              <div className={styles.resumenCaja}>
                <span>Carritos registrados</span>
                <strong>{numero(resumen.carritos)}</strong>
                <small>Últimos {periodo} días</small>
              </div>
              <div className={styles.resumenCaja}>
                <span>En checkout</span>
                <strong>{numero(resumen.checkout)}</strong>
                <small>{numero(resumen.enProceso)} armando pedido</small>
              </div>
              <div className={styles.resumenCaja}>
                <span>Carritos completados</span>
                <strong>{numero(resumen.completados)}</strong>
                <small>No equivale a ventas pagadas</small>
              </div>
              <div className={styles.resumenCaja}>
                <span>Sin actividad 24 h</span>
                <strong>{numero(resumen.sinActividad24h)}</strong>
                <small>Carritos pendientes, no necesariamente abandonados</small>
              </div>
              <div className={styles.resumenCaja}>
                <span>Valor de carritos completados</span>
                <strong className={styles.importe}>{dinero(resumen.valorCompletados)}</strong>
                <small>Estimación, no ingresos confirmados</small>
              </div>
            </div>

            <p className={styles.aviso}>
              ℹ️ Las cifras provienen de carritos web, no de pagos ni facturas.
              Los estados y precios pueden cambiar. Se muestran únicamente a administradores maestros.
            </p>

            <div className={styles.cabeceraListado}>
              <div>
                <h2>Directorio de tiendas</h2>
                <p>{numero(tiendasFiltradas.length)} de {numero(datos?.tiendas?.length)} tiendas</p>
              </div>
              <span className={styles.actualizado}>
                Actualizado: {fecha(datos?.generadoEn)}
              </span>
            </div>

            <div className={styles.filtros}>
              <label className={styles.buscar}>
                <span>Buscar tienda</span>
                <input
                  type="search"
                  placeholder="Nombre, enlace o WhatsApp"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                />
              </label>
              <label>
                <span>Estado</span>
                <select value={estado} onChange={(event) => setEstado(event.target.value)}>
                  <option value="TODAS">Todas</option>
                  <option value="ACTIVAS">Activas</option>
                  <option value="INACTIVAS">Inactivas</option>
                </select>
              </label>
              <label>
                <span>Tipo</span>
                <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
                  <option value="TODOS">Todas</option>
                  <option value="RA">Tienda RA</option>
                  <option value="CLIENTES">Revendedores</option>
                </select>
              </label>
              <label>
                <span>Ordenar por</span>
                <select value={orden} onChange={(event) => setOrden(event.target.value)}>
                  <option value="ACTIVIDAD">Última actividad</option>
                  <option value="CARRITOS">Más carritos</option>
                  <option value="CHECKOUT">Más checkouts</option>
                  <option value="COMPLETADOS">Más completados</option>
                  <option value="NOMBRE">Nombre</option>
                </select>
              </label>
            </div>

            {tiendasFiltradas.length === 0 ? (
              <div className={styles.vacio}>
                No encontramos tiendas con esos filtros.
              </div>
            ) : (
              <div className={styles.lista}>
                {tiendasFiltradas.map((tienda) => {
                  const whatsapp = enlaceWhatsapp(tienda.whatsapp);
                  const linkTienda = tienda.slug
                    ? `/${encodeURIComponent(tienda.slug)}`
                    : "";
                  const tasa =
                    tienda.carritos > 0
                      ? Math.round((tienda.completados / tienda.carritos) * 100)
                      : 0;

                  return (
                    <article key={tienda.id} className={styles.tarjeta}>
                      <div className={styles.superior}>
                        <div>
                          <div className={styles.etiquetas}>
                            <span className={tienda.activa ? styles.activa : styles.inactiva}>
                              {tienda.activa ? "● Activa" : "● Inactiva"}
                            </span>
                            <span className={styles.tipoTienda}>
                              {esRA(tienda) ? "RA Accesorios" : "Tienda revendedora"}
                            </span>
                          </div>
                          <h3>{tienda.nombre}</h3>
                          <p className={styles.slug}>{tienda.slug ? `/${tienda.slug}` : "Sin enlace configurado"}</p>
                        </div>
                        <div className={styles.ultimaActividad}>
                          <span>Última actividad de carrito</span>
                          <strong>{fecha(tienda.ultimaActividad)}</strong>
                        </div>
                      </div>

                      <div className={styles.metricas}>
                        <div><strong>{numero(tienda.carritos)}</strong><span>Carritos</span></div>
                        <div><strong>{numero(tienda.enProceso)}</strong><span>Armando</span></div>
                        <div><strong>{numero(tienda.checkout)}</strong><span>Checkout</span></div>
                        <div><strong>{numero(tienda.completados)}</strong><span>Completados</span></div>
                        <div><strong>{numero(tienda.sinActividad24h)}</strong><span>Sin actividad 24h</span></div>
                        <div><strong>{numero(tienda.accesosActivos)}</strong><span>Accesos activos</span></div>
                      </div>

                      <div className={styles.inferior}>
                        <div className={styles.montos}>
                          <span><b>{tasa}%</b> finalización de carritos</span>
                          <span>Valor completado: <b>{dinero(tienda.valorCompletados)}</b></span>
                        </div>
                        <div className={styles.acciones}>
                          {linkTienda && (
                            <a href={linkTienda} target="_blank" rel="noopener noreferrer" className={styles.secundario}>
                              ↗ Abrir tienda
                            </a>
                          )}
                          {whatsapp && (
                            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.secundario}>
                              WhatsApp
                            </a>
                          )}
                          <a
                            href={`/admin-maestro/carritos?tienda=${encodeURIComponent(tienda.id)}`}
                            className={styles.primario}
                          >
                            🛒 Ver sus carritos
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
