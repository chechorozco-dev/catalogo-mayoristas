"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

function formatoPrecio(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* =========================================
   GALERÍA DE CADA PRODUCTO
========================================= */

function GaleriaProducto({
  producto,
  abrirImagen,
}) {
  const imagenes = [
    producto.foto_url,
    producto.foto_url_2,
  ].filter(Boolean);

  const [indice, setIndice] =
    useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="product-image-container">
        <div className="no-image">
          Sin imagen
        </div>
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

          <div className="photo-count">
            {indice + 1}/{imagenes.length}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================
   VISOR GRANDE
========================================= */

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
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <img
          src={
            visor.imagenes[
              visor.indice
            ]
          }
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

export default function ProductosMayoristaPage() {
  const router = useRouter();

  const [productos, setProductos] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  const [
    categoriaActiva,
    setCategoriaActiva,
  ] = useState("Todos los productos");

  const [menuAbierto, setMenuAbierto] =
    useState(false);

  const [visor, setVisor] =
    useState(null);

  const categorias = [
    "Accesorios en Rodio",
    "Accesorios en Acero",
    "Todos los productos",
    "Nuevos",
    "Aretes",
    "Candongas",
    "Collares",
    "Pulseras",
    "Anillos",
    "Topos y maxitopos",
  ];

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    setCargando(true);
    setError("");

    try {
      const sesionResponse =
        await fetch(
          "/api/auth/sesion",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const sesionData =
        await sesionResponse.json();

      if (
        !sesionResponse.ok ||
        !sesionData.autenticado
      ) {
        router.replace("/login");
        return;
      }

      if (
        !sesionData.cliente?.tienda_id
      ) {
        router.replace(
          "/crear-tienda"
        );
        return;
      }

      const productosResponse =
        await fetch(
          "/api/productos/mayoristas",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const productosData =
        await productosResponse.json();

      if (
        !productosResponse.ok ||
        !productosData.ok
      ) {
        setError(
          productosData.mensaje ||
            "No se pudieron cargar los productos."
        );

        setCargando(false);
        return;
      }

      setProductos(
        productosData.productos || []
      );

      setCargando(false);
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error al cargar los productos."
      );

      setCargando(false);
    }
  }

  /* =========================================
     FILTROS
  ========================================= */

  const productosFiltrados =
    useMemo(() => {
      let lista = [...productos];

      if (
        categoriaActiva ===
        "Accesorios en Rodio"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                `${producto.nombre} ${producto.referencia} ${producto.categoria || ""}`
              );

            return texto.includes(
              "rodio"
            );
          }
        );
      }

      if (
        categoriaActiva ===
        "Accesorios en Acero"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                `${producto.nombre} ${producto.referencia} ${producto.categoria || ""}`
              );

            return texto.includes(
              "acero"
            );
          }
        );
      }

      if (
        categoriaActiva ===
        "Nuevos"
      ) {
        lista = [...lista].sort(
          (a, b) => {
            const fechaA =
              a.created_at
                ? new Date(
                    a.created_at
                  ).getTime()
                : 0;

            const fechaB =
              b.created_at
                ? new Date(
                    b.created_at
                  ).getTime()
                : 0;

            return fechaB - fechaA;
          }
        );
      }

      if (
        categoriaActiva ===
        "Aretes"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return (
              texto.includes(
                "arete"
              ) ||
              texto.includes(
                "aretes"
              )
            );
          }
        );
      }

      if (
        categoriaActiva ===
        "Candongas"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return texto.includes(
              "candonga"
            );
          }
        );
      }

      if (
        categoriaActiva ===
        "Collares"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return (
              texto.includes(
                "collar"
              ) ||
              texto.includes(
                "cadena"
              )
            );
          }
        );
      }

      if (
        categoriaActiva ===
        "Pulseras"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return texto.includes(
              "pulsera"
            );
          }
        );
      }

      if (
        categoriaActiva ===
        "Anillos"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return texto.includes(
              "anillo"
            );
          }
        );
      }

      if (
        categoriaActiva ===
        "Topos y maxitopos"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return (
              texto.includes(
                "topo"
              ) ||
              texto.includes(
                "maxitopo"
              )
            );
          }
        );
      }

      const textoBusqueda =
        normalizar(
          busqueda.trim()
        );

      if (textoBusqueda) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                `${producto.referencia} ${producto.nombre} ${producto.categoria || ""}`
              );

            return texto.includes(
              textoBusqueda
            );
          }
        );
      }

      return lista;
    }, [
      productos,
      categoriaActiva,
      busqueda,
    ]);

  function seleccionarCategoria(
    categoria
  ) {
    setCategoriaActiva(
      categoria
    );

    setMenuAbierto(false);
  }

  /* =========================================
     VISOR
  ========================================= */

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
            ? actual.imagenes
                .length - 1
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
          actual.imagenes.length -
            1
            ? 0
            : actual.indice + 1,
      };
    });
  }

  if (cargando) {
    return (
      <main className="loading-page">
        Cargando productos...
      </main>
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
          background: #fff8f6;
        }

        .loading-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #666;
          font-size: 18px;
        }

        .page {
          min-height: 100vh;
          padding: 25px 18px 60px;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .top h1 {
          margin: 0;
          font-size: 34px;
        }

        .top p {
          margin: 7px 0 0;
          color: #666;
        }

        .top-buttons {
          display: flex;
          gap: 10px;
        }

        .button {
          border: 1px solid #ddd;
          background: white;
          border-radius: 10px;
          padding: 11px 16px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
        }

        .filter-area {
          display: grid;
          grid-template-columns:
            auto minmax(220px, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .category-button {
          border: none;
          background: #222;
          color: white;
          padding: 13px 18px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .search {
          width: 100%;
          padding: 13px 16px;
          border: 1px solid #ddd;
          border-radius: 10px;
          background: white;
          font-size: 16px;
          outline: none;
        }

        .selected-category {
          margin: 0 0 18px;
          font-size: 18px;
          font-weight: 700;
        }

        .info {
          background: white;
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 16px 18px;
          margin-bottom: 25px;
        }

        .info p {
          color: #666;
          margin-bottom: 0;
        }

        .products {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 20px;
        }

        .card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #eee;
          box-shadow:
            0 5px 18px
            rgba(0, 0, 0, 0.05);
        }

        .product-image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background: #f5f5f5;
          overflow: hidden;
          cursor: zoom-in;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .no-image {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #999;
        }

        .gallery-arrow {
          position: absolute;
          top: 50%;
          transform:
            translateY(-50%);
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background:
            rgba(
              255,
              255,
              255,
              0.92
            );
          font-size: 25px;
          cursor: pointer;
          z-index: 3;
        }

        .gallery-left {
          left: 10px;
        }

        .gallery-right {
          right: 10px;
        }

        .gallery-dots {
          position: absolute;
          left: 50%;
          bottom: 12px;
          transform:
            translateX(-50%);
          display: flex;
          gap: 5px;
        }

        .dot {
          width: 7px;
          height: 7px;
          background:
            rgba(
              255,
              255,
              255,
              0.75
            );
          border-radius: 50%;
        }

        .dot-active {
          background: #222;
        }

        .photo-count {
          position: absolute;
          top: 10px;
          right: 10px;
          background:
            rgba(
              0,
              0,
              0,
              0.55
            );
          color: white;
          font-size: 12px;
          padding: 5px 8px;
          border-radius: 20px;
        }

        .card-info {
          padding: 18px;
        }

        .reference {
          margin: 0;
          color: #888;
          font-size: 13px;
          font-weight: 700;
        }

        .name {
          margin:
            7px 0 18px;
          font-size: 17px;
          line-height: 1.3;
        }

        .price-block {
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom:
            1px solid #eee;
        }

        .price-label {
          margin: 0;
          color: #777;
          font-size: 13px;
        }

        .cost {
          display: block;
          margin-top: 4px;
          font-size: 21px;
          color: #d97883;
        }

        .retail {
          display: block;
          margin-top: 4px;
          font-size: 21px;
          color: #222;
        }

        .profit {
          display: block;
          margin-top: 4px;
          font-size: 18px;
          color: #318553;
        }

        .empty {
          grid-column: 1 / -1;
          background: white;
          padding: 40px;
          border-radius: 15px;
          text-align: center;
          color: #666;
        }

        /* MENÚ */

        .overlay {
          position: fixed;
          inset: 0;
          background:
            rgba(
              0,
              0,
              0,
              0.35
            );
          z-index: 9998;
        }

        .side-menu {
          position: fixed;
          top: 0;
          left: 0;
          width:
            min(
              340px,
              88vw
            );
          height: 100vh;
          background: white;
          z-index: 9999;
          padding: 24px 18px;
          overflow-y: auto;
          box-shadow:
            6px 0 30px
            rgba(
              0,
              0,
              0,
              0.18
            );
        }

        .menu-header {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          border-bottom:
            1px solid #eee;
          padding-bottom: 18px;
        }

        .menu-header h2 {
          margin: 0;
        }

        .menu-close {
          border: none;
          background: transparent;
          font-size: 24px;
          cursor: pointer;
        }

        .menu-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 15px;
        }

        .menu-item {
          border: none;
          background: transparent;
          text-align: left;
          padding: 14px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        }

        .menu-item:hover {
          background: #f7f7f7;
        }

        .menu-active {
          background: #fff0f2;
          color: #d97883;
          font-weight: 700;
        }

        /* VISOR */

        .viewer {
          position: fixed;
          inset: 0;
          background:
            rgba(
              0,
              0,
              0,
              0.9
            );
          z-index: 10000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .viewer-content {
          position: relative;
          width: 100%;
          max-width: 900px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .viewer-image {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
        }

        .viewer-close {
          position: absolute;
          right: 20px;
          top: 20px;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: white;
          font-size: 21px;
          cursor: pointer;
          z-index: 3;
        }

        .viewer-arrow {
          position: absolute;
          top: 50%;
          transform:
            translateY(-50%);
          width: 48px;
          height: 48px;
          border: none;
          background: white;
          border-radius: 50%;
          font-size: 28px;
          cursor: pointer;
        }

        .viewer-left {
          left: 15px;
        }

        .viewer-right {
          right: 15px;
        }

        .viewer-count {
          position: absolute;
          left: 50%;
          bottom: 15px;
          transform:
            translateX(-50%);
          color: white;
          background:
            rgba(
              0,
              0,
              0,
              0.6
            );
          padding: 7px 12px;
          border-radius: 20px;
        }

        @media (
          max-width: 1000px
        ) {
          .products {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );
          }
        }

        @media (
          max-width: 700px
        ) {
          .products {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
            gap: 11px;
          }

          .page {
            padding:
              18px 12px 50px;
          }

          .top h1 {
            font-size: 27px;
          }

          .filter-area {
            grid-template-columns:
              1fr;
          }

          .category-button {
            width: 100%;
          }

          .card-info {
            padding: 13px;
          }

          .name {
            font-size: 15px;
          }

          .cost,
          .retail {
            font-size: 18px;
          }

          .gallery-arrow {
            display: none;
          }
        }
      `}</style>

      {/* MENÚ DE CATEGORÍAS */}

      {menuAbierto && (
        <>
          <div
            className="overlay"
            onClick={() =>
              setMenuAbierto(false)
            }
          />

          <aside className="side-menu">
            <div className="menu-header">
              <h2>Categorías</h2>

              <button
                type="button"
                className="menu-close"
                onClick={() =>
                  setMenuAbierto(false)
                }
              >
                ✕
              </button>
            </div>

            <div className="menu-list">
              {categorias.map(
                (categoria) => (
                  <button
                    key={categoria}
                    type="button"
                    className={
                      categoria ===
                      categoriaActiva
                        ? "menu-item menu-active"
                        : "menu-item"
                    }
                    onClick={() =>
                      seleccionarCategoria(
                        categoria
                      )
                    }
                  >
                    {categoria}
                  </button>
                )
              )}
            </div>
          </aside>
        </>
      )}

      {/* VISOR */}

      <VisorImagen
        visor={visor}
        cerrar={cerrarImagen}
        anterior={imagenAnterior}
        siguiente={imagenSiguiente}
      />

      <main className="page">
        <div className="container">
          {/* ENCABEZADO */}

          <div className="top">
            <div>
              <h1>
                Productos y precios
              </h1>

              <p>
                Consulta tu costo, precio sugerido y ganancia.
              </p>
            </div>

            <div className="top-buttons">
              <button
                type="button"
                className="button"
                onClick={() =>
                  router.push(
                    "/admin"
                  )
                }
              >
                ← Volver
              </button>
            </div>
          </div>

          {/* BUSCADOR + CATEGORÍAS */}

          <div className="filter-area">
            <button
              type="button"
              className="category-button"
              onClick={() =>
                setMenuAbierto(true)
              }
            >
              ☰ Categorías
            </button>

            <input
              type="text"
              className="search"
              placeholder="Buscar por referencia o nombre..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />
          </div>

          <div className="selected-category">
            {categoriaActiva}
          </div>

          <div className="info">
            <strong>
              💡 Información para tu negocio
            </strong>

            <p>
              Tu costo es el precio que pagas por el producto. El precio sugerido es el valor recomendado para venderlo a tus clientes.
            </p>
          </div>

          {error && (
            <div
              style={{
                background:
                  "#ffeaea",
                color: "#a33",
                padding: "15px",
                borderRadius:
                  "10px",
                marginBottom:
                  "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* PRODUCTOS */}

          <section className="products">
            {productosFiltrados.length ===
            0 ? (
              <div className="empty">
                No encontramos productos con estos filtros.
              </div>
            ) : (
              productosFiltrados.map(
                (producto) => {
                  const costo =
                    Number(
                      producto.costo ||
                        0
                    );

                  const precio =
                    Number(
                      producto.precio_detal ||
                        0
                    );

                  const ganancia =
                    precio - costo;

                  return (
                    <article
                      key={
                        producto.id
                      }
                      className="card"
                    >
                      <GaleriaProducto
                        producto={
                          producto
                        }
                        abrirImagen={
                          abrirImagen
                        }
                      />

                      <div className="card-info">
                        <p className="reference">
                          {
                            producto.referencia
                          }
                        </p>

                        <h2 className="name">
                          {
                            producto.nombre
                          }
                        </h2>

                        <div className="price-block">
                          <p className="price-label">
                            Tu costo
                          </p>

                          <strong className="cost">
                            {formatoPrecio(
                              costo
                            )}
                          </strong>
                        </div>

                        <div className="price-block">
                          <p className="price-label">
                            Precio sugerido
                          </p>

                          <strong className="retail">
                            {formatoPrecio(
                              precio
                            )}
                          </strong>
                        </div>

                        <div>
                          <p className="price-label">
                            Ganancia
                          </p>

                          <strong
                            className="profit"
                            style={{
                              color:
                                ganancia >=
                                0
                                  ? "#318553"
                                  : "#c43b3b",
                            }}
                          >
                            {formatoPrecio(
                              ganancia
                            )}
                          </strong>
                        </div>
                      </div>
                    </article>
                  );
                }
              )
            )}
          </section>
        </div>
      </main>
    </>
  );
}
