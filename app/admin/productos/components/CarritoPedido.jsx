"use client";

import { useState } from "react";
import FotoOptimizada from "../../../components/FotoOptimizada";
import { formatoPrecio } from "../../../../lib/catalogo/formatos.mjs";

export default function Carrito({
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
                          <FotoOptimizada
         width={128} height={128} sizes="80px" quality={80} loading="lazy"
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
