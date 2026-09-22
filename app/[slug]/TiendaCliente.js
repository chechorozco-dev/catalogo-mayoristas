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
function normalizarTelefonoColombia(numero = "") {
  let limpio = String(numero).replace(/\D/g, "");

  // Si viene como 0057...
  if (limpio.startsWith("0057")) {
    limpio = limpio.substring(2);
  }

  // Si ingresaron solamente los 10 dígitos colombianos
  if (limpio.length === 10 && limpio.startsWith("3")) {
    return `57${limpio}`;
  }

  // Si ya viene correctamente con 57
  if (
    limpio.length === 12 &&
    limpio.startsWith("573")
  ) {
    return limpio;
  }

  return limpio;
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
  tipoTienda = "CLIENTE",
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
  anuncios = [],
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
  const PRODUCTOS_POR_CARGA = 24;

const [cantidadVisible, setCantidadVisible] =
  useState(PRODUCTOS_POR_CARGA);

const cargadorRef = useRef(null);
  // ========================================
// ANUNCIOS DE LA TIENDA
// ========================================

const [indiceAnuncio, setIndiceAnuncio] =
  useState(0);

useEffect(() => {
  if (!Array.isArray(anuncios) || anuncios.length <= 1) {
    return;
  }

  const intervalo = setInterval(() => {
    setIndiceAnuncio((actual) =>
      actual >= anuncios.length - 1
        ? 0
        : actual + 1
    );
  }, 6000);

  return () => clearInterval(intervalo);
}, [anuncios]);

useEffect(() => {
  if (
    Array.isArray(anuncios) &&
    anuncios.length > 0 &&
    indiceAnuncio >= anuncios.length
  ) {
    setIndiceAnuncio(0);
  }
}, [anuncios, indiceAnuncio]);

const anuncioActual =
  Array.isArray(anuncios) && anuncios.length > 0
    ? anuncios[indiceAnuncio] || anuncios[0]
    : null;

function iconoAnuncio(tipo = "") {
  const tipoLimpio = String(tipo)
    .trim()
    .toUpperCase();

  if (tipoLimpio === "PROMOCION") return "🎁";
  if (tipoLimpio === "NOVEDAD") return "✨";
  if (tipoLimpio === "URGENTE") return "⏰";

  return "📢";
}
  // ========================================
// FINALIZAR COMPRA
// ========================================

const [formularioCompraAbierto, setFormularioCompraAbierto] =
  useState(false);
const [enviandoPedido, setEnviandoPedido] =
  useState(false);

const [pedidoEnviado, setPedidoEnviado] =
  useState(false);
const [nombreCliente, setNombreCliente] = useState("");
const [cedulaCliente, setCedulaCliente] = useState("");
const [telefonoCliente, setTelefonoCliente] = useState("");
const [correoCliente, setCorreoCliente] = useState("");
const [direccionCliente, setDireccionCliente] = useState("");

// FORMA DE PAGO
// "CONTRA_ENTREGA" o "TRANSFERENCIA"
const [formaPago, setFormaPago] = useState("");

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
 const productosVisibles = useMemo(() => {
  return productosFiltrados.slice(0, cantidadVisible);
}, [productosFiltrados, cantidadVisible]);   
  // ========================================
// CARGA PROGRESIVA DE PRODUCTOS
// ========================================

useEffect(() => {
  const elemento = cargadorRef.current;

  if (!elemento) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const entrada = entries[0];

      if (
        entrada.isIntersecting &&
        cantidadVisible < productosFiltrados.length
      ) {
        setCantidadVisible((actual) =>
          Math.min(
            actual + PRODUCTOS_POR_CARGA,
            productosFiltrados.length
          )
        );
      }
    },
    {
      root: null,
      rootMargin: "600px 0px",
      threshold: 0,
    }
  );

  observer.observe(elemento);

  return () => {
    observer.disconnect();
  };
}, [cantidadVisible, productosFiltrados.length]);
  useEffect(() => {
  setCantidadVisible(PRODUCTOS_POR_CARGA);
}, [categoriaActiva, lineaActiva, busqueda]);

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

// ========================================
// TOTALES DEL CHECKOUT RA
// ========================================

// El 6% solamente aplica a los productos
const descuentoTransferencia =
  formaPago === "TRANSFERENCIA"
    ? Math.round(totalCarrito * 0.06)
    : 0;

// Valor normal del envío según la ciudad
const costoEnvioNormal =
  ciudadSeleccionada?.costo_envio !== null &&
  ciudadSeleccionada?.costo_envio !== undefined
    ? Number(ciudadSeleccionada.costo_envio)
    : null;

// Envío gratis:
// productos SUPERIORES a $400.000
// y envío normal MENOR a $18.000
const tieneEnvioGratis =
  totalCarrito > 400000 &&
  costoEnvioNormal !== null &&
  costoEnvioNormal < 18000;

// Valor que realmente pagará por el envío
const costoEnvioFinal =
  costoEnvioNormal === null
    ? null
    : tieneEnvioGratis
      ? 0
      : costoEnvioNormal;

// Total final
const totalPedido =
  totalCarrito -
  descuentoTransferencia +
  (costoEnvioFinal || 0);

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
async function confirmarPedido() {
  if (enviandoPedido) return;

  const telefonoNormalizado =
    normalizarTelefonoColombia(telefonoCliente);

  if (!nombreCliente.trim()) {
    alert("Por favor ingresa tu nombre.");
    return;
  }

  if (!/^573\d{9}$/.test(telefonoNormalizado)) {
    alert(
      "Ingresa un número de WhatsApp colombiano válido."
    );
    return;
  }

  if (!direccionCliente.trim()) {
    alert("Por favor ingresa tu dirección.");
    return;
  }

  if (!ciudadSeleccionada?.ciudad_id) {
    alert("Selecciona tu ciudad.");
    return;
  }

  if (!formaPago) {
    alert("Selecciona una forma de pago.");
    return;
  }

  if (!carrito.length) {
    alert("Tu carrito está vacío.");
    return;
  }

  const pedido = {
    cliente: {
      nombre: nombreCliente.trim(),

      cedula: cedulaCliente.trim(),

      whatsapp: telefonoNormalizado,

      correo: correoCliente.trim(),

      direccion: direccionCliente.trim(),

      // MUY IMPORTANTE:
      // este es el ID EXACTO que viene de Supabase/AppSheet
      ciudad_id: ciudadSeleccionada.ciudad_id,

      ciudad_departamento:
        ciudadSeleccionada.ciudad_departamento || "",

      tiempo_estimado:
        ciudadSeleccionada.tiempo_estimado || "",
    },

    pago: {
      forma_pago: formaPago,
    },

    valores: {
      subtotal_productos: Number(totalCarrito),

      porcentaje_descuento:
        formaPago === "TRANSFERENCIA" ? 6 : 0,

      descuento: Number(
        descuentoTransferencia
      ),

      costo_envio_original:
        costoEnvioNormal === null
          ? 0
          : Number(costoEnvioNormal),

      envio_gratis: Boolean(tieneEnvioGratis),

      costo_envio_final:
        costoEnvioFinal === null
          ? 0
          : Number(costoEnvioFinal),

      total_pedido: Number(totalPedido),
    },

    productos: carrito.map((item) => ({
      producto_id:
        item.id_producto || item.id || null,

      variante_id:
        item.variante_id || null,

      nombre: item.nombre || "",

      referencia: item.referencia || "",

      variante: item.variante_nombre || "",

      cantidad: Number(item.cantidad || 0),

      precio_unitario: Number(
        item.precio || 0
      ),

      subtotal:
        Number(item.precio || 0) *
        Number(item.cantidad || 0),
    })),
  };

  try {
    setEnviandoPedido(true);

    const respuesta = await fetch(
      "/api/confirmar-pedido",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(pedido),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.ok) {
      throw new Error(
        datos?.error ||
          "No se pudo confirmar el pedido."
      );
    }

    setPedidoEnviado(true);
setCarrito([]);

  } catch (error) {
    console.error(
      "Error confirmando pedido:",
      error
    );

    alert(
      "No pudimos confirmar el pedido. Intenta nuevamente."
    );
  } finally {
    setEnviandoPedido(false);
  }
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
  <div className="header-contenido">

    {/* MENÚ */}

    <button
      type="button"
      className="header-btn menu-header-btn"
      onClick={() => setMenuAbierto(true)}
      aria-label="Abrir menú"
    >
      <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </svg>
    </button>

    {/* MARCA */}

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

      <div className="marca-textos">
        <div className="nombre-tienda">
          {nombreTienda}
        </div>

        {mensajePortada && (
          <div className="mensaje-portada">
            {mensajePortada}
          </div>
        )}
      </div>
    </div>

    {/* ACCIONES */}

    <div className="header-acciones">

     <button
  type="button"
  className="header-btn"
  onClick={() => {
    setMostrarBusqueda((actual) => !actual);

    setTimeout(() => {
      document
        .querySelector(".buscador-input")
        ?.focus();
    }, 100);
  }}
  aria-label="Buscar"
>
        <svg
          viewBox="0 0 24 24"
          width="25"
          height="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      <button
        ref={carritoRef}
        type="button"
        className="carrito-header"
        onClick={() => setCarritoAbierto(true)}
        aria-label="Abrir carrito"
      >
        <svg
          viewBox="0 0 24 24"
          width="27"
          height="27"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8h12l1 13H5L6 8Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </svg>

        {cantidadTotal > 0 && (
          <span className="contador-carrito">
            {cantidadTotal}
          </span>
        )}
      </button>

    </div>

  </div>

  {/* REDES SOCIALES */}

  {tieneRedesSociales && (
    <div className="redes-sociales">

      {enlaceInstagram && (
        <a
          href={enlaceInstagram}
          target="_blank"
          rel="noopener noreferrer"
          className="red-social"
          aria-label="Instagram"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
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
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
          >
            <path d="M15.5 3c.3 2.1 1.5 3.4 3.5 3.8v3.1c-1.3 0-2.5-.4-3.5-1.1v6.3a5.7 5.7 0 1 1-4.9-5.6v3.2a2.6 2.6 0 1 0 1.7 2.4V3h3.2Z" />
          </svg>
        </a>
      )}

    </div>
  )}
</header>

        {/* BUSCADOR PRINCIPAL - SOLO APARECE AL TOCAR LA LUPA */}

{mostrarBusqueda && (
  <div className="buscador-contenedor">
    <div className="buscador-caja">

      <svg
        className="buscador-icono"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>

      <input
        autoFocus
        className="buscador-input"
        type="search"
        placeholder="Buscar productos, referencias..."
        value={busqueda}
        onChange={(e) =>
          setBusqueda(e.target.value)
        }
      />

      <button
        type="button"
        className="limpiar-busqueda"
        onClick={() => {
          setBusqueda("");
          setMostrarBusqueda(false);
        }}
        aria-label="Cerrar búsqueda"
      >
        ×
      </button>

    </div>
  </div>
)}
<div className="navegacion-sticky">
  
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
{/* ANUNCIOS DE LA TIENDA */}

{anuncioActual && (
  <section className="anuncio-contenedor">
    <div
      className="anuncio-tienda"
      key={anuncioActual.id}
      style={{
        background:
          anuncioActual.color_fondo || "#FFF4D6",
        color:
          anuncioActual.color_texto || "#111111",
      }}
    >
      {anuncioActual.imagen_url && (
        <div className="anuncio-imagen">
          <img
            src={anuncioActual.imagen_url}
            alt=""
          />
        </div>
      )}

      <div className="anuncio-icono">
        {iconoAnuncio(anuncioActual.tipo)}
      </div>

      <div className="anuncio-informacion">
        <strong>
          {anuncioActual.titulo}
        </strong>

        {anuncioActual.mensaje && (
          <span>
            {anuncioActual.mensaje}
          </span>
        )}
      </div>

      {anuncioActual.texto_boton &&
        anuncioActual.enlace_boton && (
          <a
            className="anuncio-boton"
            href={anuncioActual.enlace_boton}
            target="_blank"
            rel="noopener noreferrer"
          >
            {anuncioActual.texto_boton}
            <span>→</span>
          </a>
        )}

      {anuncios.length > 1 && (
        <div className="anuncio-puntos">
          {anuncios.map((anuncio, index) => (
            <button
              key={anuncio.id}
              type="button"
              aria-label={`Ver anuncio ${index + 1}`}
              className={
                index === indiceAnuncio
                  ? "activo"
                  : ""
              }
              onClick={() =>
                setIndiceAnuncio(index)
              }
            />
          ))}
        </div>
      )}
    </div>
  </section>
)}
</div>
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
           {productosVisibles.map((producto) => {
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

            {cantidadVisible < productosFiltrados.length && (
              <div
                ref={cargadorRef}
                className="cargador-productos"
                aria-hidden="true"
              />
            )}
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
{/* FORMULARIO FINALIZAR COMPRA - SOLO TIENDA RA */}

{String(tipoTienda || "")
  .trim()
  .toUpperCase() === "RA" &&
  formularioCompraAbierto && (
    <div
      className="overlay compra-overlay"
      onClick={() =>
        setFormularioCompraAbierto(false)
      }
    >
      <div
        className="compra-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="compra-cabecera">
          <div>
            <strong>Finalizar compra</strong>
            <span>
              Completa los datos para tu pedido
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setFormularioCompraAbierto(false)
            }
          >
            ×
          </button>
        </div>

        <div className="compra-contenido">
          {pedidoEnviado ? (
  <div className="pedido-exitoso">
    <div className="pedido-exitoso-icono">
      ✓
    </div>

    <h2>¡Pedido recibido!</h2>

    <p>
      Gracias por tu compra. Hemos recibido tu pedido
      correctamente.
    </p>

    <p>
      En breve nos comunicaremos contigo por WhatsApp
      para continuar con el proceso.
    </p>

    <button
      type="button"
      className="pedido-exitoso-btn"
      onClick={() => {
        setFormularioCompraAbierto(false);
        setPedidoEnviado(false);

        setNombreCliente("");
        setCedulaCliente("");
        setTelefonoCliente("");
        setCorreoCliente("");
        setDireccionCliente("");
        setCiudadSeleccionada(null);
        setBusquedaCiudad("");
        setFormaPago("");
      }}
    >
      Volver a la tienda
    </button>
  </div>
) : (
  <>

          <label className="compra-campo">
            <span>Nombre completo</span>

            <input
  type="text"
  name="nombre_cliente"
  autoComplete="name"
  enterKeyHint="next"
  value={nombreCliente}
  onChange={(e) =>
    setNombreCliente(e.target.value)
  }
  placeholder="Ej. María Rodríguez"
/>
          </label>

          <label className="compra-campo">
  <span>Cédula (opcional)</span>

  <input
    type="text"
    inputMode="numeric"
    autoComplete="off"
    name="documento_identificacion_cliente"
    id="documento_identificacion_cliente"
    value={cedulaCliente}
    onChange={(e) =>
      setCedulaCliente(
        e.target.value.replace(/\D/g, "")
      )
    }
    placeholder="Número de cédula"
  />
</label>

          <label className="compra-campo">
            <span>WhatsApp</span>

           <input
  type="tel"
  inputMode="tel"
  autoComplete="tel"
  name="tel"
  value={telefonoCliente}
  onChange={(e) =>
    setTelefonoCliente(
      e.target.value.replace(/\D/g, "")
    )
  }
  placeholder="Ej. 3101234567"
/>
          </label>
          <label className="compra-campo">
  <span>Correo electrónico (opcional)</span>

  <input
    type="email"
    inputMode="email"
    autoComplete="email"
    name="email"
    value={correoCliente}
    onChange={(e) =>
      setCorreoCliente(e.target.value)
    }
    placeholder="Ej. cliente@gmail.com"
  />
</label>

          <label className="compra-campo">
            <span>Dirección</span>

            <input
              type="text"
              value={direccionCliente}
              onChange={(e) =>
                setDireccionCliente(e.target.value)
              }
              placeholder="Ej. Calle 15 # 20-30"
            />
          </label>

          <div className="compra-campo">
            <span>Ciudad y departamento</span>

            <input
              type="text"
              value={busquedaCiudad}
              onChange={(e) => {
                setBusquedaCiudad(e.target.value);
                setCiudadSeleccionada(null);
              }}
              placeholder="Buscar ciudad o departamento..."
              autoComplete="off"
            />

            {busquedaCiudad.trim() &&
              !ciudadSeleccionada && (
                <div className="ciudades-resultados">
                  {cargandoCiudades ? (
                    <div className="ciudad-mensaje">
                      Cargando ciudades...
                    </div>
                  ) : (
                    ciudadesEnvio
                      .filter((ciudad) =>
                        limpiarTexto(
                          ciudad.ciudad_departamento
                        ).includes(
                          limpiarTexto(busquedaCiudad)
                        )
                      )
                      .slice(0, 20)
                      .map((ciudad) => (
                        <button
                          type="button"
                          className="ciudad-opcion"
                          key={ciudad.ciudad_id}
                          onClick={() => {
                            setCiudadSeleccionada(
                              ciudad
                            );

                            setBusquedaCiudad(
                              ciudad.ciudad_departamento
                            );
                          }}
                        >
                          {ciudad.ciudad_departamento}
                        </button>
                      ))
                  )}
                </div>
              )}

            {ciudadSeleccionada && (
              <div className="ciudad-seleccionada">

                {ciudadSeleccionada.tiempo_estimado && (
                  <div>
                    <span>
                      Tiempo estimado de entrega
                    </span>

                    <strong>
                      {
                        ciudadSeleccionada.tiempo_estimado
                      }
                    </strong>
                  </div>
                )}

                <div>
                  <span>Valor del envío</span>

                  <strong>
                    {ciudadSeleccionada.costo_envio !==
                      null &&
                    ciudadSeleccionada.costo_envio !==
                      undefined
                      ? formatoPrecio(
                          ciudadSeleccionada.costo_envio
                        )
                      : "Por calcular"}
                  </strong>
                </div>

              </div>
            )}
          </div>

          {/* FORMA DE PAGO */}

          <div className="forma-pago">
            <span className="forma-pago-titulo">
              Forma de pago
            </span>

            <button
              type="button"
              className={`forma-pago-opcion ${
                formaPago === "CONTRA_ENTREGA"
                  ? "seleccionada"
                  : ""
              }`}
              onClick={() =>
                setFormaPago("CONTRA_ENTREGA")
              }
            >
              <span className="forma-pago-radio">
                {formaPago === "CONTRA_ENTREGA"
                  ? "●"
                  : "○"}
              </span>

              <div>
                <strong>Pago contra entrega</strong>
                <small>
                  Paga cuando recibas tu pedido
                </small>
              </div>
            </button>

            <button
              type="button"
              className={`forma-pago-opcion ${
                formaPago === "TRANSFERENCIA"
                  ? "seleccionada"
                  : ""
              }`}
              onClick={() =>
                setFormaPago("TRANSFERENCIA")
              }
            >
              <span className="forma-pago-radio">
                {formaPago === "TRANSFERENCIA"
                  ? "●"
                  : "○"}
              </span>

              <div>
                <strong>
                  Transferencia bancaria
                </strong>

                <small>
                  Obtienes 6% de descuento en los productos
                </small>
              </div>

              <span className="descuento-badge">
                -6%
              </span>
            </button>
          </div>

                   <div className="resumen-compra">
                   
            <div>
              <span>Productos</span>

              <strong>
                {formatoPrecio(totalCarrito)}
              </strong>
            </div>

            {formaPago === "TRANSFERENCIA" && (
              <div className="resumen-descuento">
                <span>
                  Descuento por transferencia (6%)
                </span>

                <strong>
                  -{formatoPrecio(
                    descuentoTransferencia
                  )}
                </strong>
              </div>
            )}

            <div>
              <span>Envío</span>

              <strong>
                {costoEnvioFinal === null
                  ? "Por calcular"
                  : tieneEnvioGratis
                    ? "GRATIS"
                    : formatoPrecio(
                        costoEnvioFinal
                      )}
              </strong>
            </div>

            {tieneEnvioGratis && (
              <div className="envio-gratis-mensaje">
                <span>
                  🎁 Envío gratis por compra superior a
                  $400.000
                </span>
              </div>
            )}

            <div className="total-final-pedido">
              <span>Total a pagar</span>

              <strong>
                {ciudadSeleccionada
                  ? formatoPrecio(totalPedido)
                  : "Por calcular"}
              </strong>
            </div>
          </div>

          <button
  type="button"
  className="confirmar-pedido-btn"
  disabled={
    enviandoPedido ||
    !nombreCliente.trim() ||
    !telefonoCliente.trim() ||
    !direccionCliente.trim() ||
    !ciudadSeleccionada ||
    !formaPago
  }
  onClick={confirmarPedido}
>
  {enviandoPedido
    ? "Enviando pedido..."
    : "Confirmar pedido"}
</button>
</>
)}
        </div>
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

                {String(tipoTienda || "")
  .trim()
  .toUpperCase() === "RA" ? (
  <button
  className="confirmar-compra-btn"
  onClick={() => {
    setCarritoAbierto(false);
    setFormularioCompraAbierto(true);
  }}
>
  Confirmar compra
</button>
) : (
  <button
    className="whatsapp-btn"
    onClick={enviarPedidoWhatsapp}
  >
    Enviar pedido por WhatsApp
  </button>
)}
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
  width: 100%;
  padding: 15px 18px 10px;
  background: var(--color-fondo);
  color: var(--texto-fondo);
}

.header-contenido {
  width: 100%;
  max-width: 1440px;
  min-height: 76px;
  margin: 0 auto;

  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.header-btn {
  width: 44px;
  height: 44px;

  padding: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  appearance: none;
  border: none;
  border-radius: 50%;

  background: transparent;
  color: var(--texto-fondo);

  cursor: pointer;
}

.header-btn:hover {
  background: rgba(128, 128, 128, 0.08);
}

.marca {
  min-width: 0;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  gap: 12px;
}

.logo-tienda {
  width: 62px;
  height: 62px;

  flex: 0 0 62px;

  object-fit: contain;
  border-radius: 50%;
}

.logo-placeholder {
  width: 62px;
  height: 62px;

  flex: 0 0 62px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: rgba(128, 128, 128, 0.12);

  color: var(--texto-fondo);

  font-size: 26px;
  font-weight: 800;
}

.marca-textos {
  min-width: 0;

  display: flex;
  flex-direction: column;

  gap: 3px;
}

.nombre-tienda {
  max-width: 100%;

  overflow: hidden;

  color: var(--texto-fondo);

  font-size: 20px;
  font-weight: 800;

  line-height: 1.1;

  text-overflow: ellipsis;
  white-space: nowrap;

  text-transform: uppercase;
}

.mensaje-portada {
  max-width: 330px;

  overflow: hidden;

  color: var(--texto-fondo);

  font-size: 11px;
  font-weight: 600;

  line-height: 1.25;

  opacity: 0.65;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-acciones {
  display: flex;
  align-items: center;

  gap: 3px;
}

.carrito-header {
  position: relative;

  width: 46px;
  height: 46px;

  padding: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: 50%;

  background: transparent;
  color: var(--texto-fondo);

  cursor: pointer;

  transform-origin: center;
}

.contador-carrito {
  position: absolute;

  top: 0;
  right: -2px;

  min-width: 21px;
  height: 21px;

  padding: 0 5px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 2px solid var(--color-fondo);
  border-radius: 999px;

  background: var(--color-principal);
  color: var(--texto-principal);

  font-size: 11px;
  font-weight: 800;
}

.redes-sociales {
  display: flex;
  align-items: center;
  justify-content: center;

  gap: 7px;

  margin-top: 4px;
}

.red-social {
  width: 27px;
  height: 27px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid currentColor;
  border-radius: 50%;

  color: var(--texto-fondo);

  text-decoration: none;

  opacity: 0.7;
}

/* BUSCADOR */

.buscador-contenedor {
  width: 100%;
  max-width: 1000px;

  margin: 0 auto;

  padding: 4px 18px 14px;
}

.buscador-caja {
  position: relative;

  width: 100%;
  height: 48px;

  display: flex;
  align-items: center;

  border: 1px solid rgba(128, 128, 128, 0.22);
  border-radius: 999px;

  background: rgba(128, 128, 128, 0.06);

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.buscador-caja:focus-within {
  border-color: var(--color-principal);

  background: var(--color-fondo);

  box-shadow:
    0 0 0 3px
    color-mix(
      in srgb,
      var(--color-principal) 12%,
      transparent
    );
}

.buscador-icono {
  position: absolute;

  left: 17px;

  color: var(--texto-fondo);

  opacity: 0.45;

  pointer-events: none;
}

.buscador-input {
  width: 100%;
  height: 100%;

  padding: 0 48px 0 49px;

  border: none;
  outline: none;

  background: transparent;
  color: var(--texto-fondo);

  font-size: 15px;
}

.buscador-input::placeholder {
  color: var(--texto-fondo);
  opacity: 0.45;
}

.buscador-input::-webkit-search-cancel-button {
  display: none;
}

.limpiar-busqueda {
  position: absolute;

  right: 9px;
  top: 50%;

  width: 32px;
  height: 32px;

  padding: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  transform: translateY(-50%);

  border: none;
  border-radius: 50%;

  background: rgba(128, 128, 128, 0.1);
  color: var(--texto-fondo);

  font-size: 21px;
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

.navegacion-sticky {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-fondo);
}

.categorias-superiores {
  display: flex;
  gap: 28px;
  overflow-x: auto;
  white-space: nowrap;

  width: 100%;
  max-width: 1440px;
  margin: 0 auto;

  padding: 0 14px;

  background: var(--color-fondo);
  border-bottom: 1px solid #ededed;

  scrollbar-width: none;
}

.categorias-superiores::-webkit-scrollbar {
  display: none;
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
          flex-shrink: 0;
white-space: nowrap;
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

  width: 100%;
  max-width: 1440px;
  margin: 0 auto;

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
/* ========================================
   ANUNCIOS DE LA TIENDA
======================================== */

.anuncio-contenedor {
  width: 100%;
  max-width: 1440px;
  margin: 14px auto 2px;
  padding: 0 14px;
}

.anuncio-tienda {
  position: relative;

  min-height: 82px;

  display: flex;
  align-items: center;
  gap: 14px;

  padding: 15px 18px;

  border-radius: 14px;

  overflow: hidden;

  box-shadow:
    0 5px 18px rgba(0, 0, 0, 0.07);

  animation: aparecerAnuncio 0.35s ease;
}

@keyframes aparecerAnuncio {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.anuncio-icono {
  flex: 0 0 auto;

  width: 46px;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: rgba(255, 255, 255, 0.55);

  font-size: 23px;
}

.anuncio-informacion {
  min-width: 0;
  flex: 1;

  display: flex;
  flex-direction: column;

  gap: 4px;
}

.anuncio-informacion strong {
  font-size: 14px;
  font-weight: 800;

  letter-spacing: 0.3px;

  text-transform: uppercase;
}

.anuncio-informacion span {
  font-size: 13px;
  line-height: 1.4;

  opacity: 0.82;
}

.anuncio-boton {
  flex: 0 0 auto;

  min-height: 40px;

  padding: 0 15px;

  display: flex;
  align-items: center;
  justify-content: center;

  gap: 7px;

  border-radius: 999px;

  background: rgba(255, 255, 255, 0.75);

  color: inherit;

  text-decoration: none;

  font-size: 12px;
  font-weight: 800;
}

.anuncio-boton span {
  font-size: 17px;
}

.anuncio-imagen {
  width: 64px;
  height: 54px;

  flex: 0 0 64px;

  overflow: hidden;

  border-radius: 9px;
}

.anuncio-imagen img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}

.anuncio-puntos {
  position: absolute;

  right: 14px;
  bottom: 7px;

  display: flex;
  gap: 5px;
}

.anuncio-puntos button {
  width: 6px;
  height: 6px;

  padding: 0;

  border: none;
  border-radius: 50%;

  background: currentColor;

  opacity: 0.25;
}

.anuncio-puntos button.activo {
  width: 16px;

  border-radius: 999px;

  opacity: 0.8;
}

/* CELULAR */

@media (max-width: 650px) {
  .anuncio-contenedor {
    margin-top: 10px;
    padding: 0 8px;
  }

  .anuncio-tienda {
    min-height: 72px;

    gap: 10px;

    padding: 12px 13px;

    border-radius: 12px;
  }

  .anuncio-icono {
    width: 39px;
    height: 39px;

    font-size: 20px;
  }

  .anuncio-informacion strong {
    font-size: 12px;
  }

  .anuncio-informacion span {
    font-size: 12px;
    line-height: 1.3;
  }

  .anuncio-boton {
    min-height: 34px;

    padding: 0 10px;

    font-size: 11px;
  }

  .anuncio-imagen {
    width: 48px;
    height: 48px;

    flex-basis: 48px;
  }

  .anuncio-puntos {
    right: 10px;
    bottom: 5px;
  }
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
        /* PEDIDO CONFIRMADO */

.pedido-exitoso {
  padding: 35px 10px 25px;
  text-align: center;
}

.pedido-exitoso-icono {
  width: 74px;
  height: 74px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #eaf7ed;
  color: #2f8f46;
  font-size: 38px;
  font-weight: 700;
}

.pedido-exitoso h2 {
  margin: 0 0 14px;
  font-size: 25px;
}

.pedido-exitoso p {
  max-width: 390px;
  margin: 8px auto;
  color: #666666;
  font-size: 15px;
  line-height: 1.5;
}

.pedido-exitoso-btn {
  width: 100%;
  height: 55px;
  margin-top: 28px;
  border: none;
  border-radius: 8px;
  background: var(--color-principal);
  color: var(--texto-principal);
  font-size: 16px;
  font-weight: 700;
}
/* FINALIZAR COMPRA */

.compra-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.compra-panel {
  width: min(100%, 520px);
  max-height: 94vh;
  overflow-y: auto;
  background: #ffffff;
  color: #111111;
  border-radius: 16px;
}

.compra-cabecera {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #ffffff;
  border-bottom: 1px solid #eeeeee;
}

.compra-cabecera > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compra-cabecera strong {
  font-size: 21px;
}

.compra-cabecera span {
  color: #777777;
  font-size: 13px;
}

.compra-cabecera button {
  border: none;
  background: transparent;
  font-size: 31px;
}

.compra-contenido {
  padding: 20px 20px 8px;
}

.compra-campo {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 17px;
}

.compra-campo > span {
  font-size: 14px;
  font-weight: 700;
}

.compra-campo input {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #ffffff;
  color: #111111;
  outline: none;
  font-size: 16px;
}

.compra-campo input:focus {
  border-color: var(--color-principal);
}

.ciudades-resultados {
  position: absolute;
  z-index: 50;
  top: 78px;
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #dddddd;
  border-radius: 8px;
  box-shadow: 0 10px 25px
    rgba(0, 0, 0, 0.15);
}

.ciudad-opcion {
  width: 100%;
  padding: 13px 14px;
  border: none;
  border-bottom: 1px solid #eeeeee;
  background: #ffffff;
  color: #111111;
  text-align: left;
}

.ciudad-opcion:hover {
  background: #f6f6f6;
}

.ciudad-mensaje {
  padding: 15px;
  color: #777777;
}

.ciudad-seleccionada {
  margin-top: 5px;
  padding: 14px;
  border-radius: 8px;
  background: #f7f7f7;
}

.ciudad-seleccionada > div {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 5px 0;
}

.ciudad-seleccionada span {
  color: #666666;
  font-size: 13px;
}

.ciudad-seleccionada strong {
  text-align: right;
  font-size: 13px;
}
/* FORMA DE PAGO */

.forma-pago {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.forma-pago-titulo {
  margin-bottom: 2px;
  font-size: 14px;
  font-weight: 700;
}

.forma-pago-opcion {
  position: relative;
  width: 100%;
  min-height: 68px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #dddddd;
  border-radius: 10px;
  background: #ffffff;
  color: #111111;
  text-align: left;
}

.forma-pago-opcion.seleccionada {
  border: 2px solid var(--color-principal);
  padding: 11px 13px;
  background: #fafafa;
}

.forma-pago-radio {
  flex: 0 0 auto;
  font-size: 24px;
  line-height: 1;
  color: var(--color-principal);
}

.forma-pago-opcion > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.forma-pago-opcion strong {
  font-size: 14px;
}

.forma-pago-opcion small {
  color: #777777;
  font-size: 12px;
}

.descuento-badge {
  margin-left: auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: #eaf8ee;
  color: #16823b;
  font-size: 12px;
  font-weight: 800;
}

.resumen-descuento {
  color: #16823b;
}

.envio-gratis-mensaje {
  color: #16823b;
  font-size: 13px;
  font-weight: 700;
}

.total-final-pedido {
  margin-top: 8px;
  padding-top: 12px !important;
  border-top: 1px solid #eeeeee;
  font-size: 18px;
  font-weight: 700;
}

.total-final-pedido strong {
  color: var(--color-principal);
  font-size: 20px;
}


/* IMPORTANTE:
   evita que la regla general del resumen
   convierta cada producto en una fila flex */
.resumen-compra > .checkout-productos {
  display: block;
  padding: 0 0 16px;
}

@media (max-width: 650px) {
  .checkout-producto {
    grid-template-columns: 58px minmax(0, 1fr) auto !important;
    gap: 10px;
  }

  .checkout-producto img,
  .checkout-producto-sin-foto {
    width: 58px;
    height: 58px;
  }

  .checkout-producto-subtotal {
    min-width: 68px;
    font-size: 12px;
  }
}

.resumen-compra > .checkout-productos {
  display: block;
}

/* FILAS DEL RESUMEN: PRODUCTOS, DESCUENTO Y ENVÍO */

.resumen-compra > div:not(.checkout-productos) {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 7px 0;
}

.resumen-compra > div:not(.checkout-productos) > span {
  flex: 1;
}

.resumen-compra > div:not(.checkout-productos) > strong {
  flex-shrink: 0;
  text-align: right;
  white-space: nowrap;
}

/* BOTÓN CONFIRMAR PEDIDO FLOTANTE */

.confirmar-pedido-btn {
  position: sticky;
  bottom: 0;
  z-index: 200;

  width: 100%;
  height: 58px;

  margin-top: 20px;

  border: none;
  border-radius: 10px;

  background: var(--color-principal);
  color: var(--texto-principal);

  font-size: 16px;
  font-weight: 700;

  box-shadow:
    0 -8px 22px rgba(255, 255, 255, 0.95),
    0 8px 25px rgba(0, 0, 0, 0.20);

  cursor: pointer;
}

.confirmar-pedido-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
  position: sticky;
  bottom: 12px;
  z-index: 100;

  width: 100%;
  height: 58px;

  margin-top: 20px;

  border: none;
  border-radius: 10px;

  background: var(--color-principal);
  color: var(--texto-principal);

  font-size: 16px;
  font-weight: 700;

  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.20);

  cursor: pointer;
}

.confirmar-pedido-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 650px) {
  .compra-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .compra-panel {
    width: 100%;
    max-height: 94vh;
    border-radius: 16px 16px 0 0;
  }
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
.confirmar-compra-btn {
  width: 100%;
  height: 55px;
  border: none;
  border-radius: 8px;
  background: var(--color-principal);
  color: var(--texto-principal);
  font-weight: 700;
  font-size: 16px;
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
  padding: 11px 10px 6px;
}

.header-contenido {
  min-height: 64px;

  grid-template-columns:
    42px minmax(0, 1fr) auto;

  gap: 5px;
}

.header-btn {
  width: 40px;
  height: 40px;
}

.marca {
  gap: 8px;
}

.logo-tienda,
.logo-placeholder {
  width: 48px;
  height: 48px;

  flex-basis: 48px;
}

.nombre-tienda {
  font-size: 17px;
}

.mensaje-portada {
  max-width: 190px;

  font-size: 9px;
}

.header-acciones {
  gap: 0;
}

.carrito-header {
  width: 40px;
  height: 40px;
}

.buscador-contenedor {
  padding:
    5px 13px 11px;
}

.buscador-caja {
  height: 46px;
}

.buscador-input {
  font-size: 14px;
}

          .categorias-superiores {
            gap: 24px;
padding-left: 16px;
padding-right: 16px;
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
