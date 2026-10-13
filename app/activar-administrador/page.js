"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActivarAdministrador() {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  async function activar(e) {
    e.preventDefault();
    setMensaje("");
    if (password !== repetir) { setMensaje("Las contraseñas no coinciden."); return; }
    setEnviando(true);
    try {
      const r=await fetch("/api/activar-administrador", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ telefono, codigo, password })
      });
      const j=await r.json();
      if (!r.ok || !j.ok) { setMensaje(j.mensaje||"No fue posible activar el acceso."); return; }
      setListo(true); setCodigo(""); setPassword(""); setRepetir("");
      setMensaje(j.mensaje);
    } catch { setMensaje("Ocurrió un error de conexión."); }
    finally { setEnviando(false); }
  }
  const input={width:"100%",boxSizing:"border-box",padding:13,borderRadius:9,border:"1px solid #ddd",marginTop:7};
  return <main style={{display:"grid",placeItems:"center",minHeight:"100vh",background:"#fff8f6",padding:20}}>
    <div style={{width:"100%",maxWidth:460,boxSizing:"border-box",background:"white",padding:28,borderRadius:20}}>
      <h1>Activar administrador</h1><p>RA ACCESORIOS VILLAVO</p>
      <p>Solo para el responsable del local. Crea una contraseña privada utilizando el código de activación entregado por el propietario.</p>
      {!listo && <form onSubmit={activar}>
        <label>Celular del administrador<input style={input} type="tel" inputMode="numeric" value={telefono}
          onChange={e=>setTelefono(e.target.value)} required autoComplete="tel" /></label>
        <label style={{display:"block",marginTop:12}}>Código de activación<input style={input} type="text"
          autoComplete="off" value={codigo} onChange={e=>setCodigo(e.target.value)} required /></label>
        <label style={{display:"block",marginTop:12}}>Tu nueva contraseña<input style={input} type="password"
          autoComplete="new-password" minLength={10} maxLength={128} value={password}
          onChange={e=>setPassword(e.target.value)} required /></label>
        <label style={{display:"block",marginTop:12}}>Confirmar contraseña<input style={input} type="password"
          autoComplete="new-password" minLength={10} maxLength={128} value={repetir}
          onChange={e=>setRepetir(e.target.value)} required /></label>
        <button disabled={enviando} style={{width:"100%",marginTop:20,padding:14,border:0,borderRadius:10,background:"#d97883",color:"white",fontWeight:700}}>
          {enviando?"Activando...":"Activar acceso"}</button>
      </form>}
      {mensaje && <p role="status" style={{padding:12,background:"#f7f7f7",borderRadius:10}}>{mensaje}</p>}
      {listo && <button onClick={()=>router.replace("/login")} style={{padding:13,borderRadius:10}}>Ir a iniciar sesión</button>}
    </div>
  </main>;
}
