import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PublishProposalButton } from "@/components/data-forms";
import { QuoteStatusControl } from "@/components/quote-status-control";
import { formatCop, formatDate } from "@/lib/format";
import { fetchBackend } from "@/lib/backend-api";
import type { QuoteStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function QuoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role === "OPERATOR") redirect("/dashboard");
  const { id } = await params;
  const quote = await fetchBackend<{
    id: string;
    number: number;
    title: string;
    createdAt: string;
    status: QuoteStatus;
    client: { name: string; email: string | null };
    createdBy: { name: string };
    items: Array<{ id: string; description: string; unit: string; quantity: string; unitPrice: string; lineTotal: string }>;
    subtotal: string;
    discount: string;
    taxRate: string;
    taxAmount: string;
    total: string;
    costs: Array<{ id: string; description: string; amount: string }>;
    internalCosts: string;
    estimatedProfit: string;
    estimatedMargin: string;
    location: string | null;
    validUntil: string | null;
    description: string | null;
    history: Array<{
      id: string;
      toStatus: QuoteStatus;
      note: string | null;
      actorLabel: string | null;
      createdAt: string;
      user: { name: string } | null;
    }>;
  }>(`/api/quotes/${id}`);

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/quotes" className="text-xs font-semibold text-[#1769c2] hover:underline">← Volver a cotizaciones</Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">AQ-{String(quote.number).padStart(5, "0")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">{quote.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{quote.client.name} <span className="mx-1.5 text-slate-300">·</span> Creada {formatDate(quote.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <a
            href={`/api/quotes/${quote.id}/pdf`}
            className="rounded-lg bg-[#1769c2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1259a8]"
          >
            Descargar PDF para imprimir
          </a>
          <QuoteStatusControl id={quote.id} status={quote.status} />
          {["DRAFT", "SENT", "IN_REVIEW", "CHANGES_REQUESTED"].includes(quote.status) && (
            <a href={`/quotes/${quote.id}/edit`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Editar cotización
            </a>
          )}
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Servicios cotizados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3 font-semibold">Servicio</th><th className="px-3 py-3 text-right font-semibold">Cantidad</th><th className="px-3 py-3 text-right font-semibold">Precio</th><th className="px-5 py-3 text-right font-semibold">Subtotal</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4"><p className="font-medium text-slate-800">{item.description}</p><p className="mt-1 text-xs text-slate-500">por {item.unit.replace("_", " ")}</p></td>
                      <td className="px-3 py-4 text-right text-xs text-slate-600">{item.quantity}</td>
                      <td className="px-3 py-4 text-right text-xs text-slate-600">{formatCop(item.unitPrice)}</td>
                      <td className="px-5 py-4 text-right text-xs font-semibold text-slate-800">{formatCop(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCop(quote.subtotal)}</span></div>
              {Number(quote.discount) > 0 && <div className="flex justify-between"><span className="text-slate-500">Descuentos</span><span>-{formatCop(quote.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Impuestos ({quote.taxRate}%)</span><span>{formatCop(quote.taxAmount)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold"><span>Total comercial</span><span className="text-[#1769c2]">{formatCop(quote.total)}</span></div>
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">Privado · solo para la empresa</p>
            <h2 className="mt-2 text-sm font-semibold text-slate-800">Costos y rentabilidad estimada</h2>
            {quote.costs.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">No se registraron costos internos.</p>
            ) : (
              <ul className="mt-4 divide-y divide-amber-200/70">
                {quote.costs.map((cost) => (
                  <li key={cost.id} className="flex justify-between gap-3 py-2.5 text-xs">
                    <span className="text-slate-600">{cost.description}</span>
                    <span className="font-medium text-slate-800">{formatCop(cost.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-3 space-y-2 border-t border-amber-200/70 pt-3 text-xs">
              <div className="flex justify-between"><dt className="text-slate-600">Costos internos</dt><dd className="font-semibold">{formatCop(quote.internalCosts)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Utilidad estimada antes de impuestos</dt><dd className="font-semibold">{formatCop(quote.estimatedProfit)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Margen estimado</dt><dd className="font-semibold">{quote.estimatedMargin}%</dd></div>
            </dl>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-800">Datos del proyecto</h2>
            <dl className="mt-4 space-y-4 text-xs">
              <div><dt className="text-slate-400">Cliente</dt><dd className="mt-1 font-medium text-slate-700">{quote.client.name}</dd></div>
              <div><dt className="text-slate-400">Ubicación</dt><dd className="mt-1 font-medium text-slate-700">{quote.location ?? "No especificada"}</dd></div>
              <div><dt className="text-slate-400">Vigente hasta</dt><dd className="mt-1 font-medium text-slate-700">{quote.validUntil ? formatDate(quote.validUntil) : "—"}</dd></div>
              <div><dt className="text-slate-400">Responsable</dt><dd className="mt-1 font-medium text-slate-700">{quote.createdBy.name}</dd></div>
              {quote.description && <div><dt className="text-slate-400">Descripción</dt><dd className="mt-1 leading-5 text-slate-700">{quote.description}</dd></div>}
            </dl>
            {["DRAFT", "SENT", "IN_REVIEW", "CHANGES_REQUESTED"].includes(quote.status) && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-semibold text-slate-700">Propuesta para el cliente</h3>
                <PublishProposalButton quoteId={quote.id} clientEmail={quote.client.email} />
                <p className="mt-2 text-[10px] leading-4 text-slate-400">Crea una versión inmutable. El enlace vence con la cotización; luego puedes compartirlo por tu correo o mensajería.</p>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-800">Historial</h2>
            <ol className="mt-4 space-y-4">
              {quote.history.map((entry) => (
                <li key={entry.id} className="relative border-l border-slate-200 pl-4">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#35c0aa]" />
                  <p className="text-xs font-semibold text-slate-700">{entry.toStatus.replace("_", " ")}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{entry.note ?? "Cambio de estado"} · {entry.user?.name ?? entry.actorLabel ?? "Sistema"}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDate(entry.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
