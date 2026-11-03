import { MemberRole, Prisma, QuoteStatus } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { calculateQuote } from "@/lib/quotes/calculations";

const quoteSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  location: z.string().trim().max(240).optional().or(z.literal("")),
  executionTime: z.string().trim().max(160).optional().or(z.literal("")),
  deliveryTime: z.string().trim().max(160).optional().or(z.literal("")),
  paymentTerms: z.string().trim().max(1000).optional().or(z.literal("")),
  exclusions: z.string().trim().max(2000).optional().or(z.literal("")),
  commercialNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(
    z.object({
      serviceId: z.string().min(1),
      quantity: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "La cantidad debe tener hasta dos decimales."),
      unitPrice: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "El precio debe tener hasta dos decimales.").optional(),
      discountPercent: z.string().regex(/^\d{1,3}(?:\.\d{1,2})?$/, "El descuento debe tener hasta dos decimales.").default("0"),
    }),
  ).min(1).max(50),
  costs: z.array(
    z.object({
      description: z.string().trim().min(2).max(160),
      amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "El costo debe tener hasta dos decimales."),
    }),
  ).max(30).default([]),
});

export async function GET() {
  const result = await getApiContext([MemberRole.ADMIN, MemberRole.COMMERCIAL]);
  if (result.error) return result.error;

  const quotes = await prisma.quote.findMany({
    where: { organizationId: result.context.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      subtotal: true,
      taxAmount: true,
      total: true,
      estimatedProfit: true,
      estimatedMargin: true,
      currency: true,
      validUntil: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });
  return Response.json(quotes);
}

export async function POST(request: Request) {
  const result = await getApiContext([MemberRole.ADMIN, MemberRole.COMMERCIAL]);
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const input = parsed.data;
  const organizationId = result.context.organizationId;
  const [client, services, settings] = await Promise.all([
    prisma.client.findFirst({ where: { id: input.clientId, organizationId }, select: { id: true } }),
    prisma.service.findMany({
      where: { id: { in: [...new Set(input.items.map((item) => item.serviceId))] }, organizationId, active: true },
      select: { id: true, name: true, unit: true, basePrice: true },
    }),
    prisma.companySettings.findUnique({ where: { organizationId } }),
  ]);

  if (!client) return Response.json({ error: "El cliente seleccionado no existe." }, { status: 404 });
  if (services.length !== new Set(input.items.map((item) => item.serviceId)).size) {
    return Response.json({ error: "Uno o más servicios no están disponibles en esta empresa." }, { status: 400 });
  }
  if (!settings) return Response.json({ error: "Configura la empresa antes de crear cotizaciones." }, { status: 409 });

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const itemInputs: Array<{
    serviceId: string;
    quantity: string;
    unitPrice: string;
    discountPercent: string;
    service: (typeof services)[number];
  }> = [];
  for (const item of input.items) {
    const service = serviceById.get(item.serviceId);
    if (!service) return Response.json({ error: "Uno o más servicios ya no están disponibles." }, { status: 409 });
    itemInputs.push({
      ...item,
      service,
      unitPrice: item.unitPrice ?? service.basePrice.toString(),
    });
  }
  let calculation;
  try {
    calculation = calculateQuote({
      items: itemInputs,
      costs: input.costs.map((cost) => cost.amount),
      taxRate: settings.taxRate.toString(),
    });
  } catch (error) {
    return validationError(error instanceof Error ? error.message : "No se pudo calcular la cotización.");
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + settings.quoteValidityDays);

  const quote = await prisma.$transaction(async (transaction) => {
    const counter = await transaction.quoteCounter.update({
      where: { organizationId },
      data: { nextNumber: { increment: 1 } },
    });
    const number = counter.nextNumber - 1;

    return transaction.quote.create({
      data: {
        organizationId,
        clientId: client.id,
        createdById: result.context.userId,
        number,
        title: input.title,
        description: input.description || null,
        location: input.location || null,
        executionTime: input.executionTime || null,
        deliveryTime: input.deliveryTime || null,
        paymentTerms: input.paymentTerms || null,
        exclusions: input.exclusions || null,
        commercialNotes: input.commercialNotes || null,
        status: QuoteStatus.DRAFT,
        currency: settings.currency,
        subtotal: new Prisma.Decimal(calculation.subtotal),
        discount: new Prisma.Decimal(calculation.discount),
        taxRate: settings.taxRate,
        taxAmount: new Prisma.Decimal(calculation.taxAmount),
        total: new Prisma.Decimal(calculation.total),
        internalCosts: new Prisma.Decimal(calculation.internalCosts),
        estimatedProfit: new Prisma.Decimal(calculation.estimatedProfit),
        estimatedMargin: new Prisma.Decimal(calculation.marginPercent),
        validUntil,
        items: {
          create: itemInputs.map((item, index) => {
            const gross = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
            return {
              serviceId: item.service.id,
              description: item.service.name,
              unit: item.service.unit,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              discount: gross
                .mul(item.discountPercent)
                .div(100)
                .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
              lineTotal: new Prisma.Decimal(calculation.itemTotals[index]),
            };
          }),
        },
        costs: {
          create: input.costs.map((cost) => ({
            description: cost.description,
            amount: new Prisma.Decimal(cost.amount),
          })),
        },
        history: {
          create: {
            userId: result.context.userId,
            fromStatus: null,
            toStatus: QuoteStatus.DRAFT,
            note: "Cotización creada",
          },
        },
      },
      select: { id: true, number: true, title: true, status: true, total: true, createdAt: true },
    });
  });

  return Response.json(quote, { status: 201 });
}
