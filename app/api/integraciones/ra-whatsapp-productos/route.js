import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Read-only integration. It never writes to the catalog, sends WhatsApp
// messages or exposes the privileged database key to the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RESULTS = 30;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const json = (body, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });

function authenticate(request) {
  const expected = process.env.RA_LAB_CATALOG_SHARED_SECRET;
  const actual = request.headers.get("x-ra-lab-catalog-secret") || "";
  if (!expected || actual.length !== expected.length || !actual) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw Error("Falta configurar el catálogo interno.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function tiendaRa(db) {
  // Select the very same RA store that customers see on mayoristasra.com,
  // instead of assuming an environment business ID belongs to that store.
  const slug = process.env.RA_LAB_CATALOG_RA_SLUG || "mayoristas-ra";
  const { data, error } = await db.from("tiendas")
    .select("id,negocio_id").eq("slug", slug)
    .eq("tipo_tienda", "RA").eq("activa", true).limit(1).maybeSingle();
  if (error || !data?.negocio_id) throw Error("No se encontró la tienda principal RA activa.");
  return data;
}

async function visibles(db, tiendaId, productIds) {
  if (!productIds.length) return new Set();
  const { data, error } = await db.from("tienda_productos")
    .select("producto_id,visible")
    .eq("tienda_id", tiendaId)
    .in("producto_id", productIds);
  // Fail closed: never include manually hidden products if lookup fails.
  if (error) throw error;
  return new Set((data || []).filter(row => row.visible === false).map(row => String(row.producto_id)));
}

function item(product, variant = null) {
  const referencia = variant?.referencia || product.referencia || "";
  return {
    id: String(product.id),
    variantId: variant ? String(variant.id) : null,
    referencia: String(referencia),
    nombre: [product.nombre, variant?.nombre_variante].filter(Boolean).join(" · "),
    categoria: String(product.categoria || ""),
    solo_ra: product.solo_ra === true,
    foto_url: variant?.foto_url || product.foto_url || null,
    foto_url_2: variant?.foto_url_2 || product.foto_url_2 || null,
    // These are the RA principal wholesale and suggested retail prices.
    // Never return the raw column "costo" or privileged database records.
    precio: Number(variant?.costo ?? product.costo ?? 0),
    precio_sugerido: Number(variant?.precio_detal ?? product.precio_detal ?? 0),
  };
}

async function search(db, negocio, tienda, term) {
  // Filter wildcard characters and PostgREST expression syntax before .or.
  if (!/^[\p{L}\p{N} _.-]{1,50}$/u.test(term)) {
    return json({ success: false, error: "Escribe una referencia o nombre válido." }, 400);
  }
  const escaped = term.replace(/[_]/g, "\\_");
  const [parentsRes, variantsRes] = await Promise.all([
    db.from("productos")
      .select("id,referencia,nombre,categoria,foto_url,foto_url_2,costo,precio_detal,solo_ra,tiene_variantes")
      .eq("negocio_id", negocio).eq("activo", true)
      .or(`referencia.ilike.${escaped}%,nombre.ilike.%${escaped}%`)
      .order("referencia", { ascending: true }).limit(35),
    db.from("producto_variantes")
      .select("id,producto_id,referencia,foto_url,foto_url_2,costo,precio_detal,nombre_variante,orden")
      .eq("negocio_id", negocio).eq("activo", true)
      .ilike("referencia", `${escaped}%`)
      .order("referencia", { ascending: true }).limit(35),
  ]);
  if (parentsRes.error) throw parentsRes.error;
  if (variantsRes.error) throw variantsRes.error;
  const base = parentsRes.data || [];
  const matchVariants = variantsRes.data || [];
  const parentIds = [...new Set([...base.map(p=>p.id), ...matchVariants.map(v=>v.producto_id)])];
  if (!parentIds.length) return json({ success: true, products: [] });

  const { data: parents, error: parentError } = await db.from("productos")
    .select("id,referencia,nombre,categoria,foto_url,foto_url_2,costo,precio_detal,solo_ra,tiene_variantes")
    .eq("negocio_id", negocio).eq("activo", true).in("id", parentIds);
  if (parentError) throw parentError;
  const parentMap = new Map((parents || []).map(p => [String(p.id), p]));
  const hidden = await visibles(db, tienda.id, parentIds);

  // For a parent match show its active options, just like the main RA site.
  const variantParentIds = base.filter(p=>p.tiene_variantes).map(p=>p.id);
  let extraVariants = [];
  if (variantParentIds.length) {
    const { data, error } = await db.from("producto_variantes")
      .select("id,producto_id,referencia,foto_url,foto_url_2,costo,precio_detal,nombre_variante,orden")
      .eq("negocio_id", negocio).eq("activo", true)
      .in("producto_id", variantParentIds)
      .order("orden", { ascending: true }).limit(150);
    if (error) throw error;
    extraVariants = data || [];
  }
  const seen = new Set();
  const results = [];
  const add = (p, v) => {
    if (!p || hidden.has(String(p.id)) || results.length >= MAX_RESULTS) return;
    const k = `${p.id}:${v?.id || ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    results.push(item(p, v));
  };
  // Exact reference first, then begins-with matches.
  const candidates = [
    ...matchVariants.map(v => ({ p: parentMap.get(String(v.producto_id)), v })),
    ...base.flatMap(p => {
      const options = extraVariants.filter(v => String(v.producto_id) === String(p.id));
      return options.length ? options.map(v=>({p,v})) : [{p,v:null}];
    }),
  ].filter(v=>v.p);
  candidates.sort((a,b)=>{
    const rank=x=>String(x.v?.referencia || x.p.referencia || "").toLocaleLowerCase()===term.toLocaleLowerCase()?0:1;
    return rank(a)-rank(b);
  });
  candidates.forEach(({p,v})=>add(p,v));
  return json({ success: true, products: results });
}

function publicAddress(address) {
  // Block loopback, private, link-local and reserved IPs (IPv4 and IPv6).
  if (address.includes(":")) {
    const a = address.toLowerCase();
    return !(a === "::1" || a === "::" || a.startsWith("fe80:") ||
      a.startsWith("fc") || a.startsWith("fd") || a.startsWith("::ffff:") ||
      a.startsWith("2001:db8:"));
  }
  const numbers = address.split(".").map(Number);
  if (numbers.length !== 4 || numbers.some(n=>!Number.isInteger(n)||n<0||n>255)) return false;
  const [a,b,c] = numbers;
  return !(a===0 || a===10 || a===127 || a>=224 || a>=240 ||
    (a===100&&b>=64&&b<=127) || (a===169&&b===254) ||
    (a===172&&b>=16&&b<=31) || (a===192&&b===168) ||
    (a===192&&b===0&&c===0) || (a===192&&b===0&&c===2) ||
    (a===198&&b>=18&&b<=19) || (a===198&&b===51&&c===100) ||
    (a===203&&b===0&&c===113));
}
const trustedHostSuffixes = [
  "supabase.co", "r2.dev", "workers.dev", "cloudinary.com",
  "shopifycdn.com", "cdn.shopify.com", "drive.google.com", "googleusercontent.com",
  "mayoristasra.com", "vercel.app",
];
async function safeUrl(source) {
  const url = new URL(source);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw Error("La fotografía no tiene una dirección HTTPS válida.");
  }
  const host = url.hostname.toLowerCase();
  const extraHosts = (process.env.RA_LAB_CATALOG_IMAGE_HOSTS || "")
    .split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
  if (isIP(host) || ![...trustedHostSuffixes,...extraHosts].some(h=>host===h||host.endsWith("."+h))) {
    throw Error("El proveedor de la fotografía aún no está autorizado.");
  }
  const resolved = await lookup(host, { all: true });
  if (!resolved.length || resolved.some(a=>!publicAddress(a.address))) {
    throw Error("El origen de la fotografía no es público.");
  }
  return url;
}

async function proxyImage(db, negocio, tienda, url) {
  const id = url.searchParams.get("photoProductId");
  const variantId = url.searchParams.get("variantId");
  const slot = url.searchParams.get("slot") === "2" ? 2 : 1;
  if (!/^\d+$/.test(id || "") || (variantId && !/^\d+$/.test(variantId))) {
    return json({ success: false, error: "Producto inválido." }, 400);
  }
  const { data: product, error } = await db.from("productos")
    .select("id,foto_url,foto_url_2")
    .eq("negocio_id", negocio).eq("activo", true).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!product) return json({ success: false, error: "Producto no encontrado." }, 404);
  const hidden = await visibles(db, tienda.id, [product.id]);
  if (hidden.size) return json({ success: false, error: "Producto oculto." }, 404);
  let variant = null;
  if (variantId) {
    const v = await db.from("producto_variantes")
      .select("id,foto_url,foto_url_2").eq("negocio_id", negocio)
      .eq("producto_id", product.id).eq("activo", true).eq("id", variantId).maybeSingle();
    if (v.error) throw v.error;
    if (!v.data) return json({ success: false, error: "Variante no encontrada." }, 404);
    variant = v.data;
  }
  const source = (slot === 2 ? (variant?.foto_url_2 || product.foto_url_2) :
    (variant?.foto_url || product.foto_url));
  if (!source) return json({ success: false, error: "La fotografía no está disponible." }, 404);
  let target = await safeUrl(source);
  let response;
  for (let redirects=0;redirects<=2;redirects++) {
    response = await fetch(target, { cache:"no-store", redirect:"manual",
      signal: AbortSignal.timeout(12000) });
    if (![301,302,303,307,308].includes(response.status)) break;
    const next = response.headers.get("location");
    if (!next || redirects===2) throw Error("Demasiadas redirecciones de fotografía.");
    target = await safeUrl(new URL(next, target).toString());
  }
  if (!response?.ok) return json({ success:false,error:"No se pudo descargar la fotografía." }, 502);
  const mime = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!["image/jpeg","image/png","image/webp"].includes(mime)) {
    return json({ success:false,error:"El origen no entregó una fotografía compatible." }, 415);
  }
  if (Number(response.headers.get("content-length") || 0)>MAX_IMAGE_BYTES) {
    return json({ success:false,error:"La fotografía supera 5 MB." }, 413);
  }
  const reader=response.body?.getReader();
  if (!reader) return json({ success:false,error:"La fotografía llegó vacía." },502);
  const chunks=[];
  let size=0;
  while(true){
    const {done,value}=await reader.read();
    if(done) break;
    size+=value.byteLength;
    if(size>MAX_IMAGE_BYTES){await reader.cancel();return json({success:false,error:"La fotografía supera 5 MB."},413);}
    chunks.push(value);
  }
  if(!size)return json({success:false,error:"La fotografía llegó vacía."},502);
  return new NextResponse(Buffer.concat(chunks.map(x=>Buffer.from(x))),{
    headers:{"Content-Type":mime,"Content-Length":String(size),
      "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"},
  });
}

export async function GET(request) {
  if (!authenticate(request)) return json({ success:false,error:"No autorizado." },401);
  try {
    const db = getAdmin();
    const tienda = await tiendaRa(db);
    const negocio = tienda.negocio_id;
    const url = new URL(request.url);
    if (url.searchParams.has("photoProductId")) return await proxyImage(db, negocio, tienda, url);
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return json({ success:true, products:[] });
    return await search(db, negocio, tienda, q);
  } catch (error) {
    console.error("RA Lab catálogo:", error);
    return json({ success:false,error:"No fue posible consultar el catálogo. Intenta más tarde." },500);
  }
}
