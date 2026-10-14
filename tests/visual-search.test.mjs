import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { firmaVisual, similitudVisual, descargarFotoCatalogo } from "../lib/catalogo/visual.mjs";

function graphic(reverse=false) {
  const width=128,height=128,channels=3;
  const pixels=Buffer.alloc(width*height*channels,255);
  for(let y=28;y<100;y++) for(let x=38;x<90;x++) {
    const pos=(y*width+x)*3;
    const gold=!reverse;
    pixels[pos]=gold?205:40;
    pixels[pos+1]=gold?155:80;
    pixels[pos+2]=gold?32:205;
  }
  return sharp(pixels,{raw:{width,height,channels}}).png().toBuffer();
}

test("same catalog picture produces an exact signature match",async()=>{
  const image=await graphic();
  const a=await firmaVisual(image);
  const b=await firmaVisual(image);
  assert.equal(a.version,1);
  assert.match(a.full,/^[0-9a-f]{16}$/);
  assert.equal(a.color.length,48);
  assert.equal(similitudVisual(a,b),1);
});

test("matching a resized screenshot scores above a different color variant",async()=>{
  const image=await graphic();
  const sameResized=await sharp(image).resize(80,80).png().toBuffer();
  const other=await graphic(true);
  const query=await firmaVisual(image);
  const self=similitudVisual(query,await firmaVisual(sameResized));
  const different=similitudVisual(query,await firmaVisual(other));
  assert.ok(self>different,
    `Same product ${self} should rank higher than a contrasting photo ${different}`);
});

test("local network sources and empty files are rejected without external requests",async()=>{
  await assert.rejects(()=>descargarFotoCatalogo("http://127.0.0.1/admin"));
  await assert.rejects(()=>descargarFotoCatalogo("https://localhost/file.jpg"));
  await assert.rejects(()=>firmaVisual(Buffer.alloc(0)));
  assert.equal(similitudVisual({version:99},{version:1}),null);
});
