"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================================================
   UTILIDADES
========================================================= */

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

function claveProducto(productoId, varianteId = null) {
  return varianteId
    ? `producto-${productoId}-variante-${varianteId}`
    : `producto-${productoId}`;
}

/* =========================================================
   GALERÍA
========================================================= */

function GaleriaProducto({
  producto,
  abrirImagen,
  onAgregar,
  agregado = false,
  tieneVariantes = false,
}) {
  const imagenes = [
    producto.foto_url,
    producto.foto_url_2,
  ].filter(
    (url, index, array) =>
      url &&
      String(url).trim() !== "" &&
      array.indexOf(url) === index
  );

  const [indice, setIndice] = useState(0);
  const [imagenesConError, setImagenesConError] = useState({});

  useEffect(() => {
    setIndice(0);
    setImagenesConError({});
  }, [
    producto.id,
    producto.variante_id,
    producto.foto_url,
    producto.foto_url_2,
  ]);

  // Solo dejamos disponibles las fotos que realmente cargaron.
  const imagenesValidas = imagenes.filter(
    (_, i) => !imagenesConError[i]
  );

  // Evita quedar apuntando a una segunda foto que falló.
  useEffect(() => {
    if (
      imagenesValidas.length > 0 &&
      indice >= imagenesValidas.length
    ) {
      setIndice(0);
    }
  }, [imagenesValidas.length, indice]);

  function manejarAgregar(e) {
    e.preventDefault();
    e.stopPropagation();

    const contenedor = e.currentTarget.closest(
      ".product-image-container"
    );

    const imagen =
      contenedor?.querySelector(".product-image");

    onAgregar?.({
      elementoImagen: imagen,
      boton: e.currentTarget,
    });
  }

  function marcarError(indiceOriginal) {
    setImagenesConError((actual) => ({
      ...actual,
      [indiceOriginal]: true,
    }));

    setIndice(0);
  }

  if (!imagenesValidas.length) {
    return (
      <div className="galeria-producto-completa">
        <div className="product-image-container">
          <div className="no-image">Sin imagen</div>

          {onAgregar && (
            <button
              type="button"
              className={
                agregado
                  ? "image-cart-button image-cart-added"
                  : "image-cart-button"
              }
              onClick={manejarAgregar}
              title={
                tieneVariantes
                  ? "Ver variantes"
                  : "Agregar al pedido"
              }
            >
              {agregado ? "✓" : "🛒"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const imagenActual =
    imagenesValidas[indice] || imagenesValidas[0];

  function anterior(e) {
    e.preventDefault();
    e.stopPropagation();

    setIndice((actual) =>
      actual === 0
        ? imagenesValidas.length - 1
        : actual - 1
    );
  }

  function siguiente(e) {
    e.preventDefault();
    e.stopPropagation();

    setIndice((actual) =>
      actual === imagenesValidas.length - 1
        ? 0
        : actual + 1
    );
  }

  return (
    <div className="galeria-producto-completa">

      {/* FOTO GRANDE */}
      <div
        className="product-image-container"
        onClick={() =>
          abrirImagen(
            imagenesValidas,
            indice,
            producto.nombre
          )
        }
      >
        <img
          src={imagenActual}
          alt={producto.nombre}
          className="product-image"
          onError={() => {
            const indiceOriginal =
              imagenes.indexOf(imagenActual);

            if (indiceOriginal >= 0) {
              marcarError(indiceOriginal);
            }
          }}
        />

        {/* FLECHAS: SOLO SI HAY MÁS DE UNA FOTO */}
        {imagenesValidas.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-left"
              onClick={anterior}
              aria-label="Foto anterior"
            >
              ‹
            </button>

            <button
              type="button"
              className="gallery-arrow gallery-right"
              onClick={siguiente}
              aria-label="Foto siguiente"
            >
              ›
            </button>

            <div className="photo-count">
              {indice + 1}/{imagenesValidas.length}
            </div>
          </>
        )}

        {/* BOTÓN CARRITO */}
        {onAgregar && (
          <button
            type="button"
            className={
              agregado
                ? "image-cart-button image-cart-added"
                : "image-cart-button"
            }
            onClick={manejarAgregar}
            title={
              tieneVariantes
                ? "Ver variantes"
                : "Agregar al pedido"
            }
          >
            {agregado ? "✓" : "🛒"}
          </button>
        )}
      </div>

      {/* MINIATURAS */}
      <div className="miniaturas-galeria">
        {imagenesValidas.map((foto, i) => (
          <button
            key={`${producto.id}-${producto.variante_id || "p"}-${i}`}
            type="button"
            className={
              i === indice
                ? "miniatura-galeria miniatura-activa"
                : "miniatura-galeria"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndice(i);
            }}
            aria-label={`Ver foto ${i + 1}`}
          >
            <img
              src={foto}
              alt={`${producto.nombre} - foto ${i + 1}`}
              loading="lazy"
              onError={() => {
                const indiceOriginal =
                  imagenes.indexOf(foto);

                if (indiceOriginal >= 0) {
                  marcarError(indiceOriginal);
                }
              }}
            />

            {i === indice && (
              <span className="miniatura-check">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
/* =========================================================
   VISOR
========================================================= */

function VisorImagen({
  visor,
  cerrar,
  anterior,
  siguiente,
}) {
  if (!visor) return null;

  return (
    <div className="viewer" onClick={cerrar}>
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

/* =========================================================
   PRECIOS
========================================================= */

function BloquePrecios({
  costo,
  precio,
  productoId,
  varianteId = null,
  onPrecioActualizado,
}) {
  const costoNumero = Number(costo || 0);
  const precioNumero = Number(precio || 0);

  const [editando, setEditando] = useState(false);

  const [nuevoPrecio, setNuevoPrecio] = useState(
    String(Math.round(precioNumero))
  );

  const [guardando, setGuardando] = useState(false);
  const [errorPrecio, setErrorPrecio] = useState("");

  useEffect(() => {
    if (!editando) {
      setNuevoPrecio(String(Math.round(precioNumero)));
    }
  }, [precioNumero, editando]);

  async function guardarPrecio() {
    const precioGuardar = Number(
      String(nuevoPrecio)
        .replace(/\./g, "")
        .replace(/,/g, "")
        .replace(/\s/g, "")
    );

    if (
      !Number.isFinite(precioGuardar) ||
      precioGuardar < 0
    ) {
      setErrorPrecio("Ingresa un precio válido.");
      return;
    }

    setGuardando(true);
    setErrorPrecio("");

    try {
      const response = await fetch(
        "/api/precios-tienda",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            producto_id: Number(productoId),

            variante_id:
              varianteId !== null &&
              varianteId !== undefined
                ? Number(varianteId)
                : null,

            precio_sugerido: Math.round(precioGuardar),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos guardar el precio."
        );
      }

      onPrecioActualizado?.(
        Number(data.precio_sugerido)
      );

      setNuevoPrecio(
        String(data.precio_sugerido)
      );

      setEditando(false);
    } catch (error) {
      console.error(
        "Error guardando precio:",
        error
      );

      setErrorPrecio(
        error.message ||
          "No pudimos guardar el precio."
      );
    } finally {
      setGuardando(false);
    }
  }

  function cancelarEdicion() {
    setNuevoPrecio(
      String(Math.round(precioNumero))
    );

    setErrorPrecio("");
    setEditando(false);
  }

  return (
    <div className="product-prices-new">

      {/* TU COSTO */}
      <div className="cost-box-new">
        <span className="price-label-new">
          Tu costo
        </span>

        <strong className="cost-new">
          {formatoPrecio(costoNumero)}
        </strong>
      </div>

      {/* PRECIO DE VENTA */}
      <div className="sale-box-new">

        <div className="sale-title-new">
          <span className="price-label-new">
            Precio de venta
          </span>

          {!editando && (
            <button
              type="button"
              className="edit-price-new"
              title="Editar precio de venta"
              onClick={() => {
                setNuevoPrecio(
                  String(Math.round(precioNumero))
                );

                setErrorPrecio("");
                setEditando(true);
              }}
            >
              ✏️
            </button>
          )}
        </div>

        {!editando ? (
          <strong className="sale-price-new">
            {formatoPrecio(precioNumero)}
          </strong>
        ) : (
          <div className="price-editor-new">

            <div className="price-input-new">
              <span>$</span>

              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={nuevoPrecio}
                disabled={guardando}
                autoFocus
                onChange={(e) => {
                  setNuevoPrecio(e.target.value);
                  setErrorPrecio("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    guardarPrecio();
                  }

                  if (e.key === "Escape") {
                    cancelarEdicion();
                  }
                }}
              />
            </div>

            <div className="price-editor-actions-new">
              <button
                type="button"
                className="save-price-new"
                disabled={guardando}
                onClick={guardarPrecio}
              >
                {guardando
                  ? "Guardando..."
                  : "✓ Guardar"}
              </button>

              <button
                type="button"
                className="cancel-price-new"
                disabled={guardando}
                onClick={cancelarEdicion}
              >
                Cancelar
              </button>
            </div>

            {errorPrecio && (
              <p className="price-error-new">
                {errorPrecio}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CARRITO
========================================================= */

function Carrito({
  abierto,
  cerrar,
  carrito,
  aumentar,
  disminuir,
  eliminar,
  vaciar,
}) {
  const [mostrarPago, setMostrarPago] =
    useState(false);

  const [formaPago, setFormaPago] =
    useState("");

  const [enviando, setEnviando] =
    useState(false);

  const [errorPedido, setErrorPedido] =
    useState("");

  const [pedidoExitoso, setPedidoExitoso] =
    useState(null);

  if (!abierto) return null;

  const unidades = carrito.reduce(
    (total, item) =>
      total + Number(item.cantidad || 0),
    0
  );

  const subtotal = carrito.reduce(
    (acumulado, item) =>
      acumulado +
      Number(item.costo || 0) *
        Number(item.cantidad || 0),
    0
  );

  const porcentajeDescuento =
    formaPago === "TRANSFERENCIA" ? 6 : 0;

  const descuento =
    formaPago === "TRANSFERENCIA"
      ? Math.round(subtotal * 0.06)
      : 0;

  const totalConDescuento =
    subtotal - descuento;

  function abrirFormaPago() {
    setFormaPago("");
    setErrorPedido("");
    setPedidoExitoso(null);
    setMostrarPago(true);
  }

  function cerrarFormaPago() {
    if (enviando) return;

    setMostrarPago(false);
    setFormaPago("");
    setErrorPedido("");
  }

  async function enviarPedido() {
    if (!formaPago) {
      setErrorPedido(
        "Selecciona la forma de pago."
      );
      return;
    }

    if (!carrito.length) {
      setErrorPedido(
        "Tu pedido no tiene productos."
      );
      return;
    }

    setEnviando(true);
    setErrorPedido("");

    try {
      /*
        IMPORTANTE:

        Solo enviamos al servidor:
        - producto_id
        - variante_id
        - cantidad

        NO enviamos:
        - costo
        - referencia
        - infoimagen
        - precio sugerido

        La API los consulta directamente
        en Supabase para evitar manipulaciones.
      */

      const productos = carrito.map(
        (item) => ({
          producto_id:
            Number(item.producto_id),

          variante_id:
            item.variante_id !== null &&
            item.variante_id !== undefined &&
            item.variante_id !== ""
              ? Number(item.variante_id)
              : null,

          cantidad:
            Number(item.cantidad || 0),
        })
      );

      const response = await fetch(
        "/api/pedidos/enviar",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            forma_pago: formaPago,
            productos,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos enviar el pedido."
        );
      }

      /*
        El servidor devuelve los valores
        definitivos que él mismo calculó.
      */

      setPedidoExitoso({
        pedido_id:
          data.pedido_id || "",

        forma_pago:
          data.forma_pago || formaPago,

        subtotal:
          Number(
            data.subtotal ?? subtotal
          ),

        porcentaje_descuento:
          Number(
            data.porcentaje_descuento ??
              porcentajeDescuento
          ),

        descuento:
          Number(
            data.descuento ?? descuento
          ),

        total_productos:
          Number(
            data.total_productos ??
              totalConDescuento
          ),

        mensaje_envio:
          data.mensaje_envio ||
          "El valor del envío será confirmado por WhatsApp.",
      });

      /*
        SOLO vaciamos el carrito
        después de que Make confirmó
        que recibió el pedido.
      */

      vaciar();
    } catch (error) {
      console.error(
        "Error enviando pedido:",
        error
      );

      setErrorPedido(
        error.message ||
          "No pudimos enviar el pedido. Inténtalo nuevamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  function finalizarPedido() {
    setPedidoExitoso(null);
    setMostrarPago(false);
    setFormaPago("");
    setErrorPedido("");
    cerrar();
  }

  return (
    <>
      <div
        className="cart-overlay"
        onClick={cerrar}
      />

      <aside className="cart-panel">
        <div className="cart-header">
          <div>
            <h2>Mi pedido</h2>

            <p>
              {unidades}{" "}
              {unidades === 1
                ? "unidad"
                : "unidades"}
            </p>
          </div>

          <button
            type="button"
            className="cart-close"
            onClick={cerrar}
          >
            ✕
          </button>
        </div>

        {carrito.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">
              🛒
            </div>

            <h3>Tu pedido está vacío</h3>

            <p>
              Agrega los productos que deseas pedir.
            </p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {carrito.map((item) => {
                const subtotalItem =
                  Number(item.costo || 0) *
                  Number(item.cantidad || 0);

                return (
                  <div
                    className="cart-item"
                    key={item.clave}
                  >
                    <div className="cart-item-top">
                      <div className="cart-item-image">
                        {item.foto_url ? (
                          <img
                            src={item.foto_url}
                            alt={item.nombre}
                          />
                        ) : (
                          <div className="cart-no-image">
                            Sin foto
                          </div>
                        )}
                      </div>

                      <div className="cart-item-info">
                        <strong>
                          {item.nombre}
                        </strong>

                        {item.variante_nombre && (
                          <span className="cart-variant">
                            {
                              item.variante_nombre
                            }
                          </span>
                        )}

                        <span className="cart-reference">
                          Ref. {item.referencia}
                        </span>

                        <span className="cart-unit-price">
                          {formatoPrecio(
                            item.costo
                          )}{" "}
                          c/u
                        </span>
                      </div>

                      <button
                        type="button"
                        className="cart-delete"
                        onClick={() =>
                          eliminar(item.clave)
                        }
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="cart-item-bottom">
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() =>
                            disminuir(
                              item.clave
                            )
                          }
                        >
                          −
                        </button>

                        <strong>
                          {item.cantidad}
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            aumentar(
                              item.clave
                            )
                          }
                        >
                          +
                        </button>
                      </div>

                      <strong className="cart-subtotal">
                        {formatoPrecio(
                          subtotalItem
                        )}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-footer">
              <div className="cart-summary-row">
                <span>Unidades</span>
                <strong>{unidades}</strong>
              </div>

              <div className="cart-summary-row total">
                <span>
                  Total del pedido
                </span>

                <strong>
                  {formatoPrecio(subtotal)}
                </strong>
              </div>

              <button
                type="button"
                className="send-order-button"
                onClick={abrirFormaPago}
              >
                Enviar pedido
              </button>

              <button
                type="button"
                className="empty-cart-button"
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Quieres vaciar todo el pedido?"
                    )
                  ) {
                    vaciar();
                  }
                }}
              >
                Vaciar pedido
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ================================================
          MODAL FORMA DE PAGO
      ================================================ */}

      {mostrarPago && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            zIndex: 30000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "18px",
          }}
          onClick={
            pedidoExitoso
              ? undefined
              : cerrarFormaPago
          }
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "20px",
              padding: "24px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,.25)",
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {pedidoExitoso ? (
              <>
                {/* ==============================
                    PEDIDO EXITOSO
                ============================== */}

                <div
                  style={{
                    width: "65px",
                    height: "65px",
                    margin:
                      "0 auto 18px",
                    borderRadius: "50%",
                    background: "#eaf7ef",
                    color: "#318553",
                    display: "flex",
                    justifyContent:
                      "center",
                    alignItems: "center",
                    fontSize: "32px",
                    fontWeight: "900",
                  }}
                >
                  ✓
                </div>

                <h2
                  style={{
                    margin:
                      "0 0 8px",
                    textAlign: "center",
                  }}
                >
                  ¡Pedido enviado!
                </h2>

                <p
                  style={{
                    textAlign: "center",
                    color: "#666",
                    margin:
                      "0 0 22px",
                  }}
                >
                  Recibimos correctamente tu pedido.
                </p>

                {pedidoExitoso.pedido_id && (
                  <div
                    style={{
                      background:
                        "#f7f7f7",
                      borderRadius: "12px",
                      padding: "13px",
                      marginBottom:
                        "16px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display:
                          "block",
                        color: "#777",
                        fontSize:
                          "12px",
                        marginBottom:
                          "4px",
                      }}
                    >
                      Número de pedido
                    </span>

                    <strong>
                      {
                        pedidoExitoso.pedido_id
                      }
                    </strong>
                  </div>
                )}

                <div
                  style={{
                    border:
                      "1px solid #eee",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      marginBottom:
                        "10px",
                    }}
                  >
                    <span>
                      Productos
                    </span>

                    <strong>
                      {formatoPrecio(
                        pedidoExitoso.subtotal
                      )}
                    </strong>
                  </div>

                  {pedidoExitoso.descuento >
                    0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "15px",
                        marginBottom:
                          "10px",
                        color:
                          "#318553",
                      }}
                    >
                      <span>
                        Descuento 6%
                      </span>

                      <strong>
                        -
                        {formatoPrecio(
                          pedidoExitoso.descuento
                        )}
                      </strong>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      borderTop:
                        "1px solid #eee",
                      paddingTop:
                        "12px",
                      marginTop: "8px",
                      fontSize: "19px",
                    }}
                  >
                    <span>
                      Total productos
                    </span>

                    <strong>
                      {formatoPrecio(
                        pedidoExitoso.total_productos
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px",
                    borderRadius: "12px",
                    background:
                      "#fff8e8",
                    color: "#705a20",
                    fontSize: "14px",
                    lineHeight: "1.45",
                  }}
                >
                  📦{" "}
                  {
                    pedidoExitoso.mensaje_envio
                  }
                </div>

                <button
                  type="button"
                  onClick={finalizarPedido}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "#222",
                    color: "#fff",
                    padding: "15px",
                    borderRadius:
                      "11px",
                    marginTop: "18px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "800",
                  }}
                >
                  Finalizar
                </button>
              </>
            ) : (
              <>
                {/* ==============================
                    SELECCIONAR PAGO
                ============================== */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: "15px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin:
                          "0 0 5px",
                      }}
                    >
                      Forma de pago
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                        fontSize:
                          "14px",
                      }}
                    >
                      Selecciona cómo deseas pagar tu pedido.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={enviando}
                    onClick={
                      cerrarFormaPago
                    }
                    style={{
                      width: "38px",
                      height: "38px",
                      flexShrink: 0,
                      border: "none",
                      borderRadius:
                        "50%",
                      background:
                        "#f5f5f5",
                      cursor:
                        enviando
                          ? "default"
                          : "pointer",
                      fontSize: "17px",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* TRANSFERENCIA */}

                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => {
                    setFormaPago(
                      "TRANSFERENCIA"
                    );
                    setErrorPedido("");
                  }}
                  style={{
                    width: "100%",
                    marginTop: "22px",
                    padding: "17px",
                    border:
                      formaPago ===
                      "TRANSFERENCIA"
                        ? "2px solid #318553"
                        : "1px solid #ddd",
                    borderRadius: "14px",
                    background:
                      formaPago ===
                      "TRANSFERENCIA"
                        ? "#f0faf4"
                        : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "10px",
                    }}
                  >
                    <strong
                      style={{
                        fontSize:
                          "16px",
                      }}
                    >
                      🏦 Transferencia
                    </strong>

                    <span
                      style={{
                        background:
                          "#318553",
                        color: "white",
                        padding:
                          "5px 9px",
                        borderRadius:
                          "20px",
                        fontSize:
                          "12px",
                        fontWeight:
                          "800",
                      }}
                    >
                      6% DTO.
                    </span>
                  </div>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color: "#666",
                      fontSize: "13px",
                    }}
                  >
                    Recibes 6% de descuento sobre el valor de los productos.
                  </p>
                </button>

                {/* PAGO EN CASA */}

                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => {
                    setFormaPago(
                      "PAGO EN CASA"
                    );
                    setErrorPedido("");
                  }}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    padding: "17px",
                    border:
                      formaPago ===
                      "PAGO EN CASA"
                        ? "2px solid #222"
                        : "1px solid #ddd",
                    borderRadius: "14px",
                    background:
                      formaPago ===
                      "PAGO EN CASA"
                        ? "#f7f7f7"
                        : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "16px",
                    }}
                  >
                    🏠 Pago en casa
                  </strong>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color: "#666",
                      fontSize: "13px",
                    }}
                  >
                    Pagas al recibir. Esta forma de pago no aplica descuento.
                  </p>
                </button>

                {/* RESUMEN */}

                <div
                  style={{
                    marginTop: "18px",
                    padding: "16px",
                    borderRadius: "14px",
                    background: "#f8f8f8",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      marginBottom:
                        "10px",
                    }}
                  >
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {formatoPrecio(
                        subtotal
                      )}
                    </strong>
                  </div>

                  {formaPago ===
                    "TRANSFERENCIA" && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "15px",
                        color:
                          "#318553",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <span>
                        Descuento 6%
                      </span>

                      <strong>
                        -
                        {formatoPrecio(
                          descuento
                        )}
                      </strong>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      borderTop:
                        "1px solid #ddd",
                      paddingTop:
                        "12px",
                      fontSize: "19px",
                    }}
                  >
                    <span>
                      Total productos
                    </span>

                    <strong>
                      {formatoPrecio(
                        totalConDescuento
                      )}
                    </strong>
                  </div>
                </div>

                {/* AVISO ENVÍO */}

                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    background:
                      "#fff8e8",
                    borderRadius: "12px",
                    color: "#705a20",
                    fontSize: "13px",
                    lineHeight: "1.45",
                  }}
                >
                  📦 <strong>Envío no incluido.</strong>{" "}
                  Te enviaremos por WhatsApp el total final con el valor del envío.
                </div>

                {errorPedido && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "12px",
                      background:
                        "#ffecec",
                      color: "#a33",
                      borderRadius:
                        "10px",
                      fontSize: "13px",
                    }}
                  >
                    {errorPedido}
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    enviando ||
                    !formaPago
                  }
                  onClick={enviarPedido}
                  style={{
                    width: "100%",
                    border: "none",
                    background:
                      enviando ||
                      !formaPago
                        ? "#aaa"
                        : "#222",
                    color: "#fff",
                    padding: "15px",
                    borderRadius:
                      "11px",
                    marginTop: "18px",
                    cursor:
                      enviando ||
                      !formaPago
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "16px",
                    fontWeight: "800",
                  }}
                >
                  {enviando
                    ? "Enviando pedido..."
                    : formaPago
                    ? `Confirmar pedido · ${formatoPrecio(
                        totalConDescuento
                      )}`
                    : "Selecciona una forma de pago"}
                </button>

                <p
                  style={{
                    margin:
                      "12px 0 0",
                    color: "#999",
                    textAlign: "center",
                    fontSize: "11px",
                  }}
                >
                  Al confirmar enviaremos tu pedido para ser procesado.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PÁGINA
========================================================= */

export default function ProductosMayoristaPage() {
  const router = useRouter();

  const cartButtonRef = useRef(null);

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

  const [
    variantesAbiertas,
    setVariantesAbiertas,
  ] = useState({});

  /* CARRITO */

  const [carrito, setCarrito] =
    useState([]);

  const [
    carritoAbierto,
    setCarritoAbierto,
  ] = useState(false);

  const [
    carritoCargado,
    setCarritoCargado,
  ] = useState(false);

  const [
    agregadoReciente,
    setAgregadoReciente,
  ] = useState(null);

  const [
    carritoAnimando,
    setCarritoAnimando,
  ] = useState(false);
const [
  mostrarResumenFlotante,
  setMostrarResumenFlotante,
] = useState(false);

const temporizadorResumenRef = useRef(null);
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

  /* =======================================================
     CARGAR PRODUCTOS
  ======================================================= */

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    setCargando(true);
    setError("");

    try {
      const sesionResponse =
        await fetch("/api/auth/sesion", {
          method: "GET",
          cache: "no-store",
        });

      const sesionData =
        await sesionResponse.json();

      if (
        !sesionResponse.ok ||
        !sesionData.autenticado
      ) {
        router.replace("/login");
        return;
      }

      if (!sesionData.cliente?.tienda_id) {
        router.replace("/crear-tienda");
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

  /* =======================================================
     CARGAR CARRITO DE LOCALSTORAGE
  ======================================================= */

  useEffect(() => {
    try {
      const guardado =
        window.localStorage.getItem(
          "ra_pedido_mayorista"
        );

      if (guardado) {
        const datos =
          JSON.parse(guardado);

        if (Array.isArray(datos)) {
          setCarrito(datos);
        }
      }
    } catch (error) {
      console.error(
        "Error cargando carrito:",
        error
      );
    }

    setCarritoCargado(true);
  }, []);

  /* =======================================================
     GUARDAR CARRITO
  ======================================================= */

  useEffect(() => {
    if (!carritoCargado) return;

    try {
      window.localStorage.setItem(
        "ra_pedido_mayorista",
        JSON.stringify(carrito)
      );
    } catch (error) {
      console.error(
        "Error guardando carrito:",
        error
      );
    }
  }, [carrito, carritoCargado]);

  /* =======================================================
     ANIMACIÓN PRODUCTO → CARRITO
  ======================================================= */

  function animarHaciaCarrito(
    elementoImagen
  ) {
    const destino =
      cartButtonRef.current;

    if (
      !elementoImagen ||
      !destino ||
      typeof window === "undefined"
    ) {
      return;
    }

    const origenRect =
      elementoImagen.getBoundingClientRect();

    const destinoRect =
      destino.getBoundingClientRect();

    const clon =
      elementoImagen.cloneNode(true);

    clon.className = "flying-product-image";

    clon.style.position = "fixed";
    clon.style.left = `${origenRect.left}px`;
    clon.style.top = `${origenRect.top}px`;
    clon.style.width = `${origenRect.width}px`;
    clon.style.height = `${origenRect.height}px`;
    clon.style.objectFit = "cover";
    clon.style.borderRadius = "14px";
    clon.style.zIndex = "20000";
    clon.style.pointerEvents = "none";
    clon.style.margin = "0";
    clon.style.transform = "scale(1)";
    clon.style.opacity = "0.95";
    clon.style.transition =
      "left 650ms cubic-bezier(.2,.8,.2,1), top 650ms cubic-bezier(.2,.8,.2,1), width 650ms cubic-bezier(.2,.8,.2,1), height 650ms cubic-bezier(.2,.8,.2,1), opacity 650ms ease, transform 650ms ease";

    document.body.appendChild(clon);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchoFinal = 28;
        const altoFinal = 28;

        clon.style.left = `${
          destinoRect.left +
          destinoRect.width / 2 -
          anchoFinal / 2
        }px`;

        clon.style.top = `${
          destinoRect.top +
          destinoRect.height / 2 -
          altoFinal / 2
        }px`;

        clon.style.width =
          `${anchoFinal}px`;

        clon.style.height =
          `${altoFinal}px`;

        clon.style.opacity = "0.15";
        clon.style.transform =
          "scale(0.25) rotate(8deg)";
      });
    });

    window.setTimeout(() => {
      clon.remove();

      setCarritoAnimando(true);

      window.setTimeout(() => {
        setCarritoAnimando(false);
      }, 450);
    }, 680);
  }

  /* =======================================================
     CARRITO
  ======================================================= */

  function agregarProductoNormal(
    producto,
    elementoImagen = null
  ) {
    const clave = claveProducto(
      producto.id
    );

    const nuevoItem = {
      clave,
      producto_id: producto.id,
      variante_id: null,
      variante_nombre: "",
      referencia:
        producto.referencia || "",
      nombre:
        producto.nombre || "Producto",
      foto_url:
        producto.foto_url || "",
      costo:
        Number(producto.costo || 0),
      cantidad: 1,
    };

    agregarAlCarrito(
      nuevoItem,
      elementoImagen
    );
  }

  function agregarVariante(
    producto,
    variante,
    elementoImagen = null
  ) {
    const clave = claveProducto(
      producto.id,
      variante.id
    );

    const nuevoItem = {
      clave,
      producto_id: producto.id,
      variante_id: variante.id,
      variante_nombre:
        variante.nombre_variante || "",
      referencia:
        variante.referencia ||
        producto.referencia ||
        "",
      nombre:
        producto.nombre || "Producto",
      foto_url:
        variante.foto_url ||
        producto.foto_url ||
        "",
      costo:
        Number(variante.costo || 0),
      cantidad: 1,
    };

    agregarAlCarrito(
      nuevoItem,
      elementoImagen
    );
  }

  function agregarAlCarrito(
    nuevoItem,
    elementoImagen = null
  ) {
    setCarrito((actual) => {
      const existe =
        actual.find(
          (item) =>
            item.clave ===
            nuevoItem.clave
        );

      if (existe) {
        return actual.map((item) =>
          item.clave === nuevoItem.clave
            ? {
                ...item,
                cantidad:
                  Number(
                    item.cantidad || 0
                  ) + 1,
              }
            : item
        );
      }

      return [
        ...actual,
        nuevoItem,
      ];
    });

    setAgregadoReciente(
      nuevoItem.clave
    );

    if (elementoImagen) {
      animarHaciaCarrito(
        elementoImagen
      );
    } else {
      setCarritoAnimando(true);

      window.setTimeout(() => {
        setCarritoAnimando(false);
      }, 450);
    }

    setTimeout(() => {
      setAgregadoReciente(
        (actual) =>
          actual === nuevoItem.clave
            ? null
            : actual
      );
    }, 1000);
    // Mostrar resumen flotante del carrito
setMostrarResumenFlotante(true);

// Si ya había un temporizador,
// lo reiniciamos para que permanezca visible
// después del último producto agregado.
if (temporizadorResumenRef.current) {
  clearTimeout(
    temporizadorResumenRef.current
  );
}

temporizadorResumenRef.current =
  setTimeout(() => {
    setMostrarResumenFlotante(false);
  }, 3500);
  }

  function aumentarCantidad(clave) {
    setCarrito((actual) =>
      actual.map((item) =>
        item.clave === clave
          ? {
              ...item,
              cantidad:
                Number(
                  item.cantidad || 0
                ) + 1,
            }
          : item
      )
    );
  }

  function disminuirCantidad(clave) {
    setCarrito((actual) =>
      actual
        .map((item) =>
          item.clave === clave
            ? {
                ...item,
                cantidad:
                  Number(
                    item.cantidad || 0
                  ) - 1,
              }
            : item
        )
        .filter(
          (item) =>
            Number(item.cantidad) > 0
        )
    );
  }

  function eliminarDelCarrito(clave) {
    setCarrito((actual) =>
      actual.filter(
        (item) =>
          item.clave !== clave
      )
    );
  }

  function vaciarCarrito() {
    setCarrito([]);
  }

  const totalUnidades =
    useMemo(() => {
      return carrito.reduce(
        (total, item) =>
          total +
          Number(item.cantidad || 0),
        0
      );
    }, [carrito]);

  const totalCarrito =
    useMemo(() => {
      return carrito.reduce(
        (total, item) =>
          total +
          Number(item.costo || 0) *
            Number(item.cantidad || 0),
        0
      );
    }, [carrito]);

  /* =======================================================
     FILTROS
  ======================================================= */

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
        categoriaActiva === "Nuevos"
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
        categoriaActiva === "Aretes"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return (
              texto.includes("arete") ||
              texto.includes("aretes")
            );
          }
        );
      }

      if (
        categoriaActiva === "Candongas"
      ) {
        lista = lista.filter(
          (producto) =>
            normalizar(
              producto.nombre
            ).includes("candonga")
        );
      }

      if (
        categoriaActiva === "Collares"
      ) {
        lista = lista.filter(
          (producto) => {
            const texto =
              normalizar(
                producto.nombre
              );

            return (
              texto.includes("collar") ||
              texto.includes("cadena")
            );
          }
        );
      }

      if (
        categoriaActiva === "Pulseras"
      ) {
        lista = lista.filter(
          (producto) =>
            normalizar(
              producto.nombre
            ).includes("pulsera")
        );
      }

      if (
        categoriaActiva === "Anillos"
      ) {
        lista = lista.filter(
          (producto) =>
            normalizar(
              producto.nombre
            ).includes("anillo")
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
              texto.includes("topo") ||
              texto.includes("maxitopo")
            );
          }
        );
      }

      const textoBusqueda =
        normalizar(busqueda.trim());

      if (textoBusqueda) {
        lista = lista.filter(
          (producto) => {
            const variantesTexto =
              Array.isArray(
                producto.variantes
              )
                ? producto.variantes
                    .map(
                      (variante) =>
                        `${variante.nombre_variante || ""} ${variante.referencia || ""}`
                    )
                    .join(" ")
                : "";

            const texto =
              normalizar(
                `${producto.referencia || ""} ${producto.nombre || ""} ${producto.categoria || ""} ${variantesTexto}`
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
    setCategoriaActiva(categoria);
    setMenuAbierto(false);
  }
  function actualizarPrecioPersonalizado(
    productoId,
    varianteId,
    nuevoPrecio
  ) {
    setProductos((actuales) =>
      actuales.map((producto) => {
        if (
          Number(producto.id) !==
          Number(productoId)
        ) {
          return producto;
        }

        // PRODUCTO NORMAL
        if (
          varianteId === null ||
          varianteId === undefined
        ) {
          return {
            ...producto,
            precio_detal:
              Number(nuevoPrecio),
            precio_personalizado:
              Number(nuevoPrecio),
          };
        }

        // VARIANTE
        return {
          ...producto,

          variantes:
            Array.isArray(
              producto.variantes
            )
              ? producto.variantes.map(
                  (variante) =>
                    Number(
                      variante.id
                    ) ===
                    Number(varianteId)
                      ? {
                          ...variante,

                          precio_detal:
                            Number(
                              nuevoPrecio
                            ),

                          precio_personalizado:
                            Number(
                              nuevoPrecio
                            ),
                        }
                      : variante
                )
              : [],
        };
      })
    );
  }
  /* =======================================================
     VARIANTES
  ======================================================= */

  function alternarVariantes(
    productoId
  ) {
    setVariantesAbiertas(
      (actual) => ({
        ...actual,
        [productoId]:
          !actual[productoId],
      })
    );
  }

  function manejarCarritoProducto(
    producto,
    datosEvento
  ) {
    const tieneVariantes =
      producto.tiene_variantes &&
      Array.isArray(producto.variantes) &&
      producto.variantes.length > 0;

    if (tieneVariantes) {
      setVariantesAbiertas(
        (actual) => ({
          ...actual,
          [producto.id]: true,
        })
      );

      window.setTimeout(() => {
        const elemento =
          document.getElementById(
            `variantes-${producto.id}`
          );

        elemento?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 80);

      return;
    }

    agregarProductoNormal(
      producto,
      datosEvento?.elementoImagen ||
        null
    );
  }

  /* =======================================================
     VISOR
  ======================================================= */

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

  /* =======================================================
     CARGANDO
  ======================================================= */

  if (cargando) {
    return (
      <main className="loading-page">
        Cargando productos...
      </main>
    );
  }  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fff8f6;
        }

        button,
        input {
          font-family: inherit;
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
        /* =================================================
   MINIATURAS DE FOTOS DE PRODUCTO
================================================= */

.galeria-producto-completa {
  width: 100%;
}

.miniaturas-galeria {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px 11px;
  background: #fff;
  min-height: 68px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.miniatura-galeria {
  position: relative;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  padding: 2px;
  border: 1px solid #dedede;
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.miniatura-galeria:hover {
  transform: translateY(-2px);
  border-color: #777;
}

.miniatura-galeria.miniatura-activa {
  border: 2px solid #222;
  padding: 1px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.miniatura-galeria img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.miniatura-check {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #222;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

@media (max-width: 700px) {
  .miniaturas-galeria {
    gap: 6px;
    padding: 7px 7px 9px;
    min-height: 59px;
  }

  .miniatura-galeria {
    width: 47px;
    height: 47px;
    flex-basis: 47px;
  }
}

        /* =================================================
           ENCABEZADO
        ================================================= */

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
          align-items: center;
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

        /* =================================================
           BOTÓN CARRITO SUPERIOR
        ================================================= */

        .cart-top-button {
          position: relative;
          border: none;
          background: #222;
          color: white;
          height: 46px;
          padding: 0 18px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 15px;
          font-weight: 800;
          transform-origin: center;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .cart-top-button:hover {
          transform: translateY(-1px);
        }

        .cart-top-button.cart-bounce {
          animation: cartBounce 0.45s ease;
        }

        @keyframes cartBounce {
          0% {
            transform: scale(1);
          }

          30% {
            transform: scale(1.14) rotate(-3deg);
          }

          55% {
            transform: scale(0.96) rotate(2deg);
          }

          75% {
            transform: scale(1.06);
          }

          100% {
            transform: scale(1);
          }
        }

        .cart-top-icon {
          font-size: 20px;
          line-height: 1;
        }

        .cart-badge {
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #f47c8c;
          color: white;
          font-size: 12px;
          font-weight: 800;
          transition: transform 0.2s ease;
        }

        .cart-top-button.cart-bounce
        .cart-badge {
          transform: scale(1.2);
        }

        /* =================================================
           FILTROS
        ================================================= */

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

        .search:focus {
          border-color: #aaa;
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

        /* =================================================
           PRODUCTOS
        ================================================= */

        .products {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 20px;
          align-items: start;
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

        /* =================================================
           FOTO DEL PRODUCTO
        ================================================= */

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
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.94
          );
          font-size: 25px;
          cursor: pointer;
          z-index: 4;
          box-shadow:
            0 2px 7px
            rgba(0, 0, 0, 0.08);
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
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
          z-index: 3;
        }

        .dot {
          width: 7px;
          height: 7px;
          background: rgba(
            255,
            255,
            255,
            0.8
          );
          border-radius: 50%;
          box-shadow:
            0 1px 3px
            rgba(0, 0, 0, 0.2);
        }

        .dot-active {
          background: #222;
        }

        .photo-count {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(
            0,
            0,
            0,
            0.62
          );
          color: white;
          font-size: 12px;
          padding: 5px 8px;
          border-radius: 20px;
          z-index: 5;
        }

        /* =================================================
           NUEVO BOTÓN 🛒 DENTRO DE LA FOTO
        ================================================= */

        .image-cart-button {
          position: absolute;
          right: 13px;
          bottom: 13px;
          z-index: 8;

          width: 48px;
          height: 48px;

          border: none;
          border-radius: 50%;

          background: #222;
          color: white;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 21px;
          line-height: 1;

          cursor: pointer;

          box-shadow:
            0 5px 15px
            rgba(0, 0, 0, 0.25);

          transition:
            transform 0.15s ease,
            background 0.15s ease,
            box-shadow 0.15s ease;
        }

        .image-cart-button:hover {
          transform: scale(1.08);
          box-shadow:
            0 7px 18px
            rgba(0, 0, 0, 0.3);
        }

        .image-cart-button:active {
          transform: scale(0.92);
        }

        .image-cart-added {
          background: #318553;
          animation: addButtonSuccess 0.35s ease;
        }

        @keyframes addButtonSuccess {
          0% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.22);
          }

          100% {
            transform: scale(1);
          }
        }

        /* =================================================
           IMAGEN QUE VUELA HACIA EL CARRITO
        ================================================= */

        .flying-product-image {
          position: fixed;
          pointer-events: none;
          z-index: 20000;
          overflow: hidden;
          box-shadow:
            0 8px 25px
            rgba(0, 0, 0, 0.25);
          will-change:
            left,
            top,
            width,
            height,
            opacity,
            transform;
        }

        /* =================================================
           INFORMACIÓN TARJETA
        ================================================= */

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
          margin: 7px 0 18px;
          font-size: 17px;
          line-height: 1.3;
        }

        .price-block {
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid #eee;
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
        }
/* =================================================
   NUEVO DISEÑO DE PRECIOS
================================================= */

.new-prices-wrapper {
  width: 100%;
  margin-top: 10px;
}

/* COSTO + GANANCIA EN UNA SOLA LÍNEA */

.cost-profit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  padding: 8px 10px;

  background: #fafafa;
  border: 1px solid #eeeeee;
  border-radius: 10px 10px 0 0;
}

.cost-inline,
.profit-inline {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.cost-inline span,
.profit-inline span {
  color: #888;
  font-size: 10px;
  white-space: nowrap;
}

.cost-inline strong {
  color: #d97883;
  font-size: 14px;
  white-space: nowrap;
}

.profit-inline strong {
  font-size: 13px;
  white-space: nowrap;
}

/* PRECIO DE VENTA */

.sale-price-box {
  padding: 9px 10px 10px;

  background: #fff;
  border: 1px solid #eeeeee;
  border-top: none;

  border-radius: 0 0 10px 10px;
}

.sale-price-header {
  display: flex;
  align-items: center;
  gap: 5px;

  color: #777;
  font-size: 11px;
}

.sale-edit-button {
  width: 23px;
  height: 23px;

  padding: 0;
  border: none;
  border-radius: 50%;

  background: #eeeeee;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  font-size: 11px;
}

.sale-price-value {
  display: block;

  margin-top: 3px;

  color: #222;

  font-size: 19px;
  line-height: 1.1;
  font-weight: 900;
}

/* EDITOR */

.new-price-editor {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) 32px 32px;

  gap: 5px;

  margin-top: 6px;
}

.new-price-input {
  display: flex;
  align-items: center;

  border: 1px solid #ddd;
  border-radius: 8px;

  background: #fff;
  overflow: hidden;
}

.new-price-input span {
  padding-left: 8px;
  color: #777;
  font-weight: 700;
}

.new-price-input input {
  width: 100%;
  min-width: 0;
  height: 34px;

  border: none;
  outline: none;

  padding: 0 6px;

  font-size: 14px;
  font-weight: 800;
}

.new-save-price,
.new-cancel-price {
  width: 32px;
  height: 34px;

  padding: 0;

  border: none;
  border-radius: 8px;

  cursor: pointer;
  font-weight: 900;
}

.new-save-price {
  background: #318553;
  color: white;
}

.new-cancel-price {
  background: #eeeeee;
  color: #555;
}

.price-error {
  margin: 6px 0 0;
  color: #c43b3b;
  font-size: 10px;
}


/* =================================================
   AJUSTES PARA CELULAR
================================================= */

@media (max-width: 700px) {

  /* Nombre más pequeño */
  .name {
    margin: 5px 0 10px;
    font-size: 13px;
    line-height: 1.25;
  }

  .new-prices-wrapper {
    margin-top: 5px;
  }

  .cost-profit-row {
    padding: 7px 8px;
    gap: 5px;
  }

  .cost-inline,
  .profit-inline {
    gap: 4px;
  }

  .cost-inline span,
  .profit-inline span {
    font-size: 9px;
  }

  .cost-inline strong {
    font-size: 13px;
  }

  .profit-inline strong {
    font-size: 12px;
  }

  .sale-price-box {
    padding: 7px 8px 9px;
  }

  .sale-price-header {
    font-size: 10px;
  }

  .sale-price-value {
    font-size: 18px;
  }

  .sale-edit-button {
    width: 21px;
    height: 21px;
    font-size: 9px;
  }
}/* =================================================
   NUEVO DISEÑO COMPACTO DE PRECIOS
================================================= */

.card-info {
  padding: 14px 16px 16px;
}

/* Ocultamos la referencia porque ya viene
   incluida en el nombre del producto */
.card-info > .reference {
  display: none;
}

/* Nombre del producto más compacto */
.name {
  margin: 3px 0 13px;
  font-size: 15px;
  line-height: 1.25;
  font-weight: 800;
  color: #222;
}

/* Contenedor de precios */
.product-prices-new {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Caja TU COSTO */
.cost-box-new {
  background: #fafafa;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  padding: 10px 12px;
}

/* Etiquetas */
.price-label-new {
  display: block;
  color: #777;
  font-size: 12px;
  line-height: 1.15;
}

/* Tu costo grande y rosado */
.cost-new {
  display: block;
  margin-top: 3px;
  color: #d97883;
  font-size: 23px;
  line-height: 1.05;
  font-weight: 850;
}

/* Caja PRECIO DE VENTA */
.sale-box-new {
  background: #fafafa;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  padding: 10px 12px;
}

/* Precio de venta + lápiz */
.sale-title-new {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Botón del lápiz */
.edit-price-new {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: none;
  border-radius: 50%;
  background: #eeeeee;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

/* Precio de venta */
.sale-price-new {
  display: block;
  margin-top: 2px;
  color: #222;
  font-size: 23px;
  line-height: 1.05;
  font-weight: 850;
}

/* EDICIÓN DEL PRECIO */

.price-editor-new {
  margin-top: 7px;
}

.price-input-new {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 9px;
  padding: 7px 9px;
  background: white;
}

.price-input-new span {
  font-weight: 800;
  font-size: 16px;
}

.price-input-new input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 17px;
  font-weight: 800;
}

.price-editor-actions-new {
  display: flex;
  gap: 6px;
  margin-top: 7px;
}

.save-price-new,
.cancel-price-new {
  border: none;
  border-radius: 8px;
  padding: 7px 9px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.save-price-new {
  background: #222;
  color: white;
}

.cancel-price-new {
  background: #eeeeee;
  color: #555;
}

.price-error-new {
  margin: 6px 0 0;
  color: #b43d3d;
  font-size: 11px;
}


/* =================================================
   AJUSTES ESPECIALES PARA CELULAR
================================================= */

@media (max-width: 700px) {

  .card-info {
    padding: 11px 10px 12px;
  }

  .name {
    margin: 2px 0 10px;
    font-size: 13px;
    line-height: 1.22;
  }

  .product-prices-new {
    gap: 6px;
  }

  .cost-box-new,
  .sale-box-new {
    padding: 8px 9px;
    border-radius: 10px;
  }

  .price-label-new {
    font-size: 10px;
  }

  .cost-new {
    margin-top: 2px;
    font-size: 19px;
  }

  .sale-price-new {
    margin-top: 2px;
    font-size: 19px;
  }

  .edit-price-new {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
    font-size: 11px;
  }

  .price-editor-actions-new {
    flex-direction: column;
  }

  .save-price-new,
  .cancel-price-new {
    width: 100%;
  }
}
        /* =================================================
           VARIANTES
        ================================================= */

        .variants-summary {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #eee;
        }

        .variants-button {
          width: 100%;
          border: none;
          border-radius: 10px;
          background: #222;
          color: white;
          padding: 12px 14px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
        }

        .variants-button-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          padding: 0 8px;
          border-radius: 999px;
          background: white;
          color: #222;
          font-size: 12px;
        }

        .variants-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }

        .variant-card {
          overflow: hidden;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          background: #fff;
        }

        .variant-top {
          display: grid;
          grid-template-columns:
            105px minmax(0, 1fr);
        }

        /* FOTO VARIANTE */

        .variant-image {
          position: relative;
          width: 105px;
          height: 105px;
          background: #f5f5f5;
          overflow: hidden;
          cursor: zoom-in;
        }

        .variant-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .variant-no-image {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #aaa;
          font-size: 12px;
        }

        /* CARRITO DE LA VARIANTE */

        .variant-cart-button {
          position: absolute;
          right: 7px;
          bottom: 7px;
          z-index: 8;

          width: 34px;
          height: 34px;

          border: none;
          border-radius: 50%;

          background: #222;
          color: white;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;

          font-size: 15px;

          box-shadow:
            0 3px 10px
            rgba(0, 0, 0, 0.25);

          transition:
            transform 0.15s ease,
            background 0.15s ease;
        }

        .variant-cart-button:hover {
          transform: scale(1.1);
        }

        .variant-cart-button:active {
          transform: scale(0.9);
        }

        .variant-cart-button.added {
          background: #318553;
        }

        .variant-main-info {
          min-width: 0;
          padding: 12px;
        }

        .variant-name {
          margin: 0;
          font-size: 14px;
          line-height: 1.25;
          text-transform: uppercase;
        }

        .variant-reference {
          margin: 6px 0 0;
          color: #888;
          font-size: 12px;
          font-weight: 700;
        }

        .variant-prices {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          border-top: 1px solid #eee;
        }

        .variant-price-box {
          padding: 10px 8px;
          min-width: 0;
        }

        .variant-price-box +
        .variant-price-box {
          border-left: 1px solid #eee;
        }

        .variant-price-label {
          display: block;
          margin-bottom: 4px;
          color: #777;
          font-size: 10px;
          line-height: 1.2;
        }

        .variant-cost {
          color: #d97883;
          font-size: 13px;
        }

        .variant-retail {
          color: #222;
          font-size: 13px;
        }

        .variant-profit {
          font-size: 13px;
        }

        .empty {
          grid-column: 1 / -1;
          background: white;
          padding: 40px;
          border-radius: 15px;
          text-align: center;
          color: #666;
        }

        /* =================================================
           MENÚ CATEGORÍAS
        ================================================= */

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(
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
          width: min(340px, 88vw);
          height: 100vh;
          background: white;
          z-index: 9999;
          padding: 24px 18px;
          overflow-y: auto;
          box-shadow:
            6px 0 30px
            rgba(0, 0, 0, 0.18);
        }

        .menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
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

        /* =================================================
           VISOR DE IMÁGENES
        ================================================= */

        .viewer {
          position: fixed;
          inset: 0;
          background: rgba(
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
          transform: translateY(-50%);
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
          transform: translateX(-50%);
          color: white;
          background: rgba(
            0,
            0,
            0,
            0.6
          );
          padding: 7px 12px;
          border-radius: 20px;
        }

        /* =================================================
           CARRITO LATERAL
        ================================================= */

        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(
            0,
            0,
            0,
            0.42
          );
          z-index: 11000;
        }

        .cart-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: min(470px, 100vw);
          height: 100vh;
          background: white;
          z-index: 11001;
          display: flex;
          flex-direction: column;
          box-shadow:
            -8px 0 35px
            rgba(0, 0, 0, 0.16);
        }

        .cart-header {
          flex-shrink: 0;
          padding: 22px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-header h2 {
          margin: 0;
          font-size: 25px;
        }

        .cart-header p {
          margin: 5px 0 0;
          color: #777;
          font-size: 13px;
        }

        .cart-close {
          width: 40px;
          height: 40px;
          border: none;
          background: #f5f5f5;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        }

        .cart-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 35px;
        }

        .cart-empty-icon {
          font-size: 50px;
        }

        .cart-empty h3 {
          margin: 15px 0 5px;
        }

        .cart-empty p {
          margin: 0;
          color: #777;
        }

        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 10px 20px;
        }

        .cart-item {
          padding: 16px 0;
          border-bottom: 1px solid #eee;
        }

        .cart-item-top {
          display: grid;
          grid-template-columns:
            76px minmax(0, 1fr) 32px;
          gap: 12px;
          align-items: start;
        }

        .cart-item-image {
          width: 76px;
          height: 76px;
          border-radius: 10px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .cart-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .cart-no-image {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #999;
          font-size: 10px;
        }

        .cart-item-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cart-item-info strong {
          font-size: 14px;
        }

        .cart-variant {
          color: #d97883;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .cart-reference {
          color: #888;
          font-size: 12px;
        }

        .cart-unit-price {
          color: #222;
          font-size: 13px;
          font-weight: 700;
        }

        .cart-delete {
          width: 30px;
          height: 30px;
          border: none;
          background: #f6f6f6;
          border-radius: 50%;
          cursor: pointer;
          color: #888;
        }

        .cart-item-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          padding-left: 88px;
        }

        .quantity-control {
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 9px;
          overflow: hidden;
        }

        .quantity-control button {
          width: 34px;
          height: 34px;
          border: none;
          background: #fafafa;
          cursor: pointer;
          font-size: 18px;
        }

        .quantity-control strong {
          width: 38px;
          text-align: center;
          font-size: 14px;
        }

        .cart-subtotal {
          font-size: 15px;
        }

        .cart-footer {
          flex-shrink: 0;
          padding: 20px;
          border-top: 1px solid #ddd;
          background: white;
        }

        .cart-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 8px;
          color: #666;
        }

        .cart-summary-row.total {
          margin-top: 13px;
          padding-top: 13px;
          border-top: 1px solid #eee;
          color: #222;
          font-size: 19px;
        }

        .send-order-button {
          width: 100%;
          border: none;
          background: #222;
          color: white;
          padding: 15px;
          border-radius: 11px;
          margin-top: 14px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 800;
        }

        .empty-cart-button {
          width: 100%;
          border: none;
          background: transparent;
          color: #999;
          padding: 11px;
          margin-top: 5px;
          cursor: pointer;
          font-size: 13px;
        }
/* =================================================
   RESUMEN FLOTANTE DEL CARRITO
================================================= */

.floating-cart-summary {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);

  width: calc(100% - 36px);
  max-width: 760px;

  min-height: 82px;
  padding: 18px 26px;

  border: none;
  border-radius: 22px;

  background: #111;
  color: #fff;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  z-index: 10500;

  cursor: pointer;

  box-shadow:
    0 14px 40px rgba(0, 0, 0, 0.28);

  animation:
    floatingCartIn 0.35s
    cubic-bezier(.2,.8,.2,1);
}

.floating-cart-left {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.floating-cart-icon {
  font-size: 28px;
  line-height: 1;
}

.floating-cart-left strong {
  font-size: 20px;
  font-weight: 800;
  white-space: nowrap;
}

.floating-cart-total {
  font-size: 24px;
  font-weight: 900;
  white-space: nowrap;
}

@keyframes floatingCartIn {
  from {
    opacity: 0;
    transform:
      translate(-50%, 30px)
      scale(0.96);
  }

  to {
    opacity: 1;
    transform:
      translate(-50%, 0)
      scale(1);
  }
}

@media (max-width: 700px) {
  .floating-cart-summary {
    width: calc(100% - 28px);
    bottom: 20px;
    min-height: 72px;

    padding: 15px 18px;
    border-radius: 20px;
  }

  .floating-cart-icon {
    font-size: 23px;
  }

  .floating-cart-left {
    gap: 9px;
  }

  .floating-cart-left strong {
    font-size: 17px;
  }

  .floating-cart-total {
    font-size: 19px;
  }
}
        /* =================================================
           RESPONSIVE
        ================================================= */

        @media (max-width: 1000px) {
          .products {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .products {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 11px;
          }

          .page {
            padding: 18px 12px 50px;
          }

          .top h1 {
            font-size: 27px;
          }

          .filter-area {
            grid-template-columns: 1fr;
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

          .top {
            align-items: flex-start;
          }

          .top-buttons {
            width: 100%;
          }

          .cart-top-button {
            flex: 1;
          }

          .image-cart-button {
            width: 44px;
            height: 44px;
            right: 10px;
            bottom: 10px;
            font-size: 19px;
          }

          .variant-top {
            grid-template-columns:
              80px minmax(0, 1fr);
          }

          .variant-image {
            width: 80px;
            height: 80px;
          }

          .variant-main-info {
            padding: 9px;
          }

          .variant-name {
            font-size: 12px;
          }

          .variant-prices {
            grid-template-columns: 1fr;
          }

          .variant-price-box +
          .variant-price-box {
            border-left: none;
            border-top: 1px solid #eee;
          }

          .variant-price-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
          }

          .variant-price-label {
            margin-bottom: 0;
          }

          .variant-cart-button {
            width: 31px;
            height: 31px;
            right: 5px;
            bottom: 5px;
            font-size: 13px;
          }

          .cart-panel {
            width: 100%;
          }

          .cart-item-bottom {
            padding-left: 0;
          }
        }
      `}</style>

      {/* ===================================================
          MENÚ DE CATEGORÍAS
      =================================================== */}

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

      {/* ===================================================
          VISOR DE IMÁGENES
      =================================================== */}

      <VisorImagen
        visor={visor}
        cerrar={cerrarImagen}
        anterior={imagenAnterior}
        siguiente={imagenSiguiente}
      />

      {/* ===================================================
          CARRITO LATERAL
      =================================================== */}

      <Carrito
        abierto={carritoAbierto}
        cerrar={() =>
          setCarritoAbierto(false)
        }
        carrito={carrito}
        aumentar={aumentarCantidad}
        disminuir={disminuirCantidad}
        eliminar={eliminarDelCarrito}
        vaciar={vaciarCarrito}
      />
{/* ===================================================
    RESUMEN FLOTANTE DEL CARRITO
=================================================== */}

{mostrarResumenFlotante &&
  totalUnidades > 0 &&
  !carritoAbierto && (
    <button
      type="button"
      className="floating-cart-summary"
      onClick={() => {
        setMostrarResumenFlotante(false);
        setCarritoAbierto(true);
      }}
    >
      <div className="floating-cart-left">
        <span className="floating-cart-icon">
          🛍️
        </span>

        <strong>
          {totalUnidades}{" "}
          {totalUnidades === 1
            ? "producto"
            : "productos"}
        </strong>
      </div>

      <strong className="floating-cart-total">
        {formatoPrecio(totalCarrito)}
      </strong>
    </button>
  )}
      {/* ===================================================
          PÁGINA
      =================================================== */}

      <main className="page">
        <div className="container">

          {/* ENCABEZADO */}

          <div className="top">
            <div>
              <h1>
                Productos y precios
              </h1>

              <p>
                Consulta tu costo, precio sugerido y arma tu pedido.
              </p>
            </div>

            <div className="top-buttons">
              <button
                ref={cartButtonRef}
                type="button"
                className={
                  carritoAnimando
                    ? "cart-top-button cart-bounce"
                    : "cart-top-button"
                }
                onClick={() =>
                  setCarritoAbierto(true)
                }
              >
                <span className="cart-top-icon">
                  🛒
                </span>

                <span>Mi pedido</span>

                <span className="cart-badge">
                  {totalUnidades}
                </span>
              </button>

              <button
                type="button"
                className="button"
                onClick={() =>
                  router.push("/admin")
                }
              >
                ← Volver
              </button>
            </div>
          </div>

          {/* BUSCADOR */}

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
              placeholder="Buscar por referencia, producto o variante..."
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
              Tu costo es el precio que pagas por el producto. El precio sugerido es el valor recomendado para venderlo a tus clientes. También puedes agregar los productos directamente a tu pedido.
            </p>
          </div>

          {/* RESUMEN DEL PEDIDO */}

          {totalUnidades > 0 && (
            <div
              style={{
                background: "#fff",
                border:
                  "1px solid #eee",
                borderRadius: "12px",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <span>
                🛒 Tienes{" "}
                <strong>
                  {totalUnidades}
                </strong>{" "}
                unidades en tu pedido
              </span>

              <strong>
                Total:{" "}
                {formatoPrecio(
                  totalCarrito
                )}
              </strong>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div
              style={{
                background: "#ffeaea",
                color: "#a33",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* =================================================
              PRODUCTOS
          ================================================= */}

          <section className="products">
            {productosFiltrados.length ===
            0 ? (
              <div className="empty">
                No encontramos productos con estos filtros.
              </div>
            ) : (
              productosFiltrados.map(
                (producto) => {
                  const variantes =
                    Array.isArray(
                      producto.variantes
                    )
                      ? producto.variantes
                      : [];

                  const tieneVariantes =
                    producto.tiene_variantes ===
                      true &&
                    variantes.length > 0;

                  const primeraVariante =
                    tieneVariantes
                      ? variantes[0]
                      : null;

                  const productoVisual =
                    primeraVariante
                      ? {
                          ...producto,

                          foto_url:
                            primeraVariante.foto_url ||
                            producto.foto_url,

                          foto_url_2:
                            primeraVariante.foto_url_2 ||
                            producto.foto_url_2,
                        }
                      : producto;

                  const costoPrincipal =
                    primeraVariante
                      ? Number(
                          primeraVariante.costo ||
                            0
                        )
                      : Number(
                          producto.costo || 0
                        );

                  const precioPrincipal =
                    primeraVariante
                      ? Number(
                          primeraVariante.precio_detal ||
                            0
                        )
                      : Number(
                          producto.precio_detal ||
                            0
                        );

                  const abiertas =
                    variantesAbiertas[
                      producto.id
                    ] === true;

                  const claveNormal =
                    claveProducto(
                      producto.id
                    );

                  return (
                    <article
                      key={producto.id}
                      className="card"
                    >
                      {/* FOTO PRINCIPAL */}

                      <GaleriaProducto
                        producto={
                          productoVisual
                        }
                        abrirImagen={
                          abrirImagen
                        }
                        tieneVariantes={
                          tieneVariantes
                        }
                        agregado={
                          !tieneVariantes &&
                          agregadoReciente ===
                            claveNormal
                        }
                        onAgregar={(
                          datosEvento
                        ) =>
                          manejarCarritoProducto(
                            producto,
                            datosEvento
                          )
                        }
                      />

                      <div className="card-info">
                        
                        <h2 className="name">
                          {producto.nombre}
                        </h2>

                        {/* ================================
                            PRODUCTO NORMAL
                        ================================ */}

                        {!tieneVariantes && (
                          <BloquePrecios
  costo={costoPrincipal}
  precio={precioPrincipal}
  productoId={producto.id}
  varianteId={null}
  onPrecioActualizado={(nuevoPrecio) =>
    actualizarPrecioPersonalizado(
      producto.id,
      null,
      nuevoPrecio
    )
  }
/>
                        )}

                        {/* ================================
                            PRODUCTO CON VARIANTES
                        ================================ */}

                        {tieneVariantes && (
                          <>
                            <div className="variants-summary">
                              <button
                                type="button"
                                className="variants-button"
                                onClick={() =>
                                  alternarVariantes(
                                    producto.id
                                  )
                                }
                              >
                                <span>
                                  {abiertas
                                    ? "Ocultar variantes"
                                    : "Ver variantes"}
                                </span>

                                <span className="variants-button-count">
                                  {
                                    variantes.length
                                  }
                                </span>
                              </button>
                            </div>

                            {abiertas && (
                              <div
                                id={`variantes-${producto.id}`}
                                className="variants-container"
                              >
                                {variantes.map(
                                  (
                                    variante
                                  ) => {
                                    const costo =
                                      Number(
                                        variante.costo ||
                                          0
                                      );

                                    const precio =
                                      Number(
                                        variante.precio_detal ||
                                          0
                                      );

                                    const ganancia =
                                      precio -
                                      costo;

                                    const imagenesVariante =
                                      [
                                        variante.foto_url,
                                        variante.foto_url_2,
                                      ].filter(
                                        Boolean
                                      );

                                    const claveVariante =
                                      claveProducto(
                                        producto.id,
                                        variante.id
                                      );

                                    return (
                                      <div
                                        key={
                                          variante.id
                                        }
                                        className="variant-card"
                                      >
                                        <div className="variant-top">

                                          {/* FOTO VARIANTE */}

                                          <div
                                            className="variant-image"
                                            onClick={() => {
                                              if (
                                                imagenesVariante.length >
                                                0
                                              ) {
                                                abrirImagen(
                                                  imagenesVariante,
                                                  0,
                                                  `${producto.nombre} - ${variante.nombre_variante}`
                                                );
                                              }
                                            }}
                                          >
                                            {variante.foto_url ? (
                                              <img
                                                src={
                                                  variante.foto_url
                                                }
                                                alt={
                                                  variante.nombre_variante
                                                }
                                              />
                                            ) : (
                                              <div className="variant-no-image">
                                                Sin imagen
                                              </div>
                                            )}

                                            {/* CARRITO VARIANTE */}

                                            <button
                                              type="button"
                                              className={
                                                agregadoReciente ===
                                                claveVariante
                                                  ? "variant-cart-button added"
                                                  : "variant-cart-button"
                                              }
                                              title="Agregar esta variante al pedido"
                                              onClick={(
                                                e
                                              ) => {
                                                e.preventDefault();
                                                e.stopPropagation();

                                                const contenedor =
                                                  e.currentTarget.closest(
                                                    ".variant-image"
                                                  );

                                                const imagen =
                                                  contenedor?.querySelector(
                                                    "img"
                                                  );

                                                agregarVariante(
                                                  producto,
                                                  variante,
                                                  imagen ||
                                                    null
                                                );
                                              }}
                                            >
                                              {agregadoReciente ===
                                              claveVariante
                                                ? "✓"
                                                : "🛒"}
                                            </button>
                                          </div>

                                          {/* INFO VARIANTE */}

                                          <div className="variant-main-info">
                                            <h3 className="variant-name">
                                              {
                                                variante.nombre_variante
                                              }
                                            </h3>

                                            <p className="variant-reference">
                                              Ref.{" "}
                                              {variante.referencia ||
                                                "Sin referencia"}
                                            </p>
                                          </div>
                                        </div>

                                        {/* PRECIOS VARIANTE */}

                                        <div className="variant-prices">
                                          <div className="variant-price-box">
                                            <span className="variant-price-label">
                                              Tu costo
                                            </span>

                                            <strong className="variant-cost">
                                              {formatoPrecio(
                                                costo
                                              )}
                                            </strong>
                                          </div>

                                          <div className="variant-price-box">
                                            <span className="variant-price-label">
                                              Precio sugerido
                                            </span>

                                            <strong className="variant-retail">
                                              {formatoPrecio(
                                                precio
                                              )}
                                            </strong>
                                          </div>

                                          <div className="variant-price-box">
                                            <span className="variant-price-label">
                                              Ganancia
                                            </span>

                                            <strong
                                              className="variant-profit"
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
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </>
                        )}
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
