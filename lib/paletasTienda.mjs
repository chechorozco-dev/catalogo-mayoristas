// Paletas para el primer registro. La web persiste principal/fondo; el tercer
// tono se usa como detalle visual y no requiere una columna adicional.
export const PALETAS_TIENDA=[
 {id:"morado",nombre:"Morado elegante",principal:"#7340D8",acento:"#B38AF2",fondo:"#F8F4FF",muestras:["#7340D8","#B38AF2","#E9DEFA"]},
 {id:"rosa",nombre:"Rosa suave",principal:"#B85C78",acento:"#E6AFC2",fondo:"#FFF5F8",muestras:["#B85C78","#E6AFC2","#FAE2EA"]},
 {id:"negro",nombre:"Negro premium",principal:"#25272E",acento:"#9699A2",fondo:"#F7F7F9",muestras:["#25272E","#9699A2","#E9E9ED"]},
 {id:"azul",nombre:"Azul moderno",principal:"#2C61C8",acento:"#8CB5F3",fondo:"#F2F7FF",muestras:["#2C61C8","#8CB5F3","#DEEAFF"]},
 {id:"verde",nombre:"Verde natural",principal:"#287759",acento:"#81C6A9",fondo:"#F1FAF5",muestras:["#287759","#81C6A9","#D6EFE2"]},
 {id:"dorado",nombre:"Dorado clásico",principal:"#956C2D",acento:"#E2BE78",fondo:"#FFF9EB",muestras:["#956C2D","#E2BE78","#F6E9C8"]}
];
export function crearSlugVistaPrevia(nombre){
 return String(nombre||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"")
  .replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}
export function colorDeTexto(hex){
 const rgb=String(hex).match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
 if(!rgb)return "#FFFFFF";
 const luz=(parseInt(rgb[1],16)*299+parseInt(rgb[2],16)*587+parseInt(rgb[3],16)*114)/1000;
 return luz>160?"#1C2532":"#FFFFFF";
}