import { randomBytes } from "node:crypto";
import { MemberRole, QuoteStatus } from "@prisma/client";
import { getApiContext } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hashProposalToken, type ProposalSnapshot } from "@/lib/quotes/proposal";

const publishableStatuses = [
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.IN_REVIEW,
  QuoteStatus.CHANGES_REQUESTED,
];

export async function POST(
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
      client: { select: { name: true, email: true } },
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!quote) return Response.json({ error: "No se encontró la cotización." }, { status: 404 });
  if (!publishableStatuses.some((status) => status === quote.status)) {
    return Response.json({ error: "Esta cotización no puede publicarse en su estado actual." }, { status: 409 });
  }
  if (quote.validUntil && quote.validUntil <= new Date()) {
    return Response.json({ error: "La cotización venció. Actualiza su vigencia antes de compartirla." }, { status: 409 });
  }
  if (!quote.client.email) {
    return Response.json({ error: "Agrega el correo del cliente antes de compartir la propuesta." }, { status: 400 });
  }
  const publicBaseUrl = process.env.APP_URL ?? process.env.AUTH_URL;
  if (!publicBaseUrl) {
    return Response.json({ error: "Configura APP_URL con la dirección pública de tu aplicación." }, { status: 503 });
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(publicBaseUrl);
  } catch {
    return Response.json({ error: "APP_URL no es una dirección válida." }, { status: 503 });
  }
  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    return Response.json({ error: "Configura APP_URL con HTTPS para compartir propuestas." }, { status: 503 });
  }

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = quote.validUntil ?? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const version = quote.currentVersion + 1;
  const publishedAt = new Date();
  const snapshot: ProposalSnapshot = {
    quoteNumber: quote.number,
    version,
    title: quote.title,
    description: quote.description,
    location: quote.location,
    executionTime: quote.executionTime,
    deliveryTime: quote.deliveryTime,
    paymentTerms: quote.paymentTerms,
    exclusions: quote.exclusions,
    commercialNotes: quote.commercialNotes,
    currency: quote.currency,
    subtotal: quote.subtotal.toString(),
    discount: quote.discount.toString(),
    taxRate: quote.taxRate.toString(),
    taxAmount: quote.taxAmount.toString(),
    total: quote.total.toString(),
    validUntil: quote.validUntil?.toISOString() ?? null,
    publishedAt: publishedAt.toISOString(),
    company: quote.organization,
    client: quote.client,
    items: quote.items.map((item) => ({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discount: item.discount.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
  };

  try {
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.quote.updateMany({
        where: {
          id,
          organizationId: result.context.organizationId,
          status: quote.status,
          currentVersion: quote.currentVersion,
          updatedAt: quote.updatedAt,
        },
        data: { status: QuoteStatus.SENT, currentVersion: version },
      });
      if (updated.count !== 1) throw new Error("CONCURRENT_QUOTE_PUBLISH");

      await transaction.quoteVersion.create({
        data: {
          quoteId: id,
          version,
          snapshot,
          tokenHash: hashProposalToken(token),
          tokenExpiresAt,
        },
      });
      await transaction.quoteHistory.create({
        data: {
          quoteId: id,
          userId: result.context.userId,
          fromStatus: quote.status,
          toStatus: QuoteStatus.SENT,
          note: `Propuesta versión ${version} publicada`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONCURRENT_QUOTE_PUBLISH") {
      return Response.json({ error: "La cotización cambió mientras intentabas publicarla. Recarga e intenta de nuevo." }, { status: 409 });
    }
    throw error;
  }

  const url = new URL(`/propuesta/${token}`, baseUrl).toString();
  return Response.json({
    version,
    url,
    expiresAt: tokenExpiresAt.toISOString(),
    clientEmail: quote.client.email,
  });
}
