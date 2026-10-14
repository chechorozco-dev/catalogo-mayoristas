import sharp from "sharp";

// Independent compact crop-aware signatures. No external AI service or user
// photograph is stored: only catalog photo fingerprints are persisted.
export const CROP_SIGNATURE_VERSION = 2;

const SIZE = 192;
const REGIONS = [
  [0, 0, 1],
  ...[0, 0.225, 0.45].flatMap(y =>
    [0, 0.225, 0.45].map(x => [x,y,0.55])
  ),
  ...[0,0.15,0.30].flatMap(y =>
    [0,0.15,0.30].map(x => [x,y,0.70])
  ),
  [0.2,0.2,0.60],
];
// Full photo + 19 overlapping windows; partially cropped jewelry can match
// a regional signature instead of the entire pink/cream studio background.

const hex64=x=>x.toString(16).padStart(16,"0");
const validHex=x=>typeof x==="string" && /^[a-f0-9]{16}$/i.test(x);

function tileSignature(data, left, top, portion) {
  const lum=[];
  const sampled=[];
  let colorR=0,colorG=0,colorB=0;
  // Fixed 9x8 sampling grid; each point averages a small 3x3 neighborhood
  // to remain stable under resizing and JPEG compression.
  for(let y=0;y<8;y++){
    for(let x=0;x<9;x++){
      const fx=left+portion*((x+0.5)/9);
      const fy=top+portion*((y+0.5)/8);
      const cx=Math.min(SIZE-1,Math.max(0,Math.floor(fx*SIZE)));
      const cy=Math.min(SIZE-1,Math.max(0,Math.floor(fy*SIZE)));
      let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const px=Math.min(SIZE-1,Math.max(0,cx+dx));
        const py=Math.min(SIZE-1,Math.max(0,cy+dy));
        const idx=(py*SIZE+px)*3;
        r+=data[idx];g+=data[idx+1];b+=data[idx+2];n++;
      }
      r/=n;g/=n;b/=n;
      sampled.push([r,g,b]);
      lum.push(Math.round((54*r+183*g+19*b)/256));
      colorR+=r;colorG+=g;colorB+=b;
    }
  }
  let diff=0n;
  for(let y=0;y<8;y++){
    for(let x=0;x<8;x++){
      const i=y*9+x;
      diff=(diff<<1n)|(lum[i]>lum[i+1]?1n:0n);
    }
  }
  // Average-hash adds coarse shapes lost by a gradient-only dHash.
  const gray8=[];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)gray8.push(lum[y*9+x]);
  const average=gray8.reduce((a,b)=>a+b,0)/64;
  let ahash=0n,variance=0;
  for(const p of gray8){
    ahash=(ahash<<1n)|(p>average?1n:0n);
    variance+=(p-average)**2;
  }
  return {
    h:hex64(diff),
    a:hex64(ahash),
    c:[Math.round(colorR/72),Math.round(colorG/72),Math.round(colorB/72)],
    t:Math.round(Math.min(255,Math.sqrt(variance/64))),
  };
}

export async function firmaRecortes(bytes) {
  const input=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  if(!input.length || input.length>5*1024*1024)
    throw Error("La fotografía debe pesar menos de 5 MB.");
  let rgb;
  try{
    const output=await sharp(input,{failOn:"error",limitInputPixels:40_000_000})
      .rotate().flatten({background:"#ffffff"})
      .resize(SIZE,SIZE,{fit:"fill"})
      .removeAlpha().toColourspace("srgb")
      .raw().toBuffer({resolveWithObject:true});
    if(output.info.channels!==3 || output.info.width!==SIZE || output.info.height!==SIZE)
      throw Error("Imagen RGB inválida");
    rgb=output.data;
  }catch{
    throw Error("No se pudo analizar la fotografía.");
  }
  return {version:CROP_SIGNATURE_VERSION,
    tiles:REGIONS.map(([x,y,size])=>tileSignature(rgb,x,y,size))};
}

function distanceBits(a,b) {
  let v=BigInt("0x"+a)^BigInt("0x"+b);
  let bits=0;
  while(v){bits++;v &= v-1n;}
  return bits/64;
}

function validTile(x){
  return x && validHex(x.h) && validHex(x.a) &&
    Array.isArray(x.c) && x.c.length===3 &&
    x.c.every(v=>Number.isFinite(v)&&v>=0&&v<=255) &&
    Number.isFinite(x.t)&&x.t>=0&&x.t<=255;
}

export function similitudRecortes(query,catalog) {
  if(query?.version!==CROP_SIGNATURE_VERSION||
    catalog?.version!==CROP_SIGNATURE_VERSION||
    !Array.isArray(query.tiles)||!Array.isArray(catalog.tiles)||
    !query.tiles.length||!catalog.tiles.length||
    query.tiles.length>24||catalog.tiles.length>24||
    !query.tiles.every(validTile)||!catalog.tiles.every(validTile)) return null;
  let best=0;
  // Look for partial overlap. Compare the full query to local catalog tiles
  // and local query tiles to the entire catalog. The 3x3 grid supplies a
  // bounded number of local patch-to-patch comparisons as well.
  for(let qi=0;qi<query.tiles.length;qi++){
    const q=query.tiles[qi];
    for(let ci=0;ci<catalog.tiles.length;ci++){
      const c=catalog.tiles[ci];
      if(qi!==0&&ci!==0&&qi>9&&ci>9)continue;
      const contrast=Math.min(q.t,c.t);
      // Flat backgrounds (plain pink/cream) cannot by themselves yield a
      // high-confidence hit; jewelry contains identifiable edges.
      if(contrast<7)continue;
      const shape=distanceBits(q.h,c.h)*0.52+
        distanceBits(q.a,c.a)*0.30;
      const color=(Math.abs(q.c[0]-c.c[0])+
        Math.abs(q.c[1]-c.c[1])+
        Math.abs(q.c[2]-c.c[2]))/(3*255);
      const texture=Math.abs(q.t-c.t)/255;
      const score=1-(shape+0.13*color+0.05*texture);
      // Local-to-local matches can be coincidental because both photos
      // include props. Give modest preference to full-to-local matches.
      const adjusted=score-(qi!==0&&ci!==0?0.055:0);
      if(adjusted>best)best=adjusted;
    }
  }
  return Math.min(1,Math.max(0,best));
}
