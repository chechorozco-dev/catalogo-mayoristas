"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import "./cliente-admin.css";
import EditorTienda from "./components/EditorTienda";
import PanelAnuncios from "./components/PanelAnuncios";
import CompartirCatalogo from "./components/CompartirCatalogo";

export default function AdminPage() {
  const router =
    useRouter();

  const [
    cliente,
    setCliente,
  ] = useState(null);

  const [
    tienda,
    setTienda,
  ] = useState(null);

  const [
    anuncios,
    setAnuncios,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    cargandoAnuncios,
    setCargandoAnuncios,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    cerrando,
    setCerrando,
  ] = useState(false);

  const [
    seccionActiva,
    setSeccionActiva,
  ] = useState("inicio");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    try {
      /* SESIÓN */

      const sesionResponse =
        await fetch(
          "/api/auth/sesion",
          {
            method: "GET",
            cache:
              "no-store",
          }
        );

      const sesionData =
        await sesionResponse.json();

      if (
        !sesionResponse.ok ||
        !sesionData.autenticado
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      if (
        !sesionData.cliente
          ?.tienda_id
      ) {
        router.replace(
          "/crear-tienda"
        );

        return;
      }

      /* TIENDA */

      const tiendaResponse =
        await fetch(
          "/api/tiendas/mi-tienda",
          {
            method: "GET",
            cache:
              "no-store",
          }
        );

      const tiendaData =
        await tiendaResponse.json();

      if (
        tiendaData.necesita_tienda
      ) {
        router.replace(
          "/crear-tienda"
        );

        return;
      }

      if (
        !tiendaResponse.ok ||
        !tiendaData.ok
      ) {
        setMensaje(
          tiendaData.mensaje ||
            "No pudimos cargar tu tienda."
        );

        return;
      }

      setCliente(
        tiendaData.cliente ||
          sesionData.cliente
      );

      setTienda(
        tiendaData.tienda
      );

      await cargarAnuncios(
        false
      );
    } catch (error) {
      console.error(
        "Error cargando admin:",
        error
      );

      setMensaje(
        "No pudimos cargar tu catálogo."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarAnuncios(
    mostrarCarga = true
  ) {
    if (mostrarCarga) {
      setCargandoAnuncios(
        true
      );
    }

    try {
      const response =
        await fetch(
          "/api/anuncios",
          {
            method: "GET",
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        console.error(
          "No se pudieron cargar anuncios",
          data
        );

        return;
      }

      setAnuncios(
        Array.isArray(
          data.anuncios
        )
          ? data.anuncios
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando anuncios:",
        error
      );
    } finally {
      if (mostrarCarga) {
        setCargandoAnuncios(
          false
        );
      }
    }
  }

  async function cerrarSesion() {
    if (cerrando) {
      return;
    }

    setCerrando(true);

    try {
      await fetch(
        "/api/auth/cerrar-sesion",
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error(error);
    }

    router.replace(
      "/login"
    );

    router.refresh();
  }

  function verCatalogo() {
    if (!tienda) {
      return;
    }

    window.open(
      `/${tienda.slug}`,
      "_blank", "noopener,noreferrer"
    );
  }

  function verProductos() {
    router.push(
      "/admin/productos"
    );
  }


  const secciones = [
    ["inicio", "Inicio"], ["productos", "Productos"],
    ["tienda", "Mi tienda"], ["anuncios", "Avisos"], ["compartir", "Compartir"],
  ];
  function navegar(id) {
    if (id === "productos") { verProductos(); return; }
    setSeccionActiva(id);
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  if (cargando) return <main className="ca-shell ca-centered">
    <div role="status" className="ca-state"><span className="ca-mark">RA</span>
      <h1>Preparando tu tienda</h1><p>En un momento podrás organizar tu catálogo.</p></div>
  </main>;
  if (!tienda) return <main className="ca-shell ca-centered"><div className="ca-state">
    <h1>No pudimos abrir tu tienda</h1><p role="alert">{mensaje || "Revisa tu conexión e inténtalo de nuevo."}</p>
    <button className="ca-primary" onClick={cargarDatos}>Volver a intentar</button>
  </div></main>;
  const activos = anuncios.filter(a => a.activo);
  return <main className="ca-shell">
    <a className="ca-skip" href="#ca-content">Ir al contenido</a>
    <header className="ca-header"><div className="ca-header-inner">
      <div className="ca-brand"><span className="ca-mark" aria-hidden="true">RA</span>
        <div><span className="ca-eyebrow">MI NEGOCIO</span><strong>Administra tu catálogo</strong></div></div>
      <button className="ca-outline" onClick={verCatalogo}>Ver mi catálogo ↗</button>
    </div></header>
    <div className="ca-layout">
      <nav className="ca-nav" aria-label="Administración de mi tienda">
        {secciones.map(([id,label]) => <button type="button" key={id}
          aria-current={seccionActiva === id ? "page" : undefined}
          onClick={() => navegar(id)}>{label}{id === "productos" && <span aria-hidden="true"> ↗</span>}</button>)}
      </nav>
      <div className="ca-body" id="ca-content">
        {mensaje && <div role={mensaje.startsWith("✅") ? "status" : "alert"}
          className={"ca-notice " + (mensaje.startsWith("✅") ? "ca-success" : "ca-error")}>{mensaje}</div>}
        <section className="ca-store" aria-label="Tu tienda">
          <div className="ca-store-identity">
            <div className="ca-logo">{tienda.logo_url ?
              <img src={tienda.logo_url} alt="" /> : <span aria-hidden="true">◇</span>}</div>
            <div><span className="ca-eyebrow">TU TIENDA</span><h1>{tienda.nombre_tienda}</h1>
              <p>/{tienda.slug}</p></div>
          </div>
          <button className="ca-text-button" onClick={() => navegar("tienda")}>Personalizar tienda →</button>
        </section>
        {seccionActiva === "inicio" && <>
          <div className="ca-intro"><span className="ca-eyebrow">TODO A MANO</span>
            <h2>Hola{cliente?.nombre ? ", " + cliente.nombre : ""}</h2>
            <p>Prepara tu catálogo, compártelo y empieza a vender.</p></div>
          <div className="ca-actions">
            {[
              ["productos","01","Productos y precios","Elige qué mostrar y ajusta tus precios de venta.","Organizar productos"],
              ["tienda","02","Dale tu estilo","Personaliza el nombre, logo, colores y contacto.","Personalizar"],
              ["compartir","03","Comparte tu catálogo","Copia tu enlace y envíalo a tus clientes.","Compartir enlace"],
            ].map(([id,number,title,description,action]) => <button type="button"
              className="ca-action" key={id} onClick={() => navegar(id)}>
              <span className="ca-step">{number}</span><h3>{title}</h3><p>{description}</p>
              <span className="ca-action-link">{action} <span aria-hidden="true">→</span></span>
            </button>)}
          </div>
          <section className="ca-announcements">
            <div className="ca-section-head"><div><h2>Avisos de tu tienda</h2>
              <p>{activos.length ? activos.length + " publicados en tu catálogo" : "Destaca una novedad o un mensaje para tus clientes."}</p></div>
              <button className="ca-outline" onClick={() => navegar("anuncios")}>{activos.length ? "Administrar avisos" : "Crear un aviso"}</button></div>
            {activos.length > 0 && <div className="ca-announcement-list">{activos.slice(0,3).map(a =>
              <div key={a.id}><strong>{a.titulo}</strong>{a.mensaje && <p>{a.mensaje}</p>}</div>)}</div>}
          </section>
          <aside className="ca-tip"><strong>¿Es tu primera vez?</strong>
            <p>Revisa tus precios, agrega el logo de tu negocio y abre «Ver mi catálogo» para comprobar cómo lo verán tus clientes.</p>
            <button className="ca-text-button" onClick={verProductos}>Empezar con mis productos →</button></aside>
        </>}
        <div className="ca-editor">
          {seccionActiva === "tienda" && <EditorTienda tienda={tienda} onActualizada={setTienda}
            setMensaje={setMensaje} onCancelar={() => navegar("inicio")} />}
          {seccionActiva === "anuncios" && <PanelAnuncios anuncios={anuncios} cargando={cargandoAnuncios}
            recargar={() => cargarAnuncios(true)} setMensaje={setMensaje} />}
          {seccionActiva === "compartir" && <CompartirCatalogo tienda={tienda} onVerCatalogo={verCatalogo} />}
        </div>
        <footer className="ca-footer"><span>Tu negocio, tu estilo.</span>
          <button type="button" onClick={cerrarSesion} disabled={cerrando}>{cerrando ? "Cerrando sesión…" : "Cerrar sesión"}</button></footer>
      </div>
    </div>
  </main>;
}
