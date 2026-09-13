"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PAISES = [
  { nombre: "Colombia", codigo: "57", bandera: "🇨🇴" },
  { nombre: "Estados Unidos", codigo: "1", bandera: "🇺🇸" },
  { nombre: "México", codigo: "52", bandera: "🇲🇽" },
  { nombre: "Ecuador", codigo: "593", bandera: "🇪🇨" },
  { nombre: "Perú", codigo: "51", bandera: "🇵🇪" },
  { nombre: "Venezuela", codigo: "58", bandera: "🇻🇪" },
  { nombre: "Panamá", codigo: "507", bandera: "🇵🇦" },
];

export default function LoginPage() {
  const router = useRouter();

  const [cargandoSesion, setCargandoSesion] = useState(true);

  const [codigoPais, setCodigoPais] = useState("57");
  const [telefono, setTelefono] = useState("");

  const [codigo, setCodigo] = useState("");

  const [codigoEnviado, setCodigoEnviado] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");

  useEffect(() => {
    revisarSesion();
  }, []);

  async function revisarSesion() {
    try {
      const response = await fetch("/api/auth/sesion", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.autenticado) {
        if (data.cliente?.tienda_id) {
          router.replace("/admin");
        } else {
          router.replace("/crear-tienda");
        }

        return;
      }
    } catch (error) {
      console.error(error);
    }

    setCargandoSesion(false);
  }

  function telefonoCompleto() {
    const numero = String(telefono || "").replace(/\D/g, "");

    return `${codigoPais}${numero}`;
  }

  async function enviarCodigo(e) {
    e.preventDefault();

    const numero = String(telefono || "").replace(/\D/g, "");

    setMensaje("");
    setTipoMensaje("");

    if (!numero) {
      setMensaje("Escribe tu número de WhatsApp.");
      setTipoMensaje("error");
      return;
    }

    if (codigoPais === "57" && numero.length !== 10) {
      setMensaje(
        "Para Colombia escribe los 10 dígitos de tu celular."
      );
      setTipoMensaje("error");
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch("/api/auth/enviar-codigo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefono: telefonoCompleto(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensaje(
          data.mensaje || "No pudimos enviar el código."
        );
        setTipoMensaje("error");
        setEnviando(false);
        return;
      }

      setCodigoEnviado(true);

      setMensaje(
        "Te enviamos un código de 4 dígitos por WhatsApp."
      );

      setTipoMensaje("exito");
    } catch (error) {
      console.error(error);

      setMensaje(
        "Ocurrió un error. Intenta nuevamente."
      );

      setTipoMensaje("error");
    } finally {
      setEnviando(false);
    }
  }

  async function verificarCodigo(e) {
    e.preventDefault();

    const codigoLimpio = String(codigo || "").replace(/\D/g, "");

    setMensaje("");
    setTipoMensaje("");

    if (codigoLimpio.length !== 4) {
      setMensaje("Escribe el código de 4 números.");
      setTipoMensaje("error");
      return;
    }

    setVerificando(true);

    try {
      const response = await fetch(
        "/api/auth/verificar-codigo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telefono: telefonoCompleto(),
            codigo: codigoLimpio,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensaje(
          data.mensaje || "El código no es válido."
        );

        setTipoMensaje("error");
        setVerificando(false);
        return;
      }

      setMensaje("Código correcto. Ingresando...");
      setTipoMensaje("exito");

      if (data.cliente?.tienda_id) {
        router.replace("/admin");
      } else {
        router.replace("/crear-tienda");
      }

      router.refresh();
    } catch (error) {
      console.error(error);

      setMensaje(
        "Ocurrió un error al verificar el código."
      );

      setTipoMensaje("error");
    } finally {
      setVerificando(false);
    }
  }

  function cambiarNumero() {
    setCodigoEnviado(false);
    setCodigo("");
    setMensaje("");
    setTipoMensaje("");
  }

  if (cargandoSesion) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff8f6",
          padding: "20px",
        }}
      >
        <p
          style={{
            color: "#666",
            fontSize: "17px",
          }}
        >
          Verificando acceso...
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff8f6",
        padding: "45px 18px",
      }}
    >
      <div
        style={{
          maxWidth: "540px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "38px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#d97883",
              fontWeight: "700",
              fontSize: "14px",
              letterSpacing: "1px",
            }}
          >
            ACCESO PARA MAYORISTAS
          </p>

          <h1
            style={{
              marginTop: "10px",
              marginBottom: "10px",
              fontSize: "36px",
              lineHeight: "1.1",
            }}
          >
            Ingresa a tu catálogo
          </h1>

          <p
            style={{
              marginTop: 0,
              marginBottom: "28px",
              color: "#666",
              fontSize: "17px",
              lineHeight: "1.5",
            }}
          >
            Usa el número de WhatsApp que tienes registrado con nosotros.
          </p>

          {!codigoEnviado ? (
            <form onSubmit={enviarCodigo}>
              {/* SELECTOR DE CÓDIGO DE PAÍS */}
              <select
                value={codigoPais}
                onChange={(e) =>
                  setCodigoPais(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "14px 15px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                  fontSize: "16px",
                  background: "white",
                  marginBottom: "18px",
                }}
              >
                {PAISES.map((pais) => (
                  <option
                    key={pais.codigo}
                    value={pais.codigo}
                  >
                    {pais.bandera} {pais.nombre} (+{pais.codigo})
                  </option>
                ))}
              </select>

              <label
                style={{
                  display: "block",
                  fontWeight: "700",
                  marginBottom: "8px",
                }}
              >
                Número de WhatsApp
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    padding: "15px 12px",
                    background: "#f7f7f7",
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  +{codigoPais}
                </div>

                <input
                  type="tel"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) =>
                    setTelefono(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder={
                    codigoPais === "57"
                      ? "320 000 0000"
                      : "Número de teléfono"
                  }
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "15px 16px",
                    borderRadius: "12px",
                    border: "1px solid #ddd",
                    fontSize: "17px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {mensaje && (
                <Mensaje
                  tipo={tipoMensaje}
                  texto={mensaje}
                />
              )}

              <button
                type="submit"
                disabled={enviando}
                style={estiloBotonPrincipal(enviando)}
              >
                {enviando
                  ? "Enviando código..."
                  : "Enviar código por WhatsApp"}
              </button>
            </form>
          ) : (
            <form onSubmit={verificarCodigo}>
              <div
                style={{
                  background: "#f7f7f7",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "22px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#777",
                  }}
                >
                  Código enviado a
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  +{telefonoCompleto()}
                </strong>

                <button
                  type="button"
                  onClick={cambiarNumero}
                  style={{
                    marginTop: "8px",
                    border: "none",
                    background: "transparent",
                    color: "#d97883",
                    fontWeight: "700",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Cambiar número
                </button>
              </div>

              <label
                style={{
                  display: "block",
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: "12px",
                }}
              >
                Código de verificación
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={codigo}
                onChange={(e) =>
                  setCodigo(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4)
                  )
                }
                placeholder="••••"
                autoFocus
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                  fontSize: "32px",
                  fontWeight: "700",
                  textAlign: "center",
                  letterSpacing: "14px",
                  boxSizing: "border-box",
                }}
              />

              {mensaje && (
                <Mensaje
                  tipo={tipoMensaje}
                  texto={mensaje}
                />
              )}

              <button
                type="submit"
                disabled={verificando}
                style={estiloBotonPrincipal(verificando)}
              >
                {verificando
                  ? "Verificando..."
                  : "Ingresar a mi catálogo"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCodigo("");
                  setCodigoEnviado(false);
                  setMensaje("");
                  setTipoMensaje("");
                }}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "13px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  background: "white",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Solicitar otro código
              </button>
            </form>
          )}

          <div
            style={{
              marginTop: "26px",
              borderTop: "1px solid #eee",
              paddingTop: "20px",
              textAlign: "center",
              color: "#777",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            El acceso está disponible únicamente para clientes registrados con nosotros.
          </div>
        </div>
      </div>
    </main>
  );
}

function Mensaje({ tipo, texto }) {
  const exito = tipo === "exito";

  return (
    <div
      style={{
        marginTop: "18px",
        padding: "13px",
        borderRadius: "10px",
        background: exito ? "#eef9f1" : "#ffeaea",
        color: exito ? "#287a42" : "#a33",
        lineHeight: "1.4",
      }}
    >
      {texto}
    </div>
  );
}

function estiloBotonPrincipal(deshabilitado) {
  return {
    width: "100%",
    marginTop: "22px",
    border: "none",
    padding: "16px",
    borderRadius: "12px",
    background: "#d97883",
    color: "white",
    fontSize: "17px",
    fontWeight: "700",
    cursor: deshabilitado ? "not-allowed" : "pointer",
    opacity: deshabilitado ? 0.7 : 1,
  };
}
