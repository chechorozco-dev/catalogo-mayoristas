// Miniaturas ligeras sin modificar las URL almacenadas en Supabase.
// Google Drive entrega variantes oficiales mediante el parámetro sz.
export function urlFotoParaVista(valor, ancho = 640) {
  if (typeof valor !== "string") return "";
  const original = valor.trim();
  if (!original) return "";
  try {
    const url = new URL(original);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    const host = url.hostname.toLowerCase();
    if ((host === "drive.google.com" || host === "www.drive.google.com") &&
        url.pathname === "/thumbnail") {
      // Evita solicitudes a URLs formales sin foto real (id vacío).
      if (!url.searchParams.get("id")?.trim()) return "";
      const pixeles = Number(ancho);
      const valido = Number.isFinite(pixeles) && pixeles > 0 ? pixeles : 640;
      const tamaño = valido <= 96 ? 192
        : valido <= 192 ? 384
        : valido <= 640 ? 640
        : 1200;
      url.searchParams.set("sz", "w" + tamaño);
      return url.toString();
    }
    return original;
  } catch {
    return "";
  }
}
