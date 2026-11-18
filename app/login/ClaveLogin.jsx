"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ClaveLogin.module.css";

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
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.brand} aria-label="RA Accesorios Villavo">
          <span className={styles.monogram} aria-hidden="true">RA</span>
          <div>
            <span className={styles.brandName}>RA Accesorios</span>
            <span className={styles.brandPlace}>Villavo</span>
          </div>
        </header>

        <section className={styles.card} aria-labelledby="villavo-login-title">
          <div className={styles.heading}>
            <span className={styles.eyebrow}>Tu catálogo, a un paso</span>
            <h1 id="villavo-login-title" className={styles.title}>
              {modo === "registro" ? "Crear mi contraseña" : modo === "cambiar" ? "Actualizar contraseña" : "Ingresar al catálogo"}
            </h1>
          </div>
        <p className={styles.description}>
          {modo === "registro"
            ? "Solo puedes registrarte si tu celular ya figura en la lista de clientes autorizados de esta tienda. Después verificaremos tu identidad para activar el acceso."
            : modo === "cambiar" ? "Ingresa la contraseña temporal que te entregó el administrador y elige una nueva."
            : "Ingresa con el celular registrado en RA ACCESORIOS VILLAVO y tu contraseña. No necesitas recibir códigos por WhatsApp."}
        </p>
        {!pendiente && (
          <form onSubmit={enviar} className={styles.form} aria-busy={cargando}>
            <label htmlFor="villavo-telefono" className={styles.label}>Número de celular</label>
            <div className={styles.phoneField}>
              <span className={styles.countryCode} aria-hidden="true">+57</span>
              <input id="villavo-telefono" name="telefono" type="tel" inputMode="numeric" autoComplete="tel-national" className={styles.phoneInput}
              placeholder="3100000000" value={telefono}
              aria-describedby="villavo-telefono-ayuda" onChange={e => setTelefono(e.target.value)} maxLength={18} required />
            </div>
            <span id="villavo-telefono-ayuda" className={styles.hint}>Escribe los 10 dígitos de tu celular.</span>
            <label htmlFor="villavo-password" className={styles.label}>
              {modo === "cambiar" ? "Contraseña actual o temporal" : "Contraseña"}
            </label>
            <input id="villavo-password" name="password" type="password" autoComplete={modo === "registro" ? "new-password" : "current-password"}
              className={styles.input} minLength={modo === "registro" ? 6 : 1} maxLength={128}
              placeholder={modo === "registro" ? "Mínimo 6 caracteres, a tu elección" : "Tu contraseña"}
              value={password} onChange={e => setPassword(e.target.value)} required />
            {modo === "cambiar" && (
              <>
                <label htmlFor="villavo-nueva" className={styles.label}>Nueva contraseña</label>
                <input id="villavo-nueva" name="nueva" type="password" autoComplete="new-password" className={styles.input}
                  placeholder="Mínimo 6 caracteres, a tu elección" minLength={6} maxLength={128}
                  value={nueva} onChange={e => setNueva(e.target.value)} required />
              </>
            )}
            <button type="submit" disabled={cargando} className={styles.primaryButton}>
              {cargando ? "Un momento..." : modo === "registro" ? "Solicitar registro" : modo === "cambiar" ? "Cambiar contraseña" : "Ingresar"}
            </button>
          </form>
        )}
        {mensaje && <p role={exito ? "status" : "alert"} className={`${styles.message} ${exito ? styles.success : styles.error}`}>{mensaje}</p>}
        {modo === "ingresar" && (
          <>
            <button type="button" onClick={() => cambiarModo("registro")} className={styles.secondaryButton}>Registrarme</button>
            <p className={styles.recovery}>
              ¿Olvidaste tu contraseña? Solicita al administrador un restablecimiento después de comprobar tu identidad.
            </p>
          </>
        )}
        {modo !== "ingresar" && <button type="button" onClick={() => cambiarModo("ingresar")} className={styles.backButton}>Volver a ingresar</button>}
        </section>
        <footer className={styles.footer}>RA Accesorios <span aria-hidden="true">·</span> Villavicencio</footer>
      </div>
    </main>
  );
}
