import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  firmaVisualMejorada, similitudVisualMejorada,
  firmaVisual, similitudVisual,
} from "../lib/catalogo/visual.mjs";
import {firmaRecortes,similitudRecortes} from "../lib/catalogo/visual-crops.mjs";

function escena(tipo="candonga") {
  // Both scenes share the same studio props and pastel background,
  // reproducing RA's frequent false positive pattern in which backgrounds
  // and decorative vases look identical across unrelated products.
  const jewelry=tipo==="candonga"
    ? `<circle cx="155" cy="181" r="46" fill="none" stroke="#b97813" stroke-width="14"/>
       <circle cx="155" cy="181" r="38" fill="none" stroke="#f3b82b" stroke-width="4"/>
       <circle cx="141" cy="141" r="6" fill="#c78515"/>
       <circle cx="166" cy="144" r="6" fill="#c78515"/>
       <circle cx="119" cy="156" r="5" fill="#b97813"/>
       <circle cx="193" cy="162" r="5" fill="#b97813"/>
       <circle cx="110" cy="181" r="5" fill="#edac16"/>
       <circle cx="199" cy="181" r="5" fill="#edac16"/>
       <circle cx="124" cy="215" r="5" fill="#ac6e11"/>
       <circle cx="180" cy="216" r="5" fill="#ac6e11"/>`
    : `<path d="M100 185 Q155 246 218 184" stroke="#c0c5cb" fill="none" stroke-width="11"/>
       <polygon points="160,129 184,163 160,188 136,163" fill="#eceff4" stroke="#969fa9" stroke-width="7"/>
       <path d="M160 135 L160 188 M141 162 L179 162" stroke="white" stroke-width="4"/>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#fbe6e5"/>
    <stop offset="1" stop-color="#f1bbc0"/></linearGradient></defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <rect x="7" y="20" width="95" height="120" rx="15" fill="#fff5ec"/>
    <path d="M12 34 L80 30 M14 46 L80 42 M14 58 L80 54" stroke="#e8dcd8" stroke-width="7"/>
    <circle cx="250" cy="53" r="28" fill="#f5eeee"/>
    <path d="M249 58 L232 70 L249 80 L263 66" fill="#c5a165"/>
    ${jewelry}
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

test("new fingerprint adds local windows without removing old fields",async()=>{
  const picture=await escena();
  const signature=await firmaVisualMejorada(picture);
  assert.equal(signature.version,2);
  assert.equal(signature.tiles.length,20);
  assert.match(signature.full,/^[0-9a-f]{16}$/);
  assert.deepEqual(signature.tiles[0].c.length,3);
  assert.ok(similitudVisualMejorada(signature,signature)>=0.999);
});

test("a center crop keeps the same accessory ahead of a different accessory on matching props",async()=>{
  const target=await escena("candonga");
  const distractor=await escena("ring");
  const recorte=await sharp(target).extract({left:74,top:108,width:174,height:156})
    .resize(380,330).jpeg({quality:76}).toBuffer();
  const query=await firmaVisualMejorada(recorte);
  const correct=await firmaVisualMejorada(target);
  const wrong=await firmaVisualMejorada(distractor);
  const s1=similitudVisualMejorada(query,correct);
  const s2=similitudVisualMejorada(query,wrong);
  assert.ok(s1>s2,`Recorte: correcto=${s1.toFixed(3)}, diferente=${s2.toFixed(3)}`);
});

test("local matching scores are bounded, and invalid signatures fall back safely",async()=>{
  const full=await escena();
  const same=await firmaRecortes(full);
  assert.equal(similitudRecortes(same,same),1);
  assert.equal(similitudRecortes({version:1},same),null);
  assert.equal(similitudRecortes({version:2,tiles:[{h:"bad"}]},same),null);
  const old=await firmaVisual(full);
  const newSig=await firmaVisualMejorada(full);
  const score=similitudVisualMejorada(old,newSig);
  assert.ok(score!==null && score>0 && score<=1);
  assert.equal(similitudVisual(old,old),1);
});
