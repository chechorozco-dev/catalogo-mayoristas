import { verificarToken } from "../../../lib/apartados/sesion.mjs";
import { generarPdfApartado } from "../../../lib/apartados/pdf.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const sku = /^(?:w:\d+:\d+|r:[a-f\d-]{36})$/i;
const privadas = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const errores = {
  PORTAL_ACCESO: [403, "Tu cuenta no tiene acceso al portal de apartados."],
  PORTAL_NO_EXISTE: [404, "No encontramos ese apartado en tu cuenta."],
  PORTAL_DATOS: [
    400,
    "Revisa las referencias, las cantidades y el compromiso.",
  ],
  PORTAL_PRECIO: [
    409,
    "Cambió un precio. Actualiza la selección y revísala antes de confirmar.",
  ],
  PORTAL_DESTINO: [
    409,
    "El estado del apartado cambió. Revisa tus apartados antes de confirmar.",
  ],
  PORTAL_PENALIZADO: [
    403,
    "Tu cuenta tiene una penalización activa. Comunícate con RA para volver a apartar.",
  ],
  PORTAL_DISPONIBILIDAD: [
    409,
    "Una referencia ya no está disponible en la cantidad elegida. Revisa tu selección.",
  ],
  PORTAL_SOLICITUD: [
    409,
    "Esta confirmación ya se utilizó con otra selección.",
  ],
  PORTAL_LINEA: [
    409,
    "Comunícate con RA para vincular tu cuenta con el chat de tu tienda.",
  ],
};
function respuesta(datos, status = 200) {
  return Response.json(datos, { status, headers: privadas });
}
function acceso(request) {
  const s = verificarToken(
    request.cookies.get("ra_session")?.value,
    process.env.AUTH_SESSION_SECRET,
  );
  return s?.rol === "CLIENTE" && uuid.test(s.cliente_id) && s.telefono
    ? { p_cliente: s.cliente_id, p_telefono: s.telefono }
    : null;
}
async function rpc(nombre, args) {
  const key = process.env.SUPABASE_SECRET_KEY;
  const r = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/rpc/" + nombre,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        ...(key?.startsWith("eyJ") ? { Authorization: "Bearer " + key } : {}),
      },
      body: JSON.stringify(args),
    },
  );
  const data = await r.json();
  if (!r.ok) {
    const err = new Error(data.message);
    err.referencia = data.details;
    throw err;
  }
  return data;
}
function fallo(error) {
  const known = errores[error.message];
  if (!known)
    console.error("apartados portal", String(error.message).slice(0, 100));
  const [status, texto] = known || [
    503,
    "No pudimos consultar WhatsApp Lab. Inténtalo de nuevo.",
  ];
  const ref =
    error.message === "PORTAL_DISPONIBILIDAD" &&
    /^[A-Z0-9-]{1,32}$/i.test(error.referencia || "")
      ? " Ref. " + error.referencia
      : "";
  return respuesta({ mensaje: texto + ref }, status);
}
export async function GET(request) {
  const identity = acceso(request);
  if (!identity)
    return respuesta({ mensaje: "Ingresa con tu cuenta de cliente." }, 401);
  const p = request.nextUrl.searchParams;
  const modo = p.get("modo") || "resumen",
    id = p.get("id"),
    busca = (p.get("q") || "").trim();
  const offset = Number(p.get("offset") || 0);
  if (
    !["resumen", "detalle", "catalogo", "pdf"].includes(modo) ||
    (["pdf", "detalle"].includes(modo) && !uuid.test(id)) ||
    busca.length > 80 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100000
  )
    return fallo(new Error("PORTAL_DATOS"));
  try {
    const data = await rpc("ra_portal_leer", {
      ...identity,
      p_modo: modo === "pdf" ? "detalle" : modo,
      p_pedido: id,
      p_busca: busca,
      p_offset: offset,
    });
    if (modo === "pdf")
      return new Response(await generarPdfApartado(data), {
        headers: {
          ...privadas,
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="RA_' + data.codigo + '.pdf"',
        },
      });
    return respuesta(data);
  } catch (error) {
    return fallo(error);
  }
}
export async function POST(request) {
  const identity = acceso(request);
  if (!identity)
    return respuesta({ mensaje: "Ingresa con tu cuenta de cliente." }, 401);
  const origin = URL.canParse(request.headers.get("origin"))
    ? new URL(request.headers.get("origin"))
    : null;
  if (
    !origin ||
    !["https:", "http:"].includes(origin.protocol) ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin.origin !== request.nextUrl.origin &&
      origin.host !== request.headers.get("host"))
  ) {
    return respuesta({ mensaje: "Origen no autorizado." }, 403);
  }
  try {
    const raw = await request.text();
    if (raw.length > 55000) return fallo(new Error("PORTAL_DATOS"));
    const b = JSON.parse(raw);
    if (
      b?.accion === "revisar" &&
      Array.isArray(b.claves) &&
      b.claves.length <= 250 &&
      b.claves.every((k) => typeof k === "string" && sku.test(k))
    ) {
      return respuesta(
        await rpc("ra_portal_leer", {
          ...identity,
          p_modo: "seleccion",
          p_claves: b.claves,
        }),
      );
    }
    if (
      b?.accion !== "apartar" ||
      b.compromiso !== true ||
      !uuid.test(b.solicitud) ||
      (b.destino !== null && !uuid.test(b.destino)) ||
      !Array.isArray(b.lineas) ||
      !b.lineas.length ||
      b.lineas.length > 250 ||
      !b.lineas.every(
        (x) =>
          x &&
          sku.test(x.clave) &&
          Number.isSafeInteger(x.cantidad) &&
          x.cantidad >= 1 &&
          x.cantidad <= 999 &&
          Number.isFinite(x.mayor) &&
          x.mayor > 0,
      )
    )
      return fallo(new Error("PORTAL_DATOS"));
    return respuesta(
      await rpc("ra_portal_apartar", {
        ...identity,
        p_pedido: b.destino,
        p_solicitud: b.solicitud,
        p_compromiso: true,
        p_lineas: b.lineas.map(({ clave, cantidad, mayor }) => ({
          clave,
          cantidad,
          mayor,
        })),
      }),
    );
  } catch (error) {
    return fallo(
      error instanceof SyntaxError ? new Error("PORTAL_DATOS") : error,
    );
  }
}
