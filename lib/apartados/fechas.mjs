const formato = (zona) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: zona,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const bogota = formato("America/Bogota");
const diaCalendario = formato("UTC");

export function fechaApartado(valor) {
  if (!valor) return "Sin fecha registrada";
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return "Sin fecha registrada";
  return (/^\d{4}-\d{2}-\d{2}$/.test(valor) ? diaCalendario : bogota).format(
    fecha,
  );
}
