"use client";

import { useMemo, useState } from "react";

/* =========================================================
   UTILIDADES
========================================================= */

function limpiarTexto(texto = "") {
  return String(texto)
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
  let limpio = String(numero).replace(/\D/g, "");

  if (limpio.length === 10) {
    limpio = `57${limpio}`;
  }

  return limpio;
}

/* =========================================================
   CATEGORÍAS PRINCIPALES
========================================================= */

const CATEGORIAS_PRINCIPALES = [
  "Todos",
  "Aretes",
  "Juegos",
  "Anillos",
  "Pulseras",
  "Earcuff",
];

/* =========================================================
   CATEGORÍAS DEL MENÚ LATERAL
========================================================= */

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

/* =========================================================
   FILTRADO POR CATEGORÍA
========================================================= */

function productoPerteneceCategoria(producto, categoria) {
  const nombre = limpiarTexto(producto.nombre);
  const referencia = limpiarTexto(producto.referencia);

  const texto = `${nombre} ${referencia}`;

  if (categoria === "Todos") {
    return true;
  }

  /* ARETES:
     Incluye aretes, candongas, topos y maxitopos
  */

  if (categoria === "Aretes") {
    return (
      nombre.includes("arete") ||
      nombre.includes("candonga") ||
      nombre.includes("topo") ||
      nombre.includes("maxitopo")
    );
  }

  if (categoria === "Juegos") {
    return (
      nombre.includes("juego") ||
      nombre.includes("set")
    );
  }

  if (categoria === "Anillos") {
    return nombre.includes("anillo");
  }

  if (categoria === "Pulseras") {
    return (
      nombre.includes("pulsera") ||
      nombre.includes("brazalete")
    );
  }

  if (categoria === "Earcuff") {
    return (
      nombre.includes("earcuff") ||
      nombre.includes("ear cuff")
    );
  }

  if (categoria === "Collares") {
    return (
      nombre.includes("collar") ||
      nombre.includes("cadena")
    );
  }

  if (categoria === "Accesorios en Rodio") {
    return texto.includes("rodio");
  }

  if (categoria === "Accesorios en Acero") {
    return texto.includes("acero");
  }

  return true;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function TiendaCliente({
  nombreTienda,
  logoUrl,
  whatsapp,
  productos = [],
}) {
  const [busqueda, setBusqueda] = useState("");

  const [categoria, setCategoria] = useState("Todos");

  const [menuAbierto, setMenuAbierto] = useState(false);

  const [buscadorAbierto, setBuscadorAbierto] =
    useState(false);

  const [carritoAbierto, setCarritoAbierto] =
    useState(false);

  const [carrito, setCarrito] = useState([]);

  const [productoVisor, setProductoVisor] =
    useState(null);

  const [indiceFoto, setIndiceFoto] = useState(0);

  /* =========================================================
     PRODUCTOS FILTRADOS
  ========================================================= */

  const productosFiltrados = useMemo(() => {
    let lista = [...productos];

    if (categoria === "Nuevos") {
      lista.sort((a, b) => {
        return (
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
        );
      });
    } else {
      lista = lista.filter((producto) =>
        productoPerteneceCategoria(producto, categoria)
      );
    }

    const buscar = limpiarTexto(busqueda);

    if (buscar) {
      lista = lista.filter((producto) => {
        const texto = limpiarTexto(
          `${producto.referencia || ""} ${
            producto.nombre || ""
          }`
        );

        return texto.includes(buscar);
      });
    }

    return lista;
  }, [productos, categoria, busqueda]);

  /* =========================================================
     CARRITO
  ========================================================= */

  function agregarAlCarrito(producto) {
    setCarrito((actual) => {
      const existe = actual.find(
        (item) => item.id === producto.id
      );

      if (existe) {
        return actual.map((item) =>
          item.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
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
  }

  function aumentarCantidad(id) {
    setCarrito((actual) =>
      actual.map((item) =>
        item.id === id
          ? {
              ...item,
              cantidad: item.cantidad + 1,
            }
          : item
      )
    );
  }

  function disminuirCantidad(id) {
    setCarrito((actual) =>
      actual
        .map((item) =>
          item.id === id
            ? {
                ...item,
                cantidad: item.cantidad - 1,
              }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  function eliminarProducto(id) {
    setCarrito((actual) =>
      actual.filter((item) => item.id !== id)
    );
  }

  const cantidadTotal = carrito.reduce(
    (total, item) => total + item.cantidad,
    0
  );

  const totalCarrito = carrito.reduce(
    (total, item) =>
      total +
      Number(item.precio || 0) * item.cantidad,
    0
  );

  /* =========================================================
     WHATSAPP
  ========================================================= */

  function enviarPedidoWhatsapp() {
    if (carrito.length === 0) return;

    const numero = limpiarWhatsapp(whatsapp);

    if (!numero) {
      alert(
        "Esta tienda todavía no tiene un número de WhatsApp configurado."
      );

      return;
    }

    let mensaje = `🛍️ *NUEVO PEDIDO*\n\n`;

    carrito.forEach((item) => {
      const subtotal =
        Number(item.precio || 0) * item.cantidad;

      mensaje += `*${item.referencia || ""}*`;

      if (item.nombre) {
        mensaje += ` - ${item.nombre}`;
      }

      mensaje += `\n`;

      mensaje += `Cantidad: ${item.cantidad}\n`;

      mensaje += `Precio unitario: ${formatoPrecio(
        item.precio
      )}\n`;

      mensaje += `Subtotal: ${formatoPrecio(
        subtotal
      )}\n\n`;
    });

    mensaje += `--------------------------\n`;
    mensaje += `Productos: ${cantidadTotal}\n`;

    mensaje += `*TOTAL: ${formatoPrecio(
      totalCarrito
    )}*`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(
      mensaje
    )}`;

    window.open(url, "_blank");
  }

  /* =========================================================
     VISOR
  ========================================================= */

  function abrirProducto(producto) {
    setProductoVisor(producto);
    setIndiceFoto(0);
  }

  function cerrarProducto() {
    setProductoVisor(null);
    setIndiceFoto(0);
  }

  function fotosProducto(producto) {
    if (!producto) return [];

    return [
      producto.foto_url,
      producto.foto_url_2,
    ].filter(Boolean);
  }

  function fotoAnterior() {
    const fotos = fotosProducto(productoVisor);

    if (fotos.length <= 1) return;

    setIndiceFoto((actual) =>
      actual === 0
        ? fotos.length - 1
        : actual - 1
    );
  }

  function fotoSiguiente() {
    const fotos = fotosProducto(productoVisor);

    if (fotos.length <= 1) return;

    setIndiceFoto((actual) =>
      actual === fotos.length - 1
        ? 0
        : actual + 1
    );
  }

  /* =========================================================
     CAMBIAR CATEGORÍA
  ========================================================= */

  function seleccionarCategoria(nuevaCategoria) {
    setCategoria(nuevaCategoria);
    setMenuAbierto(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <>
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <button
              className="icon-button"
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir categorías"
            >
              ☰
            </button>

            <button
              className="icon-button"
              type="button"
              onClick={() =>
                setBuscadorAbierto((actual) => !actual)
              }
              aria-label="Buscar productos"
            >
              ⌕
            </button>
          </div>

          <div className="store-brand">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo de ${nombreTienda}`}
                className="store-logo"
              />
            ) : (
              <div className="store-logo-placeholder">
                {String(nombreTienda || "T")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <h1 className="store-name">
              {nombreTienda}
            </h1>
          </div>

          <div className="header-right">
            <button
              className="icon-button cart-header-button"
              type="button"
              onClick={() => setCarritoAbierto(true)}
              aria-label="Abrir carrito"
            >
              🛍️

              {cantidadTotal > 0 && (
                <span className="cart-count">
                  {cantidadTotal}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* =================================================
            CATEGORÍAS SUPERIORES
        ================================================= */}

        <nav className="top-categories">
          {CATEGORIAS_PRINCIPALES.map((item) => (
            <button
              key={item}
              type="button"
              className={
                categoria === item
                  ? "top-category active"
                  : "top-category"
              }
              onClick={() => seleccionarCategoria(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* BUSCADOR */}

        {buscadorAbierto && (
          <div className="search-area">
            <div className="search-box">
              <span className="search-symbol">
                ⌕
              </span>

              <input
                autoFocus
                type="search"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Buscar producto..."
              />

              {busqueda && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setBusqueda("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* =====================================================
          CATÁLOGO
      ====================================================== */}

      <main className="catalog-container">
        <div className="catalog-heading">
          <h2>
            {categoria === "Todos"
              ? "Todos los productos"
              : categoria}
          </h2>

          <p>
            {productosFiltrados.length}{" "}
            {productosFiltrados.length === 1
              ? "producto"
              : "productos"}
          </p>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="empty-products">
            <h2>No encontramos productos</h2>

            <p>
              Prueba con otra categoría o búsqueda.
            </p>

            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setCategoria("Todos");
              }}
            >
              Ver todos
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {productosFiltrados.map((producto) => {
              const fotos = fotosProducto(producto);

              return (
                <article
                  key={producto.id}
                  className="product-card"
                >
                  <div className="product-image-wrapper">
                    <button
                      type="button"
                      className="product-image-button"
                      onClick={() =>
                        abrirProducto(producto)
                      }
                    >
                      {producto.foto_url ? (
                        <img
                          src={producto.foto_url}
                          alt={
                            producto.nombre ||
                            "Producto"
                          }
                          className="product-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="no-image">
                          Sin imagen
                        </div>
                      )}
                    </button>

                    {/* BOTÓN AGREGAR TIPO CORNALINA */}

                    <button
                      type="button"
                      className="quick-add-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        agregarAlCarrito(producto);
                      }}
                      aria-label="Agregar al carrito"
                    >
                      <span className="bag-symbol">
                        ♡
                      </span>

                      <span className="plus-symbol">
                        +
                      </span>
                    </button>

                    {fotos.length > 1 && (
                      <span className="photo-count">
                        1/{fotos.length}
                      </span>
                    )}
                  </div>

                  {/* YA NO MOSTRAMOS LA REFERENCIA */}

                  <div className="product-info">
                    {producto.nombre && (
                      <h3 className="product-name">
                        {producto.nombre}
                      </h3>
                    )}

                    <p className="product-price">
                      {formatoPrecio(
                        producto.precio
                      )}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* =====================================================
          CARRITO FLOTANTE
      ====================================================== */}

      {cantidadTotal > 0 && (
        <button
          type="button"
          className="floating-cart"
          onClick={() => setCarritoAbierto(true)}
        >
          <span>
            🛍️ {cantidadTotal}{" "}
            {cantidadTotal === 1
              ? "producto"
              : "productos"}
          </span>

          <strong>
            {formatoPrecio(totalCarrito)}
          </strong>
        </button>
      )}

      {/* =====================================================
          MENÚ LATERAL
      ====================================================== */}

      {menuAbierto && (
        <div
          className="overlay"
          onClick={() => setMenuAbierto(false)}
        >
          <aside
            className="side-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="side-menu-header">
              <div>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt=""
                    className="menu-logo"
                  />
                )}

                <strong>{nombreTienda}</strong>
              </div>

              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                className="close-button"
              >
                ×
              </button>
            </div>

            <p className="menu-title">
              Categorías
            </p>

            <nav className="categories-list">
              {CATEGORIAS_MENU.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    categoria === item
                      ? "category-button active"
                      : "category-button"
                  }
                  onClick={() =>
                    seleccionarCategoria(item)
                  }
                >
                  <span>{item}</span>
                  <span>›</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* =====================================================
          VISOR PRODUCTO
      ====================================================== */}

      {productoVisor && (
        <div className="product-modal">
          <button
            type="button"
            className="modal-close"
            onClick={cerrarProducto}
          >
            ×
          </button>

          <div className="modal-content">
            <div className="modal-gallery">
              {fotosProducto(productoVisor).length >
              0 ? (
                <img
                  src={
                    fotosProducto(productoVisor)[
                      indiceFoto
                    ]
                  }
                  alt={
                    productoVisor.nombre ||
                    "Producto"
                  }
                  className="modal-image"
                />
              ) : (
                <div className="modal-no-image">
                  Sin imagen
                </div>
              )}

              {fotosProducto(productoVisor).length >
                1 && (
                <>
                  <button
                    type="button"
                    className="gallery-arrow gallery-prev"
                    onClick={fotoAnterior}
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="gallery-arrow gallery-next"
                    onClick={fotoSiguiente}
                  >
                    ›
                  </button>

                  <div className="gallery-dots">
                    {fotosProducto(productoVisor).map(
                      (_, index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() =>
                            setIndiceFoto(index)
                          }
                          className={
                            indiceFoto === index
                              ? "gallery-dot active"
                              : "gallery-dot"
                          }
                        />
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="modal-product-info">
              <h2>{productoVisor.nombre}</h2>

              <p className="modal-price">
                {formatoPrecio(
                  productoVisor.precio
                )}
              </p>

              {productoVisor.descripcion && (
                <p className="modal-description">
                  {productoVisor.descripcion}
                </p>
              )}

              <button
                type="button"
                className="modal-add-button"
                onClick={() => {
                  agregarAlCarrito(productoVisor);
                  cerrarProducto();
                }}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CARRITO
      ====================================================== */}

      {carritoAbierto && (
        <div
          className="overlay cart-overlay"
          onClick={() => setCarritoAbierto(false)}
        >
          <aside
            className="cart-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-header">
              <div>
                <h2>Tu pedido</h2>

                <p>
                  {cantidadTotal}{" "}
                  {cantidadTotal === 1
                    ? "producto"
                    : "productos"}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setCarritoAbierto(false)
                }
              >
                ×
              </button>
            </div>

            {carrito.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">
                  🛍️
                </div>

                <h3>Tu pedido está vacío</h3>

                <p>
                  Agrega productos para comenzar.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setCarritoAbierto(false)
                  }
                >
                  Ver productos
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {carrito.map((item) => (
                    <div
                      key={item.id}
                      className="cart-item"
                    >
                      <div className="cart-thumb">
                        {item.foto_url ? (
                          <img
                            src={item.foto_url}
                            alt={item.nombre || ""}
                          />
                        ) : (
                          <span>Sin foto</span>
                        )}
                      </div>

                      <div className="cart-item-info">
                        <h3>{item.nombre}</h3>

                        <strong>
                          {formatoPrecio(
                            item.precio
                          )}
                        </strong>

                        <div className="quantity-row">
                          <div className="quantity-control">
                            <button
                              type="button"
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
                              type="button"
                              onClick={() =>
                                aumentarCantidad(
                                  item.id
                                )
                              }
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className="remove-item"
                            onClick={() =>
                              eliminarProducto(
                                item.id
                              )
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-footer">
                  <div className="cart-total-row">
                    <span>Total</span>

                    <strong>
                      {formatoPrecio(
                        totalCarrito
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="whatsapp-button"
                    onClick={enviarPedidoWhatsapp}
                  >
                    <span>WhatsApp</span>

                    <span>Enviar pedido</span>
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* =====================================================
          ESTILOS
      ====================================================== */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #181818;
          font-family: Arial, Helvetica, sans-serif;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        /* ======================================
           HEADER
        ====================================== */

        .header {
          position: sticky;
          top: 0;
          z-index: 100;

          background: rgba(255, 255, 255, 0.98);

          border-bottom: 1px solid #eee;

          backdrop-filter: blur(10px);
        }

        .header-inner {
          min-height: 105px;

          max-width: 1400px;

          margin: 0 auto;

          padding: 7px 18px;

          display: grid;

          grid-template-columns:
            1fr auto 1fr;

          align-items: center;
        }

        .header-left,
        .header-right {
          display: flex;
          align-items: center;
        }

        .header-right {
          justify-content: flex-end;
        }

        .icon-button {
          position: relative;

          width: 44px;
          height: 44px;

          border: none;

          border-radius: 50%;

          background: transparent;

          color: #111;

          font-size: 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;
        }

        /* ======================================
           LOGO
        ====================================== */

        .store-brand {
          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 3px;
        }

        .store-logo,
        .store-logo-placeholder {
          width: 72px;
          height: 72px;

          border-radius: 14px;

          display: block;
        }

        .store-logo {
          object-fit: contain;
        }

        .store-logo-placeholder {
          background: #111;

          color: white;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 25px;

          font-weight: bold;
        }

        .store-name {
          margin: 0;

          font-size: 17px;

          font-weight: 600;

          text-align: center;
        }

        .cart-count {
          position: absolute;

          top: 0;
          right: 0;

          min-width: 18px;
          height: 18px;

          padding: 0 4px;

          border-radius: 10px;

          background: #111;

          color: white;

          font-size: 11px;

          display: flex;

          align-items: center;

          justify-content: center;
        }

        /* ======================================
           CATEGORÍAS ARRIBA
        ====================================== */

        .top-categories {
          width: 100%;

          max-width: 800px;

          margin: 0 auto;

          padding: 6px 12px 13px;

          display: flex;

          justify-content: center;

          gap: 27px;

          overflow-x: auto;

          scrollbar-width: none;
        }

        .top-categories::-webkit-scrollbar {
          display: none;
        }

        .top-category {
          flex-shrink: 0;

          padding: 6px 0;

          border: none;

          border-bottom:
            2px solid transparent;

          background: transparent;

          color: #333;

          font-size: 15px;

          cursor: pointer;
        }

        .top-category.active {
          color: #000;

          font-weight: 700;

          border-bottom-color: #111;
        }

        /* ======================================
           BUSCADOR
        ====================================== */

        .search-area {
          max-width: 700px;

          margin: auto;

          padding:
            0 15px 14px;
        }

        .search-box {
          position: relative;

          display: flex;

          align-items: center;

          background: #f4f4f4;

          border-radius: 8px;
        }

        .search-symbol {
          padding-left: 14px;

          color: #777;

          font-size: 20px;
        }

        .search-box input {
          width: 100%;

          padding:
            13px 40px 13px 9px;

          border: none;

          outline: none;

          background: transparent;

          font-size: 16px;
        }

        .clear-search {
          position: absolute;

          right: 6px;

          width: 32px;
          height: 32px;

          border: none;

          background: transparent;

          font-size: 24px;

          cursor: pointer;
        }

        /* ======================================
           CATÁLOGO
        ====================================== */

        .catalog-container {
          width: 100%;

          max-width: 1450px;

          margin: auto;

          padding:
            24px 8px 120px;
        }

        .catalog-heading {
          padding: 0 10px;

          margin-bottom: 18px;
        }

        .catalog-heading h2 {
          margin: 0;

          font-size: 27px;

          font-weight: 500;
        }

        .catalog-heading p {
          margin:
            6px 0 0;

          color: #888;

          font-size: 12px;
        }

        /* ======================================
           PRODUCTOS
        ====================================== */

        .products-grid {
          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap:
            18px 8px;
        }

        .product-card {
          min-width: 0;
        }

        .product-image-wrapper {
          position: relative;
        }

        .product-image-button {
          width: 100%;

          aspect-ratio: 1 / 1;

          padding: 0;

          border: none;

          overflow: hidden;

          background: #f6f6f6;

          cursor: pointer;
        }

        .product-image {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;
        }

        .no-image {
          height: 100%;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #aaa;
        }

        /* BOTÓN PEQUEÑO SOBRE LA FOTO */

        .quick-add-button {
          position: absolute;

          right: 10px;
          bottom: 10px;

          width: 46px;
          height: 46px;

          padding: 0;

          border:
            2px solid white;

          border-radius: 50%;

          background: white;

          color: #111;

          box-shadow:
            0 2px 8px
            rgba(0, 0, 0, 0.17);

          display: flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          z-index: 3;
        }

        .bag-symbol {
          font-size: 23px;

          line-height: 1;
        }

        .plus-symbol {
          position: absolute;

          right: 7px;
          bottom: 5px;

          width: 17px;
          height: 17px;

          border-radius: 50%;

          background: #111;

          color: white;

          font-size: 14px;

          line-height: 17px;

          text-align: center;
        }

        .photo-count {
          position: absolute;

          left: 8px;
          bottom: 8px;

          padding:
            4px 7px;

          border-radius: 20px;

          background:
            rgba(0, 0, 0, 0.62);

          color: white;

          font-size: 10px;
        }

        .product-info {
          padding:
            7px 2px 0;
        }

        .product-name {
          margin: 0;

          font-size: 14px;

          line-height: 1.25;

          font-weight: 400;
        }

        .product-price {
          margin:
            4px 0 0;

          font-size: 14px;

          font-weight: 700;
        }

        /* ======================================
           VACÍO
        ====================================== */

        .empty-products {
          text-align: center;

          padding:
            70px 20px;
        }

        .empty-products p {
          color: #777;
        }

        .empty-products button {
          padding:
            12px 20px;

          border: none;

          background: #111;

          color: white;

          border-radius: 6px;

          cursor: pointer;
        }

        /* ======================================
           CARRITO FLOTANTE
        ====================================== */

        .floating-cart {
          position: fixed;

          left: 50%;
          bottom: 14px;

          transform:
            translateX(-50%);

          z-index: 150;

          width:
            calc(100% - 24px);

          max-width: 600px;

          min-height: 56px;

          padding:
            12px 18px;

          border: none;

          border-radius: 8px;

          background: #111;

          color: white;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          box-shadow:
            0 8px 25px
            rgba(0, 0, 0, 0.2);

          cursor: pointer;
        }

        /* ======================================
           OVERLAY
        ====================================== */

        .overlay {
          position: fixed;

          inset: 0;

          z-index: 500;

          background:
            rgba(0, 0, 0, 0.42);
        }

        /* ======================================
           MENÚ
        ====================================== */

        .side-menu {
          width:
            min(88vw, 370px);

          height: 100%;

          padding: 22px;

          background: white;

          overflow-y: auto;
        }

        .side-menu-header {
          display: flex;

          justify-content:
            space-between;

          align-items: center;
        }

        .side-menu-header > div {
          display: flex;

          align-items: center;

          gap: 10px;
        }

        .menu-logo {
          width: 45px;
          height: 45px;

          object-fit: contain;

          border-radius: 8px;
        }

        .close-button {
          width: 40px;
          height: 40px;

          border: none;

          border-radius: 50%;

          background: #f4f4f4;

          font-size: 27px;

          cursor: pointer;
        }

        .menu-title {
          margin:
            30px 0 10px;

          color: #888;

          font-size: 12px;

          text-transform: uppercase;

          font-weight: 700;
        }

        .categories-list {
          display: flex;

          flex-direction: column;
        }

        .category-button {
          width: 100%;

          padding:
            15px 0;

          border: none;

          border-bottom:
            1px solid #eee;

          background: white;

          display: flex;

          justify-content:
            space-between;

          font-size: 15px;

          cursor: pointer;
        }

        .category-button.active {
          font-weight: 700;
        }

        /* ======================================
           MODAL
        ====================================== */

        .product-modal {
          position: fixed;

          inset: 0;

          z-index: 600;

          overflow-y: auto;

          background:
            rgba(255, 255, 255, 0.99);

          padding: 20px;
        }

        .modal-close {
          position: fixed;

          top: 12px;
          right: 12px;

          z-index: 10;

          width: 44px;
          height: 44px;

          border: none;

          border-radius: 50%;

          background: #f2f2f2;

          font-size: 28px;

          cursor: pointer;
        }

        .modal-content {
          width: 100%;

          max-width: 1000px;

          margin:
            35px auto;

          display: grid;

          grid-template-columns:
            1.3fr 0.7fr;

          gap: 40px;

          align-items: center;
        }

        .modal-gallery {
          position: relative;

          min-height: 500px;

          background: #f7f7f7;

          display: flex;

          align-items: center;

          justify-content: center;
        }

        .modal-image {
          width: 100%;

          max-height: 80vh;

          object-fit: contain;
        }

        .gallery-arrow {
          position: absolute;

          top: 50%;

          transform:
            translateY(-50%);

          width: 44px;
          height: 44px;

          border: none;

          border-radius: 50%;

          background:
            rgba(255, 255, 255, 0.92);

          font-size: 30px;

          cursor: pointer;
        }

        .gallery-prev {
          left: 10px;
        }

        .gallery-next {
          right: 10px;
        }

        .gallery-dots {
          position: absolute;

          bottom: 12px;

          left: 50%;

          transform:
            translateX(-50%);

          display: flex;

          gap: 7px;
        }

        .gallery-dot {
          width: 8px;
          height: 8px;

          padding: 0;

          border: none;

          border-radius: 50%;

          background: #bbb;
        }

        .gallery-dot.active {
          background: #111;
        }

        .modal-product-info h2 {
          margin:
            0 0 12px;

          font-size: 25px;

          font-weight: 500;
        }

        .modal-price {
          font-size: 22px;

          font-weight: 700;
        }

        .modal-description {
          color: #666;

          line-height: 1.6;

          white-space: pre-line;
        }

        .modal-add-button {
          width: 100%;

          margin-top: 20px;

          padding: 15px;

          border: none;

          background: #111;

          color: white;

          font-weight: 700;

          cursor: pointer;
        }

        /* ======================================
           CARRITO
        ====================================== */

        .cart-overlay {
          display: flex;

          justify-content:
            flex-end;
        }

        .cart-drawer {
          width:
            min(100%, 470px);

          height: 100%;

          background: white;

          display: flex;

          flex-direction: column;
        }

        .cart-header {
          padding: 20px;

          border-bottom:
            1px solid #eee;

          display: flex;

          justify-content:
            space-between;

          align-items: center;
        }

        .cart-header h2 {
          margin: 0;
        }

        .cart-header p {
          margin:
            4px 0 0;

          color: #888;

          font-size: 12px;
        }

        .cart-items {
          flex: 1;

          overflow-y: auto;

          padding:
            0 18px;
        }

        .cart-item {
          padding:
            18px 0;

          border-bottom:
            1px solid #eee;

          display: grid;

          grid-template-columns:
            85px 1fr;

          gap: 12px;
        }

        .cart-thumb {
          width: 85px;
          height: 85px;

          overflow: hidden;

          background: #f5f5f5;
        }

        .cart-thumb img {
          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        .cart-item h3 {
          margin:
            0 0 7px;

          font-size: 14px;

          font-weight: 500;
        }

        .quantity-row {
          margin-top: 12px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;
        }

        .quantity-control {
          border:
            1px solid #ddd;

          display: flex;

          align-items: center;
        }

        .quantity-control button {
          width: 32px;
          height: 32px;

          border: none;

          background: white;

          font-size: 18px;
        }

        .quantity-control span {
          min-width: 28px;

          text-align: center;
        }

        .remove-item {
          border: none;

          background: transparent;

          color: #888;

          text-decoration: underline;

          font-size: 11px;
        }

        .cart-footer {
          padding: 20px;

          border-top:
            1px solid #eee;
        }

        .cart-total-row {
          margin-bottom: 15px;

          display: flex;

          justify-content:
            space-between;

          font-size: 18px;
        }

        .whatsapp-button {
          width: 100%;

          min-height: 55px;

          border: none;

          border-radius: 6px;

          background: #25d366;

          color: white;

          padding:
            10px 15px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;

          font-weight: 700;

          cursor: pointer;
        }

        .empty-cart {
          flex: 1;

          display: flex;

          align-items: center;

          justify-content: center;

          flex-direction: column;

          text-align: center;

          padding: 30px;
        }

        /* ======================================
           TABLET
        ====================================== */

        @media (max-width: 950px) {
          .products-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .modal-content {
            grid-template-columns:
              1fr;

            max-width: 650px;
          }
        }

        /* ======================================
           CELULAR
        ====================================== */

        @media (max-width: 650px) {
          .header-inner {
            min-height: 105px;

            padding:
              5px 8px;

            grid-template-columns:
              78px
              minmax(0, 1fr)
              55px;
          }

          .icon-button {
            width: 38px;
            height: 38px;

            font-size: 21px;
          }

          .store-logo,
          .store-logo-placeholder {
            width: 68px;
            height: 68px;

            border-radius: 12px;
          }

          .store-name {
            max-width: 170px;

            font-size: 13px;

            overflow: hidden;

            white-space: nowrap;

            text-overflow: ellipsis;
          }

          /* CATEGORÍAS COMO CORNALINA */

          .top-categories {
            justify-content:
              flex-start;

            gap: 24px;

            padding:
              7px 14px 12px;

            overflow-x: auto;
          }

          .top-category {
            font-size: 14px;
          }

          /* PRODUCTOS GRANDES */

          .catalog-container {
            padding:
              18px 4px 110px;
          }

          .catalog-heading {
            padding:
              0 7px;

            margin-bottom: 12px;
          }

          .catalog-heading h2 {
            font-size: 21px;
          }

          .products-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap:
              16px 5px;
          }

          .product-info {
            padding:
              6px 4px 0;
          }

          .product-name {
            font-size: 13px;

            line-height: 1.2;
          }

          .product-price {
            margin-top: 4px;

            font-size: 13px;
          }

          .quick-add-button {
            width: 42px;
            height: 42px;

            right: 8px;
            bottom: 8px;
          }

          .bag-symbol {
            font-size: 21px;
          }

          .plus-symbol {
            right: 5px;

            bottom: 4px;

            width: 16px;
            height: 16px;

            line-height: 16px;

            font-size: 12px;
          }

          .product-modal {
            padding: 0;
          }

          .modal-content {
            margin: 0;

            display: block;
          }

          .modal-gallery {
            min-height: auto;

            aspect-ratio: 1 / 1;
          }

          .modal-image {
            width: 100%;
            height: 100%;

            object-fit: contain;
          }

          .modal-product-info {
            padding:
              20px 16px 40px;
          }

          .cart-drawer {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
