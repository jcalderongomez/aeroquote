import { ClientResponse, QuoteStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashProposalToken } from "@/lib/quotes/proposal";

const responseSchema = z.object({
  response: z.enum(ClientResponse),
  note: z.string().trim().max(2000).optional(),
});

const statusByResponse: Record<ClientResponse, QuoteStatus> = {
  APPROVED: QuoteStatus.APPROVED,
  REJECTED: QuoteStatus.REJECTED,
  CHANGES_REQUESTED: QuoteStatus.CHANGES_REQUESTED,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return Response.json({ error: "El enlace de la propuesta no es válido." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Respuesta inválida." }, { status: 400 });
  }

  const version = await prisma.quoteVersion.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: {
      quote: { select: { id: true, organizationId: true, currentVersion: true, status: true } },
    },
  });
  if (!version || version.tokenExpiresAt <= new Date()) {
    return Response.json({ error: "El enlace venció o no existe." }, { status: 410 });
  }
  if (version.version !== version.quote.currentVersion) {
    return Response.json({ error: "Esta propuesta fue reemplazada por una versión nueva." }, { status: 409 });
  }
  if (version.response) {
    return Response.json({ error: "Ya registramos una respuesta para esta versión." }, { status: 409 });
  }
  if (version.quote.status !== QuoteStatus.SENT && version.quote.status !== QuoteStatus.IN_REVIEW) {
    return Response.json({ error: "La propuesta ya no acepta respuestas." }, { status: 409 });
  }

  const nextStatus = statusByResponse[parsed.data.response];
  try {
    await prisma.$transaction(async (transaction) => {
      const currentVersion = await transaction.quoteVersion.updateMany({
        where: {
          id: version.id,
          response: null,
          tokenExpiresAt: { gt: new Date() },
        },
        data: {
          response: parsed.data.response,
          responseNote: parsed.data.note || null,
          respondedAt: new Date(),
        },
      });
      if (currentVersion.count !== 1) throw new Error("PROPOSAL_ALREADY_RESPONDED");

      const updatedQuote = await transaction.quote.updateMany({
        where: {
          id: version.quote.id,
          organizationId: version.quote.organizationId,
          currentVersion: version.version,
          status: version.quote.status,
        },
        data: { status: nextStatus },
      });
      if (updatedQuote.count !== 1) throw new Error("PROPOSAL_VERSION_REPLACED");

      await transaction.quoteHistory.create({
        data: {
          quoteId: version.quote.id,
          userId: null,
          actorLabel: "Cliente",
          fromStatus: version.quote.status,
          toStatus: nextStatus,
          note: parsed.data.note || `El cliente respondió: ${parsed.data.response}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROPOSAL_ALREADY_RESPONDED") {
      return Response.json({ error: "Ya registramos una respuesta para esta versión." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "PROPOSAL_VERSION_REPLACED") {
      return Response.json({ error: "Esta propuesta fue reemplazada por una versión nueva." }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ status: nextStatus });
}
