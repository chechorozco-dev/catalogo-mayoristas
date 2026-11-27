import assert from 'node:assert/strict';
import test from 'node:test';
import {recuperarLineas} from '../lib/catalogo/retomar-carrito.mjs';
test('recupera las cantidades y las claves editables, con su foto y con el precio de cada variante',()=>{
 const lines=[{producto_id:3,variante_id:5,cantidad:2,precio:8000},{producto_id:4,cantidad:1,precio:7000}];
 const result=recuperarLineas(lines,[{id:3,precio:10000,variantes:[{id:5,nombre_variante:'Verde',precio:9000,foto_url:'foto'}]}]);
 assert.deepEqual(result.map(i=>[i.clave_carrito,i.cantidad,i.precio]),[['p3-v5',2,9000],['p4',1,7000]]);
 assert.equal(result[0].foto_url,'foto');assert.equal(result[0].variante_nombre,'Verde');
});
test('usa el precio guardado de la variante cuando solo está disponible el producto padre',()=>{
 const [item]=recuperarLineas([{producto_id:3,variante_id:6,cantidad:1,precio:8500}],[{id:3,precio:10000}]);
 assert.equal(item.precio,8500);
});
