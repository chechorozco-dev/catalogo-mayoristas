import { verificarToken } from "../../../lib/apartados/sesion.mjs";
import { descargarPdfApartado } from "../../../lib/apartados/pdf.mjs";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const sku = /^(?:w:\d+:\d+|r:[a-f\d-]{36})$/i;
const privadas = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const errores = {
  PORTAL_ENTREGA: [
    409,
    "Revisa la forma de pago y elige una opción de entrega disponible.",
  ],
  PORTAL_ENTREGA_CAMBIO: [
    409,
    "Los datos de entrega cambiaron. Revisa la selección antes de guardar.",
  ],
  PORTAL_COBERTURA: [
    409,
    "La ciudad registrada no tiene pago contra entrega. Revisa la ciudad o elige otra forma de pago.",
  ],
  PORTAL_PDF: [
    503,
    "No pudimos preparar el PDF. Vuelve a intentar la descarga.",
  ],
  PORTAL_PDF_VACIO: [
    409,
    "El apartado todavía no tiene productos para generar el PDF.",
  ],
  PORTAL_FICHA: [
    400,
    "Revisa los datos del formulario. Verifica el nombre, el correo y el teléfono.",
  ],
  PORTAL_CIUDAD: [400, "Elige una ciudad disponible en la lista."],
  PORTAL_FICHA_CAMBIO: [
    409,
    "La ficha cambió mientras la editabas. Recarga la página y revisa los datos antes de guardar.",
  ],
  PORTAL_ACCESO: [403, "Tu cuenta no tiene acceso al portal de apartados."],
  PORTAL_NO_EXISTE: [404, "No encontramos ese apartado en tu cuenta."],
  PORTAL_DATOS: [400, "Revisa las referencias y las cantidades."],
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
  // The database checks the current account, role and active store for this signed identity.
  return s && uuid.test(s.cliente_id) && s.telefono
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
  return respuesta(
    {
      mensaje: texto + ref,
      ...(error.message === "PORTAL_DISPONIBILIDAD"
        ? { codigo: error.message }
        : {}),
    },
    status,
  );
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
    ![
      "resumen",
      "detalle",
      "catalogo",
      "referencia",
      "ciudades",
      "pdf",
    ].includes(modo) ||
    (["pdf", "detalle"].includes(modo) && !uuid.test(id)) ||
    busca.length > 80 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100000
  )
    return fallo(new Error("PORTAL_DATOS"));
  try {
    if (modo === "pdf") {
      const token = await rpc("ra_portal_pdf_emitir", {
        ...identity,
        p_pedido: id,
      });
      return await descargarPdfApartado(token);
    }
    const data = await rpc("ra_portal_leer", {
      ...identity,
      p_modo: modo,
      p_pedido: id,
      p_busca: busca,
      p_offset: offset,
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
    if (b?.accion === "revisar" && Array.isArray(b.lineas)) {
      if (
        (b.destino != null && !uuid.test(b.destino)) ||
        b.lineas.length > 250 ||
        !b.lineas.every(
          (x) =>
            x &&
            typeof x.clave === "string" &&
            sku.test(x.clave) &&
            Number.isSafeInteger(x.cantidad) &&
            x.cantidad >= 1 &&
            x.cantidad <= 999,
        )
      )
        return fallo(new Error("PORTAL_DATOS"));
      return respuesta(
        await rpc("ra_portal_revisar_seleccion", {
          ...identity,
          p_pedido: b.destino || null,
          p_lineas: b.lineas.map(({ clave, cantidad }) => ({
            clave,
            cantidad,
          })),
        }),
      );
    }
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
    if (b?.accion === "guardar_entrega" && uuid.test(b.destino)) {
      return respuesta(
        await rpc("ra_portal_editar_entrega", {
          ...identity,
          p_pedido: b.destino,
          p_pago: b.entrega?.forma_pago ?? null,
          p_empresa: b.entrega?.transportadora ?? null,
          p_antes: b.antes || {},
        }),
      );
    }
    if (b?.accion === "guardar_ficha" && uuid.test(b.destino)) {
      return respuesta(
        await rpc("ra_portal_guardar_ficha", {
          ...identity,
          p_pedido: b.destino,
          p_cambios: b.cambios,
          p_antes: b.antes,
        }),
      );
    }
    if (
      b?.accion !== "apartar" ||
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
      await rpc(
        b.destino === null
          ? "ra_portal_confirmar_apartado"
          : "ra_portal_apartar",
        {
          ...(b.destino === null
            ? {
                p_entrega: b.entrega
                  ? {
                      forma_pago: b.entrega.forma_pago,
                      transportadora: b.entrega.transportadora ?? null,
                    }
                  : {},
              }
            : {}),
          ...identity,
          p_pedido: b.destino,
          p_solicitud: b.solicitud,
          p_compromiso: true,
          p_lineas: b.lineas.map(({ clave, cantidad, mayor }) => ({
            clave,
            cantidad,
            mayor,
          })),
        },
      ),
    );
  } catch (error) {
    return fallo(
      error instanceof SyntaxError ? new Error("PORTAL_DATOS") : error,
    );
  }
}
