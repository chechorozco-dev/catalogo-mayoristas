"use client";

import { useEffect, useRef, useState } from "react";
import FotoOptimizada from "../../components/FotoOptimizada";
import { limpiarTexto } from "../../../lib/catalogo/formatos.mjs";
import { pasoConErrores, validarDatosCompra } from "../../../lib/catalogo/checkout.mjs";
import "./carrito-compra.css";

const PASOS = ["Productos", "Tus datos", "Confirmar"];

function Campo({ nombre, titulo, ayuda = "", error, children }) {
  return (
    <div className="ra-compra__campo" id={`compra-campo-${nombre}`}>
      <label htmlFor={`compra-${nombre}`}>{titulo}</label>
      {children}
      <span id={`compra-ayuda-${nombre}`} className={`ra-compra__ayuda ${error ? "ra-compra__error" : ""}`}>
        {error || ayuda || "\u00a0"}
      </span>
    </div>
  );
}

function Ciudad({ ciudades, cargando, seleccionada, onSeleccionar, error }) {
  const [busqueda, setBusqueda] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedor = useRef(null);
  const texto = busqueda ?? seleccionada?.ciudad_departamento ?? "";
  const resultados = ciudades.filter(ciudad => limpiarTexto(ciudad.ciudad_departamento).includes(limpiarTexto(busqueda ?? ""))).slice(0, 30);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = evento => { if (!contenedor.current?.contains(evento.target)) setAbierto(false); };
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [abierto]);

  function elegir(ciudad) {
    onSeleccionar(ciudad);
    setBusqueda(null);
    setAbierto(false);
    setActivo(0);
    // El campo conserva su lugar y su foco; seleccionar no avanza de paso.
  }

  return (
    <div ref={contenedor} className="ra-compra__ciudad">
      <Campo nombre="ciudad" titulo="Ciudad y departamento" ayuda={seleccionada ? "Ciudad seleccionada. Puedes escribir para cambiarla." : "Escribe tu ciudad y elígela de la lista."} error={error}>
        <input id="compra-ciudad" name="shipping-city" autoComplete="off" type="text" role="combobox"
          aria-autocomplete="list" aria-expanded={abierto} aria-controls="compra-ciudades"
          aria-activedescendant={abierto && resultados[activo] ? `compra-ciudad-opcion-${activo}` : undefined}
          aria-invalid={Boolean(error)} aria-describedby="compra-ayuda-ciudad"
          placeholder="Ej. Villavicencio, Meta" value={texto}
          onFocus={() => setAbierto(true)}
          onChange={evento => {
            setBusqueda(evento.target.value); onSeleccionar(null); setAbierto(true); setActivo(0);
          }}
          onBlur={evento => { if (!contenedor.current?.contains(evento.relatedTarget)) setAbierto(false); }}
          onKeyDown={evento => {
            if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
              evento.preventDefault(); setAbierto(true);
              const siguiente = Math.max(0, Math.min(resultados.length - 1, activo + (evento.key === "ArrowDown" ? 1 : -1)));
              setActivo(siguiente);
              document.getElementById(`compra-ciudad-opcion-${siguiente}`)?.scrollIntoView({ block: "nearest" });
            } else if (evento.key === "Enter") {
              evento.preventDefault(); if (abierto && resultados[activo]) elegir(resultados[activo]);
            } else if (evento.key === "Escape" && abierto) {
              evento.stopPropagation(); setAbierto(false);
            }
          }} />
      </Campo>
      {abierto && (
        <div id="compra-ciudades" className="ra-compra__ciudades" role="listbox" aria-label="Ciudades disponibles">
          {cargando ? <p role="status">Cargando ciudades…</p> : !resultados.length ? (
            <p>No encontramos esa ciudad. Prueba escribiendo solo el nombre.</p>
          ) : resultados.map((ciudad, indice) => (
            <button type="button" role="option" id={`compra-ciudad-opcion-${indice}`} key={ciudad.ciudad_id}
              aria-selected={seleccionada?.ciudad_id === ciudad.ciudad_id}
              className={indice === activo ? "ra-compra__ciudad-activa" : ""}
              onMouseDown={evento => evento.preventDefault()} onClick={() => elegir(ciudad)}>
              {ciudad.ciudad_departamento}
              <span>{seleccionada?.ciudad_id === ciudad.ciudad_id ? "✓" : "Elegir"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CarritoCompra({
  carrito, cantidadTotal, totalCarrito, totalPedido, costoEnvio, descuento, envioGratis,
  formatoPrecio, esTiendaRA, esPuntoVillavo, esMayoristaPrincipal, nombreTienda,
  cliente, onCliente, ciudad, onCiudad, ciudades, cargandoCiudades, cargandoPerfil,
  modalidad, onModalidad, pago, onPago, errores, onErrores, enviando, enviado,
  onConfirmar, onCerrar, onVaciar, onAumentar, onDisminuir, onEliminar,
  onWhatsapp, onPaso, avisoPedido, onReintentarCiudades,
}) {
  const [paso, setPaso] = useState(0);
  const [vaciar, setVaciar] = useState(false);
  const [operacion, setOperacion] = useState(null);
  const [resumenEnviado, setResumenEnviado] = useState(null);
  const [opcionalesAbiertos, setOpcionalesAbiertos] = useState(false);
  const panel = useRef(null);
  const contenido = useRef(null);
  const titulo = useRef(null);
  const envioEnCurso = useRef(false);
  const retiro = esPuntoVillavo && modalidad === "RECOGER";
  const datos = { ...cliente, ciudad, modalidad, pago, esPuntoVillavo };

  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    const overscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    panel.current?.focus({ preventScroll: true });
    function ajustarAltura() {
      const viewport = window.visualViewport;
      if (viewport && panel.current) {
        panel.current.style.setProperty("--compra-alto", `${viewport.height}px`);
        panel.current.style.setProperty("--compra-arriba", `${viewport.offsetTop}px`);
      }
    }
    ajustarAltura();
    window.visualViewport?.addEventListener("resize", ajustarAltura);
    window.visualViewport?.addEventListener("scroll", ajustarAltura);
    return () => {
      document.body.style.overflow = overflow;
      document.documentElement.style.overscrollBehavior = overscroll;
      window.visualViewport?.removeEventListener("resize", ajustarAltura);
      window.visualViewport?.removeEventListener("scroll", ajustarAltura);
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    contenido.current?.scrollTo({ top: 0 });
    if (paso > 0 || enviado) titulo.current?.focus({ preventScroll: true });
  }, [paso, enviado]);

  function irA(siguiente) {
    if (enviando) return;
    setPaso(siguiente); onPaso(siguiente); setVaciar(false);
  }

  function mostrarErrores(nuevos) {
    if (nuevos.correo) setOpcionalesAbiertos(true);
    onErrores(nuevos);
    const destino = pasoConErrores(nuevos);
    if (destino !== paso) irA(destino);
    requestAnimationFrame(() => {
      const campo = Object.keys(nuevos)[0];
      const elemento = panel.current?.querySelector(`#compra-${campo}`);
      elemento?.focus({ preventScroll: true });
      elemento?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  }

  function continuar() {
    if (paso === 1) {
      const nuevos = validarDatosCompra(datos, { incluirPago: false });
      if (Object.keys(nuevos).length) { mostrarErrores(nuevos); return; }
      onErrores({});
    }
    irA(paso + 1);
  }

  async function confirmar() {
    if (enviando || envioEnCurso.current) return;
    const nuevos = validarDatosCompra(datos);
    if (Object.keys(nuevos).length) { mostrarErrores(nuevos); return; }
    envioEnCurso.current = true;
    setResumenEnviado({ cantidad: cantidadTotal, total: totalPedido, telefono: cliente.telefono });
    try { await onConfirmar(); } finally { envioEnCurso.current = false; }
  }

  async function cambiarCantidad(clave, accion) {
    if (operacion) return;
    setOperacion(clave);
    try { await accion(clave); } finally { setOperacion(null); }
  }

  function cambiarCliente(campo, valor) {
    onCliente(campo, valor);
    if (errores[campo] || errores.envio) onErrores({ ...errores, [campo]: "", envio: "" });
  }

  const atributos = campo => ({ id: `compra-${campo}`, "aria-invalid": Boolean(errores[campo]), "aria-describedby": `compra-ayuda-${campo}` });
  const nombrePago = esPuntoVillavo ? "Por acordar por WhatsApp" : pago === "TRANSFERENCIA" ? "Transferencia bancaria" : "Pago contra entrega";
  const cerrar = () => { if (!enviando && !envioEnCurso.current) onCerrar(); };

  return (
    <div className="ra-compra__overlay" onClick={evento => { if (evento.target === evento.currentTarget) cerrar(); }}>
      <section className="ra-compra__panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby="compra-titulo" tabIndex={-1}
        onKeyDown={evento => {
          if (evento.key === "Escape") { evento.preventDefault(); cerrar(); }
          if (evento.key === "Tab") {
            const elementos = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), summary, [tabindex="0"]')].filter(elemento => elemento.getClientRects().length);
            const primero = elementos[0], ultimo = elementos.at(-1);
            if (evento.shiftKey && (document.activeElement === primero || document.activeElement === panel.current)) {
              evento.preventDefault(); ultimo?.focus();
            } else if (!evento.shiftKey && (document.activeElement === ultimo || !panel.current.contains(document.activeElement))) {
              evento.preventDefault(); primero?.focus();
            }
          }
        }}>
        <header className="ra-compra__cabecera">
          <div>
            <span className="ra-compra__marca">{nombreTienda || "RA Accesorios"}</span>
            <h2 id="compra-titulo" ref={titulo} tabIndex={-1}>{enviado ? "Pedido confirmado" : "Tu pedido"}</h2>
          </div>
          <button type="button" className="ra-compra__cerrar" aria-label="Cerrar pedido" disabled={enviando} onClick={cerrar}>×</button>
        </header>

        {!enviado && carrito.length > 0 && esTiendaRA && (
          <ol className="ra-compra__pasos" aria-label="Pasos de tu compra">
            {PASOS.map((nombre, indice) => (
              <li key={nombre} aria-current={paso === indice ? "step" : undefined} className={indice <= paso ? "ra-compra__paso-activo" : ""}>
                <span aria-hidden="true">{indice < paso ? "✓" : indice + 1}</span>{nombre}
              </li>
            ))}
          </ol>
        )}

        <div ref={contenido} className="ra-compra__contenido" aria-busy={enviando}>
          {enviado ? (
            <div className="ra-compra__exito" role="status">
              <span className="ra-compra__check" aria-hidden="true">✓</span>
              <h3>¡Recibimos tu pedido!</h3>
              <p>Te contactaremos por WhatsApp para continuar con tu compra.</p>
              {resumenEnviado && <div className="ra-compra__recibo"><span>{resumenEnviado.cantidad} {resumenEnviado.cantidad === 1 ? "producto" : "productos"}</span><strong>{formatoPrecio(resumenEnviado.total)}</strong><span>WhatsApp: {resumenEnviado.telefono}</span></div>}
              {avisoPedido && <p className="ra-compra__nota">{avisoPedido}</p>}
              <p className="ra-compra__ayuda">Tu pedido ya fue enviado. No necesitas confirmarlo otra vez.</p>
            </div>
          ) : !carrito.length ? (
            <div className="ra-compra__vacio"><span aria-hidden="true">🛍</span><h3>Tu carrito está vacío</h3><p>Elige los accesorios que te gusten y agrégalos a tu pedido.</p></div>
          ) : paso === 0 ? (
            <>
              <div className="ra-compra__intro"><span>Paso 1 de {esTiendaRA ? 3 : 1}</span><h3>Revisa tus productos</h3><p>Puedes ajustar las cantidades antes de continuar.</p></div>
              <div className="ra-compra__lista">
                {carrito.map(item => {
                  const clave = item.clave_carrito || item.id;
                  const ocupado = operacion === clave;
                  return (
                    <article className="ra-compra__producto" key={clave} aria-label={item.nombre}>
                      {item.foto_url ? <FotoOptimizada src={item.foto_url} width={128} height={128} sizes="80px" quality={80} alt={item.nombre} /> : <div className="ra-compra__sin-foto">Sin foto</div>}
                      <div className="ra-compra__producto-info"><h4>{item.nombre}</h4>{item.variante_nombre && <p>{item.variante_nombre}</p>}{item.referencia && <p>Ref. {item.referencia}</p>}<span>{formatoPrecio(item.precio)} por unidad</span></div>
                      <div className="ra-compra__producto-acciones">
                        <div className="ra-compra__cantidad" role="group" aria-label={`Cantidad de ${item.nombre}`}>
                          <button type="button" aria-label={`Quitar una unidad de ${item.nombre}`} disabled={Boolean(operacion) || item.cantidad <= 1} onClick={() => cambiarCantidad(clave, onDisminuir)}>−</button>
                          <output aria-live="polite" aria-label="Unidades">{item.cantidad}</output>
                          <button type="button" aria-label={`Agregar una unidad de ${item.nombre}`} disabled={Boolean(operacion)} onClick={() => cambiarCantidad(clave, onAumentar)}>+</button>
                        </div>
                        <strong>{formatoPrecio(Number(item.precio) * Number(item.cantidad))}</strong>
                        <button type="button" className="ra-compra__quitar" aria-label={`Quitar ${item.nombre} del pedido`} disabled={Boolean(operacion)} onClick={() => cambiarCantidad(clave, onEliminar)}>{ocupado ? "Actualizando…" : "Quitar"}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {esMayoristaPrincipal && <p className="ra-compra__nota">Los productos se separan al confirmar tu pedido.</p>}
              {vaciar ? <div className="ra-compra__vaciar"><p>¿Quieres quitar todos los productos?</p><button type="button" disabled={Boolean(operacion)} onClick={async () => { setOperacion("vaciar"); try { await onVaciar(); } finally { setOperacion(null); setVaciar(false); } }}>Sí, vaciar carrito</button><button type="button" onClick={() => setVaciar(false)}>Conservar productos</button></div> : <button type="button" className="ra-compra__enlace" onClick={() => setVaciar(true)}>Vaciar carrito</button>}
            </>
          ) : paso === 1 ? (
            <>
              <div className="ra-compra__intro"><span>Paso 2 de 3</span><h3>¿A quién le enviamos el pedido?</h3><p>Completa estos datos para recibir tu compra.</p></div>
              <p className="ra-compra__perfil" role="status">{cargandoPerfil ? "Buscando tus datos guardados…" : "Revisa tus datos. Puedes corregirlos aquí."}</p>
              <form id="compra-datos" noValidate onSubmit={evento => { evento.preventDefault(); continuar(); }} onKeyDown={evento => { if (evento.key === "Enter" && evento.target.tagName === "INPUT") evento.preventDefault(); }}>
                {esPuntoVillavo && <fieldset className="ra-compra__opciones"><legend>¿Cómo quieres recibirlo?</legend>{[["RECOGER", "Recoger en el local", "Sin costo de envío"], ["ENVIO", "Enviar a mi dirección", "El envío se calcula con tu ciudad"]].map(([valor, tituloOpcion, ayuda]) => <label key={valor} className={modalidad === valor ? "ra-compra__seleccionada" : ""}><input type="radio" id={valor === "RECOGER" ? "compra-modalidad" : undefined} name="modalidad" value={valor} checked={modalidad === valor} onChange={() => { onModalidad(valor); onErrores({}); }} /><span><strong>{tituloOpcion}</strong><small>{ayuda}</small></span></label>)}{errores.modalidad && <p className="ra-compra__error">{errores.modalidad}</p>}</fieldset>}
                <Campo nombre="nombre" titulo="Nombre completo" error={errores.nombre}><input {...atributos("nombre")} name="name" type="text" autoComplete="shipping name" value={cliente.nombre} placeholder="Ej. María Rodríguez" onChange={evento => cambiarCliente("nombre", evento.target.value)} /></Campo>
                <Campo nombre="telefono" titulo="WhatsApp" ayuda="Aquí te avisaremos cómo va tu pedido." error={errores.telefono}><input {...atributos("telefono")} name="tel" type="tel" inputMode="tel" autoComplete="shipping tel" value={cliente.telefono} placeholder="Ej. 3101234567" onChange={evento => cambiarCliente("telefono", evento.target.value.replace(/\D/g, ""))} /></Campo>
                {!retiro && <>
                  <Ciudad ciudades={ciudades} cargando={cargandoCiudades} seleccionada={ciudad} error={errores.ciudad} onSeleccionar={valor => { onCiudad(valor); onErrores({ ...errores, ciudad: "", envio: "" }); }} />
                  <Campo nombre="direccion" titulo="Dirección de entrega" ayuda="Incluye barrio, apartamento o casa, si aplica." error={errores.direccion}><input {...atributos("direccion")} name="street-address" type="text" autoComplete="shipping street-address" value={cliente.direccion} placeholder="Ej. Calle 15 # 20-30, barrio Centro" onChange={evento => cambiarCliente("direccion", evento.target.value)} /></Campo>
                  {ciudad && <div className="ra-compra__envio"><span>Envío a {ciudad.ciudad_departamento}</span><strong>{envioGratis ? "Gratis" : costoEnvio === null ? "Por confirmar" : formatoPrecio(costoEnvio)}</strong>{ciudad.tiempo_estimado && <small>Entrega estimada: {ciudad.tiempo_estimado}</small>}</div>}
                </>}
                {retiro && <p className="ra-compra__nota">Recoges en RA Accesorios Villavo. Acordaremos contigo el pago por WhatsApp.</p>}
                {!retiro && <details className="ra-compra__opcionales" open={opcionalesAbiertos} onToggle={evento => setOpcionalesAbiertos(evento.currentTarget.open)}><summary>Agregar cédula o correo <span>(opcional)</span></summary><div><Campo nombre="cedula" titulo="Cédula (opcional)"><input {...atributos("cedula")} name="documento" type="text" inputMode="numeric" autoComplete="off" value={cliente.cedula} placeholder="Número de cédula" onChange={evento => cambiarCliente("cedula", evento.target.value.replace(/\D/g, ""))} /></Campo><Campo nombre="correo" titulo="Correo electrónico (opcional)" error={errores.correo}><input {...atributos("correo")} name="email" type="email" inputMode="email" autoComplete="shipping email" value={cliente.correo} placeholder="Ej. maria@gmail.com" onChange={evento => cambiarCliente("correo", evento.target.value)} /></Campo></div></details>}
                {!cargandoCiudades && !ciudades.length && !retiro && <div role="alert" className="ra-compra__error">No pudimos cargar las ciudades. <button type="button" className="ra-compra__enlace" onClick={onReintentarCiudades}>Volver a intentar</button></div>}
              </form>
            </>
          ) : (
            <>
              <div className="ra-compra__intro"><span>Paso 3 de 3</span><h3>Confirma tu pedido</h3><p>Revisa la entrega y el total antes de enviarlo.</p></div>
              <div className="ra-compra__destino"><div><h4>{retiro ? "Recoges en el local" : "Datos de entrega"}</h4><button type="button" className="ra-compra__enlace" disabled={enviando} onClick={() => irA(1)}>Editar datos</button></div><strong>{cliente.nombre}</strong><span>WhatsApp: {cliente.telefono}</span>{!retiro && <><span>{cliente.direccion}</span><span>{ciudad?.ciudad_departamento}</span></>}</div>
              {esPuntoVillavo ? <p className="ra-compra__nota"><strong>Pago por acordar por WhatsApp.</strong> Te contactaremos para confirmar el pago {retiro ? "y la recogida" : "antes del despacho"}.</p> : <fieldset className="ra-compra__opciones" id="compra-campo-pago"><legend>¿Cómo quieres pagar?</legend>{[["CONTRA_ENTREGA", "Pago contra entrega", "Pagas cuando recibes tu pedido"], ["TRANSFERENCIA", "Transferencia bancaria", "Ahorras el 6% en los productos"]].map(([valor, tituloOpcion, ayuda]) => <label key={valor} className={pago === valor ? "ra-compra__seleccionada" : ""}><input type="radio" id={valor === "CONTRA_ENTREGA" ? "compra-pago" : undefined} name="pago" value={valor} checked={pago === valor} disabled={enviando} onChange={() => { onPago(valor); onErrores({ ...errores, pago: "", envio: "" }); }} /><span><strong>{tituloOpcion}</strong><small>{ayuda}</small></span>{valor === "TRANSFERENCIA" && <span className="ra-compra__descuento">−6%</span>}</label>)}<span className="ra-compra__ayuda ra-compra__error" role={errores.pago ? "alert" : undefined}>{errores.pago || "\u00a0"}</span></fieldset>}
              <div className="ra-compra__resumen" aria-label="Resumen del pedido">
                <div><span>{cantidadTotal} {cantidadTotal === 1 ? "producto" : "productos"}</span><strong>{formatoPrecio(totalCarrito)}</strong></div>
                {descuento > 0 && <div className="ra-compra__ahorro"><span>Descuento por transferencia (6%)</span><strong>−{formatoPrecio(descuento)}</strong></div>}
                <div><span>{retiro ? "Recogida en el local" : "Envío"}</span><strong>{retiro || envioGratis ? "Gratis" : costoEnvio === null ? "Por confirmar" : formatoPrecio(costoEnvio)}</strong></div>
                <div className="ra-compra__total"><span>Total a pagar</span><strong>{formatoPrecio(totalPedido)}</strong></div>
              </div>
              {descuento > 0 && <p className="ra-compra__ayuda">El descuento aplica a los productos. El envío conserva su valor.</p>}
              <p className="ra-compra__nota">{esPuntoVillavo || pago ? <>Pago: {nombrePago}. </> : ""}Al confirmar, recibiremos tu pedido y continuaremos contigo por WhatsApp.</p>
            </>
          )}
        </div>

        <footer className="ra-compra__pie">
          {enviado || !carrito.length ? <button type="button" className="ra-compra__principal" onClick={cerrar}>{enviado ? "Volver a la tienda" : "Ver productos"}</button> : <>
            {paso === 2 && errores.envio && <p className="ra-compra__error" role="alert">{errores.envio}</p>}
            {paso === 0 && <div className="ra-compra__subtotal"><span>Subtotal de productos</span><strong>{formatoPrecio(totalCarrito)}</strong><small>{esTiendaRA ? "El envío y el descuento se muestran en los siguientes pasos." : `${cantidadTotal} productos en tu pedido`}</small></div>}
            {paso === 2 && <div className="ra-compra__subtotal"><span>Total a pagar</span><strong aria-live="polite">{formatoPrecio(totalPedido)}</strong></div>}
            <div className="ra-compra__botones">
              <button type="button" className="ra-compra__secundario" disabled={enviando} onClick={() => paso === 0 ? cerrar() : irA(paso - 1)}>{paso === 0 ? "Seguir comprando" : "Volver"}</button>
              <button type="button" className="ra-compra__principal" disabled={enviando || Boolean(operacion)} onClick={!esTiendaRA ? onWhatsapp : paso < 2 ? continuar : confirmar}>
                {enviando ? "Enviando pedido…" : !esTiendaRA ? "Pedir por WhatsApp" : paso === 0 ? "Continuar con mis datos" : paso === 1 ? "Revisar mi pedido" : "Confirmar pedido"}
              </button>
            </div>
            {paso === 2 && <span className="ra-compra__pie-ayuda">{enviando ? "Estamos recibiendo tu pedido. Espera un momento." : "Confirmas el pedido. El pago se coordina después."}</span>}
          </>}
        </footer>
      </section>
    </div>
  );
}
