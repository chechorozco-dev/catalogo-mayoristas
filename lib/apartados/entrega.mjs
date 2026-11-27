export const pagosApartado = {
  PAGO_EN_CASA: "Contra entrega",
  CONTADO_CON_ENVIO: "Contado con envío",
  CONTADO: "Contado · flete al cobro",
  RECOGE_EN_LOCAL: "Recoge en el local",
};
export const empresasApartado = {
  INTERRAPIDISIMO: "INTERRAPIDISIMO",
  ENVIA: "ENVIO",
  SERVIENTREGA: "SERVIENTREGA",
  COORDINADORA: "COORDINADORA",
};
export function empresasDisponibles(pago, total) {
  if (!Object.hasOwn(pagosApartado, pago) || pago === "RECOGE_EN_LOCAL")
    return [];
  const empresas = ["INTERRAPIDISIMO", "ENVIA", "SERVIENTREGA"];
  if (pago === "PAGO_EN_CASA" && total > 400000) empresas.push("COORDINADORA");
  return empresas;
}
export function entregaValida(valor, total) {
  if (!valor || !Object.hasOwn(pagosApartado, valor.forma_pago)) return false;
  return valor.forma_pago === "RECOGE_EN_LOCAL"
    ? !valor.transportadora
    : empresasDisponibles(valor.forma_pago, total).includes(
        valor.transportadora,
      );
}
