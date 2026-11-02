import { normalizarTelefonoColombia } from "./formatos.mjs";

// La misma validación se usa al avanzar y justo antes de enviar el pedido.
export function validarDatosCompra(datos, { incluirPago = true } = {}) {
  const errores = {};
  const retiro = datos.esPuntoVillavo && datos.modalidad === "RECOGER";
  if (datos.esPuntoVillavo && !["RECOGER", "ENVIO"].includes(datos.modalidad)) {
    errores.modalidad = "Elige cómo quieres recibir tu pedido.";
  }
  if (!String(datos.nombre || "").trim()) errores.nombre = "Escribe tu nombre completo.";
  if (!/^573\d{9}$/.test(normalizarTelefonoColombia(datos.telefono))) {
    errores.telefono = "Escribe los 10 números de tu WhatsApp.";
  }
  if (!retiro && !datos.ciudad?.ciudad_id) errores.ciudad = "Elige tu ciudad de la lista.";
  if (!retiro && !String(datos.direccion || "").trim()) {
    errores.direccion = "Escribe la dirección donde recibirás el pedido.";
  }
  if (!retiro && datos.correo?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) {
    errores.correo = "Revisa el correo o deja este campo vacío.";
  }
  if (incluirPago && !datos.esPuntoVillavo && !["CONTRA_ENTREGA", "TRANSFERENCIA"].includes(datos.pago)) {
    errores.pago = "Elige cómo quieres pagar.";
  }
  return errores;
}

export function pasoConErrores(errores) {
  return ["modalidad", "nombre", "telefono", "ciudad", "direccion", "correo"].some(campo => errores[campo]) ? 1 : 2;
}
