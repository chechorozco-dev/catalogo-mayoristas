export function recuperarLineas(lineas, catalogo) {
 const porId=new Map(catalogo.map(p=>[Number(p.id),p]));
 return lineas.flatMap(linea=>{
  const id=Number(linea.producto_id),cantidad=Number(linea.cantidad);
  if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(cantidad)||cantidad<1)return [];
  const p=porId.get(id),vid=linea.variante_id==null?null:Number(linea.variante_id);
  const v=vid==null?null:p?.variantes?.find(opcion=>Number(opcion.id)===vid);
  return [{...p,id,id_producto:id,variante_id:vid,variante_nombre:v?.nombre_variante||linea.variante||'',
   nombre:p?.nombre||linea.nombre,referencia:v?.referencia||linea.referencia||p?.referencia,
   foto_url:v?.foto_url||p?.foto_url||null,precio:(vid==null?p?.precio:v?.precio)??Number(linea.precio),
   cantidad,clave_carrito:vid==null?'p'+id:'p'+id+'-v'+vid}];
 });
}
