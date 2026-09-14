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
  "Accesorios en Rodio",
  "Accesorios en Acero",
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
  productos = [],
}) {
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [carrito, setCarrito] = useState([]);
  const [carritoCargado, setCarritoCargado] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const [productoModal, setProductoModal] = useState(null);
  const [indiceFoto, setIndiceFoto] = useState(0);

  const [productoConfirmado, setProductoConfirmado] = useState(null);

  /*
    Guarda cuál foto se está mostrando
    en cada tarjeta del catálogo.
  */
  const [fotosTarjetas, setFotosTarjetas] = useState({});

  const carritoRef = useRef(null);

  /*
  ========================================
  CARGAR CARRITO
  ========================================
  */

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

  /*
  ========================================
  GUARDAR CARRITO
  ========================================
  */

  useEffect(() => {
    if (!carritoCargado) return;

    try {
      const clave = `carrito_${window.location.pathname}`;

      localStorage.setItem(clave, JSON.stringify(carrito));
    } catch (error) {
      console.error("Error guardando carrito:", error);
    }
  }, [carrito, carritoCargado]);

  /*
  ========================================
  PRODUCTOS FILTRADOS
  ========================================
  */

  const productosFiltrados = useMemo(() => {
    let lista = [...productos];

    if (categoriaActiva === "Nuevos") {
      lista.sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    } else {
      lista = lista.filter((producto) =>
        productoPerteneceCategoria(producto, categoriaActiva)
      );
    }

    const textoBusqueda = limpiarTexto(busqueda);

    if (textoBusqueda) {
      lista = lista.filter((producto) => {
        const texto = limpiarTexto(
          `${producto.nombre || ""} ${producto.referencia || ""} ${
            producto.categoria || ""
          }`
        );

        return texto.includes(textoBusqueda);
      });
    }

    return lista;
  }, [productos, categoriaActiva, busqueda]);

  /*
  ========================================
  RECOMENDACIONES
  ========================================
  */

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

    /*
      Si no encontró suficientes relacionados,
      completa con otros productos.
    */

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

  /*
  ========================================
  TOTALES
  ========================================
  */

  const cantidadTotal = carrito.reduce(
    (total, item) =>
      total + Number(item.cantidad || 0),
    0
  );

  const totalCarrito = carrito.reduce(
    (total, item) =>
      total +
      Number(item.precio || 0) *
        Number(item.cantidad || 0),
    0
  );

  function fotosProducto(producto) {
    if (!producto) return [];

    return [
      producto.foto_url,
      producto.foto_url_2,
    ].filter(Boolean);
  }

  /*
  ========================================
  FOTO EN TARJETA
  ========================================
  */

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

  /*
  ========================================
  ABRIR PRODUCTO
  ========================================
  */

  function abrirProducto(producto, fotoInicial = 0) {
    setProductoModal(producto);
    setIndiceFoto(fotoInicial);
  }

  /*
  ========================================
  ANIMACIÓN
  ========================================
  */

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

    const tamanioInicial = Math.min(
      origen.width * 0.42,
      105
    );

    imagenVoladora.style.width = `${tamanioInicial}px`;
    imagenVoladora.style.height = `${tamanioInicial}px`;

    imagenVoladora.style.left = `${
      origen.left +
      origen.width / 2 -
      tamanioInicial / 2
    }px`;

    imagenVoladora.style.top = `${
      origen.top +
      origen.height / 2 -
      tamanioInicial / 2
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
        imagenVoladora.style.transform =
          "scale(0.35) rotate(18deg)";
      });
    });

    setTimeout(() => {
      imagenVoladora.remove();
      animarBolsa();
    }, 700);
  }

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

  /*
  ========================================
  CARRITO
  ========================================
  */

  function agregarAlCarrito(producto, evento = null) {
    setCarrito((actual) => {
      const existe = actual.find(
        (item) =>
          String(item.id) === String(producto.id)
      );

      if (existe) {
        return actual.map((item) =>
          String(item.id) === String(producto.id)
            ? {
                ...item,
                cantidad:
                  Number(item.cantidad || 0) + 1,
              }
            : item
        );
      }

      return [
        ...actual,
        {
          ...producto,
          cantidad: 1,
        },
      ];
    });

    setProductoConfirmado(producto.id);

    setTimeout(() => {
      setProductoConfirmado((actual) =>
        String(actual) === String(producto.id)
          ? null
          : actual
      );
    }, 750);

    if (evento?.currentTarget) {
      animarProductoAlCarrito(
        producto,
        evento.currentTarget
      );
    } else {
      animarBolsa();
    }
  }

  function aumentarCantidad(id) {
    setCarrito((actual) =>
      actual.map((item) =>
        String(item.id) === String(id)
          ? {
              ...item,
              cantidad:
                Number(item.cantidad || 0) + 1,
            }
          : item
      )
    );
  }

  function disminuirCantidad(id) {
    setCarrito((actual) =>
      actual
        .map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                cantidad:
                  Number(item.cantidad || 0) - 1,
              }
            : item
        )
        .filter(
          (item) => Number(item.cantidad) > 0
        )
    );
  }

  function eliminarProducto(id) {
    setCarrito((actual) =>
      actual.filter(
        (item) =>
          String(item.id) !== String(id)
      )
    );
  }

  function vaciarCarrito() {
    const confirmar = window.confirm(
      "¿Quieres vaciar todo el carrito?"
    );

    if (!confirmar) return;

    setCarrito([]);
  }

  /*
  ========================================
  WHATSAPP
  ========================================
  */

  function enviarPedidoWhatsapp() {
    if (!carrito.length) return;

    const telefono = limpiarWhatsapp(whatsapp);

    let mensaje = `🛍️ *NUEVO PEDIDO*\n\n`;

    carrito.forEach((item) => {
      const subtotal =
        Number(item.precio || 0) *
        Number(item.cantidad || 0);

      mensaje += `*${item.referencia || ""}* - ${
        item.nombre || ""
      }\n`;

      mensaje += `Cantidad: ${item.cantidad}\n`;

      mensaje += `Precio: ${formatoPrecio(
        item.precio
      )}\n`;

      mensaje += `Subtotal: ${formatoPrecio(
        subtotal
      )}\n\n`;
    });

    mensaje += `--------------------\n`;
    mensaje += `Productos: ${cantidadTotal}\n`;

    mensaje += `*TOTAL: ${formatoPrecio(
      totalCarrito
    )}*`;

    const url =
      `https://wa.me/${telefono}` +
      `?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
  }

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
                setMostrarBusqueda((valor) => !valor)
              }
              aria-label="Buscar"
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </div>

          <div className="marca">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={nombreTienda}
                className="logo-tienda"
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
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              placeholder="Buscar productos..."
              className="buscador-input"
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

        <div className="categorias-superiores">
          {CATEGORIAS_PRINCIPALES.map(
            (categoria) => (
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
            )
          )}
        </div>

        {/* CANTIDAD */}

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

        <main className="productos-grid">
          {productosFiltrados.map((producto) => {
            const fotos = fotosProducto(producto);

            const indiceActual =
              indiceFotoTarjeta(producto);

            const fotoActual =
              fotos[indiceActual] ||
              producto.foto_url ||
              producto.foto_url_2;

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

                  {fotos.length > 1 && (
                    <span className="cantidad-fotos">
                      {indiceActual + 1}/{fotos.length}
                    </span>
                  )}

                  <button
                    className={`boton-agregar ${
                      String(productoConfirmado) ===
                      String(producto.id)
                        ? "confirmado"
                        : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();

                      agregarAlCarrito(
                        producto,
                        e
                      );
                    }}
                    aria-label="Agregar al carrito"
                  >
                    <span className="corazon">
                      ♡
                    </span>

                    <span className="circulo-mas">
                      {String(productoConfirmado) ===
                      String(producto.id)
                        ? "✓"
                        : "+"}
                    </span>
                  </button>
                </div>

                {/* FLECHAS PARA CAMBIAR FOTO */}

                {fotos.length > 1 && (
                  <div className="cambiar-foto-barra">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        cambiarFotoTarjeta(
                          producto,
                          "anterior"
                        );
                      }}
                      aria-label="Foto anterior"
                    >
                      ‹
                    </button>

                    <div className="puntos-mini">
                      {fotos.map((_, index) => (
                        <span
                          key={index}
                          className={`punto-mini ${
                            index === indiceActual
                              ? "activo"
                              : ""
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        cambiarFotoTarjeta(
                          producto,
                          "siguiente"
                        );
                      }}
                      aria-label="Siguiente foto"
                    >
                      ›
                    </button>
                  </div>
                )}

                <div
                  className="producto-info"
                  onClick={() =>
                    abrirProducto(
                      producto,
                      indiceActual
                    )
                  }
                >
                  <div className="producto-nombre">
                    {producto.nombre}
                  </div>

                  <div className="producto-precio">
                    {formatoPrecio(
                      producto.precio
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </main>

        {productosFiltrados.length === 0 && (
          <div className="sin-resultados">
            No encontramos productos.
          </div>
        )}

        {/* BARRA CARRITO */}

        {cantidadTotal > 0 && (
          <button
            className="barra-carrito"
            onClick={() =>
              setCarritoAbierto(true)
            }
          >
            <div className="barra-carrito-izquierda">
              <span>🛍️</span>

              <span>
                {cantidadTotal}{" "}
                {cantidadTotal === 1
                  ? "producto"
                  : "productos"}
              </span>
            </div>

            <strong>
              {formatoPrecio(totalCarrito)}
            </strong>
          </button>
        )}
      </div>

      {/* MENÚ */}

      {menuAbierto && (
        <div
          className="overlay"
          onClick={() =>
            setMenuAbierto(false)
          }
        >
          <aside
            className="menu-lateral"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="menu-cabecera">
              <strong>Categorías</strong>

              <button
                onClick={() =>
                  setMenuAbierto(false)
                }
              >
                ×
              </button>
            </div>

            <div className="menu-lista">
              {CATEGORIAS_MENU.map(
                (categoria) => (
                  <button
                    key={categoria}
                    className={
                      categoriaActiva === categoria
                        ? "menu-activo"
                        : ""
                    }
                    onClick={() => {
                      setCategoriaActiva(
                        categoria
                      );

                      setMenuAbierto(false);

                      scrollInicio();
                    }}
                  >
                    {categoria}
                  </button>
                )
              )}
            </div>
          </aside>
        </div>
      )}

      {/* PRODUCTO ABIERTO */}

      {productoModal && (
        <div
          className="overlay producto-overlay"
          onClick={() =>
            setProductoModal(null)
          }
        >
          <div
            className="producto-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="cerrar-modal"
              onClick={() =>
                setProductoModal(null)
              }
            >
              ×
            </button>

            <GaleriaProducto
              producto={productoModal}
              indiceFoto={indiceFoto}
              setIndiceFoto={setIndiceFoto}
            />

            <div className="producto-modal-info">
              <h2>{productoModal.nombre}</h2>

              <div className="precio-modal">
                {formatoPrecio(
                  productoModal.precio
                )}
              </div>

              {productoModal.descripcion && (
                <p>
                  {productoModal.descripcion}
                </p>
              )}

              <button
                className="agregar-modal"
                onClick={() =>
                  agregarAlCarrito(
                    productoModal
                  )
                }
              >
                Agregar al carrito
              </button>
            </div>

            {/* RECOMENDADOS */}

            {productosRecomendados.length >
              0 && (
              <section className="recomendados-seccion">
                <div className="recomendados-titulo">
                  <h3>
                    También te puede gustar
                  </h3>

                  <span>
                    Descubre productos
                    similares
                  </span>
                </div>

                <div className="recomendados-scroll">
                  {productosRecomendados.map(
                    (producto) => (
                      <button
                        key={producto.id}
                        className="recomendado-card"
                        onClick={() => {
                          setProductoModal(
                            producto
                          );

                          setIndiceFoto(0);

                          const modal =
                            document.querySelector(
                              ".producto-modal"
                            );

                          if (modal) {
                            modal.scrollTo({
                              top: 0,
                              behavior:
                                "smooth",
                            });
                          }
                        }}
                      >
                        <div className="recomendado-imagen">
                          {producto.foto_url ? (
                            <img
                              src={
                                producto.foto_url
                              }
                              alt={
                                producto.nombre
                              }
                            />
                          ) : (
                            <div className="recomendado-sin-foto">
                              Sin imagen
                            </div>
                          )}
                        </div>

                        <div className="recomendado-info">
                          <span className="recomendado-nombre">
                            {
                              producto.nombre
                            }
                          </span>

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
          onClick={() =>
            setCarritoAbierto(false)
          }
        >
          <aside
            className="carrito-panel"
            onClick={(e) =>
              e.stopPropagation()
            }
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
                    key={item.id}
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

                      <strong>
                        {formatoPrecio(
                          item.precio
                        )}
                      </strong>

                      <div className="cantidad-controles">
                        <button
                          onClick={() =>
                            disminuirCantidad(
                              item.id
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
                              item.id
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
                          item.id
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
                    {formatoPrecio(
                      totalCarrito
                    )}
                  </strong>
                </div>

                <button
                  className="whatsapp-btn"
                  onClick={
                    enviarPedidoWhatsapp
                  }
                >
                  Enviar pedido por
                  WhatsApp
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #111;
          font-family: Arial, Helvetica,
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        body {
          padding-bottom: 100px;
        }

        .tienda {
          min-height: 100vh;
          background: white;
        }

        /* HEADER */

        .header {
          height: 165px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: white;
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
          color: #111;
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
          background: #181818;
          color: white;
          font-size: 13px;
          font-weight: 700;
          border: 2px solid white;
        }

        /* ANIMACIÓN CARRITO */

        .carrito-rebote {
          animation: reboteCarrito
            0.48s ease;
        }

        @keyframes reboteCarrito {
          0% {
            transform: scale(1);
          }

          30% {
            transform: scale(1.35)
              rotate(-8deg);
          }

          55% {
            transform: scale(0.9)
              rotate(6deg);
          }

          75% {
            transform: scale(1.13)
              rotate(-3deg);
          }

          100% {
            transform: scale(1)
              rotate(0);
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
          box-shadow: 0 10px 30px
            rgba(0, 0, 0, 0.28);

          transition:
            left 0.7s
              cubic-bezier(
                0.22,
                0.8,
                0.25,
                1
              ),
            top 0.7s
              cubic-bezier(
                0.22,
                0.8,
                0.25,
                1
              ),
            width 0.7s ease,
            height 0.7s ease,
            opacity 0.7s ease,
            transform 0.7s ease;
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
          background: rgba(
            255,
            255,
            255,
            0.97
          );
          border-bottom: 1px solid
            #ededed;
          scrollbar-width: none;
        }

        .categorias-superiores::-webkit-scrollbar {
          display: none;
        }

        .categoria-superior {
          flex: 0 0 auto;
          padding: 14px 0 12px;
          border: none;
          border-bottom: 3px solid
            transparent;
          background: transparent;
          color: #333;
          font-size: 17px;
        }

        .categoria-superior.activa {
          font-weight: 700;
          border-bottom-color: #111;
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
          color: #888;
        }

        /* PRODUCTOS */

        .productos-grid {
          max-width: 1440px;
          margin: auto;
          padding: 4px 12px 130px;
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          column-gap: 10px;
          row-gap: 25px;
        }

        .producto-card {
          min-width: 0;
          background: white;
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
        }

        .sin-imagen {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #aaa;
        }

        .cantidad-fotos {
          position: absolute;
          left: 10px;
          bottom: 10px;
          padding: 7px 9px;
          background: rgba(
            35,
            35,
            35,
            0.72
          );
          color: white;
          border-radius: 999px;
          font-size: 12px;
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

        .corazon {
          font-size: 36px;
          line-height: 1;
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
          background: #111;
          color: white;
          border: 2px solid white;
        }

        /* NUEVO:
        CAMBIAR FOTO */

        .cambiar-foto-barra {
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          border-bottom: 1px solid #eee;
          background: white;
        }

        .cambiar-foto-barra button {
          width: 30px;
          height: 28px;
          border: none;
          background: transparent;
          color: #222;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .puntos-mini {
          display: flex;
          gap: 5px;
          align-items: center;
        }

        .punto-mini {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #c5c5c5;
        }

        .punto-mini.activo {
          width: 7px;
          height: 7px;
          background: #111;
        }

        /* INFO */

        .producto-info {
          padding: 9px 7px 0;
          cursor: pointer;
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

        .producto-precio {
          margin-top: 5px;
          font-size: 18px;
          font-weight: 700;
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
          background: #101010;
          color: white;
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
          background: rgba(
            0,
            0,
            0,
            0.42
          );
        }

        /* MENÚ */

        .menu-lateral {
          width: min(
            88vw,
            360px
          );
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
        }

        /* MODAL */

        .producto-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .producto-modal {
          position: relative;
          width: min(
            100%,
            620px
          );
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
          background: rgba(
            255,
            255,
            255,
            0.9
          );
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
          background: rgba(
            0,
            0,
            0,
            0.3
          );
        }

        .galeria-punto.activo {
          background: #111;
        }

        .producto-modal-info {
          padding: 23px;
        }

        .producto-modal-info h2 {
          margin: 0;
          font-size: 21px;
        }

        .precio-modal {
          margin-top: 10px;
          font-size: 23px;
          font-weight: 700;
        }

        .producto-modal-info p {
          color: #555;
          line-height: 1.5;
        }

        .agregar-modal {
          width: 100%;
          height: 52px;
          margin-top: 15px;
          border: none;
          border-radius: 6px;
          background: #111;
          color: white;
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
          cursor: pointer;
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

        .recomendado-info strong {
          font-size: 14px;
        }

        /* CARRITO */

        .carrito-overlay {
          display: flex;
          justify-content: flex-end;
        }

        .carrito-panel {
          width: min(
            100%,
            430px
          );
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

        .carrito-item {
          display: grid;
          grid-template-columns:
            90px 1fr auto;
          gap: 12px;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }

        .carrito-item > img {
          width: 90px;
          height: 90px;
          object-fit: cover;
        }

        .carrito-item-nombre {
          font-size: 14px;
          margin-bottom: 7px;
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
          background: white;
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

        .whatsapp-btn {
          width: 100%;
          height: 55px;
          border: none;
          border-radius: 8px;
          background: #25d366;
          color: white;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .productos-grid {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );
          }
        }

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
              repeat(
                2,
                minmax(0, 1fr)
              );

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
            border-radius:
              14px 14px 0 0;
          }

          .recomendado-card {
            flex-basis: 42%;
          }

          .carrito-panel {
            width: 100%;
          }

          .barra-carrito {
            bottom: 16px;
            width: calc(
              100% - 34px
            );
          }
        }
      `}</style>
    </>
  );
}

function GaleriaProducto({
  producto,
  indiceFoto,
  setIndiceFoto,
}) {
  const fotos = [
    producto?.foto_url,
    producto?.foto_url_2,
  ].filter(Boolean);

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
