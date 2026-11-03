import { MemberRole, QuoteStatus } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.enum(QuoteStatus),
  note: z.string().trim().max(500).optional(),
});

const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: [QuoteStatus.CANCELLED],
  SENT: [QuoteStatus.IN_REVIEW, QuoteStatus.CHANGES_REQUESTED, QuoteStatus.EXPIRED, QuoteStatus.CANCELLED],
  IN_REVIEW: [QuoteStatus.CHANGES_REQUESTED, QuoteStatus.CANCELLED],
  CHANGES_REQUESTED: [QuoteStatus.CANCELLED],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getApiContext([MemberRole.ADMIN, MemberRole.COMMERCIAL]);
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Estado inválido.");
  const { id } = await params;

  const updated = await prisma.$transaction(async (transaction) => {
    const quote = await transaction.quote.findFirst({
      where: { id, organizationId: result.context.organizationId },
      select: { id: true, status: true },
    });
    if (!quote) return { error: "No se encontró la cotización.", httpStatus: 404 };
    if (!transitions[quote.status].includes(parsed.data.status)) {
      return { error: `No se puede cambiar de ${quote.status} a ${parsed.data.status}.`, httpStatus: 409 };
    }

    const changed = await transaction.quote.updateMany({
      where: { id: quote.id, organizationId: result.context.organizationId, status: quote.status },
      data: { status: parsed.data.status },
    });
    if (changed.count !== 1) return { error: "La cotización cambió en otra operación. Actualiza e intenta de nuevo.", httpStatus: 409 };

    await transaction.quoteHistory.create({
      data: {
        quoteId: quote.id,
        userId: result.context.userId,
        fromStatus: quote.status,
        toStatus: parsed.data.status,
        note: parsed.data.note || null,
      },
    });
    return { id: quote.id, status: parsed.data.status };
  });

  if ("error" in updated) return Response.json({ error: updated.error }, { status: updated.httpStatus });
  return Response.json(updated);
}
