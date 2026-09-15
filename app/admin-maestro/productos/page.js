"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductosMaestroPage() {
  const router = useRouter();

  const inputFoto1Ref = useRef(null);
  const inputFoto2Ref = useRef(null);

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);

  const [subiendoFoto1, setSubiendoFoto1] = useState(false);
  const [subiendoFoto2, setSubiendoFoto2] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  // ======================================================
  // CARGAR PRODUCTOS
  // ======================================================

  async function cargarProductos() {
    try {
      setCargando(true);
      setMensaje("");

      const response = await fetch(
        "/api/admin-maestro/productos",
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
        setMensaje(
          data.mensaje ||
            "No pudimos cargar los productos."
        );
        return;
      }

      setProductos(data.productos || []);
    } catch (error) {
      console.error(error);
      setMensaje("No pudimos cargar los productos.");
    } finally {
      setCargando(false);
    }
  }

  // ======================================================
  // BUSCADOR
  // ======================================================

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return productos;

    return productos.filter((producto) => {
      return [
        producto.referencia,
        producto.nombre,
        producto.categoria,
        producto.descripcion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [productos, busqueda]);

  // ======================================================
  // DINERO
  // ======================================================

  function dinero(valor) {
    const numero = Number(valor || 0);

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(numero);
  }

  // ======================================================
  // ABRIR EDITOR
  // ======================================================

  function abrirEditar(producto) {
    setMensaje("");

    setEditando({
      ...producto,

      costo:
        producto.costo ?? "",

      precio_detal:
        producto.precio_detal ?? "",

      precio_minimo:
        producto.precio_minimo ?? "",

      categoria:
        producto.categoria ?? "",

      descripcion:
        producto.descripcion ?? "",

      foto_url:
        producto.foto_url ?? "",

      foto_url_2:
        producto.foto_url_2 ?? "",

      infoimagen:
        producto.infoimagen ?? "",

      activo:
        producto.activo !== false,
    });
  }

  function cerrarEditor() {
    if (
      guardando ||
      subiendoFoto1 ||
      subiendoFoto2
    ) {
      return;
    }

    setEditando(null);
  }

  // ======================================================
  // CAMBIAR CAMPOS
  // ======================================================

  function cambiarEdicion(e) {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setEditando((actual) => ({
      ...actual,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  // ======================================================
  // SUBIR FOTO
  // ======================================================

  async function subirFotografia(
    archivo,
    campo
  ) {
    if (!archivo) return;

    if (!archivo.type?.startsWith("image/")) {
      setMensaje(
        "Selecciona un archivo de imagen."
      );
      return;
    }

    const esFotoPrincipal =
      campo === "foto_url";

    try {
      if (esFotoPrincipal) {
        setSubiendoFoto1(true);
      } else {
        setSubiendoFoto2(true);
      }

      setMensaje("");

      const formData = new FormData();

      formData.append("foto", archivo);

      const response = await fetch(
        "/api/admin-maestro/productos/subir-foto",
        {
          method: "POST",
          body: formData,
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        data = {
          ok: false,
          mensaje:
            "El servidor devolvió una respuesta inválida.",
        };
      }

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        setMensaje(
          data.mensaje ||
            "No tienes permiso para subir fotografías."
        );
        return;
      }

      if (!response.ok || !data.ok) {
        setMensaje(
          data.mensaje ||
            "No pudimos subir la fotografía."
        );
        return;
      }

      if (!data.url) {
        setMensaje(
          "La fotografía se subió, pero no recibimos su dirección."
        );
        return;
      }

      setEditando((actual) => ({
        ...actual,
        [campo]: data.url,
      }));

      setMensaje(
        esFotoPrincipal
          ? "✅ Foto principal cargada. Recuerda guardar los cambios."
          : "✅ Segunda foto cargada. Recuerda guardar los cambios."
      );
    } catch (error) {
      console.error(
        "Error subiendo fotografía:",
        error
      );

      setMensaje(
        "No pudimos subir la fotografía."
      );
    } finally {
      if (esFotoPrincipal) {
        setSubiendoFoto1(false);
      } else {
        setSubiendoFoto2(false);
      }
    }
  }

  // ======================================================
  // FOTO PRINCIPAL
  // ======================================================

  function seleccionarFotoPrincipal(e) {
    const archivo =
      e.target.files?.[0];

    if (archivo) {
      subirFotografia(
        archivo,
        "foto_url"
      );
    }

    e.target.value = "";
  }

  // ======================================================
  // SEGUNDA FOTO
  // ======================================================

  function seleccionarSegundaFoto(e) {
    const archivo =
      e.target.files?.[0];

    if (archivo) {
      subirFotografia(
        archivo,
        "foto_url_2"
      );
    }

    e.target.value = "";
  }

  // ======================================================
  // QUITAR SEGUNDA FOTO
  // ======================================================

  function quitarSegundaFoto() {
    setEditando((actual) => ({
      ...actual,
      foto_url_2: "",
    }));

    setMensaje(
      "✅ Segunda foto quitada. Recuerda guardar los cambios."
    );
  }

  // ======================================================
  // GUARDAR CAMBIOS
  // ======================================================

  async function guardarCambios(e) {
    e.preventDefault();

    if (
      guardando ||
      !editando ||
      subiendoFoto1 ||
      subiendoFoto2
    ) {
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const response = await fetch(
        "/api/admin-maestro/productos",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(editando),
        }
      );

      const data =
        await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        setMensaje(
          data.mensaje ||
            "No tienes permiso para editar productos."
        );
        return;
      }

      if (!response.ok || !data.ok) {
        setMensaje(
          data.mensaje ||
            "No pudimos actualizar el producto."
        );
        return;
      }

      setProductos((actuales) =>
        actuales.map((producto) =>
          producto.id === data.producto.id
            ? data.producto
            : producto
        )
      );

      setEditando(null);

      setMensaje(
        "✅ Producto actualizado correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos actualizar el producto."
      );
    } finally {
      setGuardando(false);
    }
  }

  // ======================================================
  // ELIMINAR PRODUCTO
  // ======================================================

  async function eliminarProducto(producto) {
    const confirmar =
      window.confirm(
        `¿Seguro que deseas eliminar ${producto.referencia} - ${producto.nombre}?\n\nEsta acción eliminará el producto de la base de datos.`
      );

    if (!confirmar) return;

    try {
      setEliminando(producto.id);
      setMensaje("");

      const response = await fetch(
        "/api/admin-maestro/productos",
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id: producto.id,
          }),
        }
      );

      const data =
        await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.ok) {
        setMensaje(
          data.mensaje ||
            "No pudimos eliminar el producto."
        );
        return;
      }

      setProductos((actuales) =>
        actuales.filter(
          (item) =>
            item.id !== producto.id
        )
      );

      setMensaje(
        "✅ Producto eliminado correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos eliminar el producto."
      );
    } finally {
      setEliminando(null);
    }
  }

  // ======================================================
  // CARGANDO
  // ======================================================

  if (cargando) {
    return (
      <main style={estilos.cargando}>
        <div>
          <div style={estilos.spinner}>
            💎
          </div>

          <p>Cargando productos...</p>
        </div>
      </main>
    );
  }

  // ======================================================
  // PÁGINA
  // ======================================================

  return (
    <main style={estilos.pagina}>
      <div style={estilos.contenedor}>

        <button
          onClick={() =>
            router.push(
              "/admin-maestro"
            )
          }
          style={estilos.volver}
        >
          ← Volver al Panel Maestro
        </button>

        {/* ENCABEZADO */}

        <section
          style={estilos.encabezado}
        >
          <div>
            <div
              style={estilos.etiqueta}
            >
              ADMINISTRADOR MAESTRO
            </div>

            <h1 style={estilos.titulo}>
              Productos
            </h1>

            <p
              style={estilos.subtitulo}
            >
              Administra el catálogo
              central.
            </p>
          </div>

          <button
            onClick={() =>
              router.push(
                "/admin-maestro/productos/nuevo"
              )
            }
            style={estilos.nuevo}
          >
            ＋ Agregar producto
          </button>
        </section>

        {/* MENSAJE */}

        {mensaje && (
          <div
            style={{
              ...estilos.mensaje,

              background:
                mensaje.startsWith(
                  "✅"
                )
                  ? "#e9f8ee"
                  : "#ffe8e8",

              color:
                mensaje.startsWith(
                  "✅"
                )
                  ? "#20733c"
                  : "#a52828",
            }}
          >
            {mensaje}
          </div>
        )}

        {/* BUSCADOR */}

        <section
          style={estilos.herramientas}
        >
          <div>
            <strong
              style={estilos.contador}
            >
              {
                productosFiltrados.length
              }
            </strong>

            <span
              style={
                estilos.textoContador
              }
            >
              {" "}
              productos
            </span>
          </div>

          <input
            value={busqueda}
            onChange={(e) =>
              setBusqueda(
                e.target.value
              )
            }
            placeholder="🔍 Buscar referencia, nombre o categoría..."
            style={estilos.buscar}
          />
        </section>

        {/* PRODUCTOS */}

        {productosFiltrados.length ===
        0 ? (
          <section
            style={estilos.vacio}
          >
            <div
              style={{
                fontSize: "45px",
              }}
            >
              📦
            </div>

            <h2>
              No encontramos productos
            </h2>

            <p>
              Prueba con otra búsqueda o
              agrega un producto.
            </p>
          </section>
        ) : (
          <div style={estilos.grid}>
            {productosFiltrados.map(
              (producto) => (
                <article
                  key={producto.id}
                  style={
                    estilos.tarjeta
                  }
                >
                  <div
                    style={
                      estilos.imagenContenedor
                    }
                  >
                    {producto.foto_url ? (
                      <img
                        src={
                          producto.foto_url
                        }
                        alt={
                          producto.nombre
                        }
                        style={
                          estilos.imagen
                        }
                      />
                    ) : (
                      <div
                        style={
                          estilos.sinFoto
                        }
                      >
                        📷

                        <span>
                          Sin fotografía
                        </span>
                      </div>
                    )}

                    <span
                      style={{
                        ...estilos.estado,

                        background:
                          producto.activo
                            ? "#e5f7ea"
                            : "#eeeeee",

                        color:
                          producto.activo
                            ? "#17773b"
                            : "#666",
                      }}
                    >
                      {producto.activo
                        ? "● Activo"
                        : "● Inactivo"}
                    </span>
                  </div>

                  <div
                    style={
                      estilos.contenido
                    }
                  >
                    <div
                      style={
                        estilos.referencia
                      }
                    >
                      {
                        producto.referencia
                      }
                    </div>

                    <h2
                      style={
                        estilos.nombre
                      }
                    >
                      {producto.nombre}
                    </h2>

                    {producto.categoria && (
                      <div
                        style={
                          estilos.categoria
                        }
                      >
                        {
                          producto.categoria
                        }
                      </div>
                    )}

                    <div
                      style={
                        estilos.precios
                      }
                    >
                      <Fila
                        nombre="Tu costo"
                        valor={dinero(
                          producto.costo
                        )}
                      />

                      <Fila
                        nombre="Precio sugerido"
                        valor={dinero(
                          producto.precio_detal
                        )}
                        destacado
                      />

                      {producto.precio_minimo !==
                        null &&
                        producto.precio_minimo !==
                          undefined && (
                          <Fila
                            nombre="Precio mínimo"
                            valor={dinero(
                              producto.precio_minimo
                            )}
                          />
                        )}
                    </div>

                    <div
                      style={
                        estilos.botones
                      }
                    >
                      <button
                        onClick={() =>
                          abrirEditar(
                            producto
                          )
                        }
                        style={
                          estilos.editar
                        }
                      >
                        ✏️ Editar
                      </button>

                      <button
                        onClick={() =>
                          eliminarProducto(
                            producto
                          )
                        }
                        disabled={
                          eliminando ===
                          producto.id
                        }
                        style={{
                          ...estilos.eliminar,

                          opacity:
                            eliminando ===
                            producto.id
                              ? 0.5
                              : 1,
                        }}
                      >
                        {eliminando ===
                        producto.id
                          ? "Eliminando..."
                          : "🗑️ Eliminar"}
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>

      {/* ==================================================
          MODAL EDITAR
      ================================================== */}

      {editando && (
        <div style={estilos.overlay}>
          <div style={estilos.modal}>

            {/* CABECERA */}

            <div
              style={
                estilos.modalCabecera
              }
            >
              <div>
                <div
                  style={
                    estilos.modalReferencia
                  }
                >
                  {editando.referencia}
                </div>

                <h2
                  style={
                    estilos.modalTitulo
                  }
                >
                  Editar producto
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarEditor}
                style={estilos.cerrar}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                guardarCambios
              }
            >

              {/* INFORMACIÓN */}

              <Campo titulo="Referencia *">
                <input
                  name="referencia"
                  value={
                    editando.referencia
                  }
                  onChange={
                    cambiarEdicion
                  }
                  style={estilos.input}
                  required
                />
              </Campo>

              <Campo titulo="Nombre *">
                <input
                  name="nombre"
                  value={
                    editando.nombre
                  }
                  onChange={
                    cambiarEdicion
                  }
                  style={estilos.input}
                  required
                />
              </Campo>

              <Campo titulo="Categoría">
                <input
                  name="categoria"
                  value={
                    editando.categoria
                  }
                  onChange={
                    cambiarEdicion
                  }
                  style={estilos.input}
                />
              </Campo>

              <Campo titulo="Descripción">
                <textarea
                  name="descripcion"
                  value={
                    editando.descripcion
                  }
                  onChange={
                    cambiarEdicion
                  }
                  rows={3}
                  style={{
                    ...estilos.input,
                    resize: "vertical",
                  }}
                />
              </Campo>

              {/* PRECIOS */}

              <div
                style={
                  estilos.dosColumnas
                }
              >
                <Campo titulo="Tu costo">
                  <input
                    type="number"
                    name="costo"
                    value={
                      editando.costo
                    }
                    onChange={
                      cambiarEdicion
                    }
                    min="0"
                    style={
                      estilos.input
                    }
                  />
                </Campo>

                <Campo titulo="Precio sugerido *">
                  <input
                    type="number"
                    name="precio_detal"
                    value={
                      editando.precio_detal
                    }
                    onChange={
                      cambiarEdicion
                    }
                    min="0"
                    required
                    style={
                      estilos.input
                    }
                  />
                </Campo>
              </div>

              <Campo titulo="Precio mínimo">
                <input
                  type="number"
                  name="precio_minimo"
                  value={
                    editando.precio_minimo
                  }
                  onChange={
                    cambiarEdicion
                  }
                  min="0"
                  style={estilos.input}
                />
              </Campo>

              {/* ==========================================
                  FOTOGRAFÍAS
              ========================================== */}

              <div
                style={
                  estilos.seccionFotos
                }
              >
                <div
                  style={
                    estilos.tituloFotos
                  }
                >
                  <div
                    style={
                      estilos.iconoFotos
                    }
                  >
                    📸
                  </div>

                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "20px",
                      }}
                    >
                      Fotografías del
                      producto
                    </h3>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        color: "#777",
                        fontSize:
                          "13px",
                      }}
                    >
                      Puedes reemplazar
                      las fotografías
                      directamente desde
                      tu celular o
                      computador.
                    </p>
                  </div>
                </div>

                <div
                  style={
                    estilos.gridFotos
                  }
                >

                  {/* FOTO PRINCIPAL */}

                  <div
                    style={
                      estilos.tarjetaFoto
                    }
                  >
                    <div
                      style={
                        estilos.nombreFoto
                      }
                    >
                      Foto principal
                    </div>

                    <div
                      style={
                        estilos.previewFoto
                      }
                    >
                      {editando.foto_url ? (
                        <img
                          src={
                            editando.foto_url
                          }
                          alt="Foto principal"
                          style={
                            estilos.imagenPreview
                          }
                        />
                      ) : (
                        <div
                          style={
                            estilos.sinFotoPreview
                          }
                        >
                          <div
                            style={{
                              fontSize:
                                "35px",
                            }}
                          >
                            📷
                          </div>

                          <span>
                            Sin foto
                          </span>
                        </div>
                      )}

                      <span
                        style={
                          estilos.badgePrincipal
                        }
                      >
                        PRINCIPAL
                      </span>
                    </div>

                    <input
                      ref={
                        inputFoto1Ref
                      }
                      type="file"
                      accept="image/*"
                      onChange={
                        seleccionarFotoPrincipal
                      }
                      style={{
                        display: "none",
                      }}
                    />

                    <button
                      type="button"
                      disabled={
                        subiendoFoto1
                      }
                      onClick={() =>
                        inputFoto1Ref.current?.click()
                      }
                      style={{
                        ...estilos.botonFoto,

                        opacity:
                          subiendoFoto1
                            ? 0.6
                            : 1,
                      }}
                    >
                      {subiendoFoto1
                        ? "⏳ Subiendo..."
                        : editando.foto_url
                        ? "📷 Cambiar foto"
                        : "📷 Agregar foto"}
                    </button>
                  </div>

                  {/* SEGUNDA FOTO */}

                  <div
                    style={
                      estilos.tarjetaFoto
                    }
                  >
                    <div
                      style={
                        estilos.nombreFoto
                      }
                    >
                      Segunda foto
                    </div>

                    <div
                      style={
                        estilos.previewFoto
                      }
                    >
                      {editando.foto_url_2 ? (
                        <img
                          src={
                            editando.foto_url_2
                          }
                          alt="Segunda foto"
                          style={
                            estilos.imagenPreview
                          }
                        />
                      ) : (
                        <div
                          style={
                            estilos.sinFotoPreview
                          }
                        >
                          <div
                            style={{
                              fontSize:
                                "35px",
                            }}
                          >
                            ＋
                          </div>

                          <span>
                            Sin segunda foto
                          </span>
                        </div>
                      )}

                      <span
                        style={
                          estilos.badgeSecundaria
                        }
                      >
                        OPCIONAL
                      </span>
                    </div>

                    <input
                      ref={
                        inputFoto2Ref
                      }
                      type="file"
                      accept="image/*"
                      onChange={
                        seleccionarSegundaFoto
                      }
                      style={{
                        display: "none",
                      }}
                    />

                    <button
                      type="button"
                      disabled={
                        subiendoFoto2
                      }
                      onClick={() =>
                        inputFoto2Ref.current?.click()
                      }
                      style={{
                        ...estilos.botonFoto,

                        opacity:
                          subiendoFoto2
                            ? 0.6
                            : 1,
                      }}
                    >
                      {subiendoFoto2
                        ? "⏳ Subiendo..."
                        : editando.foto_url_2
                        ? "📷 Cambiar foto"
                        : "＋ Agregar segunda foto"}
                    </button>

                    {editando.foto_url_2 && (
                      <button
                        type="button"
                        onClick={
                          quitarSegundaFoto
                        }
                        disabled={
                          subiendoFoto2
                        }
                        style={
                          estilos.quitarFoto
                        }
                      >
                        🗑️ Quitar segunda
                        foto
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={
                    estilos.avisoFotos
                  }
                >
                  💡 Las fotos nuevas se
                  mostrarán aquí
                  inmediatamente. Después
                  debes presionar{" "}
                  <strong>
                    Guardar cambios
                  </strong>{" "}
                  para asociarlas al
                  producto.
                </div>
              </div>

              {/* INFOIMAGEN */}

              <Campo titulo="INFOIMAGEN">
                <textarea
                  name="infoimagen"
                  value={
                    editando.infoimagen
                  }
                  onChange={
                    cambiarEdicion
                  }
                  rows={3}
                  style={{
                    ...estilos.input,
                    resize: "vertical",
                  }}
                />
              </Campo>

              {/* ACTIVO */}

              <label
                style={
                  estilos.activoFila
                }
              >
                <input
                  type="checkbox"
                  name="activo"
                  checked={
                    editando.activo
                  }
                  onChange={
                    cambiarEdicion
                  }
                  style={{
                    width: "21px",
                    height: "21px",
                  }}
                />

                <div>
                  <strong>
                    Producto activo
                  </strong>

                  <div
                    style={
                      estilos.ayuda
                    }
                  >
                    Si lo desactivas
                    dejará de aparecer en
                    los catálogos.
                  </div>
                </div>
              </label>

              {/* BOTONES */}

              <div
                style={
                  estilos.modalBotones
                }
              >
                <button
                  type="button"
                  onClick={
                    cerrarEditor
                  }
                  disabled={
                    guardando ||
                    subiendoFoto1 ||
                    subiendoFoto2
                  }
                  style={
                    estilos.cancelar
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    guardando ||
                    subiendoFoto1 ||
                    subiendoFoto2
                  }
                  style={{
                    ...estilos.guardar,

                    opacity:
                      guardando ||
                      subiendoFoto1 ||
                      subiendoFoto2
                        ? 0.6
                        : 1,
                  }}
                >
                  {guardando
                    ? "Guardando..."
                    : subiendoFoto1 ||
                      subiendoFoto2
                    ? "Esperando fotografía..."
                    : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

// ======================================================
// COMPONENTE FILA
// ======================================================

function Fila({
  nombre,
  valor,
  destacado,
}) {
  return (
    <div style={estilos.fila}>
      <span
        style={estilos.filaNombre}
      >
        {nombre}
      </span>

      <strong
        style={{
          color: destacado
            ? "#111"
            : "#555",
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

// ======================================================
// COMPONENTE CAMPO
// ======================================================

function Campo({
  titulo,
  children,
}) {
  return (
    <div style={estilos.campo}>
      <label
        style={estilos.label}
      >
        {titulo}
      </label>

      {children}
    </div>
  );
}

// ======================================================
// ESTILOS
// ======================================================

const estilos = {
  pagina: {
    minHeight: "100vh",
    background: "#f5f6f8",
    padding: "22px 14px 80px",
  },

  cargando: {
    minHeight: "100vh",
    background: "#f5f6f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  spinner: {
    fontSize: "45px",
  },

  contenedor: {
    maxWidth: "1150px",
    margin: "0 auto",
  },

  volver: {
    border: 0,
    background: "transparent",
    fontWeight: "800",
    fontSize: "15px",
    padding: "10px 0 18px",
    cursor: "pointer",
  },

  encabezado: {
    background: "#111",
    color: "white",
    borderRadius: "24px",
    padding: "28px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },

  etiqueta: {
    display: "inline-block",
    background: "#dc7985",
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "11px",
    fontWeight: "900",
  },

  titulo: {
    fontSize: "35px",
    margin: "12px 0 3px",
  },

  subtitulo: {
    margin: 0,
    color: "#ccc",
  },

  nuevo: {
    border: 0,
    borderRadius: "13px",
    padding: "15px 20px",
    background: "#dc7985",
    color: "white",
    fontWeight: "900",
    fontSize: "15px",
    cursor: "pointer",
  },

  mensaje: {
    marginTop: "18px",
    borderRadius: "14px",
    padding: "16px",
    fontWeight: "700",
  },

  herramientas: {
    background: "white",
    marginTop: "18px",
    padding: "18px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  contador: {
    fontSize: "24px",
  },

  textoContador: {
    color: "#777",
  },

  buscar: {
    width: "min(100%, 430px)",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "14px",
    boxSizing: "border-box",
    fontSize: "15px",
  },

  grid: {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(270px, 1fr))",
    gap: "16px",
  },

  tarjeta: {
    background: "white",
    borderRadius: "19px",
    overflow: "hidden",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },

  imagenContenedor: {
    position: "relative",
    background: "#f2f2f2",
    aspectRatio: "1 / 1",
  },

  imagen: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  sinFoto: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    fontSize: "28px",
  },

  estado: {
    position: "absolute",
    top: "12px",
    right: "12px",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "11px",
    fontWeight: "800",
  },

  contenido: {
    padding: "17px",
  },

  referencia: {
    color: "#d26f7d",
    fontWeight: "900",
    fontSize: "13px",
  },

  nombre: {
    margin: "5px 0 8px",
    fontSize: "19px",
  },

  categoria: {
    display: "inline-block",
    background: "#f3f3f3",
    borderRadius: "999px",
    padding: "5px 9px",
    color: "#666",
    fontSize: "11px",
    marginBottom: "13px",
  },

  precios: {
    borderTop:
      "1px solid #eee",
    borderBottom:
      "1px solid #eee",
    padding: "10px 0",
  },

  fila: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: "10px",
    padding: "5px 0",
    fontSize: "13px",
  },

  filaNombre: {
    color: "#888",
  },

  botones: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "8px",
    marginTop: "14px",
  },

  editar: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: "10px",
    padding: "11px",
    fontWeight: "800",
    cursor: "pointer",
  },

  eliminar: {
    border:
      "1px solid #ffd3d3",
    background: "#fff2f2",
    color: "#b82c2c",
    borderRadius: "10px",
    padding: "11px",
    fontWeight: "800",
    cursor: "pointer",
  },

  vacio: {
    marginTop: "18px",
    background: "white",
    borderRadius: "20px",
    padding: "60px 20px",
    textAlign: "center",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(0,0,0,.62)",
    padding: "20px",
    overflowY: "auto",
  },

  modal: {
    width:
      "min(720px, 100%)",
    margin: "20px auto",
    background: "white",
    borderRadius: "22px",
    padding: "22px",
    boxSizing: "border-box",
  },

  modalCabecera: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
  },

  modalReferencia: {
    color: "#d26f7d",
    fontWeight: "900",
    fontSize: "13px",
  },

  modalTitulo: {
    margin: "3px 0 0",
    fontSize: "25px",
  },

  cerrar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "1px solid #ddd",
    background: "white",
    fontSize: "18px",
    cursor: "pointer",
  },

  campo: {
    marginBottom: "16px",
  },

  label: {
    display: "block",
    fontWeight: "800",
    marginBottom: "6px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "11px",
    padding: "13px",
    fontSize: "16px",
  },

  dosColumnas: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },

  // FOTOS

  seccionFotos: {
    margin: "25px 0",
    padding: "18px",
    borderRadius: "18px",
    background: "#f8f8f8",
    border: "1px solid #ededed",
  },

  tituloFotos: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
  },

  iconoFotos: {
    width: "45px",
    height: "45px",
    borderRadius: "13px",
    background: "#ffe9ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },

  gridFotos: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "14px",
  },

  tarjetaFoto: {
    background: "white",
    border:
      "1px solid #e5e5e5",
    borderRadius: "16px",
    padding: "12px",
  },

  nombreFoto: {
    fontWeight: "900",
    marginBottom: "9px",
    fontSize: "14px",
  },

  previewFoto: {
    width: "100%",
    aspectRatio: "1 / 1",
    background: "#eee",
    borderRadius: "13px",
    overflow: "hidden",
    position: "relative",
  },

  imagenPreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  sinFotoPreview: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    gap: "7px",
  },

  badgePrincipal: {
    position: "absolute",
    top: "9px",
    left: "9px",
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#111",
    color: "white",
    fontWeight: "900",
    fontSize: "9px",
  },

  badgeSecundaria: {
    position: "absolute",
    top: "9px",
    left: "9px",
    padding: "6px 9px",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,.92)",
    color: "#555",
    fontWeight: "900",
    fontSize: "9px",
  },

  botonFoto: {
    width: "100%",
    border: 0,
    background: "#111",
    color: "white",
    borderRadius: "11px",
    padding: "12px",
    marginTop: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  quitarFoto: {
    width: "100%",
    border:
      "1px solid #ffd2d2",
    background: "#fff2f2",
    color: "#b62c2c",
    borderRadius: "11px",
    padding: "11px",
    marginTop: "8px",
    fontWeight: "800",
    cursor: "pointer",
  },

  avisoFotos: {
    marginTop: "14px",
    padding: "12px 14px",
    background: "#fff5df",
    color: "#6b5423",
    borderRadius: "11px",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  activoFila: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#f6f6f6",
    borderRadius: "12px",
    padding: "14px",
  },

  ayuda: {
    fontSize: "12px",
    color: "#888",
    marginTop: "3px",
  },

  modalBotones: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "10px",
    marginTop: "22px",
  },

  cancelar: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  guardar: {
    border: 0,
    background: "#d97883",
    color: "white",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },
};
