"use client";

import { useEffect, useMemo, useState } from "react";
import {
  enlaceTiendaPublica,
  mensajeParaCompartirTienda,
  enlaceChatWhatsapp,
} from "../../../lib/catalogo/compartir.mjs";
import styles from "./CompartirCatalogo.module.css";
import { urlFotoParaVista } from "../../../lib/catalogo/fotos-web.mjs";

function colorSeguro(valor, fallback = "#315b48") {
  return /^#[a-f0-9]{6}$/i.test(String(valor || "")) ? valor : fallback;
}

function InicialTienda({ tienda, grande = false }) {
  const [error, setError] = useState(false);
  return tienda?.logo_url && !error ? (
    <img
      src={tienda.logo_url}
      alt=""
      className={grande ? styles.logoGrande : styles.logo}
      onError={() => setError(true)}
    />
  ) : (
    <span className={grande ? styles.inicialGrande : styles.inicial}>
      {String(tienda?.nombre_tienda || "T").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function MosaicoTienda({ fotos }) {
  const [fallidas, setFallidas] = useState([]);
  return (
    <div className={styles.mosaico} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => {
        const producto = fotos[i];
        return (
          <div className={styles.mosaicoCelda} key={producto?.id || i}>
            {producto?.foto && !fallidas.includes(producto.foto) ? (
              <img
                src={urlFotoParaVista(producto.foto, 320)}
                alt=""
                loading="lazy"
                onError={() => setFallidas((actual) => [...actual, producto.foto])}
              />
            ) : (
              <span className={styles.mosaicoAdorno}>✧</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function copiarConAlternativa(texto) {
  if (!texto) throw new Error("No hay enlace");
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return;
    }
  } catch {
    // Algunos navegadores integrados bloquean el portapapeles moderno.
  }

  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  let copiado = false;
  try {
    copiado = document.execCommand("copy");
  } finally {
    area.remove();
  }
  if (!copiado) throw new Error("No fue posible copiar el texto");
}

export default function CompartirCatalogo({ tienda, onVerCatalogo }) {
  const [ejemplo, setEjemplo] = useState("estado");
  const [copiado, setCopiado] = useState("");
  const [aviso, setAviso] = useState("");
  const [fotos, setFotos] = useState([]);

  const nombre = tienda?.nombre_tienda || "Mi tienda";
  const enlace = useMemo(() => enlaceTiendaPublica(tienda), [tienda?.slug]);
  const mensaje = useMemo(
    () => mensajeParaCompartirTienda(nombre, enlace),
    [nombre, enlace]
  );
  const enlaceWhatsapp = useMemo(() => enlaceChatWhatsapp(mensaje), [mensaje]);
  const dominioTienda = useMemo(() => {
    try { return enlace ? new URL(enlace).host : "Tu enlace"; }
    catch { return "Tu enlace"; }
  }, [enlace]);
  const tema = {
    "--compartir-color": colorSeguro(tienda?.color_principal),
    "--compartir-fondo": colorSeguro(tienda?.color_fondo, "#fff7f4"),
  };

  useEffect(() => {
    let activo = true;
    const controller = new AbortController();
    async function obtenerFotos() {
      try {
        const respuesta = await fetch("/api/tiendas/preview-compartir", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!respuesta.ok) return;
        const data = await respuesta.json();
        if (activo && data.ok && Array.isArray(data.productos)) {
          setFotos(data.productos.slice(0, 4));
        }
      } catch {
        // La muestra decorativa no debe impedir compartir la tienda.
      }
    }
    obtenerFotos();
    return () => {
      activo = false;
      controller.abort();
    };
  }, [tienda?.id]);

  async function copiar(texto, tipo) {
    try {
      await copiarConAlternativa(texto);
      setCopiado(tipo);
      setAviso(tipo === "enlace"
        ? "Enlace copiado. Ya puedes pegarlo en tu estado o en un chat."
        : "Mensaje copiado. Pégalo donde quieras compartir tu catálogo.");
    } catch {
      setAviso("No fue posible copiar automáticamente. Mantén presionado el enlace para copiarlo.");
    }
  }

  return (
    <section className={styles.contenedor} style={tema} aria-labelledby="compartir-titulo">
      <header className={styles.encabezado}>
        <div className={styles.etiqueta}>TU CATÁLOGO DIGITAL</div>
        <h2 id="compartir-titulo">Comparte tu tienda y llega a más clientes</h2>
        <p>
          Tu página ya tiene su propio enlace. Compártelo en tus
          <strong> estados de WhatsApp</strong> para dar a conocer el catálogo,
          o <strong>envíalo directamente por chat</strong> a cualquier cliente.
          Es el mismo enlace y siempre lleva a tu tienda.
        </p>
      </header>

      <div className={styles.distribucion}>
        <div className={styles.info}>
          <div className={styles.identidad}>
            <InicialTienda tienda={tienda} grande />
            <div className={styles.nombreBloque}>
              <span className={styles.publicado}>● Tu tienda está publicada</span>
              <strong>{nombre}</strong>
              <small>Enlace de tu catálogo completo</small>
            </div>
          </div>

          <div className={styles.enlaceGrupo}>
            <span className={styles.subtitulo}>Tu enlace para compartir</span>
            <div className={styles.cajaEnlace}>
              <input
                aria-label="Enlace público de tu tienda"
                readOnly
                value={enlace}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button type="button" className={styles.copiarMini}
                onClick={() => copiar(enlace, "enlace")} disabled={!enlace}>
                Copiar
              </button>
            </div>
          </div>

          <div className={styles.botones}>
            <button type="button" className={styles.principal} disabled={!enlace}
              onClick={() => copiar(enlace, "enlace")}>
              {copiado === "enlace" ? "✓ Enlace copiado" : "📋 Copiar enlace"}
            </button>
            <button type="button" className={styles.secundario} disabled={!mensaje}
              onClick={() => copiar(mensaje, "mensaje")}>
              {copiado === "mensaje" ? "✓ Mensaje copiado" : "✍️ Copiar mensaje"}
            </button>
            <a href={enlaceWhatsapp || undefined} className={styles.whatsapp}
              target="_blank" rel="noopener noreferrer"
              aria-disabled={!enlaceWhatsapp}
              onClick={(e) => { if (!enlaceWhatsapp) e.preventDefault(); }}>
              <span aria-hidden="true">💬</span> Enviar por WhatsApp (chat)
            </a>
            <button type="button" className={styles.verTienda} onClick={onVerCatalogo}>
              ↗ Ver mi tienda publicada
            </button>
          </div>

          <p className={styles.confirmacion} role="status" aria-live="polite">{aviso}</p>

          <div className={styles.pasos}>
            <h3>¿Cómo compartir tu catálogo?</h3>
            <div className={styles.paso}>
              <span className={styles.numero}>1</span>
              <div><strong>Copia el enlace</strong><p>Es la dirección de tu propia página web.</p></div>
            </div>
            <div className={styles.paso}>
              <span className={styles.numero}>2</span>
              <div><strong>Pégalo en un estado de WhatsApp</strong>
                <p>Abre WhatsApp, crea un estado de texto y pega el enlace para que tus contactos conozcan tu catálogo.</p>
              </div>
            </div>
            <div className={styles.paso}>
              <span className={styles.numero}>3</span>
              <div><strong>O envíalo directamente en el chat</strong>
                <p>Pégalo en la conversación de un cliente o usa el botón verde para abrir WhatsApp con el mensaje preparado.</p>
              </div>
            </div>
          </div>
          <p className={styles.nota}>
            <strong>Importante:</strong> el botón de WhatsApp prepara un mensaje para un chat;
            no publica estados automáticamente. Para los estados, copia y pega el enlace desde WhatsApp.
          </p>
        </div>

        <aside className={styles.vista} aria-label="Ejemplos de cómo compartir tu tienda">
          <div className={styles.vistaTitulo}>
            <div><span className={styles.ejemploTag}>ASÍ PODRÍA VERSE</span>
              <h3>Tu tienda en WhatsApp</h3></div>
            <span className={styles.demoChip}>Ejemplo</span>
          </div>
          <div className={styles.selector} role="tablist" aria-label="Tipo de ejemplo">
            <button type="button" role="tab" aria-selected={ejemplo === "estado"}
              className={ejemplo === "estado" ? styles.seleccionado : ""}
              onClick={() => setEjemplo("estado")}>Estado</button>
            <button type="button" role="tab" aria-selected={ejemplo === "chat"}
              className={ejemplo === "chat" ? styles.seleccionado : ""}
              onClick={() => setEjemplo("chat")}>Chat</button>
          </div>
          <div className={styles.telefono}>
            <div className={styles.phoneNotch} aria-hidden="true" />
            {ejemplo === "estado" ? (
              <div role="tabpanel" className={styles.estadoPanel}>
                <div className={styles.progresoEstado}><span /></div>
                <div className={styles.cabeceraEstado}>
                  <div className={styles.avatarDemo}><InicialTienda tienda={tienda} /></div>
                  <div><strong>{nombre}</strong><small>Ahora · Ejemplo de estado</small></div>
                </div>
                <div className={styles.centroEstado}>
                  <div className={styles.estadoTexto}>✨ ¡Conoce mi tienda!</div>
                  <div className={styles.tarjetaSitio}>
                    <div className={styles.miniCabecera}>
                      <InicialTienda tienda={tienda} />
                      <strong>{nombre}</strong>
                    </div>
                    <MosaicoTienda fotos={fotos} />
                    <div className={styles.miniPie}>
                      <strong>Descubre nuestro catálogo</strong>
                      <span>Accesorios y novedades para ti</span>
                    </div>
                  </div>
                  <div className={styles.enlaceEjemplo}>🔗 {dominioTienda}</div>
                </div>
                <div className={styles.estadoPie}>Tu catálogo completo en un solo enlace ↗</div>
              </div>
            ) : (
              <div role="tabpanel" className={styles.chatPanel}>
                <div className={styles.chatCabecera}>
                  <div className={styles.chatAvatar}>C</div>
                  <div><strong>Cliente (ejemplo)</strong><small>WhatsApp</small></div>
                </div>
                <div className={styles.conversacion}>
                  <div className={styles.burbujaCliente}>¡Hola! ¿Tienes catálogo? 😊</div>
                  <div className={styles.burbujaTienda}>
                    ¡Claro! ✨ Te comparto mi tienda para que veas todo el catálogo.
                    <div className={styles.previsualizacionChat}>
                      <div className={styles.miniCabecera}>
                        <InicialTienda tienda={tienda} /><strong>{nombre}</strong>
                      </div>
                      <MosaicoTienda fotos={fotos} />
                      <span>🔗 {enlace ? new URL(enlace).host : "Enlace de tu tienda"}</span>
                    </div>
                    <small>10:30 ✓✓</small>
                  </div>
                </div>
                <div className={styles.chatEscribir}>Escribe un mensaje… <span>➤</span></div>
              </div>
            )}
          </div>
          <p className={styles.textoIlustracion}>
            {ejemplo === "estado"
              ? "Así puedes promocionar tu página en tus estados. La ilustración usa tu tienda y fotografías de muestra."
              : "Este mismo enlace también se puede enviar en una conversación individual o de grupo."}
          </p>
        </aside>
      </div>
    </section>
  );
}
