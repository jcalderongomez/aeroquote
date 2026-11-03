import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { getProposalByToken } from "@/lib/quotes/proposal";
import { formatCop } from "@/lib/format";

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
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);
  if (!proposal) return Response.json({ error: "El enlace de la propuesta venció o no existe." }, { status: 404 });
  const { snapshot } = proposal;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Propuesta AQ-${String(snapshot.quoteNumber).padStart(5, "0")} - ${snapshot.company.name}`);
  pdf.setAuthor(snapshot.company.name);
  pdf.setSubject(snapshot.title);
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
    page.drawText("AEROQUOTE", { x: margin, y, size: 10, font: bold, color: accent });
    page.drawText(`PROPUESTA  AQ-${String(snapshot.quoteNumber).padStart(5, "0")}  |  v${snapshot.version}`, {
      x: 360,
      y,
      size: 8,
      font: bold,
      color: muted,
    });
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: 564, y }, thickness: 1, color: light });
    y -= 28;
  }

  function addPage() {
    page = pdf.addPage([612, 792]);
    drawPageHeader();
  }

  function ensureSpace(height: number) {
    if (y - height < 54) addPage();
  }

  function drawWrapped(
    text: string,
    options: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number } = {},
  ) {
    const x = options.x ?? margin;
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const maxWidth = options.maxWidth ?? 516;
    const safeText = printable(text);
    const words = safeText.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
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
    ensureSpace(24);
    page.drawText(printable(title.toUpperCase()), { x: margin, y, size: 8, font: bold, color: accent });
    y -= 16;
  }

  drawPageHeader();
  drawWrapped(snapshot.title, { size: 22, font: bold });
  y -= 3;
  drawWrapped(snapshot.description ?? "Propuesta comercial de servicios profesionales.", { size: 10, color: muted });
  y -= 14;

  drawSection("Propuesta para");
  drawWrapped(snapshot.client.name, { size: 12, font: bold });
  if (snapshot.client.email) drawWrapped(snapshot.client.email, { size: 9, color: muted });
  drawWrapped(snapshot.company.name, { size: 10, font: bold });
  for (const companyLine of [
    snapshot.company.taxId ? `NIT: ${snapshot.company.taxId}` : null,
    snapshot.company.email,
    snapshot.company.phone,
    [snapshot.company.address, snapshot.company.city].filter(Boolean).join(", ") || null,
  ]) {
    if (companyLine) drawWrapped(companyLine, { size: 9, color: muted });
  }
  if (snapshot.location) {
    y -= 4;
    drawWrapped(`Lugar del servicio: ${snapshot.location}`, { size: 9 });
  }
  y -= 12;

  drawSection("Servicios incluidos");
  page.drawRectangle({ x: margin, y: y - 5, width: 516, height: 20, color: light });
  page.drawText("DESCRIPCION", { x: margin + 7, y, size: 7, font: bold, color: muted });
  page.drawText("CANT.", { x: 356, y, size: 7, font: bold, color: muted });
  page.drawText("VALOR UNIT.", { x: 404, y, size: 7, font: bold, color: muted });
  page.drawText("TOTAL", { x: 507, y, size: 7, font: bold, color: muted });
  y -= 22;

  for (const item of snapshot.items) {
    const descriptionLines: string[] = [];
    let current = "";
    for (const word of printable(item.description).split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, 8) <= 194) current = candidate;
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
    page.drawText(`${item.quantity} ${printable(item.unit).slice(0, 10)}`, { x: 356, y, size: 7, font: regular, color: muted });
    page.drawText(formatCop(item.unitPrice), { x: 404, y, size: 7, font: regular, color: ink });
    page.drawText(formatCop(item.lineTotal), { x: 494, y, size: 7, font: bold, color: ink });
    y -= rowHeight;
    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: 564, y: y + 5 }, thickness: 0.5, color: light });
  }

  y -= 12;
  const summaryLine = (label: string, value: string, strong = false) => {
    ensureSpace(18);
    const font = strong ? bold : regular;
    page.drawText(printable(label), { x: 342, y, size: 9, font, color: strong ? ink : muted });
    page.drawText(printable(value), { x: 460, y, size: 9, font, color: strong ? accent : ink });
    y -= 17;
  };
  summaryLine("Subtotal", formatCop(snapshot.subtotal));
  if (Number(snapshot.discount) > 0) summaryLine("Descuentos", `-${formatCop(snapshot.discount)}`);
  summaryLine(`Impuestos (${snapshot.taxRate}%)`, formatCop(snapshot.taxAmount));
  summaryLine("TOTAL PROPUESTA", formatCop(snapshot.total), true);

  const terms: Array<[string, string | null]> = [
    ["Vigencia", snapshot.validUntil ? new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(snapshot.validUntil)) : null],
    ["Tiempo de ejecución", snapshot.executionTime],
    ["Tiempo de entrega", snapshot.deliveryTime],
    ["Forma de pago", snapshot.paymentTerms],
    ["Exclusiones", snapshot.exclusions],
    ["Observaciones", snapshot.commercialNotes],
  ];
  for (const [label, value] of terms) {
    if (!value) continue;
    y -= 8;
    drawSection(label);
    drawWrapped(value, { size: 9 });
  }

  y -= 16;
  drawSection("Aceptación");
  drawWrapped("Responda a esta propuesta desde el enlace seguro recibido. La aceptación corresponde a esta versión de la propuesta.", {
    size: 9,
    color: muted,
  });
  y -= 24;
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
      "Content-Disposition": `attachment; filename="AQ-${String(snapshot.quoteNumber).padStart(5, "0")}-v${snapshot.version}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
