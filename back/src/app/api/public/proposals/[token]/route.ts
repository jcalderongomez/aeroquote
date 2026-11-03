import { getProposalByToken } from "@/lib/quotes/proposal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);
  if (!proposal) return Response.json({ error: "El enlace de la propuesta venció o no existe." }, { status: 404 });

  return Response.json({
    snapshot: proposal.snapshot,
    version: {
      response: proposal.version.response,
      responseNote: proposal.version.responseNote,
    },
    isCurrent: proposal.isCurrent,
    quoteStatus: proposal.quoteStatus,
  });
}
