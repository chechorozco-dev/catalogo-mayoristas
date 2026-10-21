"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {PALETAS_TIENDA,crearSlugVistaPrevia,colorDeTexto} from "../../lib/paletasTienda.mjs";
import "./crear-tienda.css";

async function prepararFoto(file) {
  if(!file.type.startsWith("image/"))throw Error("Selecciona una foto válida.");
  if(file.size>20*1024*1024)throw Error("Elige una imagen menor de 20 MB.");
  const local=URL.createObjectURL(file);
  try {
    const img=await new Promise((resolve,reject)=>{
      const el=new Image();
      el.onload=()=>resolve(el);
      el.onerror=()=>reject(Error("No pudimos leer la foto. Usa JPG o PNG."));
      el.src=local;
    });
    const factor=Math.min(1,900/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
    const ctx=canvas.getContext("2d");
    if(!ctx)throw Error("No se pudo procesar la foto.");
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.82));
    if(!blob||blob.type!=="image/webp")throw Error("No se pudo convertir la foto. Prueba con JPG o PNG.");
    if(blob.size>5*1024*1024)throw Error("La imagen sigue siendo demasiado pesada.");
    return new File([blob],"foto-tienda.webp",{type:"image/webp"});
  } finally {URL.revokeObjectURL(local);}
}

export default function OnboardingTienda(){
  const router=useRouter();
  const [cargando,setCargando]=useState(true);
  const [creando,setCreando]=useState(false);
  const [preparandoFoto,setPreparandoFoto]=useState(false);
  const [subiendoFoto,setSubiendoFoto]=useState(false);
  const [creada,setCreada]=useState(false);
  const [cliente,setCliente]=useState(null);
  const [nombre,setNombre]=useState("");
  const [estilo,setEstilo]=useState("morado");
  const [principal,setPrincipal]=useState(PALETAS_TIENDA[0].principal);
  const [fondo,setFondo]=useState(PALETAS_TIENDA[0].fondo);
  const [foto,setFoto]=useState(null);
  const [fotoUrl,setFotoUrl]=useState("");
  const [mensaje,setMensaje]=useState("");
  const [dominio,setDominio]=useState("mi-catalogo-accesorios.vercel.app");

  useEffect(()=>{
    let active=true;
    setDominio(window.location.host);
    (async()=>{
      try{
        const res=await fetch("/api/auth/sesion",{cache:"no-store",credentials:"same-origin"});
        const json=await res.json();
        if(!res.ok||!json.autenticado){router.replace("/login");return;}
        if(!active)return;
        setCliente(json.cliente||null);
        if(json.cliente?.tienda_id){router.replace("/admin");return;}
        setCargando(false);
      }catch(e){console.error("Error comprobando la sesión",e);router.replace("/login");}
    })();
    return()=>{active=false;};
  },[router]);
  useEffect(()=>()=>{if(fotoUrl)URL.revokeObjectURL(fotoUrl);},[fotoUrl]);

  const slug=useMemo(()=>crearSlugVistaPrevia(nombre),[nombre]);
  const paleta=PALETAS_TIENDA.find(x=>x.id===estilo);
  const colorAcento=paleta?.acento||principal;
  const primerNombre=String(cliente?.nombre||"").trim().split(/\s+/)[0];
  const listaParaCrear=nombre.trim().length>=2&&Boolean(slug)&&!creando&&!preparandoFoto;
  const textoBoton=colorDeTexto(principal);

  async function elegirFoto(event){
    const original=event.target.files?.[0];
    event.target.value="";
    if(!original)return;
    setPreparandoFoto(true);setMensaje("");
    try{
      const procesada=await prepararFoto(original);
      setFoto(procesada);
      setFotoUrl(URL.createObjectURL(procesada));
    }catch(err){setMensaje(err instanceof Error?err.message:"No pudimos leer la imagen.");}
    finally{setPreparandoFoto(false);}
  }

  async function subirLogo(){
    if(!foto)return true;
    setSubiendoFoto(true);
    try{
      const form=new FormData();
      form.append("logo",foto);
      // Tras crear la tienda, la API de creación emite la cookie actualizada.
      // Reutilizamos el endpoint autenticado que ya usan los administradores.
      const res=await fetch("/api/tiendas/logo",{
        method:"POST",body:form,cache:"no-store",credentials:"same-origin"
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok)throw Error(data.mensaje||"No se pudo guardar la foto.");
      return true;
    }catch(err){
      setMensaje("Tu tienda sí quedó creada, pero no se guardó la foto. "+
        (err instanceof Error?err.message:"")+" Puedes volver a intentarlo o agregarla desde tu administrador.");
      return false;
    }finally{setSubiendoFoto(false);}
  }

  function irAlAdministrador(){router.replace("/admin");router.refresh();}
  async function reintentarLogo(){
    setMensaje("");
    if(await subirLogo())irAlAdministrador();
  }
  async function crearTienda(event){
    event.preventDefault();
    if(creando||creada)return;
    if(nombre.trim().length<2||!slug){setMensaje("Escribe un nombre válido para tu tienda.");return;}
    if(preparandoFoto){setMensaje("Espera mientras se prepara tu foto.");return;}
    setCreando(true);setMensaje("");
    try{
      const res=await fetch("/api/tiendas/crear",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({nombre_tienda:nombre.trim(),color_principal:principal,color_fondo:fondo})
      });
      const json=await res.json().catch(()=>({}));
      if(!res.ok||!json.ok){
        if(res.status===409&&json.tienda_id){irAlAdministrador();return;}
        throw Error(json.mensaje||"No pudimos crear tu tienda.");
      }
      setCreada(true);
      if(foto&&!(await subirLogo()))return;
      irAlAdministrador();
    }catch(err){setMensaje(err instanceof Error?err.message:"No pudimos crear tu tienda.");}
    finally{setCreando(false);}
  }

  if(cargando)return <main className="ra-setup-loading" role="status">Preparando tu catálogo…</main>;
  return <main className="ra-setup-shell">
    <div className="ra-setup-wrap">
      <header className="ra-setup-header">
        <span className="ra-setup-step">PERSONALIZA TU CATÁLOGO</span>
        <h1>Configura tu tienda</h1>
        <p>{primerNombre?"¡Hola, "+primerNombre+"! ":""}Ponle nombre, elige colores bonitos y sube tu foto o logo.</p>
      </header>

      <form onSubmit={crearTienda} noValidate>
        <section className="ra-setup-card" aria-labelledby="ra-setup-logo-title">
          <div className="ra-setup-section-heading">
            <span className="ra-setup-section-icon">📷</span>
            <div><h2 id="ra-setup-logo-title">Foto o logo de tu tienda</h2>
              <p>Para que tus clientes reconozcan tu negocio.</p></div>
          </div>
          <div className="ra-setup-upload">
            <div className="ra-setup-photo-preview">
              {fotoUrl?<img src={fotoUrl} alt="Foto que elegiste para tu tienda"/>:
                <span aria-hidden="true">🏪</span>}
            </div>
            <div className="ra-setup-photo-actions">
              <label className="ra-setup-pick-photo">
                <input type="file" accept="image/*" aria-label="Subir foto o logo de mi tienda"
                  disabled={creando||preparandoFoto||creada} onChange={e=>void elegirFoto(e)}/>
                {preparandoFoto?"Preparando foto…":foto?"Cambiar foto":"Subir foto"}
              </label>
              {foto&&!creada&&<button className="ra-setup-remove-photo" type="button"
                disabled={creando} onClick={()=>{setFoto(null);setFotoUrl("");}}>Quitar foto</button>}
              <small>Opcional. Puedes cambiarla después desde tu administrador.</small>
            </div>
          </div>
        </section>

        <section className="ra-setup-card" aria-labelledby="ra-setup-name-title">
          <div className="ra-setup-section-heading">
            <span className="ra-setup-section-icon ra-setup-icon-blue">🏬</span>
            <div><h2 id="ra-setup-name-title">Nombre de tu tienda</h2>
              <p>Así te encontrarán tus clientes.</p></div>
          </div>
          <label className="ra-setup-screenreader" htmlFor="ra-setup-name">Nombre de tu tienda</label>
          <input id="ra-setup-name" className="ra-setup-name" autoComplete="organization" type="text"
            value={nombre} onChange={e=>{setNombre(e.target.value);setMensaje("");}}
            maxLength={80} placeholder="Ej: Accesorios Tatiana"
            disabled={creando||creada} required/>
          <div className="ra-setup-url">
            <span aria-hidden="true">🔗</span>
            <div><small>Tu enlace se parecerá a:</small>
              <strong>{"https://"+dominio+"/"+(slug||"nombre-de-tu-tienda")}</strong>
              <p>Si ya existe uno igual, agregaremos un número al crearlo.</p></div>
          </div>
        </section>

        <section className="ra-setup-card" aria-labelledby="ra-setup-style-title">
          <div className="ra-setup-section-heading">
            <span className="ra-setup-section-icon ra-setup-icon-pink">🎨</span>
            <div><h2 id="ra-setup-style-title">Elige el estilo de tu tienda</h2>
              <p>Combinamos los colores por ti. Después podrás cambiarlos.</p></div>
          </div>
          <div className="ra-setup-palettes" role="group" aria-label="Combinaciones de colores">
            {PALETAS_TIENDA.map(item=><button key={item.id} type="button"
              className={"ra-setup-palette"+(estilo===item.id?" is-chosen":"")}
              style={{"--palette-color":item.principal,"--palette-bg":item.fondo}}
              aria-pressed={estilo===item.id} disabled={creando||creada}
              onClick={()=>{setEstilo(item.id);setPrincipal(item.principal);setFondo(item.fondo);setMensaje("");}}>
              <span className="ra-setup-swatches" aria-hidden="true">{item.muestras.map(c=><i key={c} style={{backgroundColor:c}}/>)}</span>
              <span>{item.nombre}</span>
              {estilo===item.id&&<strong aria-hidden="true">✓</strong>}
            </button>)}
            <button type="button" className={"ra-setup-palette ra-setup-personalized"+(estilo==="personalizado"?" is-chosen":"")}
              style={{"--palette-color":principal,"--palette-bg":fondo}}
              aria-pressed={estilo==="personalizado"} disabled={creando||creada}
              onClick={()=>{setEstilo("personalizado");setMensaje("");}}>
              <span className="ra-setup-rainbow" aria-hidden="true"/>
              <span>Personalizado</span><strong aria-hidden="true">{estilo==="personalizado"?"✓":"›"}</strong>
            </button>
          </div>
          {estilo==="personalizado"&&<div className="ra-setup-custom-colors">
            <label>Color principal
              <span><input type="color" value={principal} disabled={creando||creada}
                onChange={e=>setPrincipal(e.target.value)}/>{principal.toUpperCase()}</span>
            </label>
            <label>Color de fondo
              <span><input type="color" value={fondo} disabled={creando||creada}
                onChange={e=>setFondo(e.target.value)}/>{fondo.toUpperCase()}</span>
            </label>
          </div>}
        </section>

        <section className="ra-setup-card" aria-labelledby="ra-setup-preview-title">
          <div className="ra-setup-section-heading">
            <span className="ra-setup-section-icon">👁️</span>
            <div><h2 id="ra-setup-preview-title">Vista previa</h2>
              <p>Mira cómo se verán el nombre, el logo y los colores.</p></div>
          </div>
          <div className="ra-setup-store-preview" style={{backgroundColor:fondo,"--main":principal,"--accent":colorAcento,"--on-main":textoBoton}}>
            <div className="ra-setup-store-cover" style={{background:"linear-gradient(115deg,"+principal+","+colorAcento+")"}}>
              <span>✨ TU CATÁLOGO</span><span aria-hidden="true">✦</span>
            </div>
            <div className="ra-setup-store-brand">
              <div className="ra-setup-store-logo">
                {fotoUrl?<img src={fotoUrl} alt="Vista previa de la foto"/>:<span aria-hidden="true">🏪</span>}
              </div>
              <div><strong>{nombre.trim()||"Tu tienda"}</strong>
                <small>Accesorios que te hacen brillar ✨</small></div>
            </div>
            <nav className="ra-setup-store-nav" aria-label="Ejemplo de menú de tienda">
              <span className="active">⌂ Inicio</span><span>♡ Favoritos</span><span>🛍 Productos</span>
            </nav>
            <div className="ra-setup-store-banner">
              <div><small>NUEVA COLECCIÓN</small><strong>Encuentra tus favoritos</strong></div>
              <span style={{backgroundColor:principal,color:textoBoton}}>Ver productos →</span>
            </div>
          </div>
          <p className="ra-setup-preview-caption">Esta es una vista ilustrativa. Tu catálogo real mostrará tus productos.</p>
        </section>

        {mensaje&&<div className="ra-setup-alert" role="alert">{mensaje}</div>}
        {creada?<div className="ra-setup-finish">
          <h3>¡Tu tienda ya está creada!</h3>
          <p>Entra a tu administrador o vuelve a intentar subir la foto.</p>
          {foto&&<button type="button" disabled={subiendoFoto}
            onClick={()=>void reintentarLogo()}>{subiendoFoto?"Subiendo foto…":"Reintentar subir foto"}</button>}
          <button type="button" className="ra-setup-visit-admin" onClick={irAlAdministrador}>Ir a mi tienda →</button>
        </div>:<button type="submit" className="ra-setup-create"
          disabled={!listaParaCrear} style={{backgroundColor:principal,color:textoBoton}}>
          {creando?(subiendoFoto?"Guardando tu foto…":"Creando tu tienda…"):"Crear mi tienda →"}
        </button>}
        <p className="ra-setup-bottom-note">Después podrás agregar productos, personalizar más detalles y compartir tu enlace por WhatsApp.</p>
      </form>
    </div>
  </main>;
}