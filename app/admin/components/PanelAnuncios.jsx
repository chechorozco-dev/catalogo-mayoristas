"use client";

import { useState } from "react";

export default function PanelAnuncios({
  anuncios,
  cargando,
  recargar,
  setMensaje,
}) {
  const [
    formularioAbierto,
    setFormularioAbierto,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    anuncioEditando,
    setAnuncioEditando,
  ] = useState(null);

  const [
    guardandoEdicion,
    setGuardandoEdicion,
  ] = useState(false);

  const [tipo, setTipo] =
    useState("AVISO");

  const [titulo, setTitulo] =
    useState("");

  const [
    mensajeAnuncio,
    setMensajeAnuncio,
  ] = useState("");

  const [
    colorFondo,
    setColorFondo,
  ] = useState("#FFF4D6");

  const [
    colorTexto,
    setColorTexto,
  ] = useState("#111111");

  function icono(tipoActual) {
    if (
      tipoActual === "NOVEDAD"
    ) {
      return "✨";
    }

    if (
      tipoActual === "URGENTE"
    ) {
      return "⚠️";
    }

    return "📢";
  }

  async function crearAnuncio() {
    if (
      guardando ||
      !titulo.trim()
    ) {
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const response =
        await fetch(
          "/api/anuncios",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              tipo,
              titulo:
                titulo.trim(),
              mensaje:
                mensajeAnuncio.trim(),
              color_fondo:
                colorFondo,
              color_texto:
                colorTexto,
              texto_boton: "",
              enlace_boton: "",
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setMensaje(
          data.mensaje ||
            "No pudimos crear el anuncio."
        );

        return;
      }

      await recargar();

      setTipo("AVISO");
      setTitulo("");
      setMensajeAnuncio("");
      setColorFondo(
        "#FFF4D6"
      );
      setColorTexto(
        "#111111"
      );

      setFormularioAbierto(
        false
      );

      setMensaje(
        "✅ Anuncio publicado correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos crear el anuncio."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(
    anuncio
  ) {
    setMensaje("");

    try {
      const response =
        await fetch(
          "/api/anuncios",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: anuncio.id,
              activo:
                !anuncio.activo,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setMensaje(
          data.mensaje ||
            "No pudimos actualizar el anuncio."
        );

        return;
      }

      await recargar();

      setMensaje(
        !anuncio.activo
          ? "✅ Anuncio publicado correctamente."
          : "✅ Anuncio pausado correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos actualizar el anuncio."
      );
    }
  }

  function empezarEditar(
    anuncio
  ) {
    setAnuncioEditando({
      id: anuncio.id,

      tipo:
        anuncio.tipo ||
        "AVISO",

      titulo:
        anuncio.titulo ||
        "",

      mensaje:
        anuncio.mensaje ||
        "",

      color_fondo:
        anuncio.color_fondo ||
        "#FFF4D6",

      color_texto:
        anuncio.color_texto ||
        "#111111",
    });

    setMensaje("");
  }

  async function guardarEdicion() {
    if (
      !anuncioEditando ||
      guardandoEdicion
    ) {
      return;
    }

    if (
      !anuncioEditando.titulo.trim()
    ) {
      setMensaje(
        "Escribe un título."
      );

      return;
    }

    setGuardandoEdicion(
      true
    );

    setMensaje("");

    try {
      const response =
        await fetch(
          "/api/anuncios",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id:
                anuncioEditando.id,

              tipo:
                anuncioEditando.tipo,

              titulo:
                anuncioEditando.titulo.trim(),

              mensaje:
                anuncioEditando.mensaje.trim(),

              color_fondo:
                anuncioEditando.color_fondo,

              color_texto:
                anuncioEditando.color_texto,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setMensaje(
          data.mensaje ||
            "No pudimos guardar los cambios."
        );

        return;
      }

      await recargar();

      setAnuncioEditando(
        null
      );

      setMensaje(
        "✅ Anuncio actualizado correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos guardar los cambios."
      );
    } finally {
      setGuardandoEdicion(
        false
      );
    }
  }

  async function eliminar(
    anuncio
  ) {
    const confirmar =
      window.confirm(
        `¿Eliminar "${anuncio.titulo}"?\n\nEsta acción no se puede deshacer.`
      );

    if (!confirmar) {
      return;
    }

    setMensaje("");

    try {
      const response =
        await fetch(
          "/api/anuncios",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: anuncio.id,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setMensaje(
          data.mensaje ||
            "No pudimos eliminar el anuncio."
        );

        return;
      }

      if (
        anuncioEditando?.id ===
        anuncio.id
      ) {
        setAnuncioEditando(
          null
        );
      }

      await recargar();

      setMensaje(
        "✅ Anuncio eliminado correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos eliminar el anuncio."
      );
    }
  }

  return (
    <div>
      {/* ENCABEZADO */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-end",
          gap: "12px",
          marginBottom:
            "15px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize:
                "21px",
              color: "#222",
            }}
          >
            Avisos y
            novedades
          </h2>

          <p
            style={{
              margin:
                "4px 0 0",
              color: "#888",
              fontSize:
                "13px",
            }}
          >
            Mensajes que
            aparecen en tu
            catálogo.
          </p>
        </div>

        {!formularioAbierto && (
          <button
            type="button"
            onClick={() =>
              setFormularioAbierto(
                true
              )
            }
            style={{
              border: "none",
              background:
                "#222",
              color: "#fff",
              borderRadius:
                "11px",
              padding:
                "10px 13px",
              fontWeight:
                "800",
              cursor:
                "pointer",
              flexShrink: 0,
            }}
          >
            + Nuevo
          </button>
        )}
      </div>

      {/* NUEVO ANUNCIO */}

      {formularioAbierto && (
        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e8e8e8",
            borderRadius:
              "18px",
            padding:
              "18px",
            marginBottom:
              "14px",
          }}
        >
          <div
            style={{
              fontSize:
                "17px",
              fontWeight:
                "900",
              marginBottom:
                "16px",
            }}
          >
            📢 Nuevo anuncio
          </div>

          <Etiqueta>
            Tipo
          </Etiqueta>

          <select
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target.value
              )
            }
            style={estiloInput}
          >
            <option value="AVISO">
              📢 Aviso
            </option>

            <option value="NOVEDAD">
              ✨ Novedad
            </option>

            <option value="URGENTE">
              ⚠️ Importante
            </option>
          </select>

          <Etiqueta>
            Título
          </Etiqueta>

          <input
            type="text"
            value={titulo}
            maxLength={60}
            onChange={(e) =>
              setTitulo(
                e.target.value
              )
            }
            placeholder="Ej: Envíos contra entrega"
            style={
              estiloInput
            }
          />

          <Etiqueta>
            Mensaje
          </Etiqueta>

          <textarea
            value={
              mensajeAnuncio
            }
            maxLength={180}
            rows={3}
            onChange={(e) =>
              setMensajeAnuncio(
                e.target.value
              )
            }
            placeholder="Escribe la información que quieres mostrar..."
            style={{
              ...estiloInput,
              minHeight:
                "90px",
              resize:
                "vertical",
              fontFamily:
                "inherit",
            }}
          />

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "12px",
              marginBottom:
                "18px",
            }}
          >
            <SelectorColor
              titulo="Fondo"
              valor={
                colorFondo
              }
              onChange={
                setColorFondo
              }
            />

            <SelectorColor
              titulo="Texto"
              valor={
                colorTexto
              }
              onChange={
                setColorTexto
              }
            />
          </div>

          {/* PREVIEW */}

          {titulo && (
            <div
              style={{
                padding:
                  "14px",
                background:
                  colorFondo,
                color:
                  colorTexto,
                borderRadius:
                  "13px",
                marginBottom:
                  "17px",
              }}
            >
              <div
                style={{
                  fontWeight:
                    "900",
                }}
              >
                {icono(tipo)}{" "}
                {titulo}
              </div>

              {mensajeAnuncio && (
                <div
                  style={{
                    marginTop:
                      "4px",
                    fontSize:
                      "13px",
                    opacity:
                      0.8,
                  }}
                >
                  {
                    mensajeAnuncio
                  }
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={
              crearAnuncio
            }
            disabled={
              guardando ||
              !titulo.trim()
            }
            style={{
              width: "100%",
              border: "none",
              padding:
                "13px",
              borderRadius:
                "11px",
              background:
                "#d97883",
              color: "#fff",
              fontWeight:
                "800",
              cursor:
                "pointer",
              opacity:
                guardando ||
                !titulo.trim()
                  ? 0.6
                  : 1,
            }}
          >
            {guardando
              ? "Publicando..."
              : "📢 Publicar anuncio"}
          </button>

          <button
            type="button"
            onClick={() => {
              setFormularioAbierto(
                false
              );
            }}
            style={{
              width: "100%",
              marginTop:
                "8px",
              border:
                "1px solid #ddd",
              padding:
                "12px",
              borderRadius:
                "11px",
              background:
                "#fff",
              color: "#777",
              fontWeight:
                "700",
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* LISTA */}

      {cargando ? (
        <EstadoVacio>
          Cargando anuncios...
        </EstadoVacio>
      ) : anuncios.length ===
        0 ? (
        <EstadoVacio>
          <div
            style={{
              fontSize:
                "34px",
              marginBottom:
                "8px",
            }}
          >
            📢
          </div>

          Todavía no tienes
          anuncios.
        </EstadoVacio>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "10px",
          }}
        >
          {anuncios.map(
            (anuncio) => (
              <div
                key={
                  anuncio.id
                }
                style={{
                  background:
                    "#fff",
                  border:
                    "1px solid #e9e9e9",
                  borderRadius:
                    "18px",
                  padding:
                    "17px",
                  boxShadow:
                    "0 4px 14px rgba(0,0,0,.035)",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    gap: "11px",
                    alignItems:
                      "flex-start",
                  }}
                >
                  <div
                    style={{
                      width:
                        "42px",
                      height:
                        "42px",
                      borderRadius:
                        "12px",
                      background:
                        anuncio.color_fondo ||
                        "#FFF4D6",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      flexShrink:
                        0,
                    }}
                  >
                    {icono(
                      anuncio.tipo
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: "8px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize:
                            "14px",
                        }}
                      >
                        {
                          anuncio.titulo
                        }
                      </strong>

                      <span
                        style={{
                          background:
                            anuncio.activo
                              ? "#eaf7ee"
                              : "#f0f0f0",
                          color:
                            anuncio.activo
                              ? "#39834f"
                              : "#888",
                          padding:
                            "4px 7px",
                          borderRadius:
                            "999px",
                          fontSize:
                            "9px",
                          fontWeight:
                            "900",
                          flexShrink:
                            0,
                        }}
                      >
                        {anuncio.activo
                          ? "PUBLICADO"
                          : "PAUSADO"}
                      </span>
                    </div>

                    {anuncio.mensaje && (
                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "#777",
                          fontSize:
                            "12px",
                          lineHeight:
                            "1.45",
                        }}
                      >
                        {
                          anuncio.mensaje
                        }
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "8px",
                    marginTop:
                      "15px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      empezarEditar(
                        anuncio
                      )
                    }
                    style={
                      botonClaro
                    }
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      cambiarEstado(
                        anuncio
                      )
                    }
                    style={{
                      ...botonClaro,
                      background:
                        anuncio.activo
                          ? "#f5f5f5"
                          : "#222",
                      color:
                        anuncio.activo
                          ? "#444"
                          : "#fff",
                      border:
                        "none",
                    }}
                  >
                    {anuncio.activo
                      ? "⏸ Pausar"
                      : "▶ Publicar"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    eliminar(
                      anuncio
                    )
                  }
                  style={{
                    border:
                      "none",
                    background:
                      "transparent",
                    color:
                      "#aa5555",
                    fontSize:
                      "11px",
                    padding:
                      "9px 2px 0",
                    cursor:
                      "pointer",
                  }}
                >
                  🗑 Eliminar
                </button>

                {/* EDICIÓN */}

                {anuncioEditando?.id ===
                  anuncio.id && (
                  <div
                    style={{
                      marginTop:
                        "15px",
                      paddingTop:
                        "15px",
                      borderTop:
                        "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          "900",
                        marginBottom:
                          "13px",
                      }}
                    >
                      Editar anuncio
                    </div>

                    <Etiqueta>
                      Tipo
                    </Etiqueta>

                    <select
                      value={
                        anuncioEditando.tipo
                      }
                      onChange={(e) =>
                        setAnuncioEditando(
                          {
                            ...anuncioEditando,
                            tipo: e
                              .target
                              .value,
                          }
                        )
                      }
                      style={
                        estiloInput
                      }
                    >
                      <option value="AVISO">
                        📢 Aviso
                      </option>

                      <option value="NOVEDAD">
                        ✨ Novedad
                      </option>

                      <option value="URGENTE">
                        ⚠️ Importante
                      </option>
                    </select>

                    <Etiqueta>
                      Título
                    </Etiqueta>

                    <input
                      value={
                        anuncioEditando.titulo
                      }
                      onChange={(e) =>
                        setAnuncioEditando(
                          {
                            ...anuncioEditando,
                            titulo:
                              e
                                .target
                                .value,
                          }
                        )
                      }
                      style={
                        estiloInput
                      }
                    />

                    <Etiqueta>
                      Mensaje
                    </Etiqueta>

                    <textarea
                      value={
                        anuncioEditando.mensaje
                      }
                      rows={3}
                      onChange={(e) =>
                        setAnuncioEditando(
                          {
                            ...anuncioEditando,
                            mensaje:
                              e
                                .target
                                .value,
                          }
                        )
                      }
                      style={{
                        ...estiloInput,
                        fontFamily:
                          "inherit",
                      }}
                    />

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap:
                          "10px",
                        marginBottom:
                          "16px",
                      }}
                    >
                      <SelectorColor
                        titulo="Fondo"
                        valor={
                          anuncioEditando.color_fondo
                        }
                        onChange={(
                          valor
                        ) =>
                          setAnuncioEditando(
                            {
                              ...anuncioEditando,
                              color_fondo:
                                valor,
                            }
                          )
                        }
                      />

                      <SelectorColor
                        titulo="Texto"
                        valor={
                          anuncioEditando.color_texto
                        }
                        onChange={(
                          valor
                        ) =>
                          setAnuncioEditando(
                            {
                              ...anuncioEditando,
                              color_texto:
                                valor,
                            }
                          )
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={
                        guardarEdicion
                      }
                      disabled={
                        guardandoEdicion
                      }
                      style={{
                        width:
                          "100%",
                        border:
                          "none",
                        background:
                          "#222",
                        color:
                          "#fff",
                        borderRadius:
                          "10px",
                        padding:
                          "12px",
                        fontWeight:
                          "800",
                      }}
                    >
                      {guardandoEdicion
                        ? "Guardando..."
                        : "💾 Guardar cambios"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAnuncioEditando(
                          null
                        )
                      }
                      style={{
                        ...botonClaro,
                        width:
                          "100%",
                        marginTop:
                          "8px",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function Etiqueta({
  children,
}) {
  return (
    <label
      style={{
        fontSize: "12px",
        fontWeight: "800",
      }}
    >
      {children}
    </label>
  );
}

function SelectorColor({
  titulo,
  valor,
  onChange,
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: "800",
          marginBottom: "5px",
        }}
      >
        {titulo}
      </div>

      <input
        type="color"
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        style={{
          width: "100%",
          height: "44px",
          border:
            "1px solid #ddd",
          borderRadius:
            "10px",
          background: "#fff",
          padding: "3px",
        }}
      />
    </div>
  );
}

function EstadoVacio({
  children,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border:
          "1px solid #e9e9e9",
        borderRadius: "18px",
        padding: "28px 20px",
        textAlign: "center",
        color: "#888",
        fontSize: "13px",
      }}
    >
      {children}
    </div>
  );
}

const estiloInput = {
  width: "100%",
  padding: "13px",
  marginTop: "6px",
  marginBottom: "16px",
  boxSizing: "border-box",
  border: "1px solid #ddd",
  borderRadius: "10px",
  fontSize: "15px",
  background: "#fff",
};

const botonClaro = {
  border: "1px solid #e1e1e1",
  background: "#fff",
  color: "#444",
  padding: "10px",
  borderRadius: "10px",
  fontWeight: "800",
  cursor: "pointer",
};