"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CATEGORIAS_PRINCIPALES = [
  "Todos",
  "Aretes",
  "Juegos",
  "Anillos",
  "Pulseras",
  "Earcuff",
];

const CATEGORIAS_MENU = [
  "Todos",
  "Nuevos",
  "Aretes",
  "Juegos",
  "Anillos",
  "Pulseras",
  "Earcuff",
  "Collares",

];

function limpiarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatoPrecio(valor) {
  const numero = Number(valor || 0);

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numero);
}

function limpiarWhatsapp(numero = "") {
  return String(numero).replace(/\D/g, "");
}
function obtenerColorTexto(hex = "#FFFFFF") {
  let color = String(hex || "#FFFFFF")
    .trim()
    .replace("#", "");

  // Soportar colores cortos, por ejemplo #FFF
  if (color.length === 3) {
    color = color
      .split("")
      .map((letra) => letra + letra)
      .join("");
  }

  // Si el color recibido no es válido,
  // usamos texto negro para evitar texto invisible.
  if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
    return "#111111";
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const luminosidad =
    (r * 299 + g * 587 + b * 114) / 1000;

  // Fondo claro = letras oscuras
  // Fondo oscuro = letras blancas
  return luminosidad >= 150
    ? "#111111"
    : "#FFFFFF";
}
function productoPerteneceCategoria(producto, categoria) {
  if (categoria === "Todos") return true;

  const nombre = limpiarTexto(producto.nombre);
  const referencia = limpiarTexto(producto.referencia);
  const categoriaProducto = limpiarTexto(producto.categoria);

  const texto = `${nombre} ${referencia} ${categoriaProducto}`;

  if (categoria === "Aretes") {
    return (
      texto.includes("arete") ||
      texto.includes("candonga") ||
      texto.includes("topo") ||
      texto.includes("maxitopo")
    );
  }

  if (categoria === "Juegos") {
    return texto.includes("juego") || texto.includes("set");
  }

  if (categoria === "Anillos") {
    return texto.includes("anillo");
  }

  if (categoria === "Pulseras") {
    return texto.includes("pulsera") || texto.includes("brazalete");
  }

  if (categoria === "Earcuff") {
    return texto.includes("earcuff") || texto.includes("ear cuff");
  }

  if (categoria === "Collares") {
    return texto.includes("collar") || texto.includes("cadena");
  }

  if (categoria === "Accesorios en Rodio") {
    return texto.includes("rodio");
  }

  if (categoria === "Accesorios en Acero") {
    return texto.includes("acero");
  }

  return true;
}

function obtenerTipoProducto(producto) {
  const texto = limpiarTexto(
    `${producto?.nombre || ""} ${producto?.categoria || ""}`
  );

  if (
    texto.includes("arete") ||
    texto.includes("candonga") ||
    texto.includes("topo") ||
    texto.includes("maxitopo")
  ) {
    return "aretes";
  }

  if (texto.includes("juego") || texto.includes("set")) {
    return "juegos";
  }

  if (texto.includes("anillo")) {
    return "anillos";
  }

  if (texto.includes("pulsera") || texto.includes("brazalete")) {
    return "pulseras";
  }

  if (texto.includes("earcuff") || texto.includes("ear cuff")) {
    return "earcuff";
  }

  if (texto.includes("collar") || texto.includes("cadena")) {
    return "collares";
  }

  return limpiarTexto(producto?.categoria || "");
}

export default function TiendaCliente({
  nombreTienda,
  logoUrl,
  whatsapp,
  colorPrincipal = "#000000",
  colorFondo = "#FFFFFF",
  mensajePortada = "",
  instagram = "",
  facebook = "",
  tiktok = "",
  productos = [],
}) {
    function crearEnlaceRedSocial(red, valor) {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    // Si el cliente pegó el enlace completo
    if (
      texto.startsWith("http://") ||
      texto.startsWith("https://")
    ) {
      return texto;
    }

    const usuario = texto
      .replace(/^@/, "")
      .trim();

    if (red === "instagram") {
      return `https://www.instagram.com/${usuario}`;
    }

    if (red === "tiktok") {
      return `https://www.tiktok.com/@${usuario}`;
    }

   if (red === "facebook") {
  if (
    texto.startsWith("facebook.com/") ||
    texto.startsWith("www.facebook.com/")
  ) {
    return `https://${texto}`;
  }

  return "";
}

    return "";
  }

  const enlaceInstagram =
    crearEnlaceRedSocial("instagram", instagram);

  const enlaceFacebook =
    crearEnlaceRedSocial("facebook", facebook);

  const enlaceTiktok =
    crearEnlaceRedSocial("tiktok", tiktok);

  const tieneRedesSociales =
    enlaceInstagram ||
    enlaceFacebook ||
    enlaceTiktok;
    

  const [categoriaActiva, setCategoriaActiva] = useState("Todos");
  const [lineaActiva, setLineaActiva] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  // ========================================
// FINALIZAR COMPRA
// ========================================

const [formularioCompraAbierto, setFormularioCompraAbierto] =
  useState(false);

const [nombreCliente, setNombreCliente] = useState("");
const [cedulaCliente, setCedulaCliente] = useState("");
const [telefonoCliente, setTelefonoCliente] = useState("");
const [direccionCliente, setDireccionCliente] = useState("");

const [ciudadesEnvio, setCiudadesEnvio] = useState([]);
const [ciudadSeleccionada, setCiudadSeleccionada] =
  useState(null);

const [busquedaCiudad, setBusquedaCiudad] = useState("");
const [cargandoCiudades, setCargandoCiudades] =
  useState(false);

  const [carrito, setCarrito] = useState([]);
  const [carritoCargado, setCarritoCargado] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const [productoModal, setProductoModal] = useState(null);
  const [varianteSeleccionadaId, setVarianteSeleccionadaId] =
    useState(null);
  const [indiceFoto, setIndiceFoto] = useState(0);

  const [productoConfirmado, setProductoConfirmado] = useState(null);
  const [fotosTarjetas, setFotosTarjetas] = useState({});

  const carritoRef = useRef(null);
const colorTextoPrincipal =
  obtenerColorTexto(colorPrincipal);
  const colorTextoFondo =
  obtenerColorTexto(colorFondo);
  // ========================================
// CARGAR CIUDADES DE ENVÍO
// ========================================

useEffect(() => {
  async function cargarCiudadesEnvio() {
    try {
      setCargandoCiudades(true);

      const respuesta = await fetch(
        "/api/ciudades-envio",
        {
          cache: "no-store",
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos?.error ||
            "No se pudieron cargar las ciudades."
        );
      }

      setCiudadesEnvio(
        Array.isArray(datos?.ciudades)
          ? datos.ciudades
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando ciudades:",
        error
      );

      setCiudadesEnvio([]);
    } finally {
      setCargandoCiudades(false);
    }
  }

  cargarCiudadesEnvio();
}, []);

  // ========================================
  // CARGAR CARRITO
  // ========================================

  useEffect(() => {
    try {
      const clave = `carrito_${window.location.pathname}`;
      const guardado = localStorage.getItem(clave);

      if (guardado) {
        const datos = JSON.parse(guardado);

        if (Array.isArray(datos)) {
          setCarrito(datos);
        }
      }
    } catch (error) {
      console.error("Error cargando carrito:", error);
    } finally {
      setCarritoCargado(true);
    }
  }, []);

  // ========================================
  // GUARDAR CARRITO
  // ========================================

  useEffect(() => {
    if (!carritoCargado) return;

    try {
      const clave = `carrito_${window.location.pathname}`;
      localStorage.setItem(clave, JSON.stringify(carrito));
    } catch (error) {
      console.error("Error guardando carrito:", error);
    }
  }, [carrito, carritoCargado]);

  // ========================================
  // PRODUCTOS FILTRADOS
  // ========================================

  const productosFiltrados = useMemo(() => {
  let lista = [...productos];

  // FILTRO POR CATEGORÍA PRINCIPAL

  if (categoriaActiva === "Nuevos") {
    lista.sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    );
  } else {
    lista = lista.filter((producto) =>
      productoPerteneceCategoria(
        producto,
        categoriaActiva
      )
    );
  }

  // FILTRO POR LÍNEA DE PRODUCTO

  if (lineaActiva === "Rodio") {
    lista = lista.filter((producto) => {
      const texto = limpiarTexto(
        `${producto.nombre || ""} ${
          producto.referencia || ""
        } ${producto.categoria || ""}`
      );

      return texto.includes("rodio");
    });
  }

  if (lineaActiva === "Acero") {
    lista = lista.filter((producto) => {
      const texto = limpiarTexto(
        `${producto.nombre || ""} ${
          producto.referencia || ""
        } ${producto.categoria || ""}`
      );

      return texto.includes("acero");
    });
  }

  // BUSCADOR

  const textoBusqueda = limpiarTexto(busqueda);

  if (textoBusqueda) {
    lista = lista.filter((producto) => {
      const variantesTexto = (producto.variantes || [])
        .map(
          (variante) =>
            `${variante.nombre_variante || ""} ${
              variante.referencia || ""
            }`
        )
        .join(" ");

      const texto = limpiarTexto(
        `${producto.nombre || ""} ${
          producto.referencia || ""
        } ${producto.categoria || ""} ${variantesTexto}`
      );

      return texto.includes(textoBusqueda);
    });
  }

  return lista;
}, [
  productos,
  categoriaActiva,
  lineaActiva,
  busqueda,
]);
    

  // ========================================
  // PRODUCTOS RECOMENDADOS
  // ========================================

  const productosRecomendados = useMemo(() => {
    if (!productoModal) return [];

    const tipoActual = obtenerTipoProducto(productoModal);
    const categoriaActual = limpiarTexto(productoModal.categoria || "");

    const similares = productos
      .filter(
        (producto) =>
          String(producto.id) !== String(productoModal.id)
      )
      .map((producto) => {
        let puntos = 0;

        const tipo = obtenerTipoProducto(producto);
        const categoria = limpiarTexto(producto.categoria || "");

        if (tipoActual && tipo === tipoActual) {
          puntos += 10;
        }

        if (
          categoriaActual &&
          categoria &&
          categoria === categoriaActual
        ) {
          puntos += 6;
        }

        const textoActual = limpiarTexto(productoModal.nombre || "");
        const textoProducto = limpiarTexto(producto.nombre || "");

        const palabrasActuales = textoActual
          .split(" ")
          .filter((palabra) => palabra.length >= 4);

        palabrasActuales.forEach((palabra) => {
          if (textoProducto.includes(palabra)) {
            puntos += 1;
          }
        });

        return {
          ...producto,
          puntosRecomendacion: puntos,
        };
      })
      .filter((producto) => producto.puntosRecomendacion > 0)
      .sort(
        (a, b) =>
          b.puntosRecomendacion - a.puntosRecomendacion
      )
      .slice(0, 6);

    if (similares.length < 4) {
      const ids = new Set(
        similares.map((producto) => String(producto.id))
      );

      const extras = productos
        .filter(
          (producto) =>
            String(producto.id) !== String(productoModal.id) &&
            !ids.has(String(producto.id))
        )
        .slice(0, 6 - similares.length);

      return [...similares, ...extras];
    }

    return similares;
  }, [productoModal, productos]);

  // ========================================
  // TOTALES CARRITO
  // ========================================

  const cantidadTotal = carrito.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  );

  const totalCarrito = carrito.reduce(
    (total, item) =>
      total +
      Number(item.precio || 0) * Number(item.cantidad || 0),
    0
  );

  function fotosProducto(producto) {
    if (!producto) return [];

    return [producto.foto_url, producto.foto_url_2].filter(Boolean);
  }

  // ========================================
  // FOTOS TARJETAS
  // ========================================

  function indiceFotoTarjeta(producto) {
    return fotosTarjetas[producto.id] || 0;
  }

  function cambiarFotoTarjeta(producto, direccion) {
    const fotos = fotosProducto(producto);

    if (fotos.length <= 1) return;

    setFotosTarjetas((actual) => {
      const indiceActual = actual[producto.id] || 0;

      let nuevoIndice;

      if (direccion === "siguiente") {
        nuevoIndice =
          indiceActual === fotos.length - 1
            ? 0
            : indiceActual + 1;
      } else {
        nuevoIndice =
          indiceActual === 0
            ? fotos.length - 1
            : indiceActual - 1;
      }

      return {
        ...actual,
        [producto.id]: nuevoIndice,
      };
    });
  }

  // ========================================
  // ABRIR PRODUCTO
  // ========================================

  function abrirProducto(producto, fotoInicial = 0) {
    setProductoModal(producto);

    const primeraVariante =
      Array.isArray(producto?.variantes) &&
      producto.variantes.length > 0
        ? producto.variantes[0]
        : null;

    setVarianteSeleccionadaId(primeraVariante?.id ?? null);
    setIndiceFoto(fotoInicial);
  }

  function obtenerProductoSeleccionado(producto) {
    if (
      !producto?.tiene_variantes ||
      !Array.isArray(producto.variantes) ||
      !producto.variantes.length
    ) {
      return producto;
    }

    const variante =
      producto.variantes.find(
        (item) =>
          String(item.id) === String(varianteSeleccionadaId)
      ) || producto.variantes[0];

    return {
      ...producto,

      id_producto: producto.id,
      variante_id: variante.id,
      variante_nombre: variante.nombre_variante,

      referencia: variante.referencia,

      foto_url:
        variante.foto_url || producto.foto_url,

      foto_url_2:
        variante.foto_url_2 || null,

      precio:
        variante.precio ?? producto.precio,
    };
  }

  function claveCarrito(producto) {
    if (
      producto?.variante_id !== null &&
      producto?.variante_id !== undefined
    ) {
      return `p${
        producto.id_producto || producto.id
      }-v${producto.variante_id}`;
    }

    return `p${producto?.id}`;
  }

  // ========================================
  // ANIMACIÓN BOLSA
  // ========================================

  function animarBolsa() {
    const carritoElemento = carritoRef.current;

    if (!carritoElemento) return;

    carritoElemento.classList.remove("carrito-rebote");

    void carritoElemento.offsetWidth;

    carritoElemento.classList.add("carrito-rebote");

    setTimeout(() => {
      carritoElemento.classList.remove("carrito-rebote");
    }, 500);
  }

  function animarProductoAlCarrito(producto, elementoOrigen) {
    if (typeof window === "undefined") return;

    const carritoElemento = carritoRef.current;

    if (!carritoElemento || !elementoOrigen) return;

    const tarjeta = elementoOrigen.closest(".producto-card");

    const imagenOriginal =
      tarjeta?.querySelector(".producto-imagen");

    if (!imagenOriginal) {
      animarBolsa();
      return;
    }

    const origen = imagenOriginal.getBoundingClientRect();
    const destino = carritoElemento.getBoundingClientRect();

    const imagenVoladora = document.createElement("img");

    imagenVoladora.src = imagenOriginal.src;
    imagenVoladora.className = "producto-volador";

    const tamanioInicial = Math.min(origen.width * 0.42, 105);

    imagenVoladora.style.width = `${tamanioInicial}px`;
    imagenVoladora.style.height = `${tamanioInicial}px`;

    imagenVoladora.style.left = `${
      origen.left + origen.width / 2 - tamanioInicial / 2
    }px`;

    imagenVoladora.style.top = `${
      origen.top + origen.height / 2 - tamanioInicial / 2
    }px`;

    document.body.appendChild(imagenVoladora);

    const destinoX =
      destino.left + destino.width / 2 - 12;

    const destinoY =
      destino.top + destino.height / 2 - 12;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        imagenVoladora.style.left = `${destinoX}px`;
        imagenVoladora.style.top = `${destinoY}px`;
        imagenVoladora.style.width = "24px";
        imagenVoladora.style.height = "24px";
        imagenVoladora.style.opacity = "0.2";
        imagenVoladora.style.transform = "scale(0.25)";
      });
    });

   setTimeout(() => {
  imagenVoladora.remove();
  animarBolsa();
}, 1280);
  }

  // ========================================
  // AGREGAR AL CARRITO
  // ========================================

  function agregarAlCarrito(producto, elementoOrigen = null) {
    if (!producto) return;

    // Si tiene variantes y se pulsa el botón desde
    // la tarjeta, primero abrimos el producto.
    if (
      producto.tiene_variantes &&
      Array.isArray(producto.variantes) &&
      producto.variantes.length > 0 &&
      !producto.variante_id
    ) {
      abrirProducto(producto);
      return;
    }

    const productoFinal =
      producto.variante_id
        ? producto
        : obtenerProductoSeleccionado(producto);

    const clave = claveCarrito(productoFinal);

    setCarrito((actual) => {
      const existe = actual.find(
        (item) => item.clave_carrito === clave
      );

      if (existe) {
        return actual.map((item) =>
          item.clave_carrito === clave
            ? {
                ...item,
                cantidad: Number(item.cantidad || 0) + 1,
              }
            : item
        );
      }

      return [
        ...actual,
        {
          ...productoFinal,
          clave_carrito: clave,
          cantidad: 1,
        },
      ];
    });

    setProductoConfirmado(clave);

    setTimeout(() => {
      setProductoConfirmado(null);
    }, 900);

    if (elementoOrigen) {
      animarProductoAlCarrito(productoFinal, elementoOrigen);
    } else {
      animarBolsa();
    }
  }

  // ========================================
  // CANTIDADES
  // ========================================

  function aumentarCantidad(clave) {
    setCarrito((actual) =>
      actual.map((item) =>
        item.clave_carrito === clave
          ? {
              ...item,
              cantidad: Number(item.cantidad || 0) + 1,
            }
          : item
      )
    );
  }

  function disminuirCantidad(clave) {
    setCarrito((actual) =>
      actual
        .map((item) =>
          item.clave_carrito === clave
            ? {
                ...item,
                cantidad: Number(item.cantidad || 0) - 1,
              }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  function eliminarProducto(clave) {
    setCarrito((actual) =>
      actual.filter(
        (item) => item.clave_carrito !== clave
      )
    );
  }

  function vaciarCarrito() {
    setCarrito([]);
  }

  // ========================================
  // WHATSAPP
  // ========================================

  function enviarPedidoWhatsapp() {
    if (!carrito.length) return;

    const numero = limpiarWhatsapp(whatsapp);

    if (!numero) {
      alert(
        "Esta tienda todavía no tiene un número de WhatsApp configurado."
      );
      return;
    }

    const lineas = [];

    lineas.push(`Hola ${nombreTienda} 👋`);
    lineas.push("");
    lineas.push("Quiero hacer el siguiente pedido:");
    lineas.push("");

    carrito.forEach((item, index) => {
      lineas.push(`${index + 1}. ${item.nombre}`);

      if (item.variante_nombre) {
        lineas.push(`   Opción: ${item.variante_nombre}`);
      }

      if (item.referencia) {
        lineas.push(`   Ref: ${item.referencia}`);
      }

      lineas.push(`   Cantidad: ${item.cantidad}`);
      lineas.push(`   Precio: ${formatoPrecio(item.precio)}`);

      lineas.push(
        `   Subtotal: ${formatoPrecio(
          Number(item.precio || 0) *
            Number(item.cantidad || 0)
        )}`
      );

      lineas.push("");
    });

    lineas.push(`TOTAL: ${formatoPrecio(totalCarrito)}`);

    const mensaje = encodeURIComponent(lineas.join("\n"));

    window.open(
      `https://wa.me/${numero}?text=${mensaje}`,
      "_blank"
    );
  }

  const productoSeleccionado =
    obtenerProductoSeleccionado(productoModal);

  const fotosModal =
    fotosProducto(productoSeleccionado);

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <div className="tienda">

        {/* HEADER */}

        <header className="header">
          <div className="header-lateral header-izquierda">
            <button
              className="header-btn"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>

            <button
              className="header-btn buscar-btn"
              onClick={() =>
                setMostrarBusqueda((actual) => !actual)
              }
              aria-label="Buscar"
            >
              ⌕
            </button>
          </div>

          <div className="marca">
            {logoUrl ? (
              <img
                className="logo-tienda"
                src={logoUrl}
                alt={nombreTienda}
              />
            ) : (
              <div className="logo-placeholder">
                {String(nombreTienda || "T")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

          <div className="nombre-tienda">
  {nombreTienda}
</div>

{mensajePortada && (
  <div className="mensaje-portada">
    {mensajePortada}
  </div>
)}
{tieneRedesSociales && (
  <div className="redes-sociales">
    {enlaceInstagram && (
      <a
        href={enlaceInstagram}
        target="_blank"
        rel="noopener noreferrer"
        className="red-social"
        aria-label="Instagram"
        title="Instagram"
      >
        <svg
  viewBox="0 0 24 24"
  width="16"
  height="16"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <rect
    x="3"
    y="3"
    width="18"
    height="18"
    rx="5"
  />
  <circle cx="12" cy="12" r="4" />
  <circle
    cx="17.5"
    cy="6.5"
    r="1"
    fill="currentColor"
    stroke="none"
  />
</svg>
      </a>
    )}

    {enlaceFacebook && (
      <a
        href={enlaceFacebook}
        target="_blank"
        rel="noopener noreferrer"
        className="red-social"
        aria-label="Facebook"
        title="Facebook"
      >
        <svg
  viewBox="0 0 24 24"
  width="16"
  height="16"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.7V4.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V11H7.3v3h2.8v8h3.4Z" />
</svg>
      </a>
    )}

    {enlaceTiktok && (
      <a
        href={enlaceTiktok}
        target="_blank"
        rel="noopener noreferrer"
        className="red-social"
        aria-label="TikTok"
        title="TikTok"
      >
        <svg
  viewBox="0 0 24 24"
  width="16"
  height="16"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M15.5 3c.3 2.1 1.5 3.4 3.5 3.8v3.1c-1.3 0-2.5-.4-3.5-1.1v6.3a5.7 5.7 0 1 1-4.9-5.6v3.2a2.6 2.6 0 1 0 1.7 2.4V3h3.2Z" />
</svg>
      </a>
    )}
  </div>
)}
          </div>

          <div className="header-lateral header-derecha">
            <button
              ref={carritoRef}
              className="carrito-header"
              onClick={() => setCarritoAbierto(true)}
              aria-label="Abrir carrito"
            >
              <span className="bolsa">🛍️</span>

              {cantidadTotal > 0 && (
                <span className="contador-carrito">
                  {cantidadTotal}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* BUSCADOR */}

        {mostrarBusqueda && (
          <div className="buscador-contenedor">
            <input
              autoFocus
              className="buscador-input"
              type="text"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            {busqueda && (
              <button
                className="limpiar-busqueda"
                onClick={() => setBusqueda("")}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* CATEGORÍAS */}

        <nav className="categorias-superiores">
          {CATEGORIAS_PRINCIPALES.map((categoria) => (
            <button
              key={categoria}
              className={`categoria-superior ${
                categoriaActiva === categoria
                  ? "activa"
                  : ""
              }`}
              onClick={() => {
                setCategoriaActiva(categoria);
                scrollInicio();
              }}
            >
              {categoria}
            </button>
          ))}
        </nav>
{/* LÍNEAS DE PRODUCTO */}

<nav className="lineas-producto">
  <button
    type="button"
    className={`linea-producto ${
      lineaActiva === "Todos"
        ? "activa"
        : ""
    }`}
    onClick={() => {
      setLineaActiva("Todos");
      scrollInicio();
    }}
  >
    Todos
  </button>

  <button
    type="button"
    className={`linea-producto ${
      lineaActiva === "Rodio"
        ? "activa"
        : ""
    }`}
    onClick={() => {
      setLineaActiva("Rodio");
      scrollInicio();
    }}
  >
    Accesorios en Rodio
  </button>

  <button
    type="button"
    className={`linea-producto ${
      lineaActiva === "Acero"
        ? "activa"
        : ""
    }`}
    onClick={() => {
      setLineaActiva("Acero");
      scrollInicio();
    }}
  >
    Accesorios en Acero
  </button>
</nav>
        {/* TÍTULO */}

        <div className="titulo-catalogo">
          <h1>
            {categoriaActiva === "Todos"
              ? "Todos los productos"
              : categoriaActiva}
          </h1>

          <span>
            {productosFiltrados.length}{" "}
            {productosFiltrados.length === 1
              ? "producto"
              : "productos"}
          </span>
        </div>

        {/* PRODUCTOS */}

        {productosFiltrados.length > 0 ? (
          <div className="productos-grid">
            {productosFiltrados.map((producto) => {
              const fotos = fotosProducto(producto);

              const indiceActual =
                indiceFotoTarjeta(producto);

              const fotoActual =
                fotos[indiceActual] ||
                fotos[0] ||
                "";

              const tieneVariantes =
                producto.tiene_variantes &&
                Array.isArray(producto.variantes) &&
                producto.variantes.length > 0;

              return (
                <article
                  className="producto-card"
                  key={producto.id}
                >
                  <div className="imagen-contenedor">
                    {fotoActual ? (
                      <img
                        className="producto-imagen"
                        src={fotoActual}
                        alt={producto.nombre}
                                    loading="lazy"
                                    decoding="async"
                        onClick={() =>
                          abrirProducto(
                            producto,
                            indiceActual
                          )
                        }
                      />
                    ) : (
                      <div
                        className="sin-imagen"
                        onClick={() =>
                          abrirProducto(producto)
                        }
                      >
                        Sin imagen
                      </div>
                    )}

                    <button
                      className="boton-agregar"
                      onClick={(e) => {
                        e.stopPropagation();

                        if (tieneVariantes) {
                          abrirProducto(producto);
                        } else {
                          agregarAlCarrito(
                            producto,
                            e.currentTarget
                          );
                        }
                      }}
                      aria-label={
                        tieneVariantes
                          ? "Elegir opción"
                          : "Agregar al carrito"
                      }
                    >
                     <span className="icono-carrito-agregar">🛒</span>
                      <span className="circulo-mas">
                        {productoConfirmado ===
                        claveCarrito(producto)
                          ? "✓"
                          : "+"}
                      </span>
                    </button>
                  </div>
{fotos.length > 1 &&
  !fotosTarjetas[`foto2_error_${producto.id}`] && (
    <div className="miniaturas-producto">
      {fotos.map((foto, index) => (
        <button
          key={`${producto.id}-foto-${index}`}
          type="button"
          className={`miniatura-producto ${
            index === indiceActual ? "activa" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();

            setFotosTarjetas((actual) => ({
              ...actual,
              [producto.id]: index,
            }));
          }}
          aria-label={`Ver foto ${index + 1} de ${producto.nombre}`}
        >
          <img
            src={foto}
            alt={`Foto ${index + 1} de ${producto.nombre}`}
            loading="lazy"
            onError={() => {
              if (index === 1) {
                setFotosTarjetas((actual) => ({
                  ...actual,
                  [`foto2_error_${producto.id}`]: true,
                  [producto.id]: 0,
                }));
              }
            }}
          />

          {index === 1 && (
            <span className="miniatura-etiqueta">
              2
            </span>
          )}
        </button>
      ))}
    </div>
  )}
            
                  <div
                    className="producto-info"
                    onClick={() =>
                      abrirProducto(producto)
                    }
                  >
                    <div className="producto-nombre">
                      {producto.nombre}
                    </div>

                    {tieneVariantes && (
                      <div className="producto-opciones">
                        {producto.variantes.length}{" "}
                        {producto.variantes.length === 1
                          ? "opción"
                          : "opciones"}
                      </div>
                    )}

                    <div className="producto-precio">
                      {tieneVariantes &&
                      producto.variantes.some(
                        (variante) =>
                          Number(variante.precio) !==
                          Number(
                            producto.variantes[0]?.precio
                          )
                      )
                        ? `Desde ${formatoPrecio(
                            Math.min(
                              ...producto.variantes.map(
                                (variante) =>
                                  Number(
                                    variante.precio || 0
                                  )
                              )
                            )
                          )}`
                        : formatoPrecio(producto.precio)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="sin-resultados">
            No encontramos productos.
          </div>
        )}

        {/* BARRA CARRITO */}

        {cantidadTotal > 0 && (
          <button
            className="barra-carrito"
            onClick={() => setCarritoAbierto(true)}
          >
            <span className="barra-carrito-izquierda">
              🛍️
              <strong>
                {cantidadTotal}{" "}
                {cantidadTotal === 1
                  ? "producto"
                  : "productos"}
              </strong>
            </span>

            <strong>
              {formatoPrecio(totalCarrito)}
            </strong>
          </button>
        )}
      </div>
      {/* WHATSAPP FLOTANTE */}

      {limpiarWhatsapp(whatsapp) && (
        <button
          type="button"
          className={`whatsapp-flotante ${
            cantidadTotal > 0 ? "con-carrito" : ""
          }`}
          onClick={() => {
            const numero = limpiarWhatsapp(whatsapp);

            const mensaje = encodeURIComponent(
              `Hola ${nombreTienda} 👋 Tengo una consulta sobre los productos de tu página.`
            );

            window.open(
              `https://wa.me/${numero}?text=${mensaje}`,
              "_blank"
            );
          }}
          aria-label={`Escribir a ${nombreTienda} por WhatsApp`}
        >
          <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M16.04 3C9.4 3 4 8.3 4 14.84c0 2.3.68 4.55 1.97 6.47L4 29l7.9-2.05a12.2 12.2 0 0 0 4.14.72C22.68 27.67 28 22.36 28 15.8 28 9.25 22.68 3 16.04 3Zm0 21.67c-1.28 0-2.53-.34-3.63-.97l-.52-.3-4.69 1.22 1.25-4.53-.34-.54a8.74 8.74 0 0 1-1.35-4.71c0-4.86 4.05-8.82 9.28-8.82 5.22 0 9.2 4.62 9.2 9.78 0 4.86-3.98 8.87-9.2 8.87Zm5.1-6.63c-.28-.14-1.66-.81-1.92-.9-.26-.1-.45-.14-.64.14-.19.28-.73.9-.9 1.08-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.38a8.3 8.3 0 0 1-1.56-1.93c-.16-.28-.02-.43.12-.57.13-.12.28-.33.42-.5.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.5-.07-.14-.64-1.53-.88-2.1-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.35-.26.28-1 1-1 2.44s1.04 2.83 1.18 3.02c.14.19 2.05 3.1 4.96 4.35.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.66-.67 1.9-1.32.23-.65.23-1.2.16-1.32-.07-.12-.26-.19-.54-.33Z"
            />
          </svg>
        </button>
      )}

      {/* MENÚ LATERAL */}

      {menuAbierto && (
        <div
          className="overlay"
          onClick={() => setMenuAbierto(false)}
        >
          <aside
            className="menu-lateral"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-cabecera">
              <strong>Menú</strong>

              <button
                onClick={() => setMenuAbierto(false)}
              >
                ×
              </button>
            </div>

            <div className="menu-lista">
              {CATEGORIAS_MENU.map((categoria) => (
                <button
                  key={categoria}
                  className={
                    categoriaActiva === categoria
                      ? "menu-activo"
                      : ""
                  }
                  onClick={() => {
                    setCategoriaActiva(categoria);
                    setMenuAbierto(false);
                    scrollInicio();
                  }}
                >
                  {categoria}
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* MODAL PRODUCTO */}

      {productoModal && productoSeleccionado && (
        <div
          className="overlay producto-overlay"
          onClick={() => setProductoModal(null)}
        >
          <div
            className="producto-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="cerrar-modal"
              onClick={() => setProductoModal(null)}
            >
              ×
            </button>

            <GaleriaProducto
              producto={productoSeleccionado}
              indiceFoto={indiceFoto}
              setIndiceFoto={setIndiceFoto}
            />

            <div className="producto-modal-info">
              <h2>{productoModal.nombre}</h2>

              {productoSeleccionado.referencia && (
                <div className="referencia-modal">
                  Ref. {productoSeleccionado.referencia}
                </div>
              )}

              <div className="precio-modal">
                {formatoPrecio(
                  productoSeleccionado.precio
                )}
              </div>

              {/* SELECTOR DE VARIANTES */}

              {productoModal.tiene_variantes &&
                Array.isArray(
                  productoModal.variantes
                ) &&
                productoModal.variantes.length >
                  0 && (
                  <div className="variantes-contenedor">
                    <div className="variantes-titulo">
                      Elige una opción
                    </div>

                    <div className="variantes-grid">
                      {productoModal.variantes.map(
                        (variante) => {
                          const seleccionada =
                            String(
                              varianteSeleccionadaId
                            ) ===
                            String(variante.id);

                          return (
                            <button
                              type="button"
                              key={variante.id}
                              className={`variante-boton ${
                                seleccionada
                                  ? "seleccionada"
                                  : ""
                              }`}
                              onClick={() => {
                                setVarianteSeleccionadaId(
                                  variante.id
                                );

                                setIndiceFoto(0);
                              }}
                            >
                              {variante.foto_url && (
                                <img
                                  src={
                                    variante.foto_url
                                  }
                                  alt={
                                    variante.nombre_variante
                                  }
                                />
                              )}

                              <span>
                                {
                                  variante.nombre_variante
                                }
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

              {productoModal.descripcion && (
                <p>{productoModal.descripcion}</p>
              )}

            <button
  className="agregar-modal"
  onClick={() => {
    agregarAlCarrito(productoSeleccionado);
    setProductoModal(null);
  }}
>
  Agregar al carrito
</button>
            </div>

            {/* RECOMENDACIONES */}

            {productosRecomendados.length > 0 && (
              <section className="recomendados-seccion">
                <div className="recomendados-titulo">
                  <h3>También te puede gustar</h3>

                  <span>
                    Descubre productos similares
                  </span>
                </div>

                <div className="recomendados-scroll">
                  {productosRecomendados.map(
                    (producto) => (
                      <button
                        key={producto.id}
                        className="recomendado-card"
                        onClick={() => {
                          abrirProducto(producto);

                          const modal =
                            document.querySelector(
                              ".producto-modal"
                            );

                          if (modal) {
                            modal.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }
                        }}
                      >
                        <div className="recomendado-imagen">
                          {producto.foto_url ? (
                            <img
                              src={producto.foto_url}
                              alt={producto.nombre}
                            />
                          ) : (
                            <div className="recomendado-sin-foto">
                              Sin imagen
                            </div>
                          )}
                        </div>

                        <div className="recomendado-info">
                          <span className="recomendado-nombre">
                            {producto.nombre}
                          </span>

                          {producto.tiene_variantes &&
                            Array.isArray(
                              producto.variantes
                            ) && (
                              <span className="recomendado-opciones">
                                {
                                  producto.variantes
                                    .length
                                }{" "}
                                opciones
                              </span>
                            )}

                          <strong>
                            {formatoPrecio(
                              producto.precio
                            )}
                          </strong>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* CARRITO */}

      {carritoAbierto && (
        <div
          className="overlay carrito-overlay"
          onClick={() => setCarritoAbierto(false)}
        >
          <aside
            className="carrito-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="carrito-cabecera">
              <div>
                <strong>Tu pedido</strong>

                <span>
                  {cantidadTotal} productos
                </span>
              </div>

              <button
                onClick={() =>
                  setCarritoAbierto(false)
                }
              >
                ×
              </button>
            </div>

            {carrito.length > 0 && (
              <div className="vaciar-contenedor">
                <button
                  className="vaciar-carrito"
                  onClick={vaciarCarrito}
                >
                  Vaciar carrito
                </button>
              </div>
            )}

            <div className="carrito-contenido">
              {carrito.length === 0 ? (
                <div className="carrito-vacio">
                  Tu carrito está vacío.
                </div>
              ) : (
                carrito.map((item) => (
                  <div
                    className="carrito-item"
                    key={
                      item.clave_carrito ||
                      item.id
                    }
                  >
                    {item.foto_url ? (
                      <img
                        src={item.foto_url}
                        alt={item.nombre}
                      />
                    ) : (
                      <div className="carrito-sin-imagen">
                        Sin imagen
                      </div>
                    )}

                    <div className="carrito-item-info">
                      <div className="carrito-item-nombre">
                        {item.nombre}
                      </div>

                      {item.variante_nombre && (
                        <div className="carrito-variante">
                          {item.variante_nombre}
                        </div>
                      )}

                      {item.referencia && (
                        <div className="carrito-referencia">
                          Ref. {item.referencia}
                        </div>
                      )}

                      <strong>
                        {formatoPrecio(item.precio)}
                      </strong>

                      <div className="cantidad-controles">
                        <button
                          onClick={() =>
                            disminuirCantidad(
                              item.clave_carrito
                            )
                          }
                        >
                          −
                        </button>

                        <span>
                          {item.cantidad}
                        </span>

                        <button
                          onClick={() =>
                            aumentarCantidad(
                              item.clave_carrito
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      className="eliminar-item"
                      onClick={() =>
                        eliminarProducto(
                          item.clave_carrito
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {carrito.length > 0 && (
              <div className="carrito-pie">
                <div className="total-carrito">
                  <span>Total</span>

                  <strong>
                    {formatoPrecio(totalCarrito)}
                  </strong>
                </div>

                <button
                  className="whatsapp-btn"
                  onClick={enviarPedidoWhatsapp}
                >
                  Enviar pedido por WhatsApp
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

        <style jsx global>{`
 :root {
  --color-principal: ${colorPrincipal};
  --color-fondo: ${colorFondo};
  --texto-principal: ${colorTextoPrincipal};
  --texto-fondo: ${colorTextoFondo};
}

  * {
    box-sizing: border-box;
  }
        * {
          box-sizing: border-box;
        }

        html,
body {
  margin: 0;
  padding: 0;
  background: var(--color-fondo);
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
        }

        body {
          padding-bottom: 100px;
        }

        .tienda {
  min-height: 100vh;
  background: var(--color-fondo);
  color: var(--texto-fondo);
}

        /* HEADER */

        .header {
          height: 165px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--color-fondo);
          color: var(--texto-fondo);
        }

        .header-lateral {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .header-izquierda {
          left: 22px;
        }

        .header-derecha {
          right: 20px;
        }

        .header-btn {
          appearance: none;
          border: none;
          background: transparent;
          padding: 7px;
          font-size: 26px;
          cursor: pointer;
          color: var(--texto-fondo);
        }

        .buscar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .marca {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          max-width: 50%;
          text-align: center;
        }

        .logo-tienda {
          width: 72px;
          height: 72px;
          object-fit: contain;
          border-radius: 4px;
        }

        .logo-placeholder {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #f1f1f1;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 30px;
          font-weight: 700;
        }

        .nombre-tienda {
          font-size: 20px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .mensaje-portada {
  max-width: 360px;
  margin-top: 1px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.35;
  text-align: center;
  color: var(--texto-fondo);
  opacity: 0.72;
  white-space: normal;
}
.redes-sociales {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.red-social {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--texto-fondo);
  color: var(--texto-fondo);
  text-decoration: none;
  font-size: 12px;
  font-weight: 800;
  opacity: 0.75;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}

.red-social:hover {
  transform: translateY(-2px);
  opacity: 1;
}

        .carrito-header {
          position: relative;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 8px;
          transform-origin: center;
        }

        .bolsa {
          font-size: 29px;
          display: block;
        }

        .contador-carrito {
          position: absolute;
          top: -1px;
          right: -3px;
          min-width: 25px;
          height: 25px;
          padding: 0 6px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 999px;
          background: var(--color-principal);
          color: var(--texto-principal);
          font-size: 13px;
          font-weight: 700;
          border: 2px solid white;
        }

        /* ANIMACIÓN */

        .carrito-rebote {
          animation: reboteCarrito 0.48s ease;
        }

        @keyframes reboteCarrito {
          0% {
            transform: scale(1);
          }

          30% {
            transform: scale(1.35) rotate(-8deg);
          }

          55% {
            transform: scale(0.9) rotate(6deg);
          }

          75% {
            transform: scale(1.13) rotate(-3deg);
          }

          100% {
            transform: scale(1) rotate(0);
          }
        }

        .producto-volador {
  position: fixed;
  z-index: 999999;
  object-fit: cover;
  border-radius: 14px;
  pointer-events: none;
  opacity: 1;
  transform: scale(1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);

  transition:
    left 1.25s cubic-bezier(0.22, 0.75, 0.25, 1),
    top 1.25s cubic-bezier(0.22, 0.75, 0.25, 1),
    width 1.25s ease,
    height 1.25s ease,
    opacity 1.15s ease,
    transform 1.25s ease;
}
        /* BUSCADOR */

        .buscador-contenedor {
          position: relative;
          padding: 0 16px 14px;
        }

        .buscador-input {
          width: 100%;
          height: 48px;
          border: 1px solid #d7d7d7;
          border-radius: 4px;
          padding: 0 45px 0 15px;
          outline: none;
          font-size: 16px;
        }

        .limpiar-busqueda {
          position: absolute;
          right: 27px;
          top: 7px;
          border: none;
          background: transparent;
          font-size: 26px;
        }

        /* CATEGORÍAS */

        .categorias-superiores {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          gap: 34px;
          overflow-x: auto;
          white-space: nowrap;
          padding: 0 22px;
          background: var(--color-fondo);
          border-bottom: 1px solid #ededed;
          scrollbar-width: none;
        }

        .categorias-superiores::-webkit-scrollbar {
          display: none;
        }

        .categoria-superior {
          flex: 0 0 auto;
          padding: 14px 0 12px;
          border: none;
          border-bottom: 3px solid transparent;
          background: transparent;
          color: var(--texto-fondo);
          font-size: 17px;
        }

        .categoria-superior.activa {
  font-weight: 700;
  border-bottom-color: var(--color-principal);
}
/* LÍNEAS DE PRODUCTO */

.lineas-producto {
  display: flex;
  align-items: center;
  gap: 9px;

  padding: 11px 14px 10px;

  overflow-x: auto;
  white-space: nowrap;

  background: var(--color-fondo);

  border-bottom: 1px solid
    rgba(128, 128, 128, 0.18);

  scrollbar-width: none;
}

.lineas-producto::-webkit-scrollbar {
  display: none;
}

.linea-producto {
  flex: 0 0 auto;

  min-height: 38px;
  padding: 8px 16px;

  border: 1px solid
    rgba(128, 128, 128, 0.28);

  border-radius: 999px;

  background: transparent;
  color: var(--texto-fondo);

  font-size: 13px;
  font-weight: 600;

  white-space: nowrap;
}

.linea-producto.activa {
  background: var(--color-principal);
  border-color: var(--color-principal);
  color: var(--texto-principal);
  font-weight: 700;
}
        .titulo-catalogo {
          max-width: 1440px;
          margin: auto;
          padding: 22px 18px 12px;
        }

        .titulo-catalogo h1 {
          margin: 0 0 5px;
          font-size: 24px;
        }

        .titulo-catalogo span {
  color: var(--texto-fondo);
  opacity: 0.65;
}

        /* PRODUCTOS */

        .productos-grid {
          max-width: 1440px;
          margin: auto;
          padding: 4px 12px 130px;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          column-gap: 10px;
          row-gap: 25px;
        }

        .producto-card {
  min-width: 0;
  background: var(--color-fondo);
}

        .imagen-contenedor {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #f5f5f5;
        }

        .producto-imagen {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          cursor: pointer;
        }

        .sin-imagen {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #aaa;
        }

        /* BOTÓN AGREGAR */

        .boton-agregar {
          position: absolute;
          right: 10px;
          bottom: 10px;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: none;
          background: white;
          box-shadow: 0 3px 12px
            rgba(0, 0, 0, 0.14);
          display: flex;
          justify-content: center;
          align-items: center;
        }

       .icono-carrito-agregar {
  font-size: 27px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-1px, -1px);
}

        .circulo-mas {
          position: absolute;
          right: 2px;
          bottom: 3px;
          width: 25px;
          height: 25px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          background: var(--color-principal);
          color: var(--texto-principal);
          border: 2px solid white;
        }

      /* FOTOS TARJETA - MINIATURAS */

.miniaturas-producto {
  min-height: 64px;
  padding: 7px 7px 6px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  border-bottom: 1px solid #eeeeee;
  background: var(--color-fondo);
}

.miniatura-producto {
  position: relative;
  width: 50px;
  height: 50px;
  flex: 0 0 50px;
  padding: 2px;
  overflow: hidden;
  border: 1px solid #d8d8d8;
  border-radius: 7px;
  background: #ffffff;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.miniatura-producto:hover {
  transform: translateY(-1px);
  border-color: #777777;
}

.miniatura-producto.activa {
  border: 2px solid var(--color-principal);
  padding: 1px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.miniatura-producto img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.miniatura-etiqueta {
  position: absolute;
  right: 2px;
  bottom: 2px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  border: 1px solid #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}
        /* INFORMACIÓN PRODUCTO */

        .producto-info {
          padding: 9px 7px 0;
          cursor: pointer;
          color: var(--texto-fondo);
        }

        .producto-nombre {
          font-size: 17px;
          line-height: 1.2;
          text-transform: uppercase;
          min-height: 41px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .producto-opciones {
          display: inline-flex;
          align-items: center;
          margin-top: 3px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #f4f4f4;
          color: #555;
          font-size: 12px;
          font-weight: 600;
        }

        .producto-precio {
  margin-top: 5px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-principal);
}

        .sin-resultados {
          text-align: center;
          padding: 70px 20px;
        }

        /* BARRA CARRITO */

        .barra-carrito {
          position: fixed;
          z-index: 500;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          width: calc(100% - 40px);
          max-width: 680px;
          min-height: 68px;
          padding: 0 25px;
          border: none;
          border-radius: 14px;
          background: var(--color-principal);
color: var(--texto-principal);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 12px 30px
            rgba(0, 0, 0, 0.23);
        }

        .barra-carrito-izquierda {
          display: flex;
          gap: 9px;
          align-items: center;
        }

        /* OVERLAY */

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.42);
        }

        /* MENÚ */

        .menu-lateral {
          width: min(88vw, 360px);
          height: 100%;
          background: white;
          padding: 25px;
        }

        .menu-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 22px;
          border-bottom: 1px solid #eee;
        }

        .menu-cabecera button,
        .carrito-cabecera button,
        .cerrar-modal {
          border: none;
          background: transparent;
          font-size: 31px;
        }

        .menu-lista {
          display: flex;
          flex-direction: column;
        }

        .menu-lista button {
          width: 100%;
          padding: 16px 3px;
          border: none;
          border-bottom: 1px solid #eee;
          background: white;
          text-align: left;
        }

        .menu-activo {
  font-weight: 700;
  color: var(--color-principal);
}

        /* MODAL PRODUCTO */

        .producto-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .producto-modal {
          position: relative;
          width: min(100%, 620px);
          max-height: 94vh;
          overflow-y: auto;
          background: white;
          border-radius: 10px;
        }

        .cerrar-modal {
          position: absolute;
          z-index: 20;
          top: 10px;
          right: 10px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: white;
        }

        .galeria-producto {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background: #f4f4f4;
        }

        .galeria-producto img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .galeria-flecha {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          font-size: 27px;
        }

        .galeria-flecha.izquierda {
          left: 12px;
        }

        .galeria-flecha.derecha {
          right: 12px;
        }

        .galeria-puntos {
          position: absolute;
          bottom: 13px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 7px;
        }

        .galeria-punto {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.3);
        }

        .galeria-punto.activo {
  background: var(--color-principal);
}

        .producto-modal-info {
          padding: 23px;
        }

        .producto-modal-info h2 {
          margin: 0;
          font-size: 21px;
        }

        .referencia-modal {
          margin-top: 7px;
          color: #777;
          font-size: 13px;
        }

        .precio-modal {
  margin-top: 10px;
  font-size: 23px;
  font-weight: 700;
  color: var(--color-principal);
}

        .producto-modal-info p {
          color: #555;
          line-height: 1.5;
        }

        /* VARIANTES */

        .variantes-contenedor {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid #eeeeee;
        }

        .variantes-titulo {
          margin-bottom: 12px;
          font-size: 15px;
          font-weight: 700;
        }

        .variantes-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .variante-boton {
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px;
          border: 1px solid #dddddd;
          border-radius: 8px;
          background: white;
          text-align: left;
        }

        .variante-boton.seleccionada {
  border: 2px solid var(--color-principal);
  padding: 6px;
  background: #fafafa;
}

        .variante-boton img {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          object-fit: cover;
          border-radius: 5px;
          background: #f3f3f3;
        }

        .variante-boton span {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.25;
          text-transform: uppercase;
        }

        .agregar-modal {
  width: 100%;
  height: 52px;
  margin-top: 15px;
  border: none;
  border-radius: 6px;
  background: var(--color-principal);
  color: var(--texto-principal);
  font-weight: 700;
}

        /* RECOMENDACIONES */

        .recomendados-seccion {
          padding: 20px 0 30px;
          border-top: 8px solid #f6f6f6;
        }

        .recomendados-titulo {
          padding: 0 20px 15px;
        }

        .recomendados-titulo h3 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .recomendados-titulo span {
          color: #888;
          font-size: 13px;
        }

        .recomendados-scroll {
          display: flex;
          overflow-x: auto;
          gap: 10px;
          padding: 0 16px 7px;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }

        .recomendados-scroll::-webkit-scrollbar {
          display: none;
        }

        .recomendado-card {
          flex: 0 0 43%;
          max-width: 200px;
          border: none;
          background: white;
          padding: 0;
          text-align: left;
          scroll-snap-align: start;
        }

        .recomendado-imagen {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #f5f5f5;
          border-radius: 5px;
        }

        .recomendado-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .recomendado-sin-foto {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #aaa;
        }

        .recomendado-info {
          padding: 8px 2px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .recomendado-nombre {
          font-size: 13px;
          line-height: 1.25;
          text-transform: uppercase;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 32px;
        }

        .recomendado-opciones {
          font-size: 11px;
          color: #777;
        }

        .recomendado-info strong {
          font-size: 14px;
        }

        /* CARRITO */

        .carrito-overlay {
          display: flex;
          justify-content: flex-end;
        }

        .carrito-panel {
          width: min(100%, 430px);
          height: 100%;
          background: white;
          display: flex;
          flex-direction: column;
        }

        .carrito-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .carrito-cabecera > div {
          display: flex;
          flex-direction: column;
        }

        .vaciar-contenedor {
          text-align: right;
          padding: 10px 18px 0;
        }

        .vaciar-carrito {
          border: none;
          background: transparent;
          text-decoration: underline;
          color: #777;
        }

        .carrito-contenido {
          flex: 1;
          overflow-y: auto;
          padding: 10px 18px;
        }

        .carrito-vacio {
          text-align: center;
          color: #777;
          padding: 70px 20px;
        }

        .carrito-item {
          display: grid;
          grid-template-columns: 90px 1fr auto;
          gap: 12px;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }

        .carrito-item > img {
          width: 90px;
          height: 90px;
          object-fit: cover;
        }

        .carrito-sin-imagen {
          width: 90px;
          height: 90px;
          background: #f4f4f4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 12px;
        }

        .carrito-item-nombre {
          font-size: 14px;
          margin-bottom: 5px;
          font-weight: 600;
        }

        .carrito-variante {
  margin-bottom: 3px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-principal);
}

        .carrito-referencia {
          margin-bottom: 7px;
          color: #777;
          font-size: 12px;
        }

        .cantidad-controles {
          display: flex;
          width: fit-content;
          border: 1px solid #ddd;
          margin-top: 12px;
        }

        .cantidad-controles button {
  width: 35px;
  height: 34px;
  border: none;
  background: var(--color-principal);
  color: var(--texto-principal);
  font-weight: 700;
}

        .cantidad-controles span {
          width: 33px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .eliminar-item {
          border: none;
          background: transparent;
          font-size: 23px;
        }

        .carrito-pie {
          padding: 18px;
          border-top: 1px solid #eee;
        }

        .total-carrito {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 18px;
}

.total-carrito strong {
  color: var(--color-principal);
}

        .whatsapp-btn {
  width: 100%;
  height: 55px;
  border: 3px solid var(--color-principal);
  border-radius: 8px;
  background: #25d366;
  color: white;
  font-weight: 700;
}
/* WHATSAPP FLOTANTE */

.whatsapp-flotante {
  position: fixed;
  right: 20px;
  bottom: 24px;
  z-index: 9000;

  width: 64px;
  height: 64px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: 50%;

  background: #25d366;
  color: white;

  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.22);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.whatsapp-flotante svg {
  width: 37px;
  height: 37px;
}

.whatsapp-flotante:hover {
  transform: scale(1.07);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.28);
}

/* Si aparece la barra del carrito,
   subimos WhatsApp para que no se tapen */

.whatsapp-flotante.con-carrito {
  bottom: 105px;
}

@media (max-width: 650px) {
  .whatsapp-flotante {
    right: 16px;
    bottom: 18px;
    width: 60px;
    height: 60px;
  }

  .whatsapp-flotante.con-carrito {
    bottom: 100px;
  }

  .whatsapp-flotante svg {
    width: 35px;
    height: 35px;
  }
}
        /* TABLET */

        @media (max-width: 900px) {
          .productos-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        /* CELULAR */

        @media (max-width: 650px) {
          .header {
            height: 165px;
            padding: 14px 10px;
          }

          .header-izquierda {
            left: 20px;
          }

          .header-derecha {
            right: 12px;
          }

          .marca {
            max-width: 54%;
          }

          .logo-tienda,
          .logo-placeholder {
            width: 68px;
            height: 68px;
          }

          .nombre-tienda {
            font-size: 18px;
            white-space: nowrap;
          }

          .categorias-superiores {
            gap: 35px;
          }

          .titulo-catalogo {
            padding: 10px 7px 8px;
          }

          .titulo-catalogo h1 {
            display: none;
          }

          .productos-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            column-gap: 5px;
            row-gap: 17px;
            padding: 4px 5px 120px;
          }

          .producto-nombre {
            font-size: 16px;
          }

          .producto-precio {
            font-size: 17px;
          }

          .boton-agregar {
            width: 55px;
            height: 55px;
          }

          .cambiar-foto-barra {
            height: 31px;
          }

          .cambiar-foto-barra button {
            width: 27px;
            font-size: 22px;
          }

          .producto-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .producto-modal {
            width: 100%;
            max-height: 94vh;
            border-radius: 14px 14px 0 0;
          }

          .variantes-grid {
            grid-template-columns: 1fr 1fr;
          }

          .recomendado-card {
            flex-basis: 42%;
          }

          .carrito-panel {
            width: 100%;
          }

          .barra-carrito {
            bottom: 16px;
            width: calc(100% - 34px);
          }
        }
      `}</style>
    </>
  );
}

// ========================================
// GALERÍA DEL PRODUCTO
// ========================================

function GaleriaProducto({
  producto,
  indiceFoto,
  setIndiceFoto,
}) {
  const fotos = [
    producto?.foto_url,
    producto?.foto_url_2,
  ].filter(Boolean);

  useEffect(() => {
    if (indiceFoto >= fotos.length) {
      setIndiceFoto(0);
    }
  }, [
    producto?.foto_url,
    producto?.foto_url_2,
    indiceFoto,
    fotos.length,
    setIndiceFoto,
  ]);

  if (!fotos.length) {
    return (
      <div className="galeria-producto">
        <div className="sin-imagen">
          Sin imagen
        </div>
      </div>
    );
  }

  function anterior() {
    setIndiceFoto((actual) =>
      actual === 0
        ? fotos.length - 1
        : actual - 1
    );
  }

  function siguiente() {
    setIndiceFoto((actual) =>
      actual === fotos.length - 1
        ? 0
        : actual + 1
    );
  }

  return (
    <div className="galeria-producto">
      <img
        src={fotos[indiceFoto] || fotos[0]}
        alt={producto.nombre}
      />

      {fotos.length > 1 && (
        <>
          <button
            className="galeria-flecha izquierda"
            onClick={anterior}
          >
            ‹
          </button>

          <button
            className="galeria-flecha derecha"
            onClick={siguiente}
          >
            ›
          </button>

          <div className="galeria-puntos">
            {fotos.map((_, index) => (
              <span
                key={index}
                className={`galeria-punto ${
                  index === indiceFoto
                    ? "activo"
                    : ""
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function scrollInicio() {
  if (typeof window !== "undefined") {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
}
