// Protocolo de una sola petición: eventos JSON terminados en LF,
// seguidos de los bytes binarios del PDF (sin codificar en base64).
// Permite progreso real durante la generación, no una animación simulada.
export async function recibirPdfConProgreso(response, alProgresar = () => {}) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.mensaje || "No pudimos generar el catálogo PDF.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Tu navegador no permite recibir el progreso del PDF.");

  const decoder = new TextDecoder();
  let encabezado = new Uint8Array(0);
  let esperado = null;
  let recibido = 0;
  const piezas = [];

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      let bytes = value;
      if (esperado === null) {
        // El encabezado puede llegar cortado en varios chunks de red.
        const unidos = new Uint8Array(encabezado.length + bytes.length);
        unidos.set(encabezado);
        unidos.set(bytes, encabezado.length);
        bytes = unidos;
        encabezado = new Uint8Array(0);
        while (esperado === null) {
          const fin = bytes.indexOf(10);
          if (fin < 0) {
            // Evita acumular respuestas corruptas indefinidamente.
            if (bytes.length > 8192) throw new Error("Respuesta de progreso inválida.");
            encabezado = bytes;
            bytes = new Uint8Array(0);
            break;
          }
          let evento;
          try {
            evento = JSON.parse(decoder.decode(bytes.subarray(0, fin)));
          } catch {
            throw new Error("El servidor envió un progreso no válido.");
          }
          bytes = bytes.subarray(fin + 1);
          if (evento.type === "error") {
            throw new Error(evento.mensaje || "No pudimos generar el catálogo PDF.");
          }
          if (evento.type === "progress") {
            alProgresar({
              percent: Math.max(0, Math.min(99, Number(evento.percent) || 0)),
              etapa: String(evento.etapa || "Preparando catálogo..."),
            });
          } else if (evento.type === "pdf") {
            esperado = Number(evento.length);
            if (!Number.isSafeInteger(esperado) || esperado < 5) {
              throw new Error("El archivo PDF recibido no es válido.");
            }
          } else {
            throw new Error("Respuesta inesperada del servidor.");
          }
        }
      }
      if (esperado !== null && bytes.length) {
        recibido += bytes.length;
        if (recibido > esperado) throw new Error("El archivo PDF llegó con datos adicionales.");
        piezas.push(bytes);
      }
    }
    if (esperado === null || recibido !== esperado) {
      throw new Error("La descarga del catálogo se interrumpió. Inténtalo de nuevo.");
    }
    const blob = new Blob(piezas, { type: "application/pdf" });
    // Valida la firma para no descargar una respuesta de error como PDF.
    const firma = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
    if (firma !== "%PDF-") throw new Error("El archivo generado no es un PDF válido.");
    alProgresar({ percent: 100, etapa: "Catálogo listo para descargar" });
    return blob;
  } finally {
    reader.releaseLock();
  }
}
