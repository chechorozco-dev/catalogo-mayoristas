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
   CATEGORÍAS
========================================================= */

const CATEGORIAS = [
  "Todos los productos",
  "Nuevos",
  "Accesorios en Rodio",
  "Accesorios en Acero",
  "Aretes",
  "Candongas",
  "Collares",
  "Pulseras",
  "Anillos",
  "Topos y maxitopos",
];

function productoPerteneceCategoria(producto, categoria) {
  if (categoria === "Todos los productos") {
    return true;
  }

  const nombre = limpiarTexto(producto.nombre);
  const referencia = limpiarTexto(producto.referencia);

  const texto = `${nombre} ${referencia}`;

  if (categoria === "Accesorios en Rodio") {
    return texto.includes("rodio");
  }

  if (categoria === "Accesorios en Acero") {
    return texto.includes("acero");
  }

  if (categoria === "Aretes") {
    return nombre.includes("arete");
  }

  if (categoria === "Candongas") {
    return nombre.includes("candonga");
  }

  if (categoria === "Collares") {
    return (
      nombre.includes("collar") ||
      nombre.includes("cadena")
    );
  }

  if (categoria === "Pulseras") {
    return nombre.includes("pulsera");
  }

  if (categoria === "Anillos") {
    return nombre.includes("anillo");
  }

  if (categoria === "Topos y maxitopos") {
    return (
      nombre.includes("topo") ||
      nombre.includes("maxitopo")
    );
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

  const [categoria, setCategoria] = useState(
    "Todos los productos"
  );

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
        productoPerteneceCategoria(
          producto,
          categoria
        )
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
    if (carrito.length === 0) {
      return;
    }

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
     VISOR DE PRODUCTOS
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

          {/* LOGO + NOMBRE */}

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
                placeholder="Buscar por nombre o referencia..."
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
          CONTENIDO
      ====================================================== */}

      <main className="catalog-container">
        <div className="catalog-heading">
          <p className="category-label">
            {categoria}
          </p>

          <p className="product-count">
            {productosFiltrados.length}{" "}
            {productosFiltrados.length === 1
              ? "producto"
              : "productos"}
          </p>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="empty-products">
            <div className="empty-icon">⌕</div>

            <h2>
              No encontramos productos
            </h2>

            <p>
              Prueba buscando otra referencia o seleccionando
              otra categoría.
            </p>

            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setCategoria("Todos los productos");
              }}
            >
              Ver todos los productos
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
                          producto.referencia ||
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

                    {fotos.length > 1 && (
                      <span className="photo-count">
                        1/{fotos.length}
                      </span>
                    )}
                  </button>

                  <div className="product-info">
                    {producto.referencia && (
                      <p className="product-reference">
                        {producto.referencia}
                      </p>
                    )}

                    {producto.nombre && (
                      <h2 className="product-name">
                        {producto.nombre}
                      </h2>
                    )}

                    <p className="product-price">
                      {formatoPrecio(producto.precio)}
                    </p>

                    <button
                      type="button"
                      className="add-button"
                      onClick={() =>
                        agregarAlCarrito(producto)
                      }
                    >
                      Agregar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* =====================================================
          BARRA FLOTANTE CARRITO
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
          MENÚ CATEGORÍAS
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

                <strong>
                  {nombreTienda}
                </strong>
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
              {CATEGORIAS.map((item) => (
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
              {fotosProducto(productoVisor).length > 0 ? (
                <img
                  src={
                    fotosProducto(productoVisor)[
                      indiceFoto
                    ]
                  }
                  alt={
                    productoVisor.nombre ||
                    productoVisor.referencia ||
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
              <p className="modal-reference">
                {productoVisor.referencia}
              </p>

              <h2>
                {productoVisor.nombre}
              </h2>

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
                            alt={
                              item.nombre ||
                              item.referencia ||
                              ""
                            }
                          />
                        ) : (
                          <span>Sin foto</span>
                        )}
                      </div>

                      <div className="cart-item-info">
                        <p className="cart-reference">
                          {item.referencia}
                        </p>

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

                    <span>
                      Enviar pedido
                    </span>
                  </button>

                  <p className="cart-note">
                    Al continuar, tu pedido será enviado
                    directamente a la tienda por WhatsApp.
                  </p>
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

        /* ==============================
           HEADER
        ============================== */

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.97);
          border-bottom: 1px solid #eeeeee;
          backdrop-filter: blur(10px);
        }

        .header-inner {
          min-height: 105px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 8px 20px;

          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 15px;
        }

        .header-left,
        .header-right {
          display: flex;
          align-items: center;
          gap: 4px;
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
          color: #1c1c1c;

          font-size: 25px;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-button:hover {
          background: #f6f6f6;
        }

        /* ==============================
           LOGO DE LA TIENDA
        ============================== */

        .store-brand {
          min-width: 0;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 4px;
        }

        .store-logo,
        .store-logo-placeholder {
          width: 58px;
          height: 58px;

          border-radius: 14px;

          display: block;

          background: #f5f5f5;
        }

        .store-logo {
          object-fit: contain;
        }

        .store-logo-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;

          background: #181818;
          color: white;

          font-size: 23px;
          font-weight: 700;
        }

        .store-name {
          margin: 0;

          max-width: 320px;

          font-size: 20px;
          line-height: 1.15;

          font-weight: 600;

          text-align: center;
        }

        .cart-count {
          position: absolute;
          top: 1px;
          right: 0px;

          min-width: 18px;
          height: 18px;

          padding: 0 4px;

          border-radius: 10px;

          background: #111;
          color: white;

          font-size: 11px;
          font-weight: 700;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ==============================
           BUSCADOR
        ============================== */

        .search-area {
          max-width: 700px;

          margin: 0 auto;

          padding: 0 18px 15px;
        }

        .search-box {
          position: relative;

          display: flex;
          align-items: center;

          background: #f5f5f5;

          border-radius: 12px;

          overflow: hidden;
        }

        .search-symbol {
          padding-left: 15px;

          font-size: 22px;

          color: #777;
        }

        .search-box input {
          width: 100%;

          border: none;
          outline: none;

          background: transparent;

          padding: 14px 40px 14px 10px;

          font-size: 16px;
        }

        .clear-search {
          position: absolute;
          right: 8px;

          width: 32px;
          height: 32px;

          border: none;
          border-radius: 50%;

          background: transparent;

          font-size: 24px;

          cursor: pointer;
        }

        /* ==============================
           CATÁLOGO
        ============================== */

        .catalog-container {
          width: 100%;

          max-width: 1400px;

          margin: 0 auto;

          padding: 28px 18px 130px;
        }

        .catalog-heading {
          margin-bottom: 22px;
        }

        .category-label {
          margin: 0;

          font-size: 25px;
          font-weight: 600;
        }

        .product-count {
          margin: 7px 0 0;

          color: #888;

          font-size: 13px;
        }

        .products-grid {
          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 28px 16px;
        }

        .product-card {
          min-width: 0;
        }

        .product-image-button {
          position: relative;

          width: 100%;

          aspect-ratio: 1 / 1;

          padding: 0;

          overflow: hidden;

          border: none;

          background: #f5f5f5;

          cursor: pointer;
        }

        .product-image {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;

          transition: transform 0.3s ease;
        }

        .product-image-button:hover
          .product-image {
          transform: scale(1.025);
        }

        .no-image {
          width: 100%;
          height: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #aaa;

          font-size: 13px;
        }

        .photo-count {
          position: absolute;
          right: 8px;
          bottom: 8px;

          padding: 5px 8px;

          border-radius: 20px;

          background: rgba(0, 0, 0, 0.66);
          color: white;

          font-size: 11px;
        }

        .product-info {
          padding: 11px 2px 0;
        }

        .product-reference {
          margin: 0 0 4px;

          font-size: 11px;
          font-weight: 700;

          color: #888;

          letter-spacing: 0.5px;

          text-transform: uppercase;
        }

        .product-name {
          margin: 0;

          min-height: 36px;

          font-size: 14px;
          line-height: 1.3;

          font-weight: 400;
        }

        .product-price {
          margin: 8px 0 10px;

          font-size: 16px;
          font-weight: 700;
        }

        .add-button {
          width: 100%;

          padding: 10px;

          border: 1px solid #222;

          border-radius: 4px;

          background: white;
          color: #222;

          font-size: 13px;
          font-weight: 600;

          cursor: pointer;
        }

        .add-button:hover {
          background: #222;
          color: white;
        }

        /* ==============================
           SIN RESULTADOS
        ============================== */

        .empty-products {
          max-width: 480px;

          margin: 70px auto;

          text-align: center;
        }

        .empty-icon {
          font-size: 45px;

          color: #aaa;
        }

        .empty-products h2 {
          margin-bottom: 8px;
        }

        .empty-products p {
          color: #777;

          line-height: 1.5;
        }

        .empty-products button {
          margin-top: 12px;

          padding: 13px 18px;

          border: none;
          border-radius: 8px;

          background: #111;
          color: white;

          cursor: pointer;
        }

        /* ==============================
           CARRITO FLOTANTE
        ============================== */

        .floating-cart {
          position: fixed;

          z-index: 150;

          left: 50%;
          bottom: 18px;

          transform: translateX(-50%);

          width: calc(100% - 28px);
          max-width: 600px;

          min-height: 58px;

          padding: 12px 18px;

          border: none;
          border-radius: 9px;

          background: #111;
          color: white;

          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.24);

          display: flex;
          align-items: center;
          justify-content: space-between;

          font-size: 14px;

          cursor: pointer;
        }

        .floating-cart strong {
          font-size: 16px;
        }

        /* ==============================
           OVERLAY
        ============================== */

        .overlay {
          position: fixed;

          inset: 0;

          z-index: 500;

          background: rgba(0, 0, 0, 0.42);
        }

        /* ==============================
           MENÚ
        ============================== */

        .side-menu {
          width: min(88vw, 370px);
          height: 100%;

          padding: 22px;

          background: white;

          overflow-y: auto;

          animation: menuEntrada 0.2s ease;
        }

        @keyframes menuEntrada {
          from {
            transform: translateX(-100%);
          }

          to {
            transform: translateX(0);
          }
        }

        .side-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 15px;
        }

        .side-menu-header > div {
          display: flex;
          align-items: center;

          gap: 10px;

          min-width: 0;
        }

        .menu-logo {
          width: 42px;
          height: 42px;

          object-fit: contain;

          border-radius: 9px;
        }

        .side-menu-header strong {
          font-size: 17px;
        }

        .close-button {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          border: none;
          border-radius: 50%;

          background: #f4f4f4;

          font-size: 28px;
          line-height: 1;

          cursor: pointer;
        }

        .menu-title {
          margin: 35px 0 10px;

          color: #888;

          font-size: 12px;
          font-weight: 700;

          text-transform: uppercase;

          letter-spacing: 1px;
        }

        .categories-list {
          display: flex;
          flex-direction: column;
        }

        .category-button {
          width: 100%;

          padding: 15px 0;

          border: none;
          border-bottom: 1px solid #eeeeee;

          background: white;

          display: flex;
          align-items: center;
          justify-content: space-between;

          text-align: left;

          font-size: 15px;

          cursor: pointer;
        }

        .category-button.active {
          font-weight: 700;
        }

        /* ==============================
           VISOR PRODUCTO
        ============================== */

        .product-modal {
          position: fixed;

          inset: 0;

          z-index: 600;

          padding: 25px;

          overflow-y: auto;

          background: rgba(255, 255, 255, 0.98);
        }

        .modal-close {
          position: fixed;

          z-index: 10;

          top: 16px;
          right: 16px;

          width: 45px;
          height: 45px;

          border: none;
          border-radius: 50%;

          background: #f1f1f1;

          font-size: 30px;

          cursor: pointer;
        }

        .modal-content {
          width: 100%;
          max-width: 1050px;

          margin: 25px auto;

          display: grid;

          grid-template-columns: minmax(0, 1.3fr)
            minmax(280px, 0.7fr);

          gap: 45px;

          align-items: center;
        }

        .modal-gallery {
          position: relative;

          width: 100%;

          min-height: 500px;

          background: #f7f7f7;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-image {
          width: 100%;
          max-height: 78vh;

          object-fit: contain;

          display: block;
        }

        .modal-no-image {
          color: #999;
        }

        .gallery-arrow {
          position: absolute;

          top: 50%;

          transform: translateY(-50%);

          width: 44px;
          height: 44px;

          border: none;
          border-radius: 50%;

          background: rgba(255, 255, 255, 0.92);

          box-shadow:
            0 3px 12px rgba(0, 0, 0, 0.15);

          font-size: 33px;

          cursor: pointer;
        }

        .gallery-prev {
          left: 12px;
        }

        .gallery-next {
          right: 12px;
        }

        .gallery-dots {
          position: absolute;

          bottom: 13px;
          left: 50%;

          transform: translateX(-50%);

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

          cursor: pointer;
        }

        .gallery-dot.active {
          background: #111;
        }

        .modal-product-info h2 {
          margin: 5px 0 13px;

          font-size: 28px;
          font-weight: 500;
        }

        .modal-reference {
          margin: 0;

          color: #888;

          font-size: 13px;
          font-weight: 700;
        }

        .modal-price {
          margin: 0 0 20px;

          font-size: 24px;
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

          padding: 16px;

          border: none;

          background: #111;
          color: white;

          font-size: 15px;
          font-weight: 700;

          cursor: pointer;
        }

        /* ==============================
           CARRITO LATERAL
        ============================== */

        .cart-overlay {
          display: flex;
          justify-content: flex-end;
        }

        .cart-drawer {
          width: min(100%, 470px);
          height: 100%;

          background: white;

          display: flex;
          flex-direction: column;

          animation: carritoEntrada 0.2s ease;
        }

        @keyframes carritoEntrada {
          from {
            transform: translateX(100%);
          }

          to {
            transform: translateX(0);
          }
        }

        .cart-header {
          padding: 21px;

          border-bottom: 1px solid #eeeeee;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cart-header h2 {
          margin: 0;

          font-size: 23px;
        }

        .cart-header p {
          margin: 5px 0 0;

          color: #888;

          font-size: 13px;
        }

        .cart-items {
          flex: 1;

          padding: 0 20px;

          overflow-y: auto;
        }

        .cart-item {
          padding: 20px 0;

          border-bottom: 1px solid #eeeeee;

          display: grid;

          grid-template-columns: 90px 1fr;

          gap: 14px;
        }

        .cart-thumb {
          width: 90px;
          height: 90px;

          overflow: hidden;

          background: #f5f5f5;
        }

        .cart-thumb img {
          width: 100%;
          height: 100%;

          object-fit: cover;

          display: block;
        }

        .cart-thumb span {
          width: 100%;
          height: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #999;

          font-size: 11px;
        }

        .cart-item-info {
          min-width: 0;
        }

        .cart-reference {
          margin: 0 0 3px;

          color: #888;

          font-size: 11px;
          font-weight: 700;
        }

        .cart-item h3 {
          margin: 0 0 7px;

          font-size: 14px;
          line-height: 1.3;

          font-weight: 500;
        }

        .cart-item strong {
          font-size: 14px;
        }

        .quantity-row {
          margin-top: 12px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;
        }

        .quantity-control {
          border: 1px solid #dddddd;

          display: flex;
          align-items: center;
        }

        .quantity-control button {
          width: 33px;
          height: 32px;

          border: none;

          background: white;

          font-size: 19px;

          cursor: pointer;
        }

        .quantity-control span {
          min-width: 27px;

          text-align: center;

          font-size: 13px;
        }

        .remove-item {
          padding: 5px 0;

          border: none;

          background: transparent;
          color: #888;

          font-size: 11px;

          text-decoration: underline;

          cursor: pointer;
        }

        .cart-footer {
          padding: 20px;

          border-top: 1px solid #eeeeee;

          background: white;
        }

        .cart-total-row {
          margin-bottom: 17px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          font-size: 18px;
        }

        .cart-total-row strong {
          font-size: 22px;
        }

        .whatsapp-button {
          width: 100%;

          min-height: 56px;

          padding: 10px 16px;

          border: none;
          border-radius: 7px;

          background: #25d366;
          color: white;

          font-size: 14px;
          font-weight: 700;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cart-note {
          margin: 11px 0 0;

          color: #999;

          font-size: 11px;
          line-height: 1.4;

          text-align: center;
        }

        .empty-cart {
          flex: 1;

          padding: 50px 25px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;
        }

        .empty-cart-icon {
          font-size: 50px;
        }

        .empty-cart h3 {
          margin-bottom: 5px;
        }

        .empty-cart p {
          color: #888;
        }

        .empty-cart button {
          margin-top: 15px;

          padding: 13px 20px;

          border: none;
          border-radius: 7px;

          background: #111;
          color: white;

          cursor: pointer;
        }

        /* ==============================
           TABLET
        ============================== */

        @media (max-width: 950px) {
          .products-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .modal-content {
            grid-template-columns: 1fr;

            max-width: 650px;
          }

          .modal-gallery {
            min-height: 400px;
          }
        }

        /* ==============================
           CELULAR
        ============================== */

        @media (max-width: 650px) {
          .header-inner {
            min-height: 88px;

            padding: 5px 8px;

            grid-template-columns:
              78px minmax(0, 1fr) 78px;

            gap: 2px;
          }

          .header-left {
            gap: 0;
          }

          .header-right {
            gap: 0;
          }

          .icon-button {
            width: 38px;
            height: 38px;

            font-size: 22px;
          }

          .store-brand {
            gap: 3px;
          }

          .store-logo,
          .store-logo-placeholder {
            width: 46px;
            height: 46px;

            border-radius: 10px;
          }

          .store-logo-placeholder {
            font-size: 18px;
          }

          .store-name {
            max-width: 160px;

            overflow: hidden;

            font-size: 13px;

            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .search-area {
            padding:
              0 10px 10px;
          }

          .catalog-container {
            padding:
              20px 8px 120px;
          }

          .category-label {
            font-size: 20px;
          }

          .catalog-heading {
            padding: 0 4px;

            margin-bottom: 14px;
          }

          .products-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap:
              24px 8px;
          }

          .product-info {
            padding:
              9px 3px 0;
          }

          .product-reference {
            font-size: 10px;
          }

          .product-name {
            min-height: 34px;

            font-size: 12px;
          }

          .product-price {
            margin:
              6px 0 9px;

            font-size: 14px;
          }

          .add-button {
            padding: 9px;

            font-size: 12px;
          }

          .floating-cart {
            bottom: 10px;

            min-height: 55px;
          }

          .product-modal {
            padding: 0;

            background: white;
          }

          .modal-close {
            position: fixed;

            top: 10px;
            right: 10px;

            width: 40px;
            height: 40px;

            font-size: 27px;
          }

          .modal-content {
            margin: 0;

            display: block;
          }

          .modal-gallery {
            min-height: auto;

            width: 100%;

            aspect-ratio: 1 / 1;
          }

          .modal-image {
            width: 100%;
            height: 100%;

            max-height: none;

            object-fit: contain;
          }

          .modal-product-info {
            padding:
              22px 18px 40px;
          }

          .modal-product-info h2 {
            font-size: 21px;
          }

          .modal-price {
            font-size: 20px;
          }

          .cart-drawer {
            width: 100%;
          }

          .cart-item {
            grid-template-columns:
              82px 1fr;
          }

          .cart-thumb {
            width: 82px;
            height: 82px;
          }
        }

        @media (max-width: 360px) {
          .header-inner {
            grid-template-columns:
              72px minmax(0, 1fr) 50px;
          }

          .header-left .icon-button {
            width: 34px;
          }

          .store-name {
            max-width: 130px;
          }
        }
      `}</style>
    </>
  );
}
