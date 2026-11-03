import { MemberRole, Prisma, QuoteStatus } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { calculateQuote } from "@/lib/quotes/calculations";

const editQuoteSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  location: z.string().trim().max(240).optional().or(z.literal("")),
  executionTime: z.string().trim().max(160).optional().or(z.literal("")),
  deliveryTime: z.string().trim().max(160).optional().or(z.literal("")),
  paymentTerms: z.string().trim().max(1000).optional().or(z.literal("")),
  exclusions: z.string().trim().max(2000).optional().or(z.literal("")),
  commercialNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(z.object({
    serviceId: z.string().min(1),
    quantity: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
    unitPrice: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/),
    discountPercent: z.string().regex(/^\d{1,3}(?:\.\d{1,2})?$/),
  })).min(1).max(50),
  costs: z.array(z.object({
    description: z.string().trim().min(2).max(160),
    amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/),
  })).max(30),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getApiContext([MemberRole.ADMIN, MemberRole.COMMERCIAL]);
  if (result.error) return result.error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }
  const parsed = editQuoteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const input = parsed.data;
  const organizationId = result.context.organizationId;
  const quote = await prisma.quote.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      status: true,
      currentVersion: true,
      taxRate: true,
      validUntil: true,
      updatedAt: true,
      items: { select: { serviceId: true } },
    },
  });
  if (!quote) return Response.json({ error: "No se encontró la cotización." }, { status: 404 });
  if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.CHANGES_REQUESTED) {
    return Response.json({ error: "Solo puedes editar borradores o cotizaciones con cambios solicitados." }, { status: 409 });
  }

  const uniqueServiceIds = [...new Set(input.items.map((item) => item.serviceId))];
  const existingServiceIds = new Set(quote.items.flatMap((item) => item.serviceId ? [item.serviceId] : []));
  const [client, services] = await Promise.all([
    prisma.client.findFirst({ where: { id: input.clientId, organizationId }, select: { id: true } }),
    prisma.service.findMany({
      where: { id: { in: uniqueServiceIds }, organizationId },
      select: { id: true, name: true, unit: true, active: true },
    }),
  ]);
  if (!client) return Response.json({ error: "El cliente no existe en esta organización." }, { status: 404 });
  const serviceById = new Map(services.map((service) => [service.id, service]));
  if (
    services.length !== uniqueServiceIds.length ||
    input.items.some((item) => {
      const service = serviceById.get(item.serviceId);
      return !service || (!service.active && !existingServiceIds.has(service.id));
    })
  ) {
    return Response.json({ error: "Los servicios nuevos deben estar activos y todos deben pertenecer a esta organización." }, { status: 400 });
  }

  let calculation;
  try {
    calculation = calculateQuote({
      items: input.items,
      costs: input.costs.map((cost) => cost.amount),
      taxRate: quote.taxRate.toString(),
    });
  } catch (error) {
    return validationError(error instanceof Error ? error.message : "No se pudo calcular la cotización.");
  }

  try {
    const updatedQuote = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.quote.updateMany({
        where: {
          id,
          organizationId,
          status: quote.status,
          currentVersion: quote.currentVersion,
          updatedAt: quote.updatedAt,
        },
        data: {
          clientId: client.id,
          title: input.title,
          description: input.description || null,
          location: input.location || null,
          executionTime: input.executionTime || null,
          deliveryTime: input.deliveryTime || null,
          paymentTerms: input.paymentTerms || null,
          exclusions: input.exclusions || null,
          commercialNotes: input.commercialNotes || null,
          subtotal: new Prisma.Decimal(calculation.subtotal),
          discount: new Prisma.Decimal(calculation.discount),
          taxAmount: new Prisma.Decimal(calculation.taxAmount),
          total: new Prisma.Decimal(calculation.total),
          internalCosts: new Prisma.Decimal(calculation.internalCosts),
          estimatedProfit: new Prisma.Decimal(calculation.estimatedProfit),
          estimatedMargin: new Prisma.Decimal(calculation.marginPercent),
        },
      });
      if (updated.count !== 1) throw new Error("CONCURRENT_QUOTE_EDIT");

      await transaction.quoteItem.deleteMany({ where: { quoteId: id } });
      await transaction.quoteCost.deleteMany({ where: { quoteId: id } });
      const items = input.items.map((item, index) => {
        const service = serviceById.get(item.serviceId);
        if (!service) throw new Error("QUOTE_SERVICE_CHANGED");
        const gross = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
        return {
          quoteId: id,
          serviceId: service.id,
          description: service.name,
          unit: service.unit,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          discount: gross.mul(item.discountPercent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
          lineTotal: new Prisma.Decimal(calculation.itemTotals[index]),
        };
      });
      await transaction.quoteItem.createMany({ data: items });
      if (input.costs.length > 0) {
        await transaction.quoteCost.createMany({
          data: input.costs.map((cost) => ({
            quoteId: id,
            description: cost.description,
            amount: new Prisma.Decimal(cost.amount),
          })),
        });
      }
      await transaction.quoteHistory.create({
        data: {
          quoteId: id,
          userId: result.context.userId,
          fromStatus: quote.status,
          toStatus: quote.status,
          note: "Cotización editada",
        },
      });
      return transaction.quote.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true, updatedAt: true },
      });
    });
    return Response.json(updatedQuote);
  } catch (error) {
    if (error instanceof Error && error.message === "CONCURRENT_QUOTE_EDIT") {
      return Response.json({ error: "La cotización cambió mientras la editabas. Recarga e intenta de nuevo." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "QUOTE_SERVICE_CHANGED") {
      return Response.json({ error: "Un servicio dejó de estar disponible; vuelve a cargar la cotización." }, { status: 409 });
    }
    throw error;
  }
}
