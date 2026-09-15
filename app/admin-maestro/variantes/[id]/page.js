"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditarProductoVariantesPage() {
  const router = useRouter();
  const params = useParams();

  const productoId = params?.id;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [producto, setProducto] = useState({
    nombre: "",
    categoria: "",
    descripcion: "",
    activo: true,
  });

  const [variantes, setVariantes] = useState([]);

  /* =========================================================
     CARGAR
  ========================================================= */

  useEffect(() => {
    if (productoId) {
      cargarProducto();
    }
  }, [productoId]);

  async function cargarProducto() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      /* =====================================================
         1. COMPROBAR SESIÓN
      ===================================================== */

      const respuestaSesion = await fetch("/api/auth/sesion", {
        method: "GET",
        cache: "no-store",
      });

      const sesion = await respuestaSesion.json();

      if (!respuestaSesion.ok || !sesion.autenticado) {
        router.replace("/login");
        return;
      }

      if (sesion.cliente?.rol !== "MAESTRO") {
        router.replace("/admin");
        return;
      }

      /* =====================================================
         2. CARGAR PRODUCTO
      ===================================================== */

      const respuesta = await fetch(
        `/api/admin-maestro/variantes?id=${encodeURIComponent(
          productoId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos cargar el producto."
        );
      }

      /*
        Nuestra API GET devuelve productos[].
        Buscamos el producto solicitado.
      */

      const productos = Array.isArray(data.productos)
        ? data.productos
        : [];

      const encontrado = productos.find(
        (item) =>
          String(item.id) === String(productoId)
      );

      if (!encontrado) {
        throw new Error(
          "No encontramos este producto con variantes."
        );
      }

      setProducto({
        nombre: encontrado.nombre || "",
        categoria: encontrado.categoria || "",
        descripcion: encontrado.descripcion || "",
        activo: encontrado.activo !== false,
      });

      const variantesEncontradas = Array.isArray(
        encontrado.variantes
      )
        ? encontrado.variantes
        : [];

      setVariantes(
        variantesEncontradas.map((variante, indice) => ({
          id: variante.id,

          nombre_variante:
            variante.nombre_variante || "",

          referencia:
            variante.referencia || "",

          foto_url:
            variante.foto_url || "",

          foto_url_2:
            variante.foto_url_2 || "",

          costo:
            variante.costo ?? "",

          precio_detal:
            variante.precio_detal ?? "",

          precio_minimo:
            variante.precio_minimo ?? "",

          infoimagen:
            variante.infoimagen || "",

          activo:
            variante.activo !== false,

          orden:
            variante.orden ?? indice,

          archivoFoto1: null,
          archivoFoto2: null,

          previewFoto1:
            variante.foto_url || "",

          previewFoto2:
            variante.foto_url_2 || "",

          subiendoFoto1: false,
          subiendoFoto2: false,

          nueva: false,
        }))
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Ocurrió un error cargando el producto."
      );
    } finally {
      setCargando(false);
    }
  }

  /* =========================================================
     CAMBIAR PRODUCTO
  ========================================================= */

  function cambiarProducto(campo, valor) {
    setProducto((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  /* =========================================================
     CAMBIAR VARIANTE
  ========================================================= */

  function cambiarVariante(indice, campo, valor) {
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

  /* =========================================================
     AGREGAR VARIANTE
  ========================================================= */

  function agregarVariante() {
    setVariantes((actuales) => [
      ...actuales,
      {
        id: null,

        nombre_variante: "",
        referencia: "",

        foto_url: "",
        foto_url_2: "",

        costo: "",
        precio_detal: "",
        precio_minimo: "",

        infoimagen: "",

        activo: true,

        orden: actuales.length,

        archivoFoto1: null,
        archivoFoto2: null,

        previewFoto1: "",
        previewFoto2: "",

        subiendoFoto1: false,
        subiendoFoto2: false,

        nueva: true,
      },
    ]);
  }

  /* =========================================================
     ELIMINAR VARIANTE
  ========================================================= */

  function eliminarVariante(indice) {
    if (variantes.length <= 1) {
      window.alert(
        "El producto debe tener por lo menos una variante."
      );
      return;
    }

    const variante = variantes[indice];

    const confirmar = window.confirm(
      `¿Seguro que deseas quitar la variante "${
        variante.nombre_variante || `#${indice + 1}`
      }"?`
    );

    if (!confirmar) return;

    setVariantes((actuales) =>
      actuales
        .filter((_, i) => i !== indice)
        .map((item, nuevoIndice) => ({
          ...item,
          orden: nuevoIndice,
        }))
    );
  }

  /* =========================================================
     MOVER ARRIBA
  ========================================================= */

  function moverArriba(indice) {
    if (indice === 0) return;

    setVariantes((actuales) => {
      const copia = [...actuales];

      [copia[indice - 1], copia[indice]] = [
        copia[indice],
        copia[indice - 1],
      ];

      return copia.map((item, i) => ({
        ...item,
        orden: i,
      }));
    });
  }

  /* =========================================================
     MOVER ABAJO
  ========================================================= */

  function moverAbajo(indice) {
    if (indice >= variantes.length - 1) return;

    setVariantes((actuales) => {
      const copia = [...actuales];

      [copia[indice], copia[indice + 1]] = [
        copia[indice + 1],
        copia[indice],
      ];

      return copia.map((item, i) => ({
        ...item,
        orden: i,
      }));
    });
  }

  /* =========================================================
     SELECCIONAR FOTO
  ========================================================= */

  function seleccionarFoto(indice, numeroFoto, archivo) {
    if (!archivo) return;

    if (!archivo.type?.startsWith("image/")) {
      window.alert(
        "Debes seleccionar un archivo de imagen."
      );
      return;
    }

    const preview = URL.createObjectURL(archivo);

    setVariantes((actuales) =>
      actuales.map((variante, i) => {
        if (i !== indice) {
          return variante;
        }

        if (numeroFoto === 1) {
          return {
            ...variante,
            archivoFoto1: archivo,
            previewFoto1: preview,
          };
        }

        return {
          ...variante,
          archivoFoto2: archivo,
          previewFoto2: preview,
        };
      })
    );
  }

  /* =========================================================
     SUBIR FOTO
  ========================================================= */

  async function subirFoto(indice, numeroFoto) {
    const variante = variantes[indice];

    const archivo =
      numeroFoto === 1
        ? variante.archivoFoto1
        : variante.archivoFoto2;

    if (!archivo) {
      window.alert(
        "Primero selecciona una fotografía."
      );
      return;
    }

    const campoSubiendo =
      numeroFoto === 1
        ? "subiendoFoto1"
        : "subiendoFoto2";

    cambiarVariante(
      indice,
      campoSubiendo,
      true
    );

    try {
      const formData = new FormData();

      formData.append("foto", archivo);

      const respuesta = await fetch(
        "/api/admin-maestro/productos/subir-foto",
        {
          method: "POST",
          body: formData,
        }
      );

      const texto = await respuesta.text();

      let data = {};

      try {
        data = texto ? JSON.parse(texto) : {};
      } catch {
        throw new Error(
          "El servidor respondió de forma incorrecta al subir la foto."
        );
      }

      if (!respuesta.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos subir la fotografía."
        );
      }

      const url =
        data.url ||
        data.foto_url ||
        data.publicUrl;

      if (!url) {
        throw new Error(
          "La fotografía se subió pero no recibimos su URL."
        );
      }

      setVariantes((actuales) =>
        actuales.map((item, i) => {
          if (i !== indice) {
            return item;
          }

          if (numeroFoto === 1) {
            return {
              ...item,
              foto_url: url,
              previewFoto1: url,
              archivoFoto1: null,
              subiendoFoto1: false,
            };
          }

          return {
            ...item,
            foto_url_2: url,
            previewFoto2: url,
            archivoFoto2: null,
            subiendoFoto2: false,
          };
        })
      );
    } catch (err) {
      console.error(err);

      window.alert(
        err.message ||
          "Ocurrió un error subiendo la fotografía."
      );

      cambiarVariante(
        indice,
        campoSubiendo,
        false
      );
    }
  }

  /* =========================================================
     QUITAR FOTO 2
  ========================================================= */

  function quitarFoto2(indice) {
    setVariantes((actuales) =>
      actuales.map((item, i) =>
        i === indice
          ? {
              ...item,
              foto_url_2: "",
              previewFoto2: "",
              archivoFoto2: null,
            }
          : item
      )
    );
  }

  /* =========================================================
     VALIDAR
  ========================================================= */

  function validar() {
    if (!producto.nombre.trim()) {
      setError(
        "Debes escribir el nombre del producto."
      );
      return false;
    }

    if (variantes.length === 0) {
      setError(
        "El producto necesita por lo menos una variante."
      );
      return false;
    }

    const referencias = new Set();

    for (
      let i = 0;
      i < variantes.length;
      i++
    ) {
      const variante = variantes[i];

      if (!variante.nombre_variante.trim()) {
        setError(
          `La variante ${i + 1} necesita un nombre.`
        );
        return false;
      }

      if (!variante.referencia.trim()) {
        setError(
          `La variante ${i + 1} necesita una referencia.`
        );
        return false;
      }

      const referencia =
        variante.referencia
          .trim()
          .toUpperCase();

      if (referencias.has(referencia)) {
        setError(
          `La referencia ${variante.referencia} está repetida.`
        );
        return false;
      }

      referencias.add(referencia);

      if (!variante.foto_url) {
        setError(
          `La variante ${i + 1} necesita una fotografía principal.`
        );
        return false;
      }

      if (
        variante.precio_detal === "" ||
        variante.precio_detal === null ||
        Number.isNaN(
          Number(variante.precio_detal)
        )
      ) {
        setError(
          `La variante ${i + 1} necesita un precio sugerido válido.`
        );
        return false;
      }
    }

    return true;
  }

  /* =========================================================
     GUARDAR
  ========================================================= */

  async function guardarCambios(e) {
    e.preventDefault();

    if (guardando) return;

    setError("");
    setMensaje("");

    if (!validar()) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const hayFotosPendientes =
      variantes.some(
        (variante) =>
          variante.archivoFoto1 ||
          variante.archivoFoto2
      );

    if (hayFotosPendientes) {
      setError(
        'Hay fotografías seleccionadas que todavía no has subido. Presiona "Subir foto" antes de guardar.'
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setGuardando(true);

    try {
      const variantesPreparadas =
        variantes.map((variante, indice) => ({
          id: variante.id || null,

          nombre_variante:
            variante.nombre_variante.trim(),

          referencia:
            variante.referencia.trim(),

          foto_url:
            variante.foto_url || null,

          foto_url_2:
            variante.foto_url_2 || null,

          costo:
            variante.costo === ""
              ? null
              : Number(variante.costo),

          precio_detal:
            variante.precio_detal === ""
              ? null
              : Number(variante.precio_detal),

          precio_minimo:
            variante.precio_minimo === ""
              ? null
              : Number(variante.precio_minimo),

          infoimagen:
            variante.infoimagen.trim() || null,

          activo:
            variante.activo !== false,

          orden:
            indice,
        }));

      const respuesta = await fetch(
        `/api/admin-maestro/variantes?id=${encodeURIComponent(
          productoId
        )}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            nombre: producto.nombre.trim(),

            categoria:
              producto.categoria.trim() || null,

            descripcion:
              producto.descripcion.trim() || null,

            activo:
              producto.activo !== false,

            variantes:
              variantesPreparadas,
          }),
        }
      );

      const texto = await respuesta.text();

      let data = {};

      try {
        data = texto ? JSON.parse(texto) : {};
      } catch {
        throw new Error(
          "El servidor respondió de forma incorrecta al guardar."
        );
      }

      if (!respuesta.ok || !data.ok) {
        throw new Error(
          data.mensaje ||
            "No pudimos guardar los cambios."
        );
      }

      setMensaje(
        "Producto actualizado correctamente."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      /*
        Recargamos para recibir los IDs
        de variantes nuevas y confirmar
        exactamente lo guardado.
      */

      await cargarProducto();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Ocurrió un error guardando los cambios."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setGuardando(false);
    }
  }

  /* =========================================================
     CARGANDO
  ========================================================= */

  if (cargando) {
    return (
      <main style={estilos.pagina}>
        <div style={estilos.cargando}>
          Cargando producto...
        </div>
      </main>
    );
  }

  /* =========================================================
     PÁGINA
  ========================================================= */

  return (
    <main style={estilos.pagina}>
      <div style={estilos.contenedor}>
        {/* VOLVER */}

        <button
          type="button"
          onClick={() =>
            router.push(
              "/admin-maestro/variantes"
            )
          }
          style={estilos.volver}
        >
          ← Volver a productos con variantes
        </button>

        {/* ENCABEZADO */}

        <section style={estilos.encabezado}>
          <div style={estilos.insignia}>
            ADMINISTRADOR MAESTRO
          </div>

          <h1 style={estilos.titulo}>
            Editar producto con variantes
          </h1>

          <p style={estilos.subtitulo}>
            Modifica el producto principal y cada una
            de sus opciones.
          </p>
        </section>

        {/* MENSAJES */}

        {mensaje && (
          <div style={estilos.mensajeExito}>
            ✅ {mensaje}
          </div>
        )}

        {error && (
          <div style={estilos.mensajeError}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={guardarCambios}>
          {/* ===============================================
              INFORMACIÓN GENERAL
          =============================================== */}

          <section style={estilos.seccion}>
            <div style={estilos.tituloSeccionFila}>
              <div>
                <h2 style={estilos.tituloSeccion}>
                  📦 Información general
                </h2>

                <p style={estilos.ayuda}>
                  Estos datos pertenecen al producto
                  principal.
                </p>
              </div>

              <label style={estilos.switchCaja}>
                <input
                  type="checkbox"
                  checked={producto.activo}
                  onChange={(e) =>
                    cambiarProducto(
                      "activo",
                      e.target.checked
                    )
                  }
                />

                <span>
                  {producto.activo
                    ? "Producto activo"
                    : "Producto inactivo"}
                </span>
              </label>
            </div>

            <div style={estilos.gridDos}>
              <Campo
                titulo="Nombre del producto *"
                valor={producto.nombre}
                onChange={(valor) =>
                  cambiarProducto(
                    "nombre",
                    valor
                  )
                }
                placeholder="Ejemplo: Dije de letras"
              />

              <Campo
                titulo="Categoría"
                valor={producto.categoria}
                onChange={(valor) =>
                  cambiarProducto(
                    "categoria",
                    valor
                  )
                }
                placeholder="Ejemplo: DIJES"
              />
            </div>

            <div style={{ marginTop: "18px" }}>
              <label style={estilos.label}>
                Descripción
              </label>

              <textarea
                value={producto.descripcion}
                onChange={(e) =>
                  cambiarProducto(
                    "descripcion",
                    e.target.value
                  )
                }
                placeholder="Descripción del producto..."
                style={estilos.textarea}
              />
            </div>
          </section>

          {/* ===============================================
              VARIANTES
          =============================================== */}

          <section style={estilos.seccion}>
            <div style={estilos.tituloSeccionFila}>
              <div>
                <h2 style={estilos.tituloSeccion}>
                  🔤 Variantes
                </h2>

                <p style={estilos.ayuda}>
                  Cada variante puede tener su propia
                  referencia, fotos, costo y precios.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarVariante}
                style={estilos.botonAgregar}
              >
                ＋ Agregar variante
              </button>
            </div>

            <div style={estilos.listaVariantes}>
              {variantes.map(
                (variante, indice) => (
                  <article
                    key={
                      variante.id ||
                      `nueva-${indice}`
                    }
                    style={estilos.tarjetaVariante}
                  >
                    {/* CABECERA VARIANTE */}

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
                          VARIANTE {indice + 1}
                        </div>

                        <h3
                          style={
                            estilos.nombreVarianteTitulo
                          }
                        >
                          {variante.nombre_variante ||
                            "Nueva variante"}
                        </h3>

                        {variante.referencia && (
                          <div
                            style={
                              estilos.referenciaTitulo
                            }
                          >
                            {variante.referencia}
                          </div>
                        )}
                      </div>

                      <div
                        style={
                          estilos.accionesOrden
                        }
                      >
                        <button
                          type="button"
                          disabled={indice === 0}
                          onClick={() =>
                            moverArriba(indice)
                          }
                          style={{
                            ...estilos.botonOrden,
                            opacity:
                              indice === 0
                                ? 0.35
                                : 1,
                          }}
                          title="Mover arriba"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          disabled={
                            indice ===
                            variantes.length - 1
                          }
                          onClick={() =>
                            moverAbajo(indice)
                          }
                          style={{
                            ...estilos.botonOrden,
                            opacity:
                              indice ===
                              variantes.length - 1
                                ? 0.35
                                : 1,
                          }}
                          title="Mover abajo"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            eliminarVariante(indice)
                          }
                          style={
                            estilos.botonQuitar
                          }
                        >
                          🗑️ Quitar
                        </button>
                      </div>
                    </div>

                    {/* ACTIVO */}

                    <div style={estilos.estadoVariante}>
                      <label style={estilos.switchCaja}>
                        <input
                          type="checkbox"
                          checked={variante.activo}
                          onChange={(e) =>
                            cambiarVariante(
                              indice,
                              "activo",
                              e.target.checked
                            )
                          }
                        />

                        <span>
                          {variante.activo
                            ? "Variante activa"
                            : "Variante inactiva"}
                        </span>
                      </label>
                    </div>

                    {/* NOMBRE Y REFERENCIA */}

                    <div style={estilos.gridDos}>
                      <Campo
                        titulo="Nombre de la variante *"
                        valor={
                          variante.nombre_variante
                        }
                        onChange={(valor) =>
                          cambiarVariante(
                            indice,
                            "nombre_variante",
                            valor
                          )
                        }
                        placeholder="Ejemplo: DORADO"
                      />

                      <Campo
                        titulo="Referencia *"
                        valor={variante.referencia}
                        onChange={(valor) =>
                          cambiarVariante(
                            indice,
                            "referencia",
                            valor
                          )
                        }
                        placeholder="Ejemplo: RA8000"
                      />
                    </div>

                    {/* FOTOS */}

                    <div style={estilos.bloqueFotos}>
                      <h4 style={estilos.subtituloBloque}>
                        📷 Fotografías
                      </h4>

                      <div style={estilos.gridFotos}>
                        {/* FOTO 1 */}

                        <FotoEditor
                          titulo="Foto principal *"
                          preview={
                            variante.previewFoto1
                          }
                          archivo={
                            variante.archivoFoto1
                          }
                          subiendo={
                            variante.subiendoFoto1
                          }
                          onSeleccionar={(archivo) =>
                            seleccionarFoto(
                              indice,
                              1,
                              archivo
                            )
                          }
                          onSubir={() =>
                            subirFoto(indice, 1)
                          }
                        />

                        {/* FOTO 2 */}

                        <FotoEditor
                          titulo="Segunda foto (opcional)"
                          preview={
                            variante.previewFoto2
                          }
                          archivo={
                            variante.archivoFoto2
                          }
                          subiendo={
                            variante.subiendoFoto2
                          }
                          onSeleccionar={(archivo) =>
                            seleccionarFoto(
                              indice,
                              2,
                              archivo
                            )
                          }
                          onSubir={() =>
                            subirFoto(indice, 2)
                          }
                          opcional
                          onQuitar={() =>
                            quitarFoto2(indice)
                          }
                        />
                      </div>
                    </div>

                    {/* PRECIOS */}

                    <div style={estilos.bloqueDatos}>
                      <h4 style={estilos.subtituloBloque}>
                        💰 Costos y precios
                      </h4>

                      <div style={estilos.gridTres}>
                        <Campo
                          titulo="Costo"
                          tipo="number"
                          valor={variante.costo}
                          onChange={(valor) =>
                            cambiarVariante(
                              indice,
                              "costo",
                              valor
                            )
                          }
                          placeholder="0"
                        />

                        <Campo
                          titulo="Precio sugerido *"
                          tipo="number"
                          valor={
                            variante.precio_detal
                          }
                          onChange={(valor) =>
                            cambiarVariante(
                              indice,
                              "precio_detal",
                              valor
                            )
                          }
                          placeholder="0"
                        />

                        <Campo
                          titulo="Precio mínimo"
                          tipo="number"
                          valor={
                            variante.precio_minimo
                          }
                          onChange={(valor) =>
                            cambiarVariante(
                              indice,
                              "precio_minimo",
                              valor
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* INFOIMAGEN */}

                    <div style={estilos.bloqueDatos}>
                      <label style={estilos.label}>
                        INFOIMAGEN
                      </label>

                      <input
                        type="text"
                        value={variante.infoimagen}
                        onChange={(e) =>
                          cambiarVariante(
                            indice,
                            "infoimagen",
                            e.target.value
                          )
                        }
                        placeholder="Información interna para pedidos"
                        style={estilos.input}
                      />

                      <p style={estilos.nota}>
                        Este dato es interno y no tiene
                        que mostrarse en el catálogo
                        público.
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>

            <button
              type="button"
              onClick={agregarVariante}
              style={estilos.botonAgregarAbajo}
            >
              ＋ Agregar otra variante
            </button>
          </section>

          {/* ===============================================
              GUARDAR
          =============================================== */}

          <section style={estilos.guardarCaja}>
            <div>
              <strong style={{ fontSize: "18px" }}>
                ¿Terminaste los cambios?
              </strong>

              <p style={estilos.ayuda}>
                Revisa las referencias, fotografías y
                precios antes de guardar.
              </p>
            </div>

            <div style={estilos.botonesGuardar}>
              <button
                type="button"
                disabled={guardando}
                onClick={() =>
                  router.push(
                    "/admin-maestro/variantes"
                  )
                }
                style={estilos.botonCancelar}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                style={{
                  ...estilos.botonGuardar,
                  opacity: guardando ? 0.6 : 1,
                  cursor: guardando
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {guardando
                  ? "Guardando..."
                  : "💾 Guardar cambios"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTE CAMPO
========================================================= */

function Campo({
  titulo,
  valor,
  onChange,
  placeholder,
  tipo = "text",
}) {
  return (
    <div>
      <label style={estilos.label}>
        {titulo}
      </label>

      <input
        type={tipo}
        value={valor}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        min={
          tipo === "number"
            ? "0"
            : undefined
        }
        step={
          tipo === "number"
            ? "any"
            : undefined
        }
        style={estilos.input}
      />
    </div>
  );
}

/* =========================================================
   COMPONENTE FOTO
========================================================= */

function FotoEditor({
  titulo,
  preview,
  archivo,
  subiendo,
  onSeleccionar,
  onSubir,
  opcional = false,
  onQuitar,
}) {
  return (
    <div style={estilos.fotoCard}>
      <div style={estilos.fotoTitulo}>
        {titulo}
      </div>

      <div style={estilos.fotoPreviewCaja}>
        {preview ? (
          <img
            src={preview}
            alt={titulo}
            style={estilos.fotoPreview}
          />
        ) : (
          <div style={estilos.sinFoto}>
            <div style={{ fontSize: "38px" }}>
              📷
            </div>

            <span>Sin fotografía</span>
          </div>
        )}
      </div>

      <label style={estilos.botonSeleccionarFoto}>
        📁 Elegir foto

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            onSeleccionar(
              e.target.files?.[0] || null
            )
          }
          style={{
            display: "none",
          }}
        />
      </label>

      {archivo && (
        <div style={estilos.fotoPendiente}>
          Nueva foto seleccionada
        </div>
      )}

      {archivo && (
        <button
          type="button"
          disabled={subiendo}
          onClick={onSubir}
          style={{
            ...estilos.botonSubirFoto,
            opacity: subiendo ? 0.6 : 1,
          }}
        >
          {subiendo
            ? "Subiendo..."
            : "⬆️ Subir foto"}
        </button>
      )}

      {opcional && preview && !archivo && (
        <button
          type="button"
          onClick={onQuitar}
          style={estilos.botonEliminarFoto}
        >
          Quitar segunda foto
        </button>
      )}
    </div>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const estilos = {
  pagina: {
    minHeight: "100vh",
    background: "#f6f7f9",
    padding: "30px 16px 70px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  contenedor: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
  },

  cargando: {
    maxWidth: "650px",
    margin: "100px auto",
    background: "white",
    borderRadius: "20px",
    padding: "35px",
    textAlign: "center",
    fontSize: "18px",
  },

  volver: {
    border: "none",
    background: "transparent",
    padding: "5px 0",
    marginBottom: "20px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  encabezado: {
    background: "#111",
    color: "white",
    borderRadius: "24px",
    padding: "30px",
    marginBottom: "20px",
    boxShadow:
      "0 12px 35px rgba(0,0,0,0.10)",
  },

  insignia: {
    display: "inline-block",
    background: "#d97883",
    borderRadius: "999px",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: "900",
    marginBottom: "15px",
  },

  titulo: {
    margin: 0,
    fontSize: "34px",
  },

  subtitulo: {
    color: "#ddd",
    marginTop: "8px",
    marginBottom: 0,
    lineHeight: "1.5",
  },

  mensajeExito: {
    background: "#e8f8ee",
    color: "#16783a",
    borderRadius: "14px",
    padding: "16px",
    fontWeight: "700",
    marginBottom: "18px",
  },

  mensajeError: {
    background: "#ffeaea",
    color: "#b52b2b",
    borderRadius: "14px",
    padding: "16px",
    fontWeight: "700",
    marginBottom: "18px",
  },

  seccion: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.05)",
  },

  tituloSeccionFila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "22px",
  },

  tituloSeccion: {
    margin: 0,
    fontSize: "23px",
  },

  ayuda: {
    color: "#777",
    marginTop: "6px",
    marginBottom: 0,
    lineHeight: "1.5",
  },

  switchCaja: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
  },

  gridDos: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "18px",
  },

  gridTres: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontWeight: "800",
    fontSize: "14px",
    color: "#333",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "11px",
    padding: "13px 14px",
    fontSize: "15px",
    outline: "none",
    background: "white",
  },

  textarea: {
    width: "100%",
    minHeight: "110px",
    resize: "vertical",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "11px",
    padding: "13px 14px",
    fontSize: "15px",
    fontFamily: "inherit",
    outline: "none",
  },

  botonAgregar: {
    border: "none",
    background: "#d97883",
    color: "white",
    borderRadius: "11px",
    padding: "13px 17px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
  },

  listaVariantes: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  tarjetaVariante: {
    border: "1px solid #e5e5e5",
    borderRadius: "18px",
    padding: "20px",
    background: "#fff",
  },

  cabeceraVariante: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    flexWrap: "wrap",
    paddingBottom: "16px",
    borderBottom: "1px solid #eee",
  },

  numeroVariante: {
    color: "#d97883",
    fontWeight: "900",
    fontSize: "11px",
    marginBottom: "5px",
  },

  nombreVarianteTitulo: {
    margin: 0,
    fontSize: "20px",
  },

  referenciaTitulo: {
    color: "#777",
    fontSize: "13px",
    marginTop: "4px",
  },

  accionesOrden: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  botonOrden: {
    width: "40px",
    height: "38px",
    border: "1px solid #ddd",
    background: "white",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  botonQuitar: {
    border: "1px solid #ffcaca",
    background: "#fff4f4",
    color: "#bb3030",
    borderRadius: "9px",
    padding: "9px 12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  estadoVariante: {
    padding: "16px 0",
  },

  bloqueFotos: {
    marginTop: "22px",
    paddingTop: "20px",
    borderTop: "1px solid #eee",
  },

  bloqueDatos: {
    marginTop: "22px",
    paddingTop: "20px",
    borderTop: "1px solid #eee",
  },

  subtituloBloque: {
    marginTop: 0,
    marginBottom: "15px",
    fontSize: "17px",
  },

  gridFotos: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },

  fotoCard: {
    border: "1px solid #e4e4e4",
    borderRadius: "14px",
    padding: "14px",
    background: "#fafafa",
  },

  fotoTitulo: {
    fontWeight: "800",
    fontSize: "14px",
    marginBottom: "10px",
  },

  fotoPreviewCaja: {
    width: "100%",
    height: "260px",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#eee",
    marginBottom: "12px",
  },

  fotoPreview: {
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
    color: "#888",
  },

  botonSeleccionarFoto: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    background: "white",
    borderRadius: "10px",
    padding: "11px 12px",
    fontWeight: "800",
    textAlign: "center",
    cursor: "pointer",
    display: "block",
  },

  fotoPendiente: {
    marginTop: "9px",
    background: "#fff5d9",
    color: "#866200",
    borderRadius: "8px",
    padding: "8px",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: "700",
  },

  botonSubirFoto: {
    width: "100%",
    border: "none",
    background: "#111",
    color: "white",
    borderRadius: "10px",
    padding: "11px",
    fontWeight: "800",
    marginTop: "9px",
    cursor: "pointer",
  },

  botonEliminarFoto: {
    width: "100%",
    border: "1px solid #ffcaca",
    background: "#fff5f5",
    color: "#b72c2c",
    borderRadius: "10px",
    padding: "10px",
    fontWeight: "700",
    marginTop: "9px",
    cursor: "pointer",
  },

  nota: {
    marginBottom: 0,
    marginTop: "7px",
    color: "#888",
    fontSize: "12px",
  },

  botonAgregarAbajo: {
    width: "100%",
    marginTop: "20px",
    border: "2px dashed #d97883",
    background: "#fff7f8",
    color: "#c65d69",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },

  guardarCaja: {
    background: "white",
    borderRadius: "20px",
    padding: "22px",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.05)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },

  botonesGuardar: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  botonCancelar: {
    border: "1px solid #ddd",
    background: "white",
    color: "#333",
    borderRadius: "11px",
    padding: "14px 18px",
    fontWeight: "800",
    cursor: "pointer",
  },

  botonGuardar: {
    border: "none",
    background: "#d97883",
    color: "white",
    borderRadius: "11px",
    padding: "14px 20px",
    fontWeight: "900",
    fontSize: "15px",
  },
};
