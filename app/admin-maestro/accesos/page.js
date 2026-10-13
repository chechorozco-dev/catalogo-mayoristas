"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccesosLocal() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [temporal, setTemporal] = useState(null);
  const [cargando, setCargando] = useState(false);
  async function cargar() {
    setCargando(true);
    try {
      const resp = await fetch("/api/admin-maestro/accesos", { cache: "no-store" });
      if (resp.status === 403) { router.replace("/login"); return; }
      const j = await resp.json();
      if (!resp.ok) throw new Error(j.mensaje || "No se pudo cargar.");
      setClientes(j.clientes || []);
      setError("");
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);
  async function accion(datos) {
    if (datos.accion === "aprobar" && !window.confirm("¿Verificaste personalmente la identidad de este cliente antes de aprobarlo?")) return;
    if (datos.accion === "restablecer" && !window.confirm("¿Verificaste la identidad del cliente antes de generar una contraseña temporal?")) return;
    if (datos.accion === "desautorizar" && !window.confirm("¿Desautorizar este cliente y suspender su acceso?")) return;
    setCargando(true);
    setError("");
    setTemporal(null);
    try {
      const resp = await fetch("/api/admin-maestro/accesos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos)
      });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j.mensaje || "No pudimos procesar la acción.");
      if (j.temporal) setTemporal({ cliente_id: datos.cliente_id, clave: j.temporal });
      if (datos.accion === "autorizar") { setNombre(""); setTelefono(""); }
      await cargar();
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }
  const visibles = clientes.filter(c =>
    (c.nombre + " " + c.telefono).toLowerCase().includes(busqueda.trim().toLowerCase())
  );
  const input = { width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10,
    border: "1px solid #ddd", marginTop: 6 };
  const btn = { border: "1px solid #ddd", background: "white", borderRadius: 9,
    padding: "10px 12px", cursor: "pointer" };
  return <main style={{ background: "#f7f8fa", minHeight: "100vh", padding: 20 }}>
    <div style={{ maxWidth: 980, margin: "auto" }}>
      <button style={btn} onClick={() => router.push("/admin-maestro")}>← Volver al administrador</button>
      <h1>Clientes autorizados · RA ACCESORIOS VILLAVO</h1>
      <p>Solo quienes estén en esta lista pueden solicitar un registro con contraseña. La autorización no verifica por sí sola el número: antes de aprobar o restablecer, confirma la identidad del cliente.</p>
      {error && <p role="alert" style={{ color: "#ab2525" }}>{error}</p>}
      <section style={{ background: "white", padding: 20, borderRadius: 15, marginBottom: 20 }}>
        <h2>Autorizar un cliente</h2>
        <form onSubmit={e => { e.preventDefault(); accion({ accion: "autorizar", nombre, telefono }); }}>
          <label>Nombre <input style={input} value={nombre} required minLength={3}
            onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente" /></label>
          <label style={{ display: "block", marginTop: 10 }}>Celular <input style={input} value={telefono} required type="tel"
            onChange={e => setTelefono(e.target.value)} placeholder="3140000000" /></label>
          <button disabled={cargando} style={{ ...btn, marginTop: 12, background: "#d97883", color: "white" }}>
            Agregar a autorizados</button>
        </form>
      </section>
      {temporal && <section style={{ background: "#fff3d5", padding: 18, borderRadius: 12, marginBottom: 20 }} role="alert">
        <strong>Contraseña temporal (solo se muestra esta vez)</strong>
        <p style={{ fontFamily: "monospace", fontSize: 18, overflowWrap: "anywhere" }}>{temporal.clave}</p>
        <p>Comunícala solo al titular tras verificar su identidad. Tendrá que cambiarla antes de entrar.</p>
        <button style={btn} onClick={() => setTemporal(null)}>Ocultar contraseña</button>
      </section>}
      <section style={{ background: "white", padding: 20, borderRadius: 15 }}>
        <h2>Lista de clientes ({clientes.length})</h2>
        <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={input}
          placeholder="Buscar por nombre o celular" />
        {visibles.map(c => <div key={c.id} style={{ borderBottom: "1px solid #eee", padding: "15px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div><strong>{c.nombre || "Sin nombre"}</strong><div>{c.telefono}</div>
            <small>{c.activo ? "Autorizado" : "Desautorizado"} · {c.registro}</small></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {c.rol === "CLIENTE" && c.registro === "PENDIENTE" &&
              <button style={btn} disabled={cargando} onClick={() => accion({ accion: "aprobar", cliente_id: c.id })}>✅ Aprobar</button>}
            {c.rol === "CLIENTE" && c.activo && c.registro === "ACTIVO" &&
              <button style={btn} disabled={cargando} onClick={() => accion({ accion: "restablecer", cliente_id: c.id })}>🔑 Restablecer</button>}
            {c.rol === "CLIENTE" && c.activo &&
              <button style={btn} disabled={cargando} onClick={() => accion({ accion: "desautorizar", cliente_id: c.id })}>Suspender</button>}
          </div>
        </div>)}
        {!cargando && !visibles.length && <p>No encontramos clientes.</p>}
      </section>
    </div>
  </main>;
}