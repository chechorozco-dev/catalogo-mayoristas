"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoProductoVariantesPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [producto, setProducto] = useState({
    nombre: "",
    categoria: "",
    descripcion: "",
    activo: true,
  });

  const [variantes, setVariantes] = useState([
    crearVarianteVacia(),
  ]);

  useEffect(() => {
    verificarAcceso();
  }, []);

  function crearVarianteVacia() {
    return {
      temporal_id:
        Date.now().toString() +
        Math.random().toString(36).slice(2),

      nombre_variante: "",
      referencia: "",

      foto_url: "",
      foto_url_2: "",

      archivo_foto_1: null,
      archivo_foto_2: null,

      preview_foto_1: "",
      preview_foto_2: "",

      costo: "",
      precio_detal: "",
      precio_minimo: "",

      infoimagen: "",
      activo: true,

      subiendo_foto_1: false,
      subiendo_foto_2: false,
    };
  }

  async function verificarAcceso() {
    try {
      const response = await fetch("/api/auth/sesion", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.autenticado) {
        router.replace("/login");
        return;
      }

      if (data.cliente?.rol !== "MAESTRO") {
        router.replace("/admin");
        return;
      }

      setCargando(false);
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos comprobar tu acceso."
      );

      setCargando(false);
    }
  }

  function cambiarProducto(e) {
    const { name, value, type, checked } = e.target;

    setProducto((actual) => ({
      ...actual,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  function cambiarVariante(
    indice,
    campo,
    valor
  ) {
    setVariantes((actuales) =>
      actuales.map((variante, i) =>
        i === indice
          ? {
              ...variante,
              [campo]: valor,
            }
          : variante
      )
    );
  }

  function agregarVariante() {
    setVariantes((actuales) => [
      ...actuales,
      crearVarianteVacia(),
    ]);

    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }

  function eliminarVariante(indice) {
    if (variantes.length === 1) {
      setMensaje(
        "El producto debe tener por lo menos una variante."
      );

      return;
    }

    const confirmar = window.confirm(
      `¿Eliminar la variante ${indice + 1}?`
    );

    if (!confirmar) return;

    setVariantes((actuales) =>
      actuales.filter((_, i) => i !== indice)
    );
  }

  function moverVariante(indice, direccion) {
    const nuevoIndice = indice + direccion;

    if (
      nuevoIndice < 0 ||
      nuevoIndice >= variantes.length
    ) {
      return;
    }

    setVariantes((actuales) => {
      const copia = [...actuales];

      const temporal = copia[indice];

      copia[indice] = copia[nuevoIndice];
      copia[nuevoIndice] = temporal;

      return copia;
    });
  }

  function seleccionarFoto(
    indice,
    numeroFoto,
    archivo
  ) {
    if (!archivo) return;

    if (!archivo.type?.startsWith("image/")) {
      setMensaje(
        "El archivo seleccionado debe ser una imagen."
      );

      return;
    }

    const preview = URL.createObjectURL(archivo);

    if (numeroFoto === 1) {
      cambiarVarianteCompleta(indice, {
        archivo_foto_1: archivo,
        preview_foto_1: preview,
      });
    } else {
      cambiarVarianteCompleta(indice, {
        archivo_foto_2: archivo,
        preview_foto_2: preview,
      });
    }
  }

  function cambiarVarianteCompleta(
    indice,
    cambios
  ) {
    setVariantes((actuales) =>
      actuales.map((variante, i) =>
        i === indice
          ? {
              ...variante,
              ...cambios,
            }
          : variante
      )
    );
  }

  function quitarFoto(
    indice,
    numeroFoto
  ) {
    if (numeroFoto === 1) {
      cambiarVarianteCompleta(indice, {
        archivo_foto_1: null,
        preview_foto_1: "",
        foto_url: "",
      });
    } else {
      cambiarVarianteCompleta(indice, {
        archivo_foto_2: null,
        preview_foto_2: "",
        foto_url_2: "",
      });
    }
  }

  function limpiarNumero(valor) {
    if (
      valor === "" ||
      valor === null ||
      valor === undefined
    ) {
      return null;
    }

    const numero = Number(
      String(valor)
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .replace(/[^\d.-]/g, "")
    );

    return Number.isFinite(numero)
      ? numero
      : null;
  }

  async function subirFoto(
    archivo,
    indice,
    numeroFoto
  ) {
    if (!archivo) return "";

    const campoSubiendo =
      numeroFoto === 1
        ? "subiendo_foto_1"
        : "subiendo_foto_2";

    cambiarVarianteCompleta(indice, {
      [campoSubiendo]: true,
    });

    try {
      const formData = new FormData();

      formData.append("foto", archivo);

      const response = await fetch(
        "/api/admin-maestro/productos/subir-foto",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos subir la fotografía."
        );
      }

      return data.url;
    } finally {
      cambiarVarianteCompleta(indice, {
        [campoSubiendo]: false,
      });
    }
  }

  async function guardarProducto(e) {
    e.preventDefault();

    if (guardando) return;

    setMensaje("");

    const nombre =
      producto.nombre.trim();

    const categoria =
      producto.categoria.trim();

    const descripcion =
      producto.descripcion.trim();

    if (!nombre) {
      setMensaje(
        "Escribe el nombre del producto."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (variantes.length === 0) {
      setMensaje(
        "Debes agregar por lo menos una variante."
      );

      return;
    }

    for (
      let i = 0;
      i < variantes.length;
      i++
    ) {
      const variante = variantes[i];

      if (
        !variante.nombre_variante.trim()
      ) {
        setMensaje(
          `Escribe el nombre de la variante ${
            i + 1
          }.`
        );

        return;
      }

      if (!variante.referencia.trim()) {
        setMensaje(
          `Escribe la referencia de la variante ${
            i + 1
          }.`
        );

        return;
      }

      const precio =
        limpiarNumero(
          variante.precio_detal
        );

      if (
        precio === null ||
        precio < 0
      ) {
        setMensaje(
          `Escribe un precio sugerido válido para la variante ${
            i + 1
          }.`
        );

        return;
      }

      if (
        !variante.archivo_foto_1 &&
        !variante.foto_url
      ) {
        setMensaje(
          `Selecciona la foto principal de la variante ${
            i + 1
          }.`
        );

        return;
      }
    }

    setGuardando(true);

    try {
      const variantesPreparadas = [];

      for (
        let i = 0;
        i < variantes.length;
        i++
      ) {
        const variante = variantes[i];

        setMensaje(
          `Subiendo fotografías de la variante ${
            i + 1
          } de ${variantes.length}...`
        );

        let foto1 =
          variante.foto_url || "";

        let foto2 =
          variante.foto_url_2 || "";

        if (variante.archivo_foto_1) {
          foto1 = await subirFoto(
            variante.archivo_foto_1,
            i,
            1
          );
        }

        if (variante.archivo_foto_2) {
          foto2 = await subirFoto(
            variante.archivo_foto_2,
            i,
            2
          );
        }

        variantesPreparadas.push({
          nombre_variante:
            variante.nombre_variante.trim(),

          referencia:
            variante.referencia.trim(),

          foto_url: foto1 || null,

          foto_url_2: foto2 || null,

          costo:
            limpiarNumero(
              variante.costo
            ),

          precio_detal:
            limpiarNumero(
              variante.precio_detal
            ),

          precio_minimo:
            limpiarNumero(
              variante.precio_minimo
            ),

          infoimagen:
            variante.infoimagen.trim() ||
            null,

          activo:
            variante.activo !== false,

          orden: i,
        });
      }

      setMensaje(
        "Guardando producto y variantes..."
      );

      const response = await fetch(
        "/api/admin-maestro/variantes",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            nombre,
            categoria:
              categoria || null,

            descripcion:
              descripcion || null,

            activo:
              producto.activo !== false,

            variantes:
              variantesPreparadas,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensaje(
          data.mensaje ||
            "No pudimos crear el producto con variantes."
        );

        return;
      }

      setMensaje(
        "✅ Producto con variantes creado correctamente."
      );

      setProducto({
        nombre: "",
        categoria: "",
        descripcion: "",
        activo: true,
      });

      setVariantes([
        crearVarianteVacia(),
      ]);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Error creando producto con variantes:",
        error
      );

      setMensaje(
        error.message ||
          "No pudimos crear el producto con variantes."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main style={estilos.cargando}>
        <p>Cargando...</p>
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <div style={estilos.contenedor}>
        <button
          type="button"
          onClick={() =>
            router.push(
              "/admin-maestro"
            )
          }
          style={estilos.volver}
        >
          ← Volver al Panel Maestro
        </button>

        <div style={estilos.encabezado}>
          <div style={estilos.etiqueta}>
            ADMINISTRADOR MAESTRO
          </div>

          <h1 style={estilos.titulo}>
            Producto con variantes
          </h1>

          <p style={estilos.subtitulo}>
            Crea un producto y agrega
            todas sus referencias,
            colores o diseños.
          </p>
        </div>

        {mensaje && (
          <div
            style={{
              ...estilos.mensaje,

              background:
                mensaje.startsWith("✅")
                  ? "#e8f7ed"
                  : mensaje.startsWith(
                      "Subiendo"
                    ) ||
                    mensaje.startsWith(
                      "Guardando"
                    )
                  ? "#fff6dd"
                  : "#ffe9e9",

              color:
                mensaje.startsWith("✅")
                  ? "#18733b"
                  : mensaje.startsWith(
                      "Subiendo"
                    ) ||
                    mensaje.startsWith(
                      "Guardando"
                    )
                  ? "#805d00"
                  : "#b32d2d",
            }}
          >
            {mensaje}
          </div>
        )}

        <form
          onSubmit={guardarProducto}
          style={estilos.formulario}
        >
          {/* PRODUCTO PRINCIPAL */}

          <section style={estilos.seccion}>
            <h2
              style={
                estilos.tituloSeccion
              }
            >
              💎 Producto principal
            </h2>

            <Campo
              titulo="Nombre del producto *"
              ayuda="Ejemplo: Aretes de corazón"
            >
              <input
                name="nombre"
                value={producto.nombre}
                onChange={cambiarProducto}
                placeholder="Aretes de corazón"
                style={estilos.input}
              />
            </Campo>

            <Campo
              titulo="Categoría"
              ayuda="Ejemplo: Aretes, Pulseras, Juegos..."
            >
              <input
                name="categoria"
                value={
                  producto.categoria
                }
                onChange={
                  cambiarProducto
                }
                placeholder="Aretes"
                style={estilos.input}
              />
            </Campo>

            <Campo titulo="Descripción">
              <textarea
                name="descripcion"
                value={
                  producto.descripcion
                }
                onChange={
                  cambiarProducto
                }
                placeholder="Descripción general del producto..."
                rows={4}
                style={{
                  ...estilos.input,
                  resize: "vertical",
                }}
              />
            </Campo>

            <label
              style={estilos.switchFila}
            >
              <input
                type="checkbox"
                name="activo"
                checked={
                  producto.activo
                }
                onChange={
                  cambiarProducto
                }
                style={{
                  width: "22px",
                  height: "22px",
                }}
              />

              <div>
                <strong>
                  Producto activo
                </strong>

                <div
                  style={estilos.ayuda}
                >
                  Las variantes activas
                  podrán aparecer en los
                  catálogos.
                </div>
              </div>
            </label>
          </section>

          {/* VARIANTES */}

          <div
            style={
              estilos.encabezadoVariantes
            }
          >
            <div>
              <h2
                style={
                  estilos.tituloVariantes
                }
              >
                🔤 Variantes
              </h2>

              <p
                style={
                  estilos.textoVariantes
                }
              >
                Tienes{" "}
                <strong>
                  {variantes.length}
                </strong>{" "}
                {variantes.length === 1
                  ? "variante"
                  : "variantes"}
                .
              </p>
            </div>

            <button
              type="button"
              onClick={agregarVariante}
              style={
                estilos.agregarVarianteSuperior
              }
            >
              ＋ Agregar variante
            </button>
          </div>

          {variantes.map(
            (variante, indice) => (
              <section
                key={
                  variante.temporal_id
                }
                style={
                  estilos.variante
                }
              >
                <div
                  style={
                    estilos.cabeceraVariante
                  }
                >
                  <div>
                    <div
                      style={
                        estilos.numeroVariante
                      }
                    >
                      VARIANTE{" "}
                      {indice + 1}
                    </div>

                    <h2
                      style={
                        estilos.nombreVarianteTitulo
                      }
                    >
                      {variante.nombre_variante ||
                        `Variante ${
                          indice + 1
                        }`}
                    </h2>
                  </div>

                  <div
                    style={
                      estilos.accionesVariante
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        moverVariante(
                          indice,
                          -1
                        )
                      }
                      disabled={
                        indice === 0
                      }
                      style={
                        estilos.botonOrden
                      }
                      title="Subir"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moverVariante(
                          indice,
                          1
                        )
                      }
                      disabled={
                        indice ===
                        variantes.length -
                          1
                      }
                      style={
                        estilos.botonOrden
                      }
                      title="Bajar"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        eliminarVariante(
                          indice
                        )
                      }
                      style={
                        estilos.eliminar
                      }
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div
                  style={
                    estilos.gridDos
                  }
                >
                  <Campo
                    titulo="Nombre de la variante *"
                    ayuda="Ejemplo: Dorado, Plateado, A, B..."
                  >
                    <input
                      value={
                        variante.nombre_variante
                      }
                      onChange={(e) =>
                        cambiarVariante(
                          indice,
                          "nombre_variante",
                          e.target.value
                        )
                      }
                      placeholder="Dorado"
                      style={
                        estilos.input
                      }
                    />
                  </Campo>

                  <Campo
                    titulo="Referencia *"
                    ayuda="Código propio de esta variante."
                  >
                    <input
                      value={
                        variante.referencia
                      }
                      onChange={(e) =>
                        cambiarVariante(
                          indice,
                          "referencia",
                          e.target.value
                        )
                      }
                      placeholder="RA8001-D"
                      style={
                        estilos.input
                      }
                    />
                  </Campo>
                </div>

                {/* FOTOS */}

                <div
                  style={
                    estilos.bloqueFotos
                  }
                >
                  <h3
                    style={
                      estilos.tituloFotos
                    }
                  >
                    📸 Fotografías de esta
                    variante
                  </h3>

                  <div
                    style={
                      estilos.gridFotos
                    }
                  >
                    <SelectorFoto
                      titulo="Foto principal"
                      obligatorio
                      preview={
                        variante.preview_foto_1 ||
                        variante.foto_url
                      }
                      subiendo={
                        variante.subiendo_foto_1
                      }
                      onChange={(
                        archivo
                      ) =>
                        seleccionarFoto(
                          indice,
                          1,
                          archivo
                        )
                      }
                      onQuitar={() =>
                        quitarFoto(
                          indice,
                          1
                        )
                      }
                    />

                    <SelectorFoto
                      titulo="Segunda foto"
                      preview={
                        variante.preview_foto_2 ||
                        variante.foto_url_2
                      }
                      subiendo={
                        variante.subiendo_foto_2
                      }
                      onChange={(
                        archivo
                      ) =>
                        seleccionarFoto(
                          indice,
                          2,
                          archivo
                        )
                      }
                      onQuitar={() =>
                        quitarFoto(
                          indice,
                          2
                        )
                      }
                    />
                  </div>
                </div>

                {/* PRECIOS */}

                <div
                  style={
                    estilos.gridTres
                  }
                >
                  <Campo titulo="Tu costo">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={
                        variante.costo
                      }
                      onChange={(e) =>
                        cambiarVariante(
                          indice,
                          "costo",
                          e.target.value
                        )
                      }
                      placeholder="5000"
                      style={
                        estilos.input
                      }
                    />
                  </Campo>

                  <Campo titulo="Precio sugerido *">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={
                        variante.precio_detal
                      }
                      onChange={(e) =>
                        cambiarVariante(
                          indice,
                          "precio_detal",
                          e.target.value
                        )
                      }
                      placeholder="10000"
                      style={
                        estilos.input
                      }
                    />
                  </Campo>

                  <Campo titulo="Precio mínimo">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={
                        variante.precio_minimo
                      }
                      onChange={(e) =>
                        cambiarVariante(
                          indice,
                          "precio_minimo",
                          e.target.value
                        )
                      }
                      placeholder="8000"
                      style={
                        estilos.input
                      }
                    />
                  </Campo>
                </div>

                <Campo
                  titulo="INFOIMAGEN"
                  ayuda="Información interna de esta variante."
                >
                  <textarea
                    value={
                      variante.infoimagen
                    }
                    onChange={(e) =>
                      cambiarVariante(
                        indice,
                        "infoimagen",
                        e.target.value
                      )
                    }
                    placeholder="Información interna..."
                    rows={3}
                    style={{
                      ...estilos.input,
                      resize: "vertical",
                    }}
                  />
                </Campo>

                <label
                  style={
                    estilos.switchFila
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      variante.activo
                    }
                    onChange={(e) =>
                      cambiarVariante(
                        indice,
                        "activo",
                        e.target.checked
                      )
                    }
                    style={{
                      width: "22px",
                      height: "22px",
                    }}
                  />

                  <div>
                    <strong>
                      Variante activa
                    </strong>

                    <div
                      style={
                        estilos.ayuda
                      }
                    >
                      Esta variante podrá
                      aparecer en el
                      catálogo.
                    </div>
                  </div>
                </label>
              </section>
            )
          )}

          <button
            type="button"
            onClick={agregarVariante}
            style={
              estilos.agregarVariante
            }
          >
            ＋ Agregar otra variante
          </button>

          <div
            style={
              estilos.barraGuardar
            }
          >
            <div
              style={
                estilos.resumenGuardar
              }
            >
              <strong>
                {variantes.length}{" "}
                {variantes.length === 1
                  ? "variante"
                  : "variantes"}
              </strong>

              <span>
                Se guardarán dentro del
                mismo producto.
              </span>
            </div>

            <button
              type="submit"
              disabled={guardando}
              style={{
                ...estilos.guardar,
                opacity: guardando
                  ? 0.6
                  : 1,
                cursor: guardando
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {guardando
                ? "Guardando..."
                : "💎 Crear producto con variantes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Campo({
  titulo,
  ayuda,
  children,
}) {
  return (
    <div style={estilos.campo}>
      <label style={estilos.label}>
        {titulo}
      </label>

      {ayuda && (
        <div style={estilos.ayuda}>
          {ayuda}
        </div>
      )}

      {children}
    </div>
  );
}

function SelectorFoto({
  titulo,
  obligatorio = false,
  preview,
  subiendo,
  onChange,
  onQuitar,
}) {
  return (
    <div style={estilos.tarjetaFoto}>
      <div
        style={
          estilos.encabezadoFoto
        }
      >
        <strong>{titulo}</strong>

        <span
          style={
            obligatorio
              ? estilos.badgePrincipal
              : estilos.badgeOpcional
          }
        >
          {obligatorio
            ? "PRINCIPAL"
            : "OPCIONAL"}
        </span>
      </div>

      {preview ? (
        <>
          <img
            src={preview}
            alt={titulo}
            style={
              estilos.previewFoto
            }
          />

          <div
            style={
              estilos.botonesFoto
            }
          >
            <label
              style={
                estilos.botonFoto
              }
            >
              📷 Cambiar foto

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  onChange(
                    e.target
                      .files?.[0]
                  )
                }
                style={{
                  display: "none",
                }}
              />
            </label>

            <button
              type="button"
              onClick={onQuitar}
              style={
                estilos.quitarFoto
              }
            >
              Quitar
            </button>
          </div>
        </>
      ) : (
        <label
          style={
            estilos.selectorVacio
          }
        >
          <div
            style={
              estilos.iconoCamara
            }
          >
            📷
          </div>

          <strong>
            Seleccionar foto
          </strong>

          <span
            style={
              estilos.textoSelector
            }
          >
            Desde tu celular o
            computador
          </span>

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              onChange(
                e.target.files?.[0]
              )
            }
            style={{
              display: "none",
            }}
          />
        </label>
      )}

      {subiendo && (
        <div
          style={
            estilos.subiendoFoto
          }
        >
          Subiendo fotografía...
        </div>
      )}
    </div>
  );
}

const estilos = {
  pagina: {
    minHeight: "100vh",
    background: "#f6f7f9",
    padding: "20px 14px 80px",
  },

  cargando: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f6f7f9",
  },

  contenedor: {
    maxWidth: "1000px",
    margin: "0 auto",
  },

  volver: {
    border: "none",
    background: "transparent",
    padding: "10px 0",
    marginBottom: "10px",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  encabezado: {
    background: "#111",
    color: "white",
    borderRadius: "24px",
    padding: "28px",
    marginBottom: "18px",
  },

  etiqueta: {
    display: "inline-block",
    background: "#d97883",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    marginBottom: "13px",
  },

  titulo: {
    margin: 0,
    fontSize: "34px",
    lineHeight: "1.1",
  },

  subtitulo: {
    marginTop: "9px",
    marginBottom: 0,
    color: "#d2d2d2",
    fontSize: "16px",
    lineHeight: "1.5",
  },

  mensaje: {
    padding: "16px 18px",
    borderRadius: "14px",
    marginBottom: "17px",
    fontWeight: "700",
    lineHeight: "1.5",
  },

  formulario: {
    display: "grid",
    gap: "18px",
  },

  seccion: {
    background: "white",
    borderRadius: "22px",
    padding: "25px",
    boxShadow:
      "0 7px 25px rgba(0,0,0,0.05)",
  },

  tituloSeccion: {
    margin: "0 0 23px",
    fontSize: "23px",
  },

  campo: {
    marginBottom: "19px",
  },

  label: {
    display: "block",
    fontWeight: "800",
    fontSize: "15px",
    marginBottom: "5px",
  },

  ayuda: {
    color: "#888",
    fontSize: "12px",
    marginBottom: "7px",
    lineHeight: "1.4",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "16px",
    background: "white",
    outline: "none",
  },

  switchFila: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    background: "#f7f7f7",
    borderRadius: "13px",
    cursor: "pointer",
  },

  encabezadoVariantes: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    background: "#111",
    color: "white",
    padding: "20px 22px",
    borderRadius: "18px",
  },

  tituloVariantes: {
    margin: 0,
    fontSize: "22px",
  },

  textoVariantes: {
    margin: "5px 0 0",
    color: "#ccc",
  },

  agregarVarianteSuperior: {
    border: "none",
    background: "#d97883",
    color: "white",
    padding: "13px 17px",
    borderRadius: "12px",
    fontWeight: "900",
    cursor: "pointer",
  },

  variante: {
    background: "white",
    borderRadius: "22px",
    padding: "25px",
    border: "2px solid #eee",
    boxShadow:
      "0 7px 25px rgba(0,0,0,0.04)",
  },

  cabeceraVariante: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
  },

  numeroVariante: {
    color: "#d97883",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  nombreVarianteTitulo: {
    margin: "4px 0 0",
    fontSize: "22px",
  },

  accionesVariante: {
    display: "flex",
    gap: "7px",
  },

  botonOrden: {
    width: "38px",
    height: "38px",
    border: "1px solid #ddd",
    background: "white",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "18px",
  },

  eliminar: {
    width: "42px",
    height: "38px",
    border: "1px solid #ffd0d0",
    background: "#fff1f1",
    color: "#c62828",
    borderRadius: "10px",
    cursor: "pointer",
  },

  gridDos: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
  },

  gridTres: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "14px",
  },

  bloqueFotos: {
    background: "#f7f7f7",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "20px",
  },

  tituloFotos: {
    margin: "0 0 15px",
    fontSize: "18px",
  },

  gridFotos: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px",
  },

  tarjetaFoto: {
    background: "white",
    border: "1px solid #e4e4e4",
    borderRadius: "16px",
    padding: "13px",
  },

  encabezadoFoto: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "11px",
  },

  badgePrincipal: {
    background: "#111",
    color: "white",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
  },

  badgeOpcional: {
    background: "#eee",
    color: "#555",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
  },

  previewFoto: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: "13px",
    display: "block",
  },

  selectorVacio: {
    minHeight: "230px",
    border: "2px dashed #ddd",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    cursor: "pointer",
    padding: "20px",
    textAlign: "center",
  },

  iconoCamara: {
    fontSize: "32px",
  },

  textoSelector: {
    color: "#888",
    fontSize: "12px",
  },

  botonesFoto: {
    display: "grid",
    gridTemplateColumns:
      "1fr auto",
    gap: "8px",
    marginTop: "10px",
  },

  botonFoto: {
    background: "#111",
    color: "white",
    borderRadius: "11px",
    padding: "12px",
    fontWeight: "800",
    textAlign: "center",
    cursor: "pointer",
  },

  quitarFoto: {
    border: "1px solid #ffcaca",
    background: "#fff3f3",
    color: "#b32626",
    borderRadius: "11px",
    padding: "0 14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  subiendoFoto: {
    marginTop: "9px",
    background: "#fff4d8",
    color: "#805d00",
    padding: "9px",
    borderRadius: "9px",
    fontSize: "12px",
    fontWeight: "700",
    textAlign: "center",
  },

  agregarVariante: {
    width: "100%",
    padding: "18px",
    border: "2px dashed #d97883",
    background: "#fff6f7",
    color: "#c85f6d",
    borderRadius: "17px",
    fontSize: "16px",
    fontWeight: "900",
    cursor: "pointer",
  },

  barraGuardar: {
    background: "white",
    padding: "18px",
    borderRadius: "20px",
    boxShadow:
      "0 7px 25px rgba(0,0,0,0.06)",
  },

  resumenGuardar: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    marginBottom: "13px",
    color: "#555",
    fontSize: "13px",
  },

  guardar: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "18px",
    background: "#d97883",
    color: "white",
    fontSize: "17px",
    fontWeight: "900",
  },
};
