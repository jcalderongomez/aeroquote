import { notFound, redirect } from "next/navigation";
import { QuoteStatus } from "@prisma/client";
import { auth } from "@/auth";
import { QuoteCreateForm } from "@/components/data-forms";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "OPERATOR") redirect("/dashboard");
  const { id } = await params;
  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: { items: true, costs: true },
  });
  if (!quote) notFound();
  if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.CHANGES_REQUESTED) {
    redirect(`/quotes/${quote.id}`);
  }

  const serviceIds = quote.items.map((item) => item.serviceId).filter((value): value is string => value !== null);
  const [clients, services] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: {
        organizationId: session.user.organizationId,
        OR: [{ active: true }, { id: { in: serviceIds } }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, basePrice: true, active: true },
    }),
  ]);
  if (clients.length === 0 || services.length === 0) notFound();

  return (
    <div className="mx-auto max-w-[1000px]">
      <header className="mb-7">
        <a href={`/quotes/${quote.id}`} className="text-xs font-semibold text-[#1769c2] hover:underline">← Volver a la cotización</a>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">AQ-{String(quote.number).padStart(5, "0")}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Editar cotización</h1>
        <p className="mt-2 text-sm text-slate-500">Las propuestas ya compartidas permanecen guardadas como versiones históricas.</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <QuoteCreateForm
          clients={clients}
          services={services.map((service) => ({ ...service, basePrice: service.basePrice.toString() }))}
          taxRate={quote.taxRate.toString()}
          initialQuote={{
            id: quote.id,
            clientId: quote.clientId,
            title: quote.title,
            description: quote.description ?? "",
            location: quote.location ?? "",
            executionTime: quote.executionTime ?? "",
            deliveryTime: quote.deliveryTime ?? "",
            paymentTerms: quote.paymentTerms ?? "",
            exclusions: quote.exclusions ?? "",
            commercialNotes: quote.commercialNotes ?? "",
            items: quote.items.map((item) => ({
              serviceId: item.serviceId ?? "",
              quantity: item.quantity.toString(),
              unitPrice: item.unitPrice.toString(),
              discountPercent: item.quantity.isZero() || item.unitPrice.isZero()
                ? "0"
                : item.discount.div(item.quantity.mul(item.unitPrice)).mul(100).toDecimalPlaces(2).toString(),
            })),
            costs: quote.costs.map((cost) => ({
              description: cost.description,
              amount: cost.amount.toString(),
            })),
          }}
        />
      </section>
    </div>
  );
}
