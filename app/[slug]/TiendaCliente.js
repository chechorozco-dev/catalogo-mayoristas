"use client";

import { useMemo, useRef, useState } from "react";

function formatoPrecio(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

function GaleriaProducto({
  producto,
  abrirImagen,
  agregar,
  agregadoId,
}) {
  const imagenes = [
    producto.foto_url,
    producto.foto_url_2,
  ].filter(Boolean);

  const [indice, setIndice] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="product-image-container">
        <div className="no-image">
          Foto próximamente
        </div>

        <button
          type="button"
          className="quick-add"
          onClick={(e) => {
            e.stopPropagation();
            agregar(producto);
          }}
        >
          {agregadoId === producto.id ? "✓" : "+"}
        </button>
      </div>
    );
  }

  function anterior(e) {
    e.stopPropagation();

    setIndice((actual) =>
      actual === 0
        ? imagenes.length - 1
        : actual - 1
    );
  }

  function siguiente(e) {
    e.stopPropagation();

    setIndice((actual) =>
      actual === imagenes.length - 1
        ? 0
        : actual + 1
    );
  }

  return (
    <div
      className="product-image-container"
      onClick={() =>
        abrirImagen(
          imagenes,
          indice,
          producto.nombre
        )
      }
    >
      <img
        src={imagenes[indice]}
        alt={producto.nombre}
        className="product-image"
      />

      {imagenes.length > 1 && (
        <>
          <button
            type="button"
            className="gallery-arrow gallery-left"
            onClick={anterior}
          >
            ‹
          </button>

          <button
            type="button"
            className="gallery-arrow gallery-right"
            onClick={siguiente}
          >
            ›
          </button>

          <div className="gallery-dots">
            {imagenes.map((_, i) => (
              <span
                key={i}
                className={
                  i === indice
                    ? "dot dot-active"
                    : "dot"
                }
              />
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        className={
          agregadoId === producto.id
            ? "quick-add quick-add-success"
            : "quick-add"
        }
        onClick={(e) => {
          e.stopPropagation();
          agregar(producto);
        }}
      >
        {agregadoId === producto.id
          ? "✓"
          : "＋"}
      </button>
    </div>
  );
}

function VisorImagen({
  visor,
  cerrar,
  anterior,
  siguiente,
}) {
  if (!visor) return null;

  return (
    <div
      className="viewer"
      onClick={cerrar}
    >
      <button
        type="button"
        className="viewer-close"
        onClick={cerrar}
      >
        ✕
      </button>

      <div
        className="viewer-content"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={visor.imagenes[visor.indice]}
          alt={visor.nombre}
          className="viewer-image"
        />

        {visor.imagenes.length > 1 && (
          <>
            <button
              type="button"
              className="viewer-arrow viewer-left"
              onClick={anterior}
            >
              ‹
            </button>

            <button
              type="button"
              className="viewer-arrow viewer-right"
              onClick={siguiente}
            >
              ›
            </button>

            <div className="viewer-count">
              {visor.indice + 1} /{" "}
              {visor.imagenes.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TiendaCliente({
  nombreTienda,
  whatsapp,
  productos,
}) {
  const [carrito, setCarrito] = useState({});
  const [agregadoId, setAgregadoId] =
    useState(null);
  const [visor, setVisor] = useState(null);

  const [buscando, setBuscando] =
    useState(false);
  const [busqueda, setBusqueda] =
    useState("");

  const carritoRef = useRef(null);

  function abrirImagen(
    imagenes,
    indice,
    nombre
  ) {
    setVisor({
      imagenes,
      indice,
      nombre,
    });
  }

  function cerrarImagen() {
    setVisor(null);
  }

  function imagenAnterior() {
    setVisor((actual) => {
      if (!actual) return actual;

      return {
        ...actual,
        indice:
          actual.indice === 0
            ? actual.imagenes.length - 1
            : actual.indice - 1,
      };
    });
  }

  function imagenSiguiente() {
    setVisor((actual) => {
      if (!actual) return actual;

      return {
        ...actual,
        indice:
          actual.indice ===
          actual.imagenes.length - 1
            ? 0
            : actual.indice + 1,
      };
    });
  }

  function agregar(producto) {
    setCarrito((actual) => ({
      ...actual,
      [producto.id]: {
        ...producto,
        cantidad:
          (actual[producto.id]?.cantidad ||
            0) + 1,
      },
    }));

    setAgregadoId(producto.id);

    setTimeout(() => {
      setAgregadoId(null);
    }, 900);
  }

  function cambiarCantidad(id, cambio) {
    setCarrito((actual) => {
      const producto = actual[id];

      if (!producto) return actual;

      const nuevaCantidad =
        producto.cantidad + cambio;

      if (nuevaCantidad <= 0) {
        const copia = { ...actual };
        delete copia[id];
        return copia;
      }

      return {
        ...actual,
        [id]: {
          ...producto,
          cantidad: nuevaCantidad,
        },
      };
    });
  }

  const productosCarrito =
    Object.values(carrito);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) return productos;

    return productos.filter(
      (producto) =>
        producto.nombre
          ?.toLowerCase()
          .includes(texto) ||
        producto.referencia
          ?.toLowerCase()
          .includes(texto)
    );
  }, [productos, busqueda]);

  const total = useMemo(() => {
    return productosCarrito.reduce(
      (suma, producto) =>
        suma +
        Number(producto.precio || 0) *
          producto.cantidad,
      0
    );
  }, [productosCarrito]);

  const cantidadTotal = useMemo(() => {
    return productosCarrito.reduce(
      (suma, producto) =>
        suma + producto.cantidad,
      0
    );
  }, [productosCarrito]);

  function irAlCarrito() {
    carritoRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function pedirWhatsApp() {
    if (productosCarrito.length === 0) {
      alert(
        "Agrega al menos un producto al pedido."
      );
      return;
    }

    const numero = (whatsapp || "").replace(
      /\D/g,
      ""
    );

    if (!numero) {
      alert(
        "Esta tienda todavía no tiene WhatsApp configurado."
      );
      return;
    }

    const productosTexto =
      productosCarrito.map(
        (producto) => {
          const subtotal =
            Number(producto.precio || 0) *
            producto.cantidad;

          return (
            `*${producto.referencia} — ${producto.nombre}*\n` +
            `Cantidad: ${producto.cantidad}\n` +
            `Precio unitario: ${formatoPrecio(
              producto.precio
            )}\n` +
            `Subtotal: ${formatoPrecio(
              subtotal
            )}`
          );
        }
      );

    const mensaje =
      `🛍️ *NUEVO PEDIDO*\n\n` +
      productosTexto.join("\n\n") +
      `\n\n━━━━━━━━━━━━━━\n` +
      `📦 *Productos diferentes:* ${productosCarrito.length}\n` +
      `📦 *Total unidades:* ${cantidadTotal}\n` +
      `💰 *TOTAL PEDIDO: ${formatoPrecio(
        total
      )}*`;

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(
        mensaje
      )}`,
      "_blank"
    );
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: white !important;
        }

        .store-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.97);
          border-bottom: 1px solid #eeeeee;
          backdrop-filter: blur(10px);
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          min-height: 76px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .header-right {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 18px;
        }

        .icon-button {
          position: relative;
          width: 42px;
          height: 42px;
          border: none;
          background: transparent;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
        }

        .store-name {
          margin: 0;
          font-size: 28px;
          line-height: 1;
          font-weight: 600;
          text-align: center;
          letter-spacing: 0.5px;
        }

        .cart-badge {
          position: absolute;
          top: 1px;
          right: 0;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          border-radius: 20px;
          background: #111;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }

        .search-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          padding: 12px 20px 14px;
        }

        .search-input {
          width: 100%;
          border: 1px solid #dedede;
          border-radius: 8px;
          padding: 13px 16px;
          font-size: 16px;
          outline: none;
          background: #fafafa;
        }

        .catalog-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 18px 20px 120px;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          column-gap: 18px;
          row-gap: 34px;
        }

        .product-card {
          min-width: 0;
          background: white;
        }

        .product-image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #f5f5f5;
          cursor: zoom-in;
        }

        .product-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.25s ease;
        }

        .product-image-container:hover
          .product-image {
          transform: scale(1.015);
        }

        .no-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
        }

        .quick-add {
          position: absolute;
          right: 10px;
          bottom: 10px;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 1px solid #d1d1d1;
          background: rgba(
            255,
            255,
            255,
            0.96
          );
          color: #111;
          font-size: 27px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px
            rgba(0, 0, 0, 0.08);
          z-index: 5;
        }

        .quick-add-success {
          background: #58b77a;
          color: white;
          border-color: #58b77a;
        }

        .gallery-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(
            255,
            255,
            255,
            0.88
          );
          font-size: 21px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 4;
        }

        .product-image-container:hover
          .gallery-arrow {
          opacity: 1;
        }

        .gallery-left {
          left: 8px;
        }

        .gallery-right {
          right: 8px;
        }

        .gallery-dots {
          position: absolute;
          left: 50%;
          bottom: 10px;
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
          z-index: 3;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.65
          );
        }

        .dot-active {
          background: #222;
        }

        .product-info {
          padding: 11px 0 0;
        }

        .product-name {
          margin: 0;
          font-size: 17px;
          font-weight: 400;
          line-height: 1.3;
          color: #222;
        }

        .product-reference {
          display: block;
          margin-top: 5px;
          color: #929292;
          font-size: 12px;
        }

        .product-price {
          margin: 5px 0 0;
          font-size: 16px;
          font-weight: 600;
          color: #161616;
        }

        .empty-results {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #777;
        }

        .viewer {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .viewer-close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: white;
          font-size: 22px;
          cursor: pointer;
          z-index: 10002;
        }

        .viewer-content {
          position: relative;
          width: 100%;
          max-width: 900px;
          max-height: 92vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .viewer-image {
          max-width: 100%;
          max-height: 88vh;
          object-fit: contain;
        }

        .viewer-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: rgba(
            255,
            255,
            255,
            0.92
          );
          font-size: 27px;
          cursor: pointer;
        }

        .viewer-left {
          left: 12px;
        }

        .viewer-right {
          right: 12px;
        }

        .viewer-count {
          position: absolute;
          left: 50%;
          bottom: 14px;
          transform: translateX(-50%);
          color: white;
          background: rgba(
            0,
            0,
            0,
            0.55
          );
          padding: 7px 12px;
          border-radius: 20px;
        }

        .cart-section {
          max-width: 900px;
          margin: 50px auto 0;
          border-top: 1px solid #eee;
          padding-top: 35px;
        }

        .cart-title {
          margin-bottom: 25px;
          font-size: 28px;
        }

        .cart-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          align-items: center;
          padding: 18px 0;
          border-bottom: 1px solid #eee;
        }

        .quantity-control {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .quantity-button {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          font-size: 20px;
        }

        .order-summary {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 10px;
          color: #555;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
          font-size: 25px;
          font-weight: 700;
        }

        .whatsapp-button {
          width: 100%;
          margin-top: 20px;
          padding: 17px;
          border: none;
          border-radius: 8px;
          background: #25d366;
          color: white;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
        }

        .floating-cart {
          position: fixed;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 520px;
          border: none;
          border-radius: 8px;
          padding: 16px 20px;
          background: #171717;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 30px
            rgba(0, 0, 0, 0.22);
          z-index: 999;
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        @media (max-width: 900px) {
          .product-grid {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 600px) {
          .header-inner {
            min-height: 66px;
            padding: 0 14px;
          }

          .header-left {
            gap: 4px;
          }

          .header-right {
            gap: 4px;
          }

          .store-name {
            font-size: 21px;
            max-width: 210px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .icon-button {
            width: 38px;
            height: 38px;
            font-size: 22px;
          }

          .catalog-container {
            padding: 10px 12px 105px;
          }

          .product-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
            column-gap: 10px;
            row-gap: 26px;
          }

          .product-name {
            font-size: 16px;
          }

          .product-price {
            font-size: 15px;
          }

          .product-info {
            padding-top: 9px;
          }

          .quick-add {
            width: 42px;
            height: 42px;
            right: 8px;
            bottom: 8px;
            font-size: 24px;
          }

          .gallery-arrow {
            display: none;
          }

          .gallery-dots {
            bottom: 8px;
          }

          .search-wrapper {
            padding: 8px 12px 10px;
          }

          .cart-row {
            grid-template-columns: 1fr;
          }

          .quantity-control {
            justify-content: flex-start;
          }
        }
      `}</style>

      <VisorImagen
        visor={visor}
        cerrar={cerrarImagen}
        anterior={imagenAnterior}
        siguiente={imagenSiguiente}
      />

      <header className="store-header">
        <div className="header-inner">
          <div className="header-left">
            <button
              type="button"
              className="icon-button"
              aria-label="Menú"
            >
              ☰
            </button>

            <button
              type="button"
              className="icon-button"
              aria-label="Buscar"
              onClick={() =>
                setBuscando((actual) => !actual)
              }
            >
              ⌕
            </button>
          </div>

          <h1 className="store-name">
            {nombreTienda}
          </h1>

          <div className="header-right">
            <button
              type="button"
              className="icon-button"
              aria-label="Ver pedido"
              onClick={irAlCarrito}
            >
              ♡
            </button>

            <button
              type="button"
              className="icon-button"
              aria-label="Carrito"
              onClick={irAlCarrito}
            >
              🛍
              {cantidadTotal > 0 && (
                <span className="cart-badge">
                  {cantidadTotal}
                </span>
              )}
            </button>
          </div>
        </div>

        {buscando && (
          <div className="search-wrapper">
            <input
              autoFocus
              type="text"
              className="search-input"
              placeholder="Buscar producto o referencia..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />
          </div>
        )}
      </header>

      <main className="catalog-container">
        <section className="product-grid">
          {productosFiltrados.length === 0 ? (
            <div className="empty-results">
              No encontramos productos con esa búsqueda.
            </div>
          ) : (
            productosFiltrados.map(
              (producto) => (
                <article
                  key={producto.id}
                  className="product-card"
                >
                  <GaleriaProducto
                    producto={producto}
                    abrirImagen={abrirImagen}
                    agregar={agregar}
                    agregadoId={agregadoId}
                  />

                  <div className="product-info">
                    <h2 className="product-name">
                      {producto.nombre}
                    </h2>

                    <span className="product-reference">
                      {producto.referencia}
                    </span>

                    <p className="product-price">
                      {formatoPrecio(
                        producto.precio
                      )}
                    </p>
                  </div>
                </article>
              )
            )
          )}
        </section>

        {productosCarrito.length > 0 && (
          <section
            ref={carritoRef}
            className="cart-section"
          >
            <h2 className="cart-title">
              Mi pedido
            </h2>

            {productosCarrito.map(
              (producto) => (
                <div
                  key={producto.id}
                  className="cart-row"
                >
                  <div>
                    <strong>
                      {producto.referencia} —{" "}
                      {producto.nombre}
                    </strong>

                    <div
                      style={{
                        marginTop: "6px",
                        color: "#777",
                      }}
                    >
                      Precio unitario:{" "}
                      {formatoPrecio(
                        producto.precio
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        fontWeight: "600",
                      }}
                    >
                      Subtotal:{" "}
                      {formatoPrecio(
                        Number(
                          producto.precio || 0
                        ) *
                          producto.cantidad
                      )}
                    </div>
                  </div>

                  <div className="quantity-control">
                    <button
                      type="button"
                      className="quantity-button"
                      onClick={() =>
                        cambiarCantidad(
                          producto.id,
                          -1
                        )
                      }
                    >
                      −
                    </button>

                    <strong>
                      {producto.cantidad}
                    </strong>

                    <button
                      type="button"
                      className="quantity-button"
                      onClick={() =>
                        cambiarCantidad(
                          producto.id,
                          1
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            )}

            <div className="order-summary">
              <div className="summary-row">
                <span>
                  Productos diferentes
                </span>

                <strong>
                  {productosCarrito.length}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Total unidades
                </span>

                <strong>
                  {cantidadTotal}
                </strong>
              </div>

              <div className="summary-total">
                <span>Total</span>

                <span>
                  {formatoPrecio(total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="whatsapp-button"
              onClick={pedirWhatsApp}
            >
              Enviar pedido por WhatsApp
            </button>
          </section>
        )}
      </main>

      {productosCarrito.length > 0 && (
        <button
          type="button"
          className="floating-cart"
          onClick={irAlCarrito}
        >
          <span>
            🛍 {cantidadTotal}{" "}
            {cantidadTotal === 1
              ? "producto"
              : "productos"}
          </span>

          <span>
            {formatoPrecio(total)}
          </span>
        </button>
      )}
    </>
  );
}
