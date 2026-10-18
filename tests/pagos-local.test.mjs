test("envío desde Villavo calcula flete sin definir medio de pago", () => {
  assert.equal(esFormaPagoLocalValida(PAGO_POR_ACORDAR,"ENVIO"),true);
  assert.equal(esFormaPagoLocalValida("TRANSFERENCIA","ENVIO"),false);
  assert.equal(esFormaPagoLocalValida("EFECTIVO","ENVIO"),false);
  assert.equal(esFormaPagoLocalValida("CONTRA_ENTREGA","ENVIO"),false);
  const envio=calcularTotalesVillavo([{precio_unitario:12000,cantidad:2}],"ENVIO",15000);
  assert.equal(envio.subtotal_productos,24000);
  assert.equal(envio.total_pedido,39000);
  assert.equal(envio.costo_envio_final,15000);
  assert.equal(envio.descuento,0);
  const gratis=calcularTotalesVillavo([{precio_unitario:410000,cantidad:1}],"ENVIO",15000);
  assert.equal(gratis.costo_envio_final,0);
  assert.equal(gratis.envio_gratis,true);
  assert.equal(gratis.total_pedido,410000);
  const conTarifaAlta=calcularTotalesVillavo([{precio_unitario:410000,cantidad:1}],"ENVIO",28000);
  assert.equal(conTarifaAlta.total_pedido,438000);
  assert.equal(calcularTotalesVillavo([{precio_unitario:1,cantidad:1}],"ENVIO",-1),null);
  assert.equal(calcularTotalesVillavo([{precio_unitario:1,cantidad:1}],"ENVIO",NaN),null);
});
