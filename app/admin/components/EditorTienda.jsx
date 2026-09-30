"use client";

import { useEffect, useState } from "react";

const PALETAS_COLORES = [
  {
    nombre: "Elegante",
    principal: "#111111",
    fondo: "#FFFFFF",
  },
  {
    nombre: "Rosa",
    principal: "#B85C72",
    fondo: "#FFF1F4",
  },
  {
    nombre: "Dorado",
    principal: "#A67C32",
    fondo: "#FFF8E8",
  },
  {
    nombre: "Lila",
    principal: "#7656A8",
    fondo: "#F5F0FF",
  },
  {
    nombre: "Azul",
    principal: "#244A73",
    fondo: "#F0F6FC",
  },
  {
    nombre: "Verde",
    principal: "#47735A",
    fondo: "#F0F7F2",
  },
];

function obtenerColorTexto(hex = "#000000") {
  const color = String(hex).replace("#", "");

  if (color.length !== 6) {
    return "#FFFFFF";
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const luminosidad =
    (r * 299 + g * 587 + b * 114) / 1000;

  return luminosidad > 160
    ? "#111111"
    : "#FFFFFF";
}

export default function EditorTienda({
  tienda,
  onActualizada,
  onCancelar,
  setMensaje,
}) {
  const [pestana, setPestana] =
    useState("datos");

  const [nombre, setNombre] =
    useState("");

  const [whatsapp, setWhatsapp] =
    useState("");

  const [mensajePortada, setMensajePortada] =
    useState("");

  const [instagram, setInstagram] =
    useState("");

  const [facebook, setFacebook] =
    useState("");

  const [tiktok, setTiktok] =
    useState("");

  const [colorPrincipal, setColorPrincipal] =
    useState("#000000");

  const [colorFondo, setColorFondo] =
    useState("#FFFFFF");

  const [logoUrl, setLogoUrl] =
    useState("");

  const [previewLogo, setPreviewLogo] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [subiendoLogo, setSubiendoLogo] =
    useState(false);

  useEffect(() => {
    if (!tienda) return;

    setNombre(
      tienda.nombre_tienda || ""
    );

    setWhatsapp(
      tienda.whatsapp || ""
    );

    setMensajePortada(
      tienda.mensaje_portada || ""
    );

    setInstagram(
      tienda.instagram || ""
    );

    setFacebook(
      tienda.facebook || ""
    );

    setTiktok(
      tienda.tiktok || ""
    );

    setColorPrincipal(
      tienda.color_principal ||
        "#000000"
    );

    setColorFondo(
      tienda.color_fondo ||
        "#FFFFFF"
    );

    setLogoUrl(
      tienda.logo_url || ""
    );
  }, [tienda]);

  useEffect(() => {
    return () => {
      if (previewLogo) {
        URL.revokeObjectURL(
          previewLogo
        );
      }
    };
  }, [previewLogo]);

  async function comprimirImagen(
    archivo
  ) {
    return new Promise(
      (resolve, reject) => {
        const lector =
          new FileReader();

        lector.onload = (
          evento
        ) => {
          const imagen =
            new Image();

          imagen.onload = () => {
            const canvas =
              document.createElement(
                "canvas"
              );

            const MAXIMO = 1200;

            let ancho =
              imagen.width;

            let alto =
              imagen.height;

            if (
              ancho > alto &&
              ancho > MAXIMO
            ) {
              alto = Math.round(
                (alto * MAXIMO) /
                  ancho
              );

              ancho = MAXIMO;
            } else if (
              alto >= ancho &&
              alto > MAXIMO
            ) {
              ancho =
                Math.round(
                  (ancho *
                    MAXIMO) /
                    alto
                );

              alto = MAXIMO;
            }

            canvas.width =
              ancho;

            canvas.height =
              alto;

            const contexto =
              canvas.getContext(
                "2d"
              );

            if (!contexto) {
              reject(
                new Error(
                  "No pudimos procesar la imagen."
                )
              );

              return;
            }

            contexto.drawImage(
              imagen,
              0,
              0,
              ancho,
              alto
            );

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(
                    new Error(
                      "No pudimos comprimir la imagen."
                    )
                  );

                  return;
                }

                const nuevoArchivo =
                  new File(
                    [blob],
                    `logo-${Date.now()}.webp`,
                    {
                      type: "image/webp",
                    }
                  );

                resolve(
                  nuevoArchivo
                );
              },
              "image/webp",
              0.82
            );
          };

          imagen.onerror =
            () => {
              reject(
                new Error(
                  "No pudimos leer la imagen."
                )
              );
            };

          imagen.src =
            evento.target.result;
        };

        lector.onerror = () => {
          reject(
            new Error(
              "No pudimos leer el archivo."
            )
          );
        };

        lector.readAsDataURL(
          archivo
        );
      }
    );
  }

  async function subirLogo(e) {
    const archivoOriginal =
      e.target.files?.[0];

    if (!archivoOriginal) {
      return;
    }

    setSubiendoLogo(true);
    setMensaje("");

    try {
      if (
        !archivoOriginal.type.startsWith(
          "image/"
        )
      ) {
        setMensaje(
          "Selecciona una imagen válida."
        );

        return;
      }

      let archivoFinal =
        archivoOriginal;

      try {
        archivoFinal =
          await comprimirImagen(
            archivoOriginal
          );
      } catch (error) {
        console.error(
          "No se pudo comprimir:",
          error
        );
      }

      if (
        archivoFinal.size >
        5 * 1024 * 1024
      ) {
        setMensaje(
          "La imagen sigue siendo demasiado pesada."
        );

        return;
      }

      if (previewLogo) {
        URL.revokeObjectURL(
          previewLogo
        );
      }

      const vistaPrevia =
        URL.createObjectURL(
          archivoFinal
        );

      setPreviewLogo(
        vistaPrevia
      );

      const formData =
        new FormData();

      formData.append(
        "logo",
        archivoFinal
      );

      const response =
        await fetch(
          "/api/tiendas/logo",
          {
            method: "POST",
            body: formData,
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
            "No pudimos subir el logo."
        );

        return;
      }

      setLogoUrl(
        data.logo_url
      );

      onActualizada({
        ...tienda,
        logo_url:
          data.logo_url,
      });

      setMensaje(
        "✅ Logo actualizado correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos actualizar el logo."
      );
    } finally {
      setSubiendoLogo(false);
      setPreviewLogo("");

      if (e.target) {
        e.target.value = "";
      }
    }
  }

  async function guardarCambios(e) {
    e.preventDefault();

    if (guardando) return;

    if (!nombre.trim()) {
      setMensaje(
        "Escribe el nombre de la tienda."
      );

      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const response =
        await fetch(
          "/api/tiendas/mi-tienda",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              nombre_tienda:
                nombre.trim(),

              whatsapp,

              mensaje_portada:
                mensajePortada.trim(),

              instagram:
                instagram.trim(),

              facebook:
                facebook.trim(),

              tiktok:
                tiktok.trim(),

              color_principal:
                colorPrincipal,

              color_fondo:
                colorFondo,
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

      onActualizada(
        data.tienda
      );

      setMensaje(
        "✅ Tu tienda se actualizó correctamente."
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        "No pudimos guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  }

  const colorTextoPrincipal =
    obtenerColorTexto(
      colorPrincipal
    );

  const colorTextoFondo =
    obtenerColorTexto(
      colorFondo
    );

  return (
    <form
      onSubmit={
        guardarCambios
      }
    >
      <div
        style={{
          background: "#ffffff",
          border:
            "1px solid #e9e9e9",
          borderRadius: "22px",
          overflow: "hidden",
          boxShadow:
            "0 5px 20px rgba(0,0,0,0.04)",
        }}
      >
        {/* ENCABEZADO */}

        <div
          style={{
            padding: "20px",
            borderBottom:
              "1px solid #eeeeee",
          }}
        >
          <div
            style={{
              fontSize: "21px",
              fontWeight: "900",
              color: "#222",
            }}
          >
            Personalizar mi tienda
          </div>

          <div
            style={{
              marginTop: "4px",
              color: "#888",
              fontSize: "13px",
              lineHeight: "1.45",
            }}
          >
            Cambia los datos,
            redes sociales y
            apariencia de tu
            catálogo.
          </div>
        </div>

        {/* PESTAÑAS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: "5px",
            padding:
              "10px 12px",
            background:
              "#fafafa",
            borderBottom:
              "1px solid #eeeeee",
          }}
        >
          <BotonPestana
            activo={
              pestana ===
              "datos"
            }
            onClick={() =>
              setPestana(
                "datos"
              )
            }
          >
            🏪 Datos
          </BotonPestana>

          <BotonPestana
            activo={
              pestana ===
              "redes"
            }
            onClick={() =>
              setPestana(
                "redes"
              )
            }
          >
            📱 Redes
          </BotonPestana>

          <BotonPestana
            activo={
              pestana ===
              "diseno"
            }
            onClick={() =>
              setPestana(
                "diseno"
              )
            }
          >
            🎨 Diseño
          </BotonPestana>
        </div>

        <div
          style={{
            padding: "20px",
          }}
        >
          {/* =========================
              DATOS
          ========================== */}

          {pestana ===
            "datos" && (
            <>
              <TituloBloque>
                Logo de la tienda
              </TituloBloque>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "15px",
                  marginBottom:
                    "24px",
                }}
              >
                <div
                  style={{
                    width: "76px",
                    height: "76px",
                    borderRadius:
                      "18px",
                    border:
                      "1px solid #e6e6e6",
                    background:
                      "#fafafa",
                    overflow:
                      "hidden",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    flexShrink: 0,
                  }}
                >
                  {previewLogo ||
                  logoUrl ? (
                    <img
                      src={
                        previewLogo ||
                        logoUrl
                      }
                      alt="Logo"
                      style={{
                        width:
                          "100%",
                        height:
                          "100%",
                        objectFit:
                          "contain",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize:
                          "28px",
                      }}
                    >
                      🏪
                    </span>
                  )}
                </div>

                <label
                  style={{
                    flex: 1,
                    minHeight:
                      "48px",
                    borderRadius:
                      "12px",
                    background:
                      "#222",
                    color:
                      "#fff",
                    fontWeight:
                      "800",
                    fontSize:
                      "14px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    cursor:
                      subiendoLogo
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      subiendoLogo
                        ? 0.6
                        : 1,
                  }}
                >
                  {subiendoLogo
                    ? "Procesando..."
                    : "📷 Cambiar logo"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      subirLogo
                    }
                    disabled={
                      subiendoLogo
                    }
                    style={{
                      display:
                        "none",
                    }}
                  />
                </label>
              </div>

              <CampoEtiqueta>
                Nombre de la tienda
              </CampoEtiqueta>

              <input
                type="text"
                value={nombre}
                onChange={(e) =>
                  setNombre(
                    e.target
                      .value
                  )
                }
                required
                style={
                  estiloInput
                }
              />

              <CampoEtiqueta>
                Mensaje de tu
                tienda
              </CampoEtiqueta>

              <textarea
                value={
                  mensajePortada
                }
                onChange={(e) =>
                  setMensajePortada(
                    e.target.value.slice(
                      0,
                      120
                    )
                  )
                }
                rows={3}
                maxLength={120}
                placeholder="Ej: ✨ Joyas que resaltan tu estilo"
                style={{
                  ...estiloInput,
                  minHeight:
                    "90px",
                  resize:
                    "vertical",
                  fontFamily:
                    "inherit",
                  marginBottom:
                    "5px",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  color: "#999",
                  fontSize:
                    "11px",
                  marginBottom:
                    "20px",
                }}
              >
                <span>
                  Aparece debajo
                  del nombre.
                </span>

                <strong>
                  {
                    mensajePortada.length
                  }
                  /120
                </strong>
              </div>

              <CampoEtiqueta>
                WhatsApp
              </CampoEtiqueta>

              <input
                value={whatsapp}
                readOnly
                style={{
                  ...estiloInput,
                  background:
                    "#f4f4f4",
                  color: "#777",
                  marginBottom:
                    "7px",
                }}
              />

              <div
                style={{
                  fontSize:
                    "11px",
                  color: "#888",
                  lineHeight:
                    "1.45",
                }}
              >
                🔒 Este número
                está vinculado a
                la cuenta y no
                puede modificarse
                desde aquí.
              </div>
            </>
          )}

          {/* =========================
              REDES
          ========================== */}

          {pestana ===
            "redes" && (
            <>
              <TituloBloque>
                Redes sociales
              </TituloBloque>

              <p
                style={{
                  margin:
                    "0 0 20px",
                  color: "#888",
                  fontSize:
                    "13px",
                  lineHeight:
                    "1.5",
                }}
              >
                Solo aparecerán
                las redes que
                configures.
              </p>

              <CampoEtiqueta>
                Instagram
              </CampoEtiqueta>

              <input
                type="text"
                value={
                  instagram
                }
                onChange={(e) =>
                  setInstagram(
                    e.target
                      .value
                  )
                }
                placeholder="@mitienda"
                maxLength={200}
                style={
                  estiloInput
                }
              />

              <CampoEtiqueta>
                TikTok
              </CampoEtiqueta>

              <input
                type="text"
                value={tiktok}
                onChange={(e) =>
                  setTiktok(
                    e.target
                      .value
                  )
                }
                placeholder="@mitienda"
                maxLength={200}
                style={
                  estiloInput
                }
              />

              <CampoEtiqueta>
                Facebook
              </CampoEtiqueta>

              <input
                type="text"
                value={
                  facebook
                }
                onChange={(e) =>
                  setFacebook(
                    e.target
                      .value
                  )
                }
                placeholder="https://www.facebook.com/mitienda"
                maxLength={200}
                style={
                  estiloInput
                }
              />
            </>
          )}

          {/* =========================
              DISEÑO
          ========================== */}

          {pestana ===
            "diseno" && (
            <>
              <TituloBloque>
                Apariencia del
                catálogo
              </TituloBloque>

              <p
                style={{
                  color: "#888",
                  fontSize:
                    "13px",
                  margin:
                    "4px 0 18px",
                }}
              >
                Elige una
                combinación o
                crea tus propios
                colores.
              </p>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: "8px",
                  marginBottom:
                    "24px",
                }}
              >
                {PALETAS_COLORES.map(
                  (
                    paleta
                  ) => {
                    const seleccionada =
                      colorPrincipal.toLowerCase() ===
                        paleta.principal.toLowerCase() &&
                      colorFondo.toLowerCase() ===
                        paleta.fondo.toLowerCase();

                    return (
                      <button
                        key={
                          paleta.nombre
                        }
                        type="button"
                        onClick={() => {
                          setColorPrincipal(
                            paleta.principal
                          );

                          setColorFondo(
                            paleta.fondo
                          );
                        }}
                        style={{
                          padding:
                            "10px 5px",
                          background:
                            "#fff",
                          borderRadius:
                            "11px",
                          border:
                            seleccionada
                              ? `2px solid ${paleta.principal}`
                              : "1px solid #ddd",
                          cursor:
                            "pointer",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "center",
                            marginBottom:
                              "6px",
                          }}
                        >
                          <span
                            style={{
                              width:
                                "25px",
                              height:
                                "25px",
                              borderRadius:
                                "50% 0 0 50%",
                              background:
                                paleta.principal,
                              border:
                                "1px solid rgba(0,0,0,.1)",
                            }}
                          />

                          <span
                            style={{
                              width:
                                "25px",
                              height:
                                "25px",
                              borderRadius:
                                "0 50% 50% 0",
                              background:
                                paleta.fondo,
                              border:
                                "1px solid rgba(0,0,0,.1)",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            fontSize:
                              "11px",
                            fontWeight:
                              "800",
                          }}
                        >
                          {
                            paleta.nombre
                          }
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              <SelectorColor
                titulo="Color principal"
                descripcion="Botones y detalles"
                valor={
                  colorPrincipal
                }
                onChange={
                  setColorPrincipal
                }
              />

              <SelectorColor
                titulo="Color de fondo"
                descripcion="Fondo general del catálogo"
                valor={
                  colorFondo
                }
                onChange={
                  setColorFondo
                }
              />

              <div
                style={{
                  marginTop:
                    "25px",
                }}
              >
                <div
                  style={{
                    fontWeight:
                      "800",
                    marginBottom:
                      "9px",
                  }}
                >
                  Vista previa
                </div>

                <div
                  style={{
                    background:
                      colorFondo,
                    color:
                      colorTextoFondo,
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "18px",
                    overflow:
                      "hidden",
                  }}
                >
                  <div
                    style={{
                      padding:
                        "14px",
                      borderBottom: `2px solid ${colorPrincipal}`,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "10px",
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={
                          logoUrl
                        }
                        alt=""
                        style={{
                          width:
                            "42px",
                          height:
                            "42px",
                          objectFit:
                            "contain",
                          borderRadius:
                            "50%",
                          background:
                            "#fff",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width:
                            "42px",
                          height:
                            "42px",
                          borderRadius:
                            "50%",
                          background:
                            colorPrincipal,
                          color:
                            colorTextoPrincipal,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontWeight:
                            "900",
                        }}
                      >
                        {(nombre ||
                          "M")
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          fontWeight:
                            "900",
                          fontSize:
                            "14px",
                        }}
                      >
                        {nombre ||
                          "Mi tienda"}
                      </div>

                      {mensajePortada && (
                        <div
                          style={{
                            marginTop:
                              "2px",
                            fontSize:
                              "10px",
                            opacity:
                              0.7,
                          }}
                        >
                          {
                            mensajePortada
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        "16px",
                    }}
                  >
                    <div
                      style={{
                        background:
                          "#fff",
                        color:
                          "#222",
                        borderRadius:
                          "14px",
                        overflow:
                          "hidden",
                        boxShadow:
                          "0 3px 12px rgba(0,0,0,.08)",
                      }}
                    >
                      <div
                        style={{
                          height:
                            "90px",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          background:
                            "#f3f3f3",
                          fontSize:
                            "32px",
                        }}
                      >
                        ✨
                      </div>

                      <div
                        style={{
                          padding:
                            "12px",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#999",
                            fontSize:
                              "10px",
                          }}
                        >
                          RA0000
                        </div>

                        <div
                          style={{
                            fontWeight:
                              "800",
                            marginTop:
                              "3px",
                          }}
                        >
                          Aretes
                          dorados
                        </div>

                        <div
                          style={{
                            color:
                              colorPrincipal,
                            fontWeight:
                              "900",
                            margin:
                              "6px 0 10px",
                          }}
                        >
                          $25.000
                        </div>

                        <div
                          style={{
                            background:
                              colorPrincipal,
                            color:
                              colorTextoPrincipal,
                            padding:
                              "10px",
                            textAlign:
                              "center",
                            borderRadius:
                              "9px",
                            fontWeight:
                              "800",
                            fontSize:
                              "12px",
                          }}
                        >
                          Agregar al
                          pedido
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* BOTONES INFERIORES */}

        <div
          style={{
            padding:
              "0 20px 20px",
          }}
        >
          <button
            type="submit"
            disabled={
              guardando
            }
            style={{
              width: "100%",
              border: "none",
              padding: "14px",
              borderRadius:
                "12px",
              background:
                "#d97883",
              color: "#fff",
              fontSize: "15px",
              fontWeight:
                "800",
              cursor:
                guardando
                  ? "not-allowed"
                  : "pointer",
              opacity:
                guardando
                  ? 0.6
                  : 1,
            }}
          >
            {guardando
              ? "Guardando..."
              : "💾 Guardar cambios"}
          </button>

          <button
            type="button"
            onClick={
              onCancelar
            }
            disabled={
              guardando
            }
            style={{
              width: "100%",
              marginTop:
                "9px",
              border:
                "1px solid #e1e1e1",
              padding: "13px",
              borderRadius:
                "12px",
              background:
                "#fff",
              color: "#777",
              fontSize:
                "14px",
              fontWeight:
                "700",
              cursor:
                "pointer",
            }}
          >
            Volver
          </button>
        </div>
      </div>
    </form>
  );
}

function BotonPestana({
  activo,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: activo
          ? "1px solid #d97883"
          : "1px solid transparent",
        background: activo
          ? "#fff0f2"
          : "transparent",
        color: activo
          ? "#bd6671"
          : "#777",
        padding:
          "10px 5px",
        borderRadius:
          "10px",
        fontSize: "12px",
        fontWeight: "800",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function TituloBloque({
  children,
}) {
  return (
    <div
      style={{
        fontSize: "17px",
        fontWeight: "900",
        color: "#222",
        marginBottom:
          "14px",
      }}
    >
      {children}
    </div>
  );
}

function CampoEtiqueta({
  children,
}) {
  return (
    <label
      style={{
        display: "block",
        fontSize: "13px",
        fontWeight: "800",
        marginBottom:
          "1px",
      }}
    >
      {children}
    </label>
  );
}

function SelectorColor({
  titulo,
  descripcion,
  valor,
  onChange,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: "15px",
        padding:
          "12px 0",
        borderBottom:
          "1px solid #eee",
      }}
    >
      <div>
        <div
          style={{
            fontWeight:
              "800",
            fontSize:
              "14px",
          }}
        >
          {titulo}
        </div>

        <div
          style={{
            color: "#888",
            fontSize:
              "11px",
            marginTop:
              "3px",
          }}
        >
          {descripcion}
        </div>
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
          width: "58px",
          height: "46px",
          padding: "3px",
          border:
            "1px solid #ddd",
          borderRadius:
            "12px",
          background:
            "#fff",
        }}
      />
    </div>
  );
}

const estiloInput = {
  width: "100%",
  padding: "13px 14px",
  marginTop: "7px",
  marginBottom: "18px",
  borderRadius: "11px",
  border: "1px solid #dddddd",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
};