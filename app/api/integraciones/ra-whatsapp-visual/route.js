import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import {
  MAX_VISUAL_IMAGE_BYTES, descargarFotoCatalogo,
  firmaVisual, similitudVisual,
} from "../../../../lib/catalogo/visual.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const TABLE = "ra_catalog_visual_index";
const RA_SLUG = "mayoristas-ra";
const MAX_INDEX_BATCH = 20;

const reply = (data,status=200)=>NextResponse.json(data,{
  status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"},
});

function authorized(request) {
  const secret = process.env.RA_LAB_CATALOG_SHARED_SECRET;
  const actual = request.headers.get("x-ra-lab-catalog-secret");
  if(!secret||!actual) return false;
  const a=Buffer.from(actual),b=Buffer.from(secret);
  return a.length===b.length && timingSafeEqual(a,b);
}

function admin() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!secret)throw Error("Falta configuración de base de datos.");
  return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function tiendaPrincipal(db) {
  const {data,error}=await db.from("tiendas").select("id,negocio_id")
    .eq("slug",RA_SLUG).eq("tipo_tienda","RA").eq("activa",true)
    .maybeSingle();
  if(error||!data?.negocio_id)throw Error("Tienda RA no encontrada.");
  return data;
}

async function fotosCatalogo(db,negocio) {
  // Supabase defaults to 1,000 rows; paginate for future catalogs.
  const getAll=async(table,select)=>{
    let rows=[];
    for(let offset=0;offset<5000;offset+=500){
      const {data,error}=await db.from(table).select(select).eq("negocio_id",negocio)
        .eq("activo",true).order("id",{ascending:true}).range(offset,offset+499);
      if(error)throw error;
      rows.push(...(data||[]));
      if(!data||data.length<500)break;
    }
    return rows;
  };
  const [productos,variantes]=await Promise.all([
    getAll("productos","id,referencia,foto_url,foto_url_2"),
    getAll("producto_variantes","id,producto_id,referencia,foto_url,foto_url_2"),
  ]);
  const originals=new Set(productos.map(p=>String(p.id)));
  const photos=[];
  const add=(p,variantId=null)=>{
    if(p.foto_url) photos.push({
      producto_id:variantId?String(p.producto_id):String(p.id),
      variante_id:variantId?String(variantId):null,
      foto_num:1, foto_url:String(p.foto_url),
    });
    if(p.foto_url_2) photos.push({
      producto_id:variantId?String(p.producto_id):String(p.id),
      variante_id:variantId?String(variantId):null,
      foto_num:2, foto_url:String(p.foto_url_2),
    });
  };
  productos.forEach(p=>add(p));
  variantes.filter(v=>originals.has(String(v.producto_id))).forEach(v=>add(v,v.id));
  return photos;
}

const key=r=>[String(r.producto_id),String(r.variante_id??"base"),r.foto_num].join(":");

async function status(db,tienda) {
  const fotos=await fotosCatalogo(db,tienda.negocio_id);
  const {data,error}=await db.from(TABLE)
    .select("producto_id,variante_id,foto_num,foto_url,estado")
    .eq("negocio_id",tienda.negocio_id).limit(4000);
  if(error)throw error;
  const map=new Map((data||[]).map(row=>[key(row),row]));
  const indexed=fotos.filter(f=>{
    const row=map.get(key(f));
    return row?.estado==="indexed"&&row.foto_url===f.foto_url;
  }).length;
  return reply({success:true,total:fotos.length,indexed,ready:indexed>=Math.min(30,fotos.length),
    complete:indexed===fotos.length,indexer:"perceptual-v1",
    note:"Coincidencias visuales aproximadas; confirmar siempre la referencia."});
}

async function index(db,tienda,body) {
  const cursor=Number(body?.cursor??0);
  const limit=Number(body?.limit??MAX_INDEX_BATCH);
  if(!Number.isSafeInteger(cursor)||cursor<0||cursor>100000||
    !Number.isSafeInteger(limit)||limit<1||limit>MAX_INDEX_BATCH){
    return reply({success:false,error:"Parámetros de indexación inválidos."},400);
  }
  const photos=await fotosCatalogo(db,tienda.negocio_id);
  const batch=photos.slice(cursor,cursor+limit);
  if(!batch.length)return reply({success:true,total:photos.length,
    nextCursor:photos.length,done:true,processed:0,indexed:0,failed:0,skipped:0});
  const productIds=[...new Set(batch.map(p=>p.producto_id))];
  const {data:existing,error:existingError}=await db.from(TABLE)
    .select("producto_id,variante_id,foto_num,foto_url,estado")
    .eq("negocio_id",tienda.negocio_id).in("producto_id",productIds);
  if(existingError)throw existingError;
  const current=new Map((existing||[]).map(x=>[key(x),x]));
  const toCreate=batch.filter(photo=>{
    const row=current.get(key(photo));
    return !(row?.estado==="indexed"&&row.foto_url===photo.foto_url);
  });
  const results=[];
  // Bound concurrency and egress: max 5 simultaneous remote image downloads.
  for(let i=0;i<toCreate.length;i+=5){
    const slice=toCreate.slice(i,i+5);
    results.push(...await Promise.all(slice.map(async photo=>{
      try {
        const bytes=await descargarFotoCatalogo(photo.foto_url);
        const signature=await firmaVisual(bytes);
        return {...photo,estado:"indexed",signature,ok:true};
      }catch(error){
        console.error("No se pudo indexar fotografía RA",
          photo.producto_id,photo.variante_id,photo.foto_num,
          error instanceof Error?error.message:"Error de imagen");
        return {...photo,estado:"error",signature:null,ok:false};
      }
    })));
  }
  if(results.length){
    const rows=results.map(({ok,...photo})=>({
      ...photo,negocio_id:tienda.negocio_id,
      actualizado_en:new Date().toISOString(),
    }));
    const {error}=await db.from(TABLE)
      .upsert(rows,{onConflict:"negocio_id,producto_id,variante_id,foto_num"});
    if(error)throw error;
  }
  const nextCursor=Math.min(cursor+limit,photos.length);
  return reply({success:true,total:photos.length,processed:batch.length,
    indexed:results.filter(r=>r.ok).length,
    failed:results.filter(r=>!r.ok).length,
    skipped:batch.length-toCreate.length,
    nextCursor,done:nextCursor>=photos.length});
}

async function findMatches(db,tienda,uploaded) {
  if(uploaded.size>MAX_VISUAL_IMAGE_BYTES||uploaded.size===0)
    return reply({success:false,error:"La imagen debe pesar menos de 5 MB."},413);
  if(!["image/jpeg","image/png","image/webp","image/heic","image/heif","application/octet-stream"].includes(uploaded.type))
    return reply({success:false,error:"Utiliza una fotografía JPG, PNG o WebP."},415);
  const signature=await firmaVisual(await uploaded.arrayBuffer());
  const indexed=[];
  for(let page=0;page<7;page++){
    const {data,error}=await db.from(TABLE)
      .select("producto_id,variante_id,foto_num,foto_url,signature")
      .eq("negocio_id",tienda.negocio_id).eq("estado","indexed")
      .order("id",{ascending:true}).range(page*400,page*400+399);
    if(error)throw error;
    indexed.push(...(data||[]));
    if(!data||data.length<400)break;
  }
  if(!indexed.length) return reply({success:true,results:[],indexed:0,
    errorCode:"INDEX_NOT_READY",message:"Primero hay que preparar las fotografías del catálogo."});
  const ranked=indexed.map(entry=>({
    ...entry,score:similitudVisual(signature,entry.signature),
  })).filter(entry=>entry.score!==null)
    .sort((a,b)=>b.score-a.score);
  const top=ranked.slice(0,160);
  const productIds=[...new Set(top.map(x=>x.producto_id))];
  if(!productIds.length)return reply({success:true,results:[],indexed:indexed.length});
  const [parentRes,variantRes,hiddenRes]=await Promise.all([
    db.from("productos")
      .select("id,referencia,nombre,categoria,foto_url,foto_url_2,precio_detal,costo,solo_ra")
      .eq("negocio_id",tienda.negocio_id).eq("activo",true).in("id",productIds),
    db.from("producto_variantes")
      .select("id,producto_id,referencia,nombre_variante,foto_url,foto_url_2,precio_detal,costo")
      .eq("negocio_id",tienda.negocio_id).eq("activo",true)
      .in("id",[...new Set(top.map(x=>x.variante_id).filter(Boolean))].length
        ? [...new Set(top.map(x=>x.variante_id).filter(Boolean))] : [-1]),
    db.from("tienda_productos").select("producto_id,visible")
      .eq("tienda_id",tienda.id).in("producto_id",productIds),
  ]);
  if(parentRes.error||variantRes.error||hiddenRes.error)
    throw parentRes.error||variantRes.error||hiddenRes.error;
  const parents=new Map((parentRes.data||[]).map(p=>[String(p.id),p]));
  const variants=new Map((variantRes.data||[]).map(v=>[String(v.id),v]));
  const hidden=new Set((hiddenRes.data||[])
    .filter(row=>row.visible===false).map(row=>String(row.producto_id)));
  const used=new Set(),results=[];
  for(const row of ranked.slice(0,160)) {
    const p=parents.get(String(row.producto_id));
    if(!p||hidden.has(String(row.producto_id)))continue;
    const v=row.variante_id?variants.get(String(row.variante_id)):null;
    if(row.variante_id&&(!v||String(v.producto_id)!==String(p.id)))continue;
    const currentUrl=row.foto_num===2?(v?.foto_url_2||p.foto_url_2):(v?.foto_url||p.foto_url);
    if(!currentUrl||currentUrl!==row.foto_url)continue; // Stale fingerprint.
    const composite=String(p.id)+":"+(v?.id??"");
    if(used.has(composite))continue;
    used.add(composite);
    results.push({
      id:String(p.id),variantId:v?String(v.id):null,
      referencia:v?.referencia||p.referencia,
      nombre:[p.nombre,v?.nombre_variante].filter(Boolean).join(" · "),
      categoria:p.categoria||"",
      foto_url:v?.foto_url||p.foto_url,
      foto_url_2:v?.foto_url_2||p.foto_url_2,
      precio:Number(v?.costo??p.costo??0),
      precio_sugerido:Number(v?.precio_detal??p.precio_detal??0),
      solo_ra:p.solo_ra===true,
      // Explicitly do not return made-up probability percentages.
      nivel:row.score>=0.89?"muy_parecida":row.score>=0.77?"similar":"revisar",
    });
    if(results.length===5)break;
  }
  return reply({success:true,results,indexed:indexed.length,
    message:"Estas son sugerencias visuales, no referencias confirmadas."});
}

export async function POST(request) {
  if(!authorized(request))return reply({success:false,error:"No autorizado."},401);
  try {
    const db=admin();
    const tienda=await tiendaPrincipal(db);
    const contentType=request.headers.get("content-type")||"";
    if(contentType.startsWith("multipart/form-data")){
      const form=await request.formData();
      if(form.get("action")!=="search")return reply({success:false,error:"Acción inválida."},400);
      const photo=form.get("file");
      if(!(photo instanceof File))return reply({success:false,error:"Falta la fotografía."},400);
      return await findMatches(db,tienda,photo);
    }
    if(!contentType.includes("application/json"))return reply({success:false,error:"Formato inválido."},415);
    const body=await request.json();
    if(body?.action==="status")return await status(db,tienda);
    if(body?.action==="index")return await index(db,tienda,body);
    return reply({success:false,error:"Acción inválida."},400);
  }catch(error){
    console.error("Búsqueda visual RA:",error);
    return reply({success:false,error:error instanceof Error&&
      /fotografía|imagen|formato|JPG|PNG/i.test(error.message)
       ? error.message:"No se pudo procesar la solicitud de búsqueda visual."},500);
  }
}
