import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuoteCreateForm } from "@/components/data-forms";
import { fetchBackend } from "@/lib/backend-api";
import { QuoteStatus } from "@/lib/domain";
import Decimal from "decimal.js";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "OPERATOR") redirect("/dashboard");
  const { id } = await params;
  const quote = await fetchBackend<{
    id: string;
    number: number;
    status: QuoteStatus;
    clientId: string;
    title: string;
    description: string | null;
    location: string | null;
    executionTime: string | null;
    deliveryTime: string | null;
    paymentTerms: string | null;
    exclusions: string | null;
    commercialNotes: string | null;
    taxRate: string;
    items: Array<{
      serviceId: string | null;
      quantity: string;
      unitPrice: string;
      discount: string;
    }>;
    costs: Array<{ description: string; amount: string }>;
  }>(`/api/quotes/${id}`);
  if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.CHANGES_REQUESTED) {
    redirect(`/quotes/${quote.id}`);
  }

  const serviceIds = quote.items.map((item) => item.serviceId).filter((value): value is string => value !== null);
  const [clients, services] = await Promise.all([
    fetchBackend<Array<{ id: string; name: string }>>("/api/clients"),
    fetchBackend<Array<{ id: string; name: string; unit: string; basePrice: string; active: boolean }>>("/api/services"),
  ]);
  const availableServices = services.filter((service) => service.active || serviceIds.includes(service.id));
  if (clients.length === 0 || availableServices.length === 0) notFound();

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
          services={availableServices}
          taxRate={quote.taxRate}
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
            items: quote.items.map((item) => {
              const gross = new Decimal(item.quantity).mul(item.unitPrice);
              return {
              serviceId: item.serviceId ?? "",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: gross.isZero()
                ? "0"
                : new Decimal(item.discount).div(gross).mul(100).toDecimalPlaces(2).toString(),
              };
            }),
            costs: quote.costs,
          }}
        />
      </section>
    </div>
  );
}
