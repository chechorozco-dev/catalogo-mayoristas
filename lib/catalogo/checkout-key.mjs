export async function checkoutKey(pedido,storage=globalThis.sessionStorage){
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(pedido)));
 const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const slot='ra-confirmacion:'+pedido.tienda_id+':'+pedido.sesion_id;
 let old;try{old=JSON.parse(storage.getItem(slot)||'null');}catch{}
 if(old?.fingerprint===fingerprint&&typeof old.key==='string')return old.key;
 const key=globalThis.crypto.randomUUID();
 try{storage.setItem(slot,JSON.stringify({fingerprint,key}));}catch{}
 return key;
}

export function clearCheckoutKey(pedido,storage=globalThis.sessionStorage){
 try{storage.removeItem('ra-confirmacion:'+pedido.tienda_id+':'+pedido.sesion_id);}catch{}
}
