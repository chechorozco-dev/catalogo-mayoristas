"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaveLogin({ initialMode = "ingresar" }) {
  const router = useRouter();
  const [modo, setModo] = useState(initialMode);
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [nueva, setNueva] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [pendiente, setPendiente] = useState(false);

  useEffect(() => {
    let activo = true;
    fetch("/api/auth/sesion", { cache: "no-store" }).then(r => r.json()).then(j => {
      if (activo && j.autenticado && j.cliente) dirigir(j.cliente);
    }).catch(() => {});
    return () => { activo = false; };
  }, []);

  function dirigir(cliente) {
    if (cliente?.rol === "MAESTRO") router.replace("/admin-maestro");
    else if (cliente?.tienda_id) router.replace("/admin");
    else router.replace("/crear-tienda");
    router.refresh();
  }

  async function enviar(evento) {
    evento.preventDefault();
    setMensaje("");
    setExito(false);
    if (!/^3\d{9}$/.test(telefono.replace(/\D/g, ""))) {
      setMensaje("Escribe los 10 dígitos de tu celular colombiano.");
      return;
    }
    setCargando(true);
    try {
      let destino = "/api/auth/clave/ingresar";
      let cuerpo = { telefono: telefono.replace(/\D/g, ""), password };
      if (modo === "registro") destino = "/api/auth/clave/registro";
      if (modo === "cambiar") {
        destino = "/api/auth/clave/cambiar";
        cuerpo = { telefono: telefono.replace(/\D/g, ""), actual: password, nueva };
      }
      const resp = await fetch(destino, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
      });
      const j = await resp.json();
      if (!resp.ok || !j.ok) {
        setMensaje(j.mensaje || "No fue posible completar la solicitud.");
        return;
      }
      if (j.pendiente) {
        setPendiente(true);
        setPassword("");
        setMensaje(j.mensaje);
        setExito(true);
      } else if (j.requiereCambio) {
        setModo("cambiar");
        setMensaje(j.mensaje);
        setExito(true);
      } else {
        setMensaje("¡Ingreso correcto!");
        setExito(true);
        dirigir(j.cliente);
      }
    } catch (e) {
      setMensaje("No logramos conectar con la tienda. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }
  function cambiarModo(m) {
    setModo(m);
    setMensaje("");
    setExito(false);
    setPendiente(false);
    setPassword("");
    setNueva("");
  }
  const input = {
    width: "100%", boxSizing: "border-box", border: "1px solid #ddd",
    borderRadius: 12, padding: "14px 15px", fontSize: 16, marginTop: 8
  };
  const boton = {
    width: "100%", border: 0, borderRadius: 12, padding: 15,
    background: "#d97883", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer"
  };
  return (
    <main style={{ minHeight: "100vh", background: "#fff8f6", display: "grid",
      placeItems: "center", padding: 20, color: "#202020" }}>
      <div style={{ background: "white", width: "100%", maxWidth: 460, boxSizing: "border-box",
        padding: 30, borderRadius: 22, boxShadow: "0 12px 35px #0001" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#c96b7b", letterSpacing: 1 }}>RA ACCESORIOS VILLAVO</p>
        <h1 style={{ fontSize: 30, marginBottom: 10 }}>
          {modo === "registro" ? "Crear mi contraseña" : modo === "cambiar" ? "Actualizar contraseña" : "Ingresar al catálogo"}
        </h1>
        <p style={{ color: "#666", lineHeight: 1.55 }}>
          {modo === "registro"
            ? "Solo puedes registrarte si tu celular ya figura en la lista de clientes autorizados de esta tienda. Después verificaremos tu identidad para activar el acceso."
            : modo === "cambiar" ? "Ingresa la contraseña temporal que te entregó el administrador y elige una nueva."
            : "Ingresa con el celular registrado en RA ACCESORIOS VILLAVO y tu contraseña. No necesitas recibir códigos por WhatsApp."}
        </p>
        {!pendiente && (
          <form onSubmit={enviar}>
            <label style={{ display: "block", fontWeight: 700, marginTop: 18 }}>Número de celular</label>
            <input type="tel" inputMode="numeric" autoComplete="tel" style={input}
              placeholder="3146039934" value={telefono}
              onChange={e => setTelefono(e.target.value)} maxLength={18} required />
            <label style={{ display: "block", fontWeight: 700, marginTop: 18 }}>
              {modo === "cambiar" ? "Contraseña actual o temporal" : "Contraseña"}
            </label>
            <input type="password" autoComplete={modo === "registro" ? "new-password" : "current-password"}
              style={input} minLength={modo === "registro" ? 10 : 1} maxLength={128}
              placeholder={modo === "registro" ? "Mínimo 10 caracteres, letras y números" : "Tu contraseña"}
              value={password} onChange={e => setPassword(e.target.value)} required />
            {modo === "cambiar" && (
              <>
                <label style={{ display: "block", fontWeight: 700, marginTop: 18 }}>Nueva contraseña</label>
                <input type="password" autoComplete="new-password" style={input}
                  placeholder="Mínimo 10 caracteres, letras y números" minLength={10} maxLength={128}
                  value={nueva} onChange={e => setNueva(e.target.value)} required />
              </>
            )}
            <button type="submit" disabled={cargando} style={{ ...boton, opacity: cargando ? .6 : 1, marginTop: 24 }}>
              {cargando ? "Un momento..." : modo === "registro" ? "Solicitar registro" : modo === "cambiar" ? "Cambiar contraseña" : "Ingresar"}
            </button>
          </form>
        )}
        {mensaje && <p role="status" style={{ marginTop: 18, padding: 14, borderRadius: 10,
          background: exito ? "#ecfaf0" : "#fff0ef", color: exito ? "#18572e" : "#9a3030" }}>{mensaje}</p>}
        {modo === "ingresar" && (
          <>
            <button type="button" onClick={() => cambiarModo("registro")} style={{ ...boton, background: "white",
              color: "#c46d7d", border: "1px solid #e8b8c2", marginTop: 15 }}>Registrarme</button>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
              ¿Olvidaste tu contraseña? Solicita al administrador un restablecimiento después de comprobar tu identidad.
            </p>
          </>
        )}
        {modo !== "ingresar" && <button type="button" onClick={() => cambiarModo("ingresar")} style={{
          ...boton, color: "#b76377", background: "transparent", marginTop: 16
        }}>Volver a ingresar</button>}
      </div>
    </main>
  );
}