import sharp from "sharp";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_VISUAL_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = new Set([
  "hxvujossrzoqqnxxskzb.supabase.co",
  "drive.google.com",
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
]);

function esIpPublica(addr) {
  if (addr.includes(":")) {
    const a = addr.toLowerCase();
    return !(a === "::1" || a === "::" || a.startsWith("fe80:") ||
      a.startsWith("fc") || a.startsWith("fd") || a.startsWith("::ffff:") ||
      a.startsWith("2001:db8:"));
  }
  const n = addr.split(".").map(Number);
  if (n.length !== 4 || n.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a,b,c] = n;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && b >= 18 && b <= 19) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113));
}

async function asegurarUrlImagen(raw) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || isIP(host) ||
      !ALLOWED_IMAGE_HOSTS.has(host)) {
    throw new Error("El proveedor de la fotografía no está autorizado.");
  }
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some(item => !esIpPublica(item.address))) {
    throw new Error("Dirección de fotografía no pública.");
  }
  return url;
}

// Do not follow redirects blindly or load arbitrarily large remote files.
export async function descargarFotoCatalogo(source) {
  let target = await asegurarUrlImagen(source);
  for (let attempt=0; attempt<3; attempt++) {
    const response = await fetch(target, {
      method: "GET", cache: "no-store", redirect: "manual",
      signal: AbortSignal.timeout(11000),
    });
    if ([301,302,303,307,308].includes(response.status)) {
      if (attempt===2) throw new Error("La fotografía redirige demasiadas veces.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirección de fotografía inválida.");
      target = await asegurarUrlImagen(new URL(location,target).toString());
      continue;
    }
    if (!response.ok) throw new Error("La fotografía del catálogo no está accesible.");
    const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!["image/jpeg","image/png","image/webp"].includes(contentType)) {
      throw new Error("La dirección del catálogo no devolvió una imagen.");
    }
    if (Number(response.headers.get("content-length") || 0) > MAX_VISUAL_IMAGE_BYTES) {
      throw new Error("La fotografía del catálogo supera 5 MB.");
    }
    if (!response.body) throw new Error("La fotografía llegó vacía.");
    const reader = response.body.getReader();
    let size = 0;
    const parts=[];
    while (true) {
      const {done,value} = await reader.read();
      if(done) break;
      size += value.byteLength;
      if(size > MAX_VISUAL_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error("La fotografía del catálogo supera 5 MB.");
      }
      parts.push(Buffer.from(value));
    }
    if(!size) throw new Error("La fotografía llegó vacía.");
    return Buffer.concat(parts);
  }
  throw new Error("No fue posible descargar la fotografía.");
}

function hashDiferencias(data) {
  let value=0n;
  for(let y=0;y<8;y++){
    for(let x=0;x<8;x++){
      value = (value<<1n) | (data[y*9+x] > data[y*9+x+1] ? 1n : 0n);
    }
  }
  return value.toString(16).padStart(16,"0");
}

function hashMedia(gray) {
  const mean = gray.reduce((sum,p)=>sum+p,0)/gray.length;
  let value=0n;
  for(const pixel of gray) value=(value<<1n)|(pixel>mean?1n:0n);
  return value.toString(16).padStart(16,"0");
}

function bloquesColor(rgb) {
  // 4x4 grid; each cell averages the RGB color of 4 pixels from an 8x8 image.
  const result=[];
  for(let cellY=0;cellY<4;cellY++){
    for(let cellX=0;cellX<4;cellX++){
      for(let channel=0;channel<3;channel++){
        let value=0;
        for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
          const pos=((cellY*2+dy)*8+cellX*2+dx)*3+channel;
          value+=rgb[pos];
        }
        result.push(Math.round(value/4));
      }
    }
  }
  return result;
}

export async function firmaVisual(bytes) {
  const input=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  if(!input.length || input.length > MAX_VISUAL_IMAGE_BYTES){
    throw new Error("La fotografía debe pesar menos de 5 MB.");
  }
  const opts={failOn:"error",limitInputPixels:40_000_000};
  // Normalize orientation and transparency; both full-frame and central-crop
  // comparisons help recognize screenshots and moderately cropped catalog photos.
  const base=()=>sharp(input,opts).rotate().flatten({background:"#ffffff"});
  let full,crop,gray,color;
  try{
    [full,crop,gray,color]=await Promise.all([
      base().resize(9,8,{fit:"fill"}).greyscale().raw().toBuffer(),
      base().resize(9,8,{fit:"cover",position:"centre"}).greyscale().raw().toBuffer(),
      base().resize(8,8,{fit:"fill"}).greyscale().raw().toBuffer(),
      base().resize(8,8,{fit:"fill"}).removeAlpha().toColourspace("srgb").raw().toBuffer(),
    ]);
  }catch{
    throw new Error("No se pudo analizar esta fotografía. Prueba con una imagen JPG o PNG.");
  }
  if(full.length!==72 || crop.length!==72 || gray.length!==64 || color.length!==192){
    throw new Error("La imagen no pudo normalizarse correctamente.");
  }
  return {
    version:1,
    full:hashDiferencias(full),
    crop:hashDiferencias(crop),
    average:hashMedia(gray),
    color:bloquesColor(color),
  };
}

function distanciaBits(a,b) {
  let x=BigInt("0x"+a)^BigInt("0x"+b);
  let count=0;
  while(x){count++;x &= x-1n;}
  return count/64;
}

export function similitudVisual(a,b) {
  if(a?.version!==1 || b?.version!==1 ||
    !/^[0-9a-f]{16}$/i.test(a.full||"") ||
    !/^[0-9a-f]{16}$/i.test(a.crop||"") ||
    !/^[0-9a-f]{16}$/i.test(a.average||"") ||
    !/^[0-9a-f]{16}$/i.test(b.full||"") ||
    !/^[0-9a-f]{16}$/i.test(b.crop||"") ||
    !/^[0-9a-f]{16}$/i.test(b.average||"") ||
    !Array.isArray(a.color) || a.color.length!==48 ||
    !Array.isArray(b.color) || b.color.length!==48) return null;

  // Compare a received crop with both catalog crop and full-frame signatures.
  const bits = Math.min(
    distanciaBits(a.full,b.full),
    distanciaBits(a.full,b.crop),
    distanciaBits(a.crop,b.full),
    distanciaBits(a.crop,b.crop)
  );
  const structure=Math.min(
    distanciaBits(a.full,b.full),
    distanciaBits(a.crop,b.crop)
  );
  const average=distanciaBits(a.average,b.average);
  const colour=a.color.reduce((sum,p,i)=>
    sum+Math.abs(p-b.color[i]),0)/(48*255);
  // An approximate ranking score, not a statistical probability.
  const distance=0.48*bits + 0.22*structure + 0.12*average + 0.18*colour;
  return Math.max(0,1-distance);
}
