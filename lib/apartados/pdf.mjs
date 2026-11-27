// The Lab renders the same saved document the team uses for WhatsApp.
const url = "https://ra-whatsapp-lab.vercel.app/api/portal/apartado-pdf";
export async function descargarPdfApartado(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw new Error("PORTAL_PDF");
  const r = await fetch(url, {
    method: "POST",
    cache: "no-store",
    redirect: "error",
    headers: { Authorization: "Bearer " + token },
  });
  if (r.status === 409) throw new Error("PORTAL_PDF_VACIO");
  if (!r.ok || r.headers.get("Content-Type") !== "application/pdf" || !r.body)
    throw new Error("PORTAL_PDF");
  const nombre =
    r.headers
      .get("Content-Disposition")
      ?.match(/filename="(RA_[a-zA-Z0-9_-]+_MEDIA_CARTA\.pdf)"/)?.[1] ||
    "RA_Apartado_MEDIA_CARTA.pdf";
  return new Response(r.body, {
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + nombre + '"',
    },
  });
}
