"use client";

import { useMemo, useRef, useState } from "react";

function formatoPrecio(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

function GaleriaProducto({ producto, abrirImagen }) {
  const imagenes = [producto.foto_url, producto.foto_url_2].filter(Boolean);
  const [indice, setIndice] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div
        style={{
          height: "220px",
          borderRadius: "14px",
          background: "#f7efec",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
        }}
      >
        Foto próximamente
      </div>
    );
  }

  function anterior(e) {
    e.stopPropagation();

    setIndice((actual) =>
      actual === 0 ? imagenes.length - 1 : actual - 1
    );
  }

  function siguiente(e) {
    e.stopPropagation();

    setIndice((actual) =>
      actual === imagenes.length - 1 ? 0 : actual + 1
    );
  }

  return (
    <div
      onClick={() => abrirImagen(imagenes, indice, producto.nombre)}
      style={{
        position: "relative",
        height: "220px",
        borderRadius: "14px",
        background: "#f7efec",
        marginBottom: "15px",
        overflow: "hidden",
        cursor: "zoom-in",
      }}
    >
      <img
        src={imagenes[indice]}
        alt={`${producto.nombre} - imagen ${indice + 1}`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {imagenes.length > 1 && (
        <>
          <button
            type="button"
            onClick={anterior}
            aria-label="Imagen anterior"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.92)",
              fontSize: "22px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 2,
            }}
          >
            ‹
          </button>

          <button
            type="button"
            onClick={siguiente}
            aria-label="Imagen siguiente"
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.92)",
              fontSize: "22px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 2,
            }}
          >
            ›
          </button>

          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "7px",
              background: "rgba(255,255,255,0.8)",
              padding: "6px 9px",
              borderRadius: "20px",
              zIndex: 2,
            }}
          >
            {imagenes.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndice(i);
                }}
                aria-label={`Ver imagen ${i + 1}`}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background:
                    i === indice ? "#d97883" : "#d8d8d8",
                }}
              />
            ))}
          </div>
        </>
      )}
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
      onClick={cerrar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar imagen"
        style={{
          position: "absolute",
          top: "18px",
          right: "18px",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "none",
          background: "white",
          color: "#222",
          fontSize: "24px",
          fontWeight: "700",
          cursor: "pointer",
          zIndex: 10002,
        }}
      >
        ✕
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "900px",
          maxHeight: "92vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={visor.imagenes[visor.indice]}
          alt={visor.nombre}
          style={{
            maxWidth: "100%",
            maxHeight: "88vh",
            objectFit: "contain",
            borderRadius: "14px",
            display: "block",
          }}
        />

        {visor.imagenes.length > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Imagen anterior"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.92)",
                fontSize: "28px",
                cursor: "pointer",
                boxShadow: "0 3px 15px rgba(0,0,0,0.25)",
              }}
            >
              ‹
            </button>

            <button
              type="button"
              onClick={siguiente}
              aria-label="Imagen siguiente"
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.92)",
                fontSize: "28px",
                cursor: "pointer",
                boxShadow: "0 3px 15px rgba(0,0,0,0.25)",
              }}
            >
              ›
            </button>

            <div
              style={{
                position: "absolute",
                bottom: "14px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.55)",
                color: "white",
                padding: "7px 12px",
                borderRadius: "20px",
                fontSize: "14px",
              }}
            >
              {visor.indice + 1} / {visor.imagenes.length}
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
  const [agregadoId, setAgregadoId] = useState(null);
  const [visor, setVisor] = useState(null);

  const carritoRef = useRef(null);

  function abrirImagen(imagenes, indice, nombre) {
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
          actual.indice === actual.imagenes.length - 1
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
        cantidad: (actual[producto.id]?.cantidad || 0) + 1,
      },
    }));

    setAgregadoId(producto.id);

    setTimeout(() => {
      setAgregadoId(null);
    }, 1200);
  }

  function cambiarCantidad(id, cambio) {
    setCarrito((actual) => {
      const producto = actual[id];

      if (!producto) return actual;

      const nuevaCantidad = producto.cantidad + cambio;

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

  const productosCarrito = Object.values(carrito);

  const total = useMemo(() => {
    return productosCarrito.reduce(
      (suma, producto) =>
        suma + producto.precio * producto.cantidad,
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
    if (productosCarrito.length === 0) return;

    const lineas = productosCarrito.map(
      (producto) =>
        `${producto.referencia} - ${producto.nombre}\n` +
        `Cantidad: ${producto.cantidad}\n` +
        `Precio: ${formatoPrecio(producto.precio)}`
    );

    const mensaje =
      `¡Hola! Quiero hacer el siguiente pedido:\n\n` +
      lineas.join("\n\n") +
      `\n\nTotal: ${formatoPrecio(total)}`;

    const numero = (whatsapp || "").replace(/\D/g, "");

    if (!numero) {
      alert(
        "Esta tienda todavía no tiene un número de WhatsApp configurado."
      );
      return;
    }

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(
        mensaje
      )}`,
      "_blank"
    );
  }

  return (
    <>
      <VisorImagen
        visor={visor}
        cerrar={cerrarImagen}
        anterior={imagenAnterior}
        siguiente={imagenSiguiente}
      />

      <header
        style={{
          marginBottom: "35px",
          textAlign: "center",
        }}
      >
        <p className="eyebrow">CATÁLOGO DIGITAL</p>

        <h1
          style={{
            fontSize: "42px",
            marginBottom: "10px",
          }}
        >
          {nombreTienda}
        </h1>

        <p style={{ color: "#666" }}>
          Descubre nuestros productos y arma tu pedido fácilmente.
        </p>
      </header>

     <section
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    paddingBottom:
      productosCarrito.length > 0 ? "95px" : "0",
  }}
>
        {productos.map((producto) => (
          <article
            key={producto.id}
            style={{
              background: "white",
              borderRadius: "18px",
              padding: "18px",
              boxShadow:
                "0 5px 25px rgba(0,0,0,0.06)",
            }}
          >
            <GaleriaProducto
              producto={producto}
              abrirImagen={abrirImagen}
            />

            <small style={{ color: "#999" }}>
              {producto.referencia}
            </small>

            <h2
              style={{
                fontSize: "19px",
                margin: "5px 0",
              }}
            >
              {producto.nombre}
            </h2>

            <p
              style={{
                fontSize: "21px",
                fontWeight: "700",
                margin: "8px 0 15px",
              }}
            >
              {formatoPrecio(producto.precio)}
            </p>

            <button
              onClick={() => agregar(producto)}
              style={{
                width: "100%",
                border: "none",
                padding: "13px",
                borderRadius: "10px",
                background:
                  agregadoId === producto.id
                    ? "#58b77a"
                    : "#d97883",
                color: "white",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {agregadoId === producto.id
                ? "✓ Agregado"
                : "Agregar al carrito"}
            </button>
          </article>
        ))}
      </section>

      {productosCarrito.length > 0 && (
        <section
          ref={carritoRef}
          style={{
            marginTop: "40px",
            background: "white",
            borderRadius: "18px",
            padding: "24px",
            boxShadow:
              "0 5px 25px rgba(0,0,0,0.06)",
            scrollMarginTop: "20px",
          }}
        >
          <h2>Mi pedido</h2>

          {productosCarrito.map((producto) => (
            <div
              key={producto.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                padding: "14px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <div>
                <strong>{producto.referencia}</strong>
                <div>{producto.nombre}</div>
                <small>
                  {formatoPrecio(producto.precio)}
                </small>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    cambiarCantidad(producto.id, -1)
                  }
                >
                  −
                </button>

                <strong>{producto.cantidad}</strong>

                <button
                  type="button"
                  onClick={() =>
                    cambiarCantidad(producto.id, 1)
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <h2
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "25px",
            }}
          >
            <span>Total</span>
            <span>{formatoPrecio(total)}</span>
          </h2>

          <button
            onClick={pedirWhatsApp}
            style={{
              width: "100%",
              marginTop: "15px",
              padding: "16px",
              border: "none",
              borderRadius: "12px",
              background: "#25D366",
              color: "white",
              fontSize: "17px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Pedir por WhatsApp
          </button>
        </section>
      )}

      {productosCarrito.length > 0 && (
        <button
          onClick={irAlCarrito}
          style={{
            position: "fixed",
            left: "50%",
            bottom: "18px",
            transform: "translateX(-50%)",
            width: "calc(100% - 32px)",
            maxWidth: "520px",
            border: "none",
            borderRadius: "16px",
            padding: "16px 20px",
            background: "#222",
            color: "white",
            fontSize: "16px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.22)",
            zIndex: 999,
            display: "flex",
            justifyContent: "space-between",
            gap: "15px",
          }}
        >
          <span>
            🛒 {cantidadTotal}{" "}
            {cantidadTotal === 1
              ? "producto"
              : "productos"}
          </span>

          <span>
            {formatoPrecio(total)} · Ver carrito
          </span>
        </button>
      )}
    </>
  );
}
