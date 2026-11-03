import { MemberRole } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { getApiContext } from "@/lib/api-auth";
import { formatCop } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function printable(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/•/g, "-")
    .replace(/[^\x00-\xff]/g, "");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getApiContext([MemberRole.ADMIN, MemberRole.COMMERCIAL]);
  if (result.error) return result.error;
  const { id } = await params;

  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: result.context.organizationId },
    include: {
      organization: {
        select: { name: true, taxId: true, email: true, phone: true, address: true, city: true },
      },
      client: {
        select: { name: true, document: true, email: true, phone: true, address: true, city: true },
      },
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!quote) return Response.json({ error: "No se encontró la cotización." }, { status: 404 });
  const quoteRecord = quote;

  const pdf = await PDFDocument.create();
  const quoteNumber = `AQ-${String(quoteRecord.number).padStart(5, "0")}`;
  pdf.setTitle(`Cotización ${quoteNumber} - ${quoteRecord.title}`);
  pdf.setAuthor(quoteRecord.organization.name);
  pdf.setSubject(`Propuesta comercial para ${quoteRecord.client.name}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.15, 0.23);
  const muted = rgb(0.38, 0.43, 0.50);
  const accent = rgb(0.10, 0.39, 0.70);
  const light = rgb(0.92, 0.95, 0.98);
  const margin = 48;
  let page = pdf.addPage([612, 792]);
  let y = 744;

  function drawPageHeader() {
    y = 744;
    page.drawText(printable(quoteRecord.organization.name), {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: accent,
      maxWidth: 310,
    });
    page.drawText(`COTIZACION  ${quoteNumber}`, {
      x: 380,
      y,
      size: 9,
      font: bold,
      color: muted,
    });
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: 564, y }, thickness: 1, color: light });
    y -= 26;
  }

  function addPage() {
    page = pdf.addPage([612, 792]);
    drawPageHeader();
  }

  function ensureSpace(height: number) {
    if (y - height < 55) addPage();
  }

  function drawWrapped(
    value: string,
    options: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number } = {},
  ) {
    const x = options.x ?? margin;
    const size = options.size ?? 9;
    const font = options.font ?? regular;
    const maxWidth = options.maxWidth ?? 516;
    const lines: string[] = [];
    let current = "";
    for (const word of printable(value).split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    ensureSpace(lines.length * (size + 4));
    for (const line of lines) {
      page.drawText(line, { x, y, size, font, color: options.color ?? ink, maxWidth });
      y -= size + 4;
    }
  }

  function drawSection(title: string) {
    ensureSpace(22);
    page.drawText(printable(title.toUpperCase()), { x: margin, y, size: 8, font: bold, color: accent });
    y -= 16;
  }

  function drawSummaryLine(label: string, value: string, strong = false) {
    ensureSpace(18);
    const font = strong ? bold : regular;
    page.drawText(printable(label), { x: 340, y, size: 9, font, color: strong ? ink : muted });
    page.drawText(printable(value), { x: 455, y, size: 9, font, color: strong ? accent : ink, maxWidth: 110 });
    y -= 17;
  }

  drawPageHeader();
  drawWrapped(quoteRecord.title, { size: 20, font: bold });
  if (quoteRecord.description) drawWrapped(quoteRecord.description, { size: 9, color: muted });
  y -= 8;

  drawSection("Cliente");
  drawWrapped(quoteRecord.client.name, { size: 11, font: bold });
  for (const detail of [
    quoteRecord.client.document ? `Documento: ${quoteRecord.client.document}` : null,
    quoteRecord.client.email,
    quoteRecord.client.phone,
    [quoteRecord.client.address, quoteRecord.client.city].filter(Boolean).join(", ") || null,
  ]) {
    if (detail) drawWrapped(detail, { size: 8, color: muted });
  }
  drawWrapped(`Empresa: ${quoteRecord.organization.name}`, { size: 9, font: bold });
  for (const detail of [
    quoteRecord.organization.taxId ? `NIT: ${quoteRecord.organization.taxId}` : null,
    quoteRecord.organization.email,
    quoteRecord.organization.phone,
    [quoteRecord.organization.address, quoteRecord.organization.city].filter(Boolean).join(", ") || null,
  ]) {
    if (detail) drawWrapped(detail, { size: 8, color: muted });
  }
  if (quoteRecord.location) drawWrapped(`Lugar del servicio: ${quoteRecord.location}`, { size: 9 });
  y -= 8;

  drawSection("Servicios cotizados");
  page.drawRectangle({ x: margin, y: y - 5, width: 516, height: 20, color: light });
  page.drawText("DESCRIPCION", { x: margin + 7, y, size: 7, font: bold, color: muted });
  page.drawText("CANT.", { x: 345, y, size: 7, font: bold, color: muted });
  page.drawText("PRECIO UNIT.", { x: 394, y, size: 7, font: bold, color: muted });
  page.drawText("TOTAL", { x: 506, y, size: 7, font: bold, color: muted });
  y -= 22;

  for (const item of quoteRecord.items) {
    const descriptionLines: string[] = [];
    let current = "";
    for (const word of printable(item.description).split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, 8) <= 184) current = candidate;
      else {
        if (current) descriptionLines.push(current);
        current = word;
      }
    }
    if (current) descriptionLines.push(current);
    const rowHeight = Math.max(19, descriptionLines.length * 11);
    ensureSpace(rowHeight);
    descriptionLines.forEach((line, index) => {
      page.drawText(line, { x: margin + 7, y: y - index * 11, size: 8, font: regular, color: ink });
    });
    page.drawText(`${item.quantity.toString()} ${printable(item.unit).slice(0, 8)}`, {
      x: 345, y, size: 7, font: regular, color: muted,
    });
    page.drawText(printable(formatCop(item.unitPrice.toString())), { x: 394, y, size: 7, font: regular, color: ink });
    page.drawText(printable(formatCop(item.lineTotal.toString())), { x: 494, y, size: 7, font: bold, color: ink });
    y -= rowHeight;
    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: 564, y: y + 5 }, thickness: 0.5, color: light });
  }

  y -= 10;
  drawSummaryLine("Subtotal", formatCop(quoteRecord.subtotal.toString()));
  if (quoteRecord.discount.gt(0)) drawSummaryLine("Descuentos", `-${formatCop(quoteRecord.discount.toString())}`);
  drawSummaryLine(`Impuestos (${quoteRecord.taxRate.toString()}%)`, formatCop(quoteRecord.taxAmount.toString()));
  drawSummaryLine("TOTAL COTIZACION", formatCop(quoteRecord.total.toString()), true);

  const terms: Array<[string, string | null]> = [
    ["Vigencia", quoteRecord.validUntil ? new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(quoteRecord.validUntil) : null],
    ["Tiempo de ejecución", quoteRecord.executionTime],
    ["Tiempo de entrega", quoteRecord.deliveryTime],
    ["Forma de pago", quoteRecord.paymentTerms],
    ["Exclusiones", quoteRecord.exclusions],
    ["Observaciones comerciales", quoteRecord.commercialNotes],
  ];
  for (const [label, value] of terms) {
    if (!value) continue;
    y -= 6;
    drawSection(label);
    drawWrapped(value, { size: 8 });
  }

  y -= 18;
  ensureSpace(48);
  page.drawLine({ start: { x: margin, y }, end: { x: 245, y }, thickness: 0.8, color: muted });
  page.drawText("Nombre y firma", { x: margin, y: y - 12, size: 8, font: regular, color: muted });
  page.drawLine({ start: { x: 320, y }, end: { x: 470, y }, thickness: 0.8, color: muted });
  page.drawText("Fecha", { x: 320, y: y - 12, size: 8, font: regular, color: muted });
  page.drawText("Documento comercial - no incluye costos internos.", {
    x: margin,
    y: 30,
    size: 7,
    font: regular,
    color: muted,
  });

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quoteNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
