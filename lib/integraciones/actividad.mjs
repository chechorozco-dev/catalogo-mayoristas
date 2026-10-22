/**
 * Telemetría NO crítica compartida con RA WhatsApp Lab.
 * Registra exclusivamente el nombre del proceso, resultado HTTP y hora.
 * Nunca registra cuerpos, teléfonos, tokens, códigos OTP, clientes o pedidos.
 * Una falla de Supabase aquí no altera el proceso comercial original.
 */
const FLUJOS = new Set([
  "web-verificar-codigo",
  "web-crear-tienda",
  "web-productos-appsheet",
  "web-pedidos-make",
  "web-confirmar-pedido",
]);
export async function registrarActividadWeb(flujo, httpStatus) {
  const status = Number(httpStatus);
  if (!FLUJOS.has(flujo) || !Number.isInteger(status) ||
      (status < 200 || status >= 300) && status < 500) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  try {
    const response = await fetch(url.replace(/\/+$/,"") +
        "/rest/v1/ra_integraciones_actividad", {
      method: "POST",
      headers: { apikey: key, "Content-Type":"application/json",
        Prefer: "return=minimal" },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
      body: JSON.stringify({ flujo_id:flujo, origen:"CATALOGO",
        estado:status < 300 ? "OK" : "ERROR", codigo_http:status }),
    });
    if (!response.ok) console.warn("RA actividad: no se registró el estado del proceso.");
  } catch {
    console.warn("RA actividad: telemetría no disponible.");
  }
}
