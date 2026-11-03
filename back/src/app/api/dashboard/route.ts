import { MemberRole, QuoteStatus } from "@prisma/client";
import { getApiContext } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await getApiContext([MemberRole.ADMIN, MemberRole.COMMERCIAL]);
  if (result.error) return result.error;

  const organizationId = result.context.organizationId;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalQuotes, pendingQuotes, approvedQuotes, quotedValue, contractedValue, clients, recentQuotes] =
    await Promise.all([
      prisma.quote.count({ where: { organizationId } }),
      prisma.quote.count({ where: { organizationId, status: { in: [QuoteStatus.SENT, QuoteStatus.IN_REVIEW] } } }),
      prisma.quote.count({ where: { organizationId, status: QuoteStatus.APPROVED } }),
      prisma.quote.aggregate({
        where: { organizationId, status: { in: [QuoteStatus.SENT, QuoteStatus.IN_REVIEW, QuoteStatus.APPROVED] } },
        _sum: { total: true },
      }),
      prisma.quote.aggregate({
        where: { organizationId, status: QuoteStatus.APPROVED },
        _sum: { total: true },
      }),
      prisma.client.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
      prisma.quote.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          client: { select: { name: true } },
        },
      }),
    ]);

  return Response.json({
    totalQuotes,
    pendingQuotes,
    approvedQuotes,
    quotedValue: quotedValue._sum.total?.toString() ?? "0",
    contractedValue: contractedValue._sum.total?.toString() ?? "0",
    clients,
    recentQuotes,
  });
}
