"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoProductoPage() {
  const router = useRouter();

  const inputFoto1Ref = useRef(null);
  const inputFoto2Ref = useRef(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [foto1, setFoto1] = useState(null);
  const [foto2, setFoto2] = useState(null);

  const [previewFoto1, setPreviewFoto1] = useState("");
  const [previewFoto2, setPreviewFoto2] = useState("");

  const [formulario, setFormulario] = useState({
    referencia: "",
    nombre: "",
    categoria: "",
    descripcion: "",
    foto_url: "",
    foto_url_2: "",
    costo: "",
    precio_detal: "",
    precio_minimo: "",
    infoimagen: "",
    activo: true,
  });

  useEffect(() => {
    verificarAcceso();
  }, []);

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
      setMensaje("No pudimos comprobar tu acceso.");
      setCargando(false);
    }
  }

  function cambiarCampo(e) {
    const { name, value, type, checked } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
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

    return Number.isFinite(numero) ? numero : null;
  }

  // =========================================================
  // PREPARAR IMAGEN
  // =========================================================

  async function prepararImagen(archivo) {
    if (!archivo) return null;

    /*
      Intentamos optimizar JPEG, PNG y WEBP.

      Esto es especialmente útil cuando el iPhone entrega
      fotografías de muchos megapíxeles.

      No buscamos dejar la foto diminuta.
      Para joyería conservamos hasta 1800 px en su lado mayor
      y calidad WEBP de 0.9.
    */

    const tiposProcesables = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!tiposProcesables.includes(archivo.type)) {
      return archivo;
    }

    try {
      const imagen = await cargarImagen(archivo);

      const anchoOriginal = imagen.naturalWidth;
      const altoOriginal = imagen.naturalHeight;

      const maximo = 1800;

      let ancho = anchoOriginal;
      let alto = altoOriginal;

      if (anchoOriginal > maximo || altoOriginal > maximo) {
        if (anchoOriginal >= altoOriginal) {
          ancho = maximo;
          alto = Math.round(
            altoOriginal * (maximo / anchoOriginal)
          );
        } else {
          alto = maximo;
          ancho = Math.round(
            anchoOriginal * (maximo / altoOriginal)
          );
        }
      }

      const canvas = document.createElement("canvas");

      canvas.width = ancho;
      canvas.height = alto;

      const contexto = canvas.getContext("2d");

      if (!contexto) {
        return archivo;
      }

      contexto.imageSmoothingEnabled = true;
      contexto.imageSmoothingQuality = "high";

      contexto.drawImage(
        imagen,
        0,
        0,
        ancho,
        alto
      );

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (resultado) => resolve(resultado),
          "image/webp",
          0.9
        );
      });

      if (!blob) {
        return archivo;
      }

      /*
        Si por alguna razón la versión procesada queda
        más pesada que el archivo original, conservamos
        el original.
      */

      if (blob.size >= archivo.size) {
        return archivo;
      }

      return new File(
        [blob],
        `producto-${Date.now()}.webp`,
        {
          type: "image/webp",
        }
      );
    } catch (error) {
      console.warn(
        "No se pudo optimizar la imagen. Se usará el archivo original.",
        error
      );

      return archivo;
    }
  }

  function cargarImagen(archivo) {
    return new Promise((resolve, reject) => {
      const urlTemporal = URL.createObjectURL(archivo);
      const imagen = new Image();

      imagen.onload = () => {
        URL.revokeObjectURL(urlTemporal);
        resolve(imagen);
      };

      imagen.onerror = () => {
        URL.revokeObjectURL(urlTemporal);
        reject(
          new Error("No pudimos procesar esta imagen.")
        );
      };

      imagen.src = urlTemporal;
    });
  }

  // =========================================================
  // SELECCIONAR FOTO
  // =========================================================

  async function seleccionarFotoPrincipal(e) {
    const archivoOriginal = e.target.files?.[0];

    if (!archivoOriginal) return;

    setMensaje("");

    if (!archivoOriginal.type.startsWith("image/")) {
      setMensaje("Selecciona una fotografía válida.");
      return;
    }

    try {
      const archivoPreparado =
        await prepararImagen(archivoOriginal);

      setFoto1(archivoPreparado);

      if (previewFoto1) {
        URL.revokeObjectURL(previewFoto1);
      }

      setPreviewFoto1(
        URL.createObjectURL(archivoPreparado)
      );
    } catch (error) {
      console.error(error);
      setMensaje(
        "No pudimos preparar la fotografía principal."
      );
    }
  }

  async function seleccionarSegundaFoto(e) {
    const archivoOriginal = e.target.files?.[0];

    if (!archivoOriginal) return;

    setMensaje("");

    if (!archivoOriginal.type.startsWith("image/")) {
      setMensaje("Selecciona una fotografía válida.");
      return;
    }

    try {
      const archivoPreparado =
        await prepararImagen(archivoOriginal);

      setFoto2(archivoPreparado);

      if (previewFoto2) {
        URL.revokeObjectURL(previewFoto2);
      }

      setPreviewFoto2(
        URL.createObjectURL(archivoPreparado)
      );
    } catch (error) {
      console.error(error);
      setMensaje(
        "No pudimos preparar la segunda fotografía."
      );
    }
  }

  function eliminarFotoPrincipal() {
    if (previewFoto1) {
      URL.revokeObjectURL(previewFoto1);
    }

    setFoto1(null);
    setPreviewFoto1("");

    setFormulario((actual) => ({
      ...actual,
      foto_url: "",
    }));

    if (inputFoto1Ref.current) {
      inputFoto1Ref.current.value = "";
    }
  }

  function eliminarSegundaFoto() {
    if (previewFoto2) {
      URL.revokeObjectURL(previewFoto2);
    }

    setFoto2(null);
    setPreviewFoto2("");

    setFormulario((actual) => ({
      ...actual,
      foto_url_2: "",
    }));

    if (inputFoto2Ref.current) {
      inputFoto2Ref.current.value = "";
    }
  }

  // =========================================================
  // SUBIR FOTO A SUPABASE
  // =========================================================

  async function subirFoto(archivo) {
    if (!archivo) return "";

    const formData = new FormData();

    formData.append("foto", archivo);

    const response = await fetch(
      "/api/admin-maestro/productos/subir-foto",
      {
        method: "POST",
        body: formData,
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      console.error(
        "La respuesta al subir la foto no era JSON:",
        error
      );
    }

    if (!response.ok || !data.ok || !data.url) {
      throw new Error(
        data.mensaje ||
          data.detalle ||
          "No pudimos subir la fotografía."
      );
    }

    return data.url;
  }

  // =========================================================
  // GUARDAR PRODUCTO
  // =========================================================

  async function guardarProducto(e) {
    e.preventDefault();

    if (guardando) return;

    setMensaje("");

    const referencia = formulario.referencia.trim();
    const nombre = formulario.nombre.trim();

    if (!referencia) {
      setMensaje("La referencia es obligatoria.");
      return;
    }

    if (!nombre) {
      setMensaje(
        "El nombre del producto es obligatorio."
      );
      return;
    }

    const precioDetal = limpiarNumero(
      formulario.precio_detal
    );

    if (precioDetal === null || precioDetal < 0) {
      setMensaje(
        "Escribe un precio sugerido de venta válido."
      );
      return;
    }

    setGuardando(true);

    try {
      let fotoUrl = formulario.foto_url;
      let fotoUrl2 = formulario.foto_url_2;

      // FOTO PRINCIPAL

      if (foto1) {
        setMensaje(
          "📸 Subiendo fotografía principal..."
        );

        fotoUrl = await subirFoto(foto1);
      }

      // SEGUNDA FOTO

      if (foto2) {
        setMensaje(
          "📸 Subiendo segunda fotografía..."
        );

        fotoUrl2 = await subirFoto(foto2);
      }

      setMensaje("💾 Guardando producto...");

      const response = await fetch(
        "/api/admin-maestro/productos",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            referencia,
            nombre,
            categoria: formulario.categoria.trim(),
            descripcion:
              formulario.descripcion.trim(),

            foto_url: fotoUrl || "",
            foto_url_2: fotoUrl2 || "",

            costo: limpiarNumero(formulario.costo),

            precio_detal: precioDetal,

            precio_minimo: limpiarNumero(
              formulario.precio_minimo
            ),

            infoimagen:
              formulario.infoimagen.trim(),

            activo: formulario.activo,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensaje(
          data.mensaje ||
            "No pudimos guardar el producto."
        );

        return;
      }

      setMensaje(
        "✅ Producto creado correctamente."
      );

      if (previewFoto1) {
        URL.revokeObjectURL(previewFoto1);
      }

      if (previewFoto2) {
        URL.revokeObjectURL(previewFoto2);
      }

      setFoto1(null);
      setFoto2(null);

      setPreviewFoto1("");
      setPreviewFoto2("");

      if (inputFoto1Ref.current) {
        inputFoto1Ref.current.value = "";
      }

      if (inputFoto2Ref.current) {
        inputFoto2Ref.current.value = "";
      }

      setFormulario({
        referencia: "",
        nombre: "",
        categoria: "",
        descripcion: "",
        foto_url: "",
        foto_url_2: "",
        costo: "",
        precio_detal: "",
        precio_minimo: "",
        infoimagen: "",
        activo: true,
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Error guardando producto:",
        error
      );

      setMensaje(
        error.message ||
          "No pudimos guardar el producto. Intenta nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  }

  // =========================================================
  // CARGANDO
  // =========================================================

  if (cargando) {
    return (
      <main style={estilos.cargando}>
        <p>Cargando...</p>
      </main>
    );
  }

  // =========================================================
  // PANTALLA
  // =========================================================

  return (
    <main style={estilos.pagina}>
      <div style={estilos.contenedor}>
        <button
          type="button"
          onClick={() =>
            router.push("/admin-maestro")
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
            Agregar producto
          </h1>

          <p style={estilos.subtitulo}>
            Crea un nuevo producto para el catálogo
            central.
          </p>
        </div>

        {mensaje && (
          <div
            style={{
              ...estilos.mensaje,

              background: mensaje.startsWith("✅")
                ? "#eaf8ef"
                : mensaje.startsWith("📸") ||
                  mensaje.startsWith("💾")
                ? "#eef6ff"
                : "#ffeaea",

              color: mensaje.startsWith("✅")
                ? "#267541"
                : mensaje.startsWith("📸") ||
                  mensaje.startsWith("💾")
                ? "#245d91"
                : "#a33",
            }}
          >
            {mensaje}
          </div>
        )}

        <form
          onSubmit={guardarProducto}
          style={estilos.formulario}
        >
          {/* INFORMACIÓN PRINCIPAL */}

          <Seccion
            titulo="Información principal"
            icono="💎"
          >
            <Campo
              titulo="Referencia *"
              ayuda="Ejemplo: RA7534"
            >
              <input
                name="referencia"
                value={formulario.referencia}
                onChange={cambiarCampo}
                placeholder="RA7534"
                required
                style={estilos.input}
              />
            </Campo>

            <Campo
              titulo="Nombre del producto *"
              ayuda="Nombre que aparecerá en el catálogo."
            >
              <input
                name="nombre"
                value={formulario.nombre}
                onChange={cambiarCampo}
                placeholder="Pulsera dorada"
                required
                style={estilos.input}
              />
            </Campo>

            <Campo titulo="Categoría">
              <input
                name="categoria"
                value={formulario.categoria}
                onChange={cambiarCampo}
                placeholder="Pulseras"
                style={estilos.input}
              />
            </Campo>

            <Campo titulo="Descripción">
              <textarea
                name="descripcion"
                value={formulario.descripcion}
                onChange={cambiarCampo}
                placeholder="Descripción del producto..."
                rows={4}
                style={{
                  ...estilos.input,
                  resize: "vertical",
                }}
              />
            </Campo>
          </Seccion>

          {/* FOTOGRAFÍAS */}

          <Seccion titulo="Fotografías" icono="📸">
            <p style={estilos.explicacion}>
              Selecciona las fotografías directamente
              desde tu galería. Las imágenes grandes se
              optimizarán automáticamente manteniendo una
              calidad alta para el catálogo.
            </p>

            {/* FOTO PRINCIPAL */}

            <div style={estilos.bloqueFoto}>
              <div style={estilos.tituloFoto}>
                Foto principal
              </div>

              <div style={estilos.ayudaFoto}>
                Esta será la primera imagen que verá el
                cliente.
              </div>

              <input
                ref={inputFoto1Ref}
                type="file"
                accept="image/*"
                onChange={seleccionarFotoPrincipal}
                style={{ display: "none" }}
              />

              {!previewFoto1 ? (
                <button
                  type="button"
                  onClick={() =>
                    inputFoto1Ref.current?.click()
                  }
                  style={estilos.botonGaleria}
                >
                  <span style={estilos.iconoGaleria}>
                    📷
                  </span>

                  <div>
                    <strong>
                      Seleccionar foto principal
                    </strong>

                    <div
                      style={estilos.textoBotonGaleria}
                    >
                      Elegir desde la galería
                    </div>
                  </div>
                </button>
              ) : (
                <div style={estilos.fotoSeleccionada}>
                  <img
                    src={previewFoto1}
                    alt="Vista previa foto principal"
                    style={estilos.previewGrande}
                  />

                  <div
                    style={
                      estilos.accionesFotografia
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        inputFoto1Ref.current?.click()
                      }
                      style={estilos.botonCambiar}
                    >
                      📷 Cambiar
                    </button>

                    <button
                      type="button"
                      onClick={eliminarFotoPrincipal}
                      style={estilos.botonEliminar}
                    >
                      🗑️ Quitar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SEGUNDA FOTO */}

            <div
              style={{
                ...estilos.bloqueFoto,
                marginBottom: 0,
              }}
            >
              <div style={estilos.tituloFoto}>
                Segunda foto
              </div>

              <div style={estilos.ayudaFoto}>
                Opcional. Puedes mostrar otro ángulo o
                detalle del producto.
              </div>

              <input
                ref={inputFoto2Ref}
                type="file"
                accept="image/*"
                onChange={seleccionarSegundaFoto}
                style={{ display: "none" }}
              />

              {!previewFoto2 ? (
                <button
                  type="button"
                  onClick={() =>
                    inputFoto2Ref.current?.click()
                  }
                  style={estilos.botonGaleria}
                >
                  <span style={estilos.iconoGaleria}>
                    📷
                  </span>

                  <div>
                    <strong>
                      Seleccionar segunda foto
                    </strong>

                    <div
                      style={estilos.textoBotonGaleria}
                    >
                      Elegir desde la galería
                    </div>
                  </div>
                </button>
              ) : (
                <div style={estilos.fotoSeleccionada}>
                  <img
                    src={previewFoto2}
                    alt="Vista previa segunda foto"
                    style={estilos.previewGrande}
                  />

                  <div
                    style={
                      estilos.accionesFotografia
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        inputFoto2Ref.current?.click()
                      }
                      style={estilos.botonCambiar}
                    >
                      📷 Cambiar
                    </button>

                    <button
                      type="button"
                      onClick={eliminarSegundaFoto}
                      style={estilos.botonEliminar}
                    >
                      🗑️ Quitar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Seccion>

          {/* PRECIOS */}

          <Seccion titulo="Precios" icono="💰">
            <div style={estilos.gridPrecios}>
              <Campo titulo="Tu costo">
                <input
                  type="number"
                  inputMode="numeric"
                  name="costo"
                  value={formulario.costo}
                  onChange={cambiarCampo}
                  placeholder="5000"
                  min="0"
                  step="1"
                  style={estilos.input}
                />
              </Campo>

              <Campo titulo="Precio sugerido *">
                <input
                  type="number"
                  inputMode="numeric"
                  name="precio_detal"
                  value={formulario.precio_detal}
                  onChange={cambiarCampo}
                  placeholder="10000"
                  min="0"
                  step="1"
                  required
                  style={estilos.input}
                />
              </Campo>
            </div>

            <Campo
              titulo="Precio mínimo"
              ayuda="Precio mínimo recomendado para vender este producto."
            >
              <input
                type="number"
                inputMode="numeric"
                name="precio_minimo"
                value={formulario.precio_minimo}
                onChange={cambiarCampo}
                placeholder="8000"
                min="0"
                step="1"
                style={estilos.input}
              />
            </Campo>
          </Seccion>

          {/* INFORMACIÓN INTERNA */}

          <Seccion
            titulo="Información interna"
            icono="🔗"
          >
            <Campo
              titulo="INFOIMAGEN"
              ayuda="Este dato es interno. No se mostrará en el catálogo público."
            >
              <textarea
                name="infoimagen"
                value={formulario.infoimagen}
                onChange={cambiarCampo}
                placeholder="Información interna para pedidos o automatizaciones..."
                rows={4}
                style={{
                  ...estilos.input,
                  resize: "vertical",
                }}
              />
            </Campo>

            <label style={estilos.switchFila}>
              <input
                type="checkbox"
                name="activo"
                checked={formulario.activo}
                onChange={cambiarCampo}
                style={{
                  width: "22px",
                  height: "22px",
                }}
              />

              <div>
                <strong>Producto activo</strong>

                <div style={estilos.ayuda}>
                  Si está activo podrá aparecer en los
                  catálogos.
                </div>
              </div>
            </label>
          </Seccion>

          {/* GUARDAR */}

          <div style={estilos.barraGuardar}>
            <button
              type="submit"
              disabled={guardando}
              style={{
                ...estilos.guardar,
                opacity: guardando ? 0.65 : 1,
                cursor: guardando
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {guardando
                ? "Guardando producto..."
                : "＋ Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

// =========================================================
// COMPONENTES
// =========================================================

function Seccion({ titulo, icono, children }) {
  return (
    <section style={estilos.seccion}>
      <h2 style={estilos.tituloSeccion}>
        <span>{icono}</span>
        {titulo}
      </h2>

      {children}
    </section>
  );
}

function Campo({ titulo, ayuda, children }) {
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

// =========================================================
// ESTILOS
// =========================================================

const estilos = {
  pagina: {
    minHeight: "100vh",
    background: "#f6f7f9",
    padding: "20px 14px 70px",
  },

  cargando: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f6f7f9",
  },

  contenedor: {
    maxWidth: "760px",
    margin: "0 auto",
  },

  volver: {
    border: "none",
    background: "transparent",
    padding: "10px 0",
    marginBottom: "10px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  encabezado: {
    background: "#111",
    color: "white",
    borderRadius: "22px",
    padding: "25px",
    marginBottom: "18px",
  },

  etiqueta: {
    display: "inline-block",
    background: "#d97883",
    padding: "6px 11px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    marginBottom: "12px",
  },

  titulo: {
    margin: 0,
    fontSize: "31px",
  },

  subtitulo: {
    marginTop: "8px",
    marginBottom: 0,
    color: "#ccc",
    lineHeight: "1.5",
  },

  mensaje: {
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "16px",
    lineHeight: "1.5",
    fontWeight: "600",
  },

  formulario: {
    display: "grid",
    gap: "16px",
  },

  seccion: {
    background: "white",
    padding: "22px",
    borderRadius: "20px",
    boxShadow: "0 7px 25px rgba(0,0,0,0.05)",
  },

  tituloSeccion: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginTop: 0,
    marginBottom: "22px",
    fontSize: "21px",
  },

  explicacion: {
    color: "#777",
    fontSize: "14px",
    lineHeight: "1.5",
    marginTop: "-10px",
    marginBottom: "20px",
  },

  campo: {
    marginBottom: "19px",
  },

  label: {
    display: "block",
    fontWeight: "700",
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
    borderRadius: "11px",
    padding: "14px",
    fontSize: "16px",
    background: "white",
    outline: "none",
  },

  gridPrecios: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },

  bloqueFoto: {
    marginBottom: "28px",
  },

  tituloFoto: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#222",
    marginBottom: "5px",
  },

  ayudaFoto: {
    fontSize: "13px",
    color: "#888",
    lineHeight: "1.45",
    marginBottom: "11px",
  },

  botonGaleria: {
    width: "100%",
    minHeight: "100px",
    border: "2px dashed #d7d7d7",
    borderRadius: "16px",
    background: "#fafafa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "13px",
    padding: "18px",
    color: "#222",
    fontSize: "15px",
    cursor: "pointer",
    textAlign: "left",
  },

  iconoGaleria: {
    fontSize: "32px",
  },

  textoBotonGaleria: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#888",
    fontWeight: "400",
  },

  fotoSeleccionada: {
    width: "100%",
  },

  previewGrande: {
    display: "block",
    width: "100%",
    maxHeight: "460px",
    aspectRatio: "1 / 1",
    objectFit: "contain",
    background: "#f7f7f7",
    border: "1px solid #eee",
    borderRadius: "16px",
  },

  accionesFotografia: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "10px",
  },

  botonCambiar: {
    border: "1px solid #ddd",
    borderRadius: "11px",
    padding: "12px",
    background: "white",
    color: "#222",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
  },

  botonEliminar: {
    border: "1px solid #f1cccc",
    borderRadius: "11px",
    padding: "12px",
    background: "#fff5f5",
    color: "#a33",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
  },

  switchFila: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    background: "#f7f7f7",
    borderRadius: "12px",
    cursor: "pointer",
  },

  barraGuardar: {
    background: "white",
    padding: "16px",
    borderRadius: "18px",
    boxShadow: "0 7px 25px rgba(0,0,0,0.06)",
  },

  guardar: {
    width: "100%",
    border: "none",
    borderRadius: "13px",
    padding: "17px",
    background: "#d97883",
    color: "white",
    fontSize: "17px",
    fontWeight: "800",
  },
};