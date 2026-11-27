import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { fechaApartado } from "./fechas.mjs";
import { formatoPrecio } from "../catalogo/formatos.mjs";

export async function generarPdfApartado(doc) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Apartado " + doc.codigo);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const verde = rgb(0.17, 0.34, 0.26);
  const tinta = rgb(0.16, 0.18, 0.16);
  const clean = (s) =>
    [...String(s ?? "").normalize("NFC")]
      .map((c) => {
        try {
          regular.encodeText(c);
          return c;
        } catch {
          return " ";
        }
      })
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  let page, y;
  function draw(s, x, top, size = 10, font = regular, color = tinta) {
    page.drawText(clean(s), { x, y: top, size, font, color });
  }
  function right(s, x, top, size = 10, font = regular) {
    draw(s, x - font.widthOfTextAtSize(clean(s), size), top, size, font);
  }
  function wrap(s, width, size, font = regular) {
    const rows = [];
    let line = "";
    for (const ch of clean(s)) {
      if (line && font.widthOfTextAtSize(line + ch, size) > width) {
        rows.push(line.trim());
        line = "";
      }
      line += ch;
    }
    if (line) rows.push(line.trim());
    return rows;
  }
  function nueva() {
    page = pdf.addPage([595, 842]);
    draw("RA ACCESORIOS", 38, 795, 12, bold, verde);
    right(doc.codigo, 557, 795, 16, bold);
    draw("Detalle de tu apartado", 38, 759, 24, bold);
    draw(
      "Fecha de inicio: " + fechaApartado(doc.fecha) + "  ·  " + doc.estado,
      38,
      737,
    );
    draw(
      "Último producto agregado: " + fechaApartado(doc.ultimo_producto_en),
      38,
      721,
    );
    draw(
      "Vencimiento: " +
        (doc.vence_en ? fechaApartado(doc.vence_en) : "Sin fecha programada"),
      38,
      705,
    );
    const nombre = wrap(doc.cliente || "", 510, 10);
    y = 686;
    for (const row of nombre) {
      draw(row, 38, y);
      y -= 13;
    }
    y -= 18;
    draw("Referencia / producto", 38, y, 10, bold);
    right("Cant.", 293, y);
    right("Mayor c/u", 377, y);
    right("Sugerido c/u", 470, y);
    right("Subtotal", 557, y);
    y -= 7;
    page.drawLine({
      start: { x: 38, y },
      end: { x: 557, y },
      thickness: 1,
      color: verde,
    });
    y -= 19;
    draw("RA Accesorios  ·  Página " + pdf.getPageCount(), 38, 30, 9);
  }
  nueva();
  let total = 0,
    unidades = 0;
  for (const p of doc.productos) {
    const nombre = wrap(p.nombre, 213, 10);
    const alto = 39 + nombre.length * 12;
    if (y - alto < 70) nueva();
    draw(p.referencia || "Sin referencia", 38, y, 11, bold, verde);
    right(String(p.cantidad), 293, y);
    right(formatoPrecio(p.mayor), 377, y);
    right(p.sugerido > 0 ? formatoPrecio(p.sugerido) : "—", 470, y);
    right(formatoPrecio(p.cantidad * p.mayor), 557, y);
    y -= 15;
    for (const row of nombre) {
      draw(row, 38, y);
      y -= 12;
    }
    const ingreso = p.agregado_en
      ? "Agregado el " + fechaApartado(p.agregado_en)
      : "Fecha de ingreso sin registrar";
    draw(p.estado + "  ·  " + ingreso, 38, y, 9);
    y -= 24;
    unidades += p.cantidad;
    total += p.cantidad * p.mayor;
  }
  if (y < 120) nueva();
  draw(unidades + " unidades", 38, y, 11, bold);
  right(
    "Total productos al por mayor   " + formatoPrecio(total),
    557,
    y,
    13,
    bold,
  );
  if (doc.abono > 0)
    right("Abono registrado   " + formatoPrecio(doc.abono), 557, y - 22);
  return pdf.save();
}
