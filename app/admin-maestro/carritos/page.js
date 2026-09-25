"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CarritosMaestroPage() {
  const router = useRouter();

  const [carritos, setCarritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [abierto, setAbierto] = useState(null);
const [editando, setEditando] = useState(null);
const [carritoEditado, setCarritoEditado] = useState(null);
const [guardandoCambios, setGuardandoCambios] = useState(false);
const [ciudadesEnvio, setCiudadesEnvio] = useState([]);
const [busquedaCiudadEditar, setBusquedaCiudadEditar] =
  useState("");
 useEffect(() => {
  cargarCarritos();
  cargarCiudades();

  const intervalo = setInterval(() => {
    cargarCarritos(false);
  }, 15000);

  return () => clearInterval(intervalo);
}, []);
async function cargarCiudades() {
  try {
    const response = await fetch(
      "/api/ciudades-envio",
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "No se pudieron cargar las ciudades."
      );
    }

    setCiudadesEnvio(
      Array.isArray(data?.ciudades)
        ? data.ciudades
        : []
    );
  } catch (error) {
    console.error(
      "Error cargando ciudades:",
      error
    );

    setCiudadesEnvio([]);
  }
}
  async function cargarCarritos(mostrarCarga = true) {
    if (mostrarCarga) {
      setCargando(true);
    }

    try {
      const response = await fetch(
        "/api/admin-maestro/carritos",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/admin");
        return;
      }

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No pudimos cargar los carritos."
        );
      }

      setCarritos(
        Array.isArray(data.carritos)
          ? data.carritos
          : []
      );

      setMensaje("");
    } catch (error) {
      console.error(error);

      setMensaje(
        error.message ||
          "No pudimos cargar los carritos."
      );
    } finally {
      setCargando(false);
    }
  }
function iniciarEdicion(carrito) {
  const ciudadActual =
    ciudadesEnvio.find(
      (ciudad) =>
        normalizarTexto(
          ciudad.ciudad_departamento
        ) ===
        normalizarTexto(
          carrito.ciudad
        )
    ) || null;

  setEditando(carrito.id);

  setCarritoEditado({
    ...carrito,

    ciudad_id:
      ciudadActual?.ciudad_id || "",

    productos: Array.isArray(carrito.productos)
      ? carrito.productos.map((producto) => ({
          ...producto,
        }))
      : [],
  });

  setBusquedaCiudadEditar(
    carrito.ciudad || ""
  );
}

function cancelarEdicion() {
  setEditando(null);
  setCarritoEditado(null);
}
  async function guardarCambiosCarrito() {
  if (
    guardandoCambios ||
    !carritoEditado
  ) {
    return;
  }

  if (
    busquedaCiudadEditar.trim() &&
    !carritoEditado.ciudad_id
  ) {
    window.alert(
      "Selecciona la ciudad correcta de la lista antes de guardar."
    );

    return;
  }

  try {
    setGuardandoCambios(true);
    setMensaje("");

    const response = await fetch(
      "/api/admin-maestro/editar-carrito",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          carrito_id:
            carritoEditado.id,

          nombre_cliente:
            carritoEditado.nombre_cliente ||
            "",

          cedula_cliente:
            carritoEditado.cedula_cliente ||
            "",

          telefono_cliente:
            carritoEditado.telefono_cliente ||
            "",

          correo_cliente:
            carritoEditado.correo_cliente ||
            "",

          direccion_cliente:
            carritoEditado.direccion_cliente ||
            "",

          ciudad_id:
            carritoEditado.ciudad_id ||
            "",

          forma_pago:
            carritoEditado.forma_pago ||
            "",

          estado:
            carritoEditado.estado ||
            "EN_PROCESO",

          productos:
            carritoEditado.productos || [],
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
          "No se pudieron guardar los cambios."
      );
    }

    setEditando(null);
    setCarritoEditado(null);
    setBusquedaCiudadEditar("");

    await cargarCarritos(false);

    window.alert(
      "✅ Carrito actualizado correctamente."
    );
  } catch (error) {
    console.error(
      "Error guardando carrito:",
      error
    );

    window.alert(
      `❌ No se pudieron guardar los cambios.\n\n${
        error.message ||
        "Error desconocido."
      }`
    );
  } finally {
    setGuardandoCambios(false);
  }
}
async function reenviarAMake(carrito) {
  const confirmar = window.confirm(
    `¿Seguro que quieres reenviar este pedido a Make?\n\n` +
      `Cliente: ${carrito.nombre_cliente || "Sin nombre"}\n` +
      `Valor del carrito: ${dinero(carrito.subtotal)}\n\n` +
      `Se generará un NUEVO número de pedido.`
  );

  if (!confirmar) return;

  try {
    setMensaje("");

    const response = await fetch(
      "/api/admin-maestro/reenviar-carrito",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          carrito_id: carrito.id,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
          "No se pudo reenviar el pedido."
      );
    }

    window.alert(
      `✅ Pedido enviado nuevamente a Make.\n\n` +
        `Nuevo pedido: #${data.numero_pedido}\n` +
        `Total: ${dinero(data.total_pedido)}`
    );
  } catch (error) {
    console.error(
      "Error reenviando pedido:",
      error
    );

    window.alert(
      `❌ No se pudo reenviar el pedido.\n\n${
        error.message || "Error desconocido."
      }`
    );
  }
}
  function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
  function dinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(valor || 0));
  }

  function fecha(valor) {
    if (!valor) return "—";

    try {
      return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Bogota",
      }).format(new Date(valor));
    } catch {
      return valor;
    }
  }

  function estadoVisual(estado) {
    if (estado === "COMPLETADO") {
      return {
        texto: "✅ Completado",
        fondo: "#e8f8ee",
        color: "#18763b",
      };
    }

    if (estado === "CHECKOUT") {
      return {
        texto: "🟣 Llenando datos",
        fondo: "#f2edff",
        color: "#6335a5",
      };
    }

    if (estado === "ABANDONADO") {
      return {
        texto: "⚠️ Abandonado",
        fondo: "#fff2e2",
        color: "#a55b00",
      };
    }

    return {
      texto: "🛒 Armando carrito",
      fondo: "#eef6ff",
      color: "#1769aa",
    };
  }

  if (cargando) {
    return (
      <main style={pagina}>
        <div style={contenedor}>
          <p>Cargando carritos...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={pagina}>
      <div style={contenedor}>
        <button
          type="button"
          onClick={() => router.push("/admin-maestro")}
          style={botonVolver}
        >
          ← Volver al panel maestro
        </button>

        <div style={encabezado}>
          <div>
            <div style={etiqueta}>
              ADMINISTRADOR MAESTRO
            </div>

            <h1 style={titulo}>
              🛒 Carritos en vivo
            </h1>

            <p style={descripcion}>
              Observa los pedidos que los clientes están
              comenzando y los que ya completaron.
            </p>
          </div>

          <button
            type="button"
            onClick={() => cargarCarritos()}
            style={botonActualizar}
          >
            ↻ Actualizar
          </button>
        </div>

        {mensaje && (
          <div style={error}>
            {mensaje}
          </div>
        )}

        <div style={resumen}>
          <div style={resumenCaja}>
            <strong style={numeroResumen}>
              {carritos.filter(
                (c) => c.estado === "EN_PROCESO"
              ).length}
            </strong>
            <span>Armando carrito</span>
          </div>

          <div style={resumenCaja}>
            <strong style={numeroResumen}>
              {carritos.filter(
                (c) => c.estado === "CHECKOUT"
              ).length}
            </strong>
            <span>Llenando datos</span>
          </div>

          <div style={resumenCaja}>
            <strong style={numeroResumen}>
              {carritos.filter(
                (c) => c.estado === "COMPLETADO"
              ).length}
            </strong>
            <span>Completados</span>
          </div>
        </div>

        {carritos.length === 0 ? (
          <div style={vacio}>
            <div style={{ fontSize: "42px" }}>
              🛒
            </div>

            <h2>No hay carritos todavía</h2>

            <p style={{ color: "#777" }}>
              Cuando alguien agregue productos en la tienda,
              aparecerá aquí.
            </p>
          </div>
        ) : (
          <div style={lista}>
            {carritos.map((carrito) => {
              const visual = estadoVisual(
                carrito.estado
              );

              const productos = Array.isArray(
                carrito.productos
              )
                ? carrito.productos
                : [];

              const estaAbierto =
                abierto === carrito.id;
const estaEditando =
  editando === carrito.id;
              return (
                <article
                  key={carrito.id}
                  style={tarjeta}
                >
                  <div style={filaSuperior}>
                    <div>
                      <span
                        style={{
                          ...estado,
                          background: visual.fondo,
                          color: visual.color,
                        }}
                      >
                        {visual.texto}
                      </span>

                      <h2 style={nombre}>
                        {carrito.nombre_cliente ||
                          "Cliente todavía sin identificar"}
                      </h2>

                      <div style={datos}>
                        {carrito.telefono_cliente && (
                          <span>
                            📱{" "}
                            {carrito.telefono_cliente}
                          </span>
                        )}

                        {carrito.ciudad && (
                          <span>
                            📍 {carrito.ciudad}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={total}>
                      {dinero(carrito.subtotal)}
                    </div>
                  </div>

                  <div style={info}>
                    <span>
                      🛍️{" "}
                      {carrito.cantidad_productos || 0}{" "}
                      unidades
                    </span>

                    <span>
                      🕐 Última actividad:{" "}
                      {fecha(
                        carrito.ultima_actividad
                      )}
                    </span>

                    {carrito.forma_pago && (
                      <span>
                        💳 {carrito.forma_pago}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAbierto(
                        estaAbierto
                          ? null
                          : carrito.id
                      )
                    }
                    style={botonDetalle}
                  >
                    {estaAbierto
                      ? "Ocultar detalles"
                      : "Ver carrito"}
                  </button>

                  {estaAbierto && (
                    <div style={detalle}>
                    
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  }}
>
  <h3 style={{ margin: 0 }}>
    Datos del cliente
  </h3>

  {!estaEditando && (
    <button
      type="button"
      onClick={() =>
        iniciarEdicion(carrito)
      }
      style={{
        border: "1px solid #ddd",
        background: "white",
        padding: "9px 13px",
        borderRadius: "9px",
        fontWeight: "700",
        cursor: "pointer",
      }}
    >
      ✏️ Editar
    </button>
  )}
</div>

{estaEditando ? (
  <div
    style={{
      display: "grid",
      gap: "13px",
    }}
  >
    <label>
      <div style={etiquetaCampo}>
        Nombre
      </div>

      <input
        type="text"
        value={
          carritoEditado?.nombre_cliente ||
          ""
        }
        onChange={(e) =>
          setCarritoEditado((actual) => ({
            ...actual,
            nombre_cliente:
              e.target.value,
          }))
        }
        style={campoEdicion}
      />
    </label>

    <label>
      <div style={etiquetaCampo}>
        Cédula
      </div>

      <input
        type="text"
        value={
          carritoEditado?.cedula_cliente ||
          ""
        }
        onChange={(e) =>
          setCarritoEditado((actual) => ({
            ...actual,
            cedula_cliente:
              e.target.value,
          }))
        }
        style={campoEdicion}
      />
    </label>

    <label>
      <div style={etiquetaCampo}>
        WhatsApp
      </div>

      <input
        type="text"
        value={
          carritoEditado
            ?.telefono_cliente || ""
        }
        onChange={(e) =>
          setCarritoEditado((actual) => ({
            ...actual,
            telefono_cliente:
              e.target.value,
          }))
        }
        style={campoEdicion}
      />
    </label>

    <label>
      <div style={etiquetaCampo}>
        Correo
      </div>

      <input
        type="email"
        value={
          carritoEditado?.correo_cliente ||
          ""
        }
        onChange={(e) =>
          setCarritoEditado((actual) => ({
            ...actual,
            correo_cliente:
              e.target.value,
          }))
        }
        style={campoEdicion}
      />
    </label>

    <label>
      <div style={etiquetaCampo}>
        Dirección
      </div>

      <input
        type="text"
        value={
          carritoEditado
            ?.direccion_cliente || ""
        }
        onChange={(e) =>
          setCarritoEditado((actual) => ({
            ...actual,
            direccion_cliente:
              e.target.value,
          }))
        }
        style={campoEdicion}
      />
    </label>

   <div>
  <div style={etiquetaCampo}>
    Ciudad
  </div>

  <input
    type="text"
    value={busquedaCiudadEditar}
    onChange={(e) => {
      const valor = e.target.value;

      setBusquedaCiudadEditar(valor);

      setCarritoEditado((actual) => ({
        ...actual,
        ciudad_id: "",
        ciudad: valor,
      }));
    }}
    placeholder="Buscar ciudad..."
    autoComplete="off"
    style={campoEdicion}
  />

  {busquedaCiudadEditar.trim() &&
    !carritoEditado?.ciudad_id && (
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "white",
          maxHeight: "220px",
          overflowY: "auto",
          marginTop: "6px",
        }}
      >
        {ciudadesEnvio
          .filter((ciudad) =>
            normalizarTexto(
              ciudad.ciudad_departamento
            ).includes(
              normalizarTexto(
                busquedaCiudadEditar
              )
            )
          )
          .slice(0, 20)
          .map((ciudad) => (
            <button
              key={ciudad.ciudad_id}
              type="button"
              onClick={() => {
                setCarritoEditado(
                  (actual) => ({
                    ...actual,

                    ciudad_id:
                      ciudad.ciudad_id,

                    ciudad:
                      ciudad.ciudad_departamento,
                  })
                );

                setBusquedaCiudadEditar(
                  ciudad.ciudad_departamento
                );
              }}
              style={{
                width: "100%",
                border: "none",
                borderBottom:
                  "1px solid #eee",
                background: "white",
                padding: "11px 12px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              📍{" "}
              {ciudad.ciudad_departamento}
            </button>
          ))}
      </div>
    )}

  {carritoEditado?.ciudad_id && (
    <div
      style={{
        marginTop: "6px",
        color: "#18763b",
        fontSize: "13px",
        fontWeight: "700",
      }}
    >
      ✓ Ciudad seleccionada correctamente
    </div>
  )}
</div>

<label>
  <div style={etiquetaCampo}>
    Forma de pago
  </div>

  <select
    value={
      carritoEditado?.forma_pago ||
      ""
    }
    onChange={(e) =>
      setCarritoEditado((actual) => ({
        ...actual,
        forma_pago:
          e.target.value,
      }))
    }
    style={campoEdicion}
  >
    <option value="">
      Sin seleccionar
    </option>

    <option value="CONTRA_ENTREGA">
      Contra entrega
    </option>

    <option value="TRANSFERENCIA">
      Transferencia
    </option>
  </select>
</label>

<label>
  <div style={etiquetaCampo}>
    Estado del carrito
  </div>

  <select
    value={
      carritoEditado?.estado ||
      "EN_PROCESO"
    }
    onChange={(e) =>
      setCarritoEditado((actual) => ({
        ...actual,
        estado:
          e.target.value,
      }))
    }
    style={campoEdicion}
  >
    <option value="EN_PROCESO">
      🛒 Armando carrito
    </option>

    <option value="CHECKOUT">
      🟣 Llenando datos
    </option>

    <option value="COMPLETADO">
      ✅ Completado
    </option>

    <option value="ABANDONADO">
      ⚠️ Abandonado
    </option>
  </select>
</label>

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "10px",
    marginTop: "5px",
  }}
>
  <button
    type="button"
    onClick={cancelarEdicion}
    disabled={guardandoCambios}
    style={{
      border: "1px solid #ddd",
      background: "white",
      padding: "12px",
      borderRadius: "10px",
      fontWeight: "700",
      cursor: "pointer",
    }}
  >
    Cancelar
  </button>

  <button
    type="button"
    onClick={guardarCambiosCarrito}
    disabled={guardandoCambios}
    style={{
      border: "none",
      background: "#d97883",
      color: "white",
      padding: "12px",
      borderRadius: "10px",
      fontWeight: "800",
      cursor: guardandoCambios
        ? "not-allowed"
        : "pointer",
      opacity:
        guardandoCambios
          ? 0.6
          : 1,
    }}
  >
    {guardandoCambios
      ? "Guardando..."
      : "💾 Guardar cambios"}
  </button>
</div>


  </div>
) : (
  <div style={datosCliente}>
    <div>
      <strong>Nombre:</strong>{" "}
      {carrito.nombre_cliente ||
        "Sin registrar"}
    </div>

    <div>
      <strong>Cédula:</strong>{" "}
      {carrito.cedula_cliente ||
        "Sin registrar"}
    </div>

    <div>
      <strong>WhatsApp:</strong>{" "}
      {carrito.telefono_cliente ||
        "Sin registrar"}
    </div>

    <div>
      <strong>Correo:</strong>{" "}
      {carrito.correo_cliente ||
        "Sin registrar"}
    </div>

    <div>
      <strong>Dirección:</strong>{" "}
      {carrito.direccion_cliente ||
        "Sin registrar"}
    </div>

    <div>
      <strong>Ciudad:</strong>{" "}
      {carrito.ciudad ||
        "Sin registrar"}
    </div>
  </div>
)}
                      <h3>
                        Productos
                      </h3>
<button
  type="button"
  onClick={() => reenviarAMake(carrito)}
  style={{
    width: "100%",
    border: "none",
    background: "#111",
    color: "white",
    padding: "14px 16px",
    borderRadius: "11px",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    marginTop: "10px",
    marginBottom: "18px",
  }}
>
  🔄 Reenviar pedido a Make
</button>
                      {productos.length === 0 ? (
                        <p>
                          No hay productos registrados.
                        </p>
                      ) : (
                        <div>
                          {productos.map(
                            (producto, index) => (
                              <div
                                key={`${carrito.id}-${index}`}
                                style={productoFila}
                              >
                                <div>
                                  <strong>
                                    {producto.referencia ||
                                      "Sin referencia"}
                                  </strong>

                                  <div
                                    style={{
                                      color: "#666",
                                      marginTop: "3px",
                                    }}
                                  >
                                    {producto.nombre ||
                                      "Producto"}
                                  </div>

                                  {producto.variante && (
                                    <div
                                      style={{
                                        color: "#888",
                                        fontSize: "13px",
                                        marginTop: "3px",
                                      }}
                                    >
                                      {
                                        producto.variante
                                      }
                                    </div>
                                  )}
                                </div>

                                <div
                                  style={{
                                    textAlign: "right",
                                  }}
                                >
                                  <strong>
                                    x
                                    {producto.cantidad ||
                                      1}
                                  </strong>

                                  <div
                                    style={{
                                      marginTop: "4px",
                                    }}
                                  >
                                    {dinero(
                                      producto.subtotal ||
                                        Number(
                                          producto.precio ||
                                            producto.precio_unitario ||
                                            0
                                        ) *
                                          Number(
                                            producto.cantidad ||
                                              1
                                          )
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f6f7f9",
  padding: "24px 14px 60px",
};

const contenedor = {
  maxWidth: "1000px",
  margin: "0 auto",
};

const botonVolver = {
  border: "none",
  background: "transparent",
  padding: "8px 0",
  marginBottom: "12px",
  fontSize: "15px",
  cursor: "pointer",
};

const encabezado = {
  background: "#111",
  color: "white",
  padding: "25px",
  borderRadius: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
};

const etiqueta = {
  display: "inline-block",
  background: "#d97883",
  padding: "6px 11px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "800",
  marginBottom: "10px",
};

const titulo = {
  margin: 0,
  fontSize: "29px",
};

const descripcion = {
  marginBottom: 0,
  color: "#ccc",
  lineHeight: 1.5,
};

const botonActualizar = {
  border: "1px solid #444",
  background: "#222",
  color: "white",
  padding: "12px 16px",
  borderRadius: "11px",
  cursor: "pointer",
};

const resumen = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const resumenCaja = {
  background: "white",
  borderRadius: "16px",
  padding: "17px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  boxShadow: "0 5px 20px rgba(0,0,0,.05)",
};

const numeroResumen = {
  fontSize: "25px",
};

const lista = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
};

const tarjeta = {
  background: "white",
  borderRadius: "18px",
  padding: "19px",
  boxShadow: "0 5px 22px rgba(0,0,0,.06)",
};

const filaSuperior = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
};

const estado = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
};

const nombre = {
  margin: "10px 0 5px",
  fontSize: "19px",
};

const datos = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  color: "#777",
  fontSize: "14px",
};

const total = {
  fontWeight: "900",
  fontSize: "20px",
  whiteSpace: "nowrap",
};

const info = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px 18px",
  marginTop: "16px",
  paddingTop: "14px",
  borderTop: "1px solid #eee",
  color: "#666",
  fontSize: "14px",
};

const botonDetalle = {
  width: "100%",
  marginTop: "15px",
  border: "1px solid #ddd",
  background: "white",
  padding: "11px",
  borderRadius: "10px",
  fontWeight: "700",
  cursor: "pointer",
};

const detalle = {
  marginTop: "14px",
  background: "#fafafa",
  padding: "16px",
  borderRadius: "13px",
};

const datosCliente = {
  display: "grid",
  gap: "8px",
  color: "#444",
};

const productoFila = {
  display: "flex",
  justifyContent: "space-between",
  gap: "15px",
  padding: "11px 0",
  borderTop: "1px solid #e5e5e5",
};

const vacio = {
  background: "white",
  marginTop: "16px",
  padding: "45px 20px",
  borderRadius: "20px",
  textAlign: "center",
};
const etiquetaCampo = {
  fontSize: "13px",
  fontWeight: "700",
  marginBottom: "5px",
  color: "#555",
};

const campoEdicion = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "11px 12px",
  fontSize: "15px",
  background: "white",
};

const error = {
  background: "#ffeaea",
  color: "#a33",
  padding: "14px",
  borderRadius: "12px",
  marginTop: "15px",
};
