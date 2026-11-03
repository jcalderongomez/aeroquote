import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuoteStatusControl } from "@/components/quote-status-control";
import { fetchBackend } from "@/lib/backend-api";
import type { QuoteStatus } from "@/lib/domain";
import { formatCop, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const session = await auth();
  if (!session?.user || session.user.role === "OPERATOR") redirect("/dashboard");

  const quotes = await fetchBackend<Array<{
    id: string;
    number: number;
    title: string;
    status: QuoteStatus;
    total: string;
    estimatedProfit: string;
    estimatedMargin: string;
    createdAt: string;
    validUntil: string | null;
    client: { name: string };
  }>>("/api/quotes");

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Gestión comercial</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Cotizaciones</h1>
          <p className="mt-2 text-sm text-slate-500">Prepara propuestas y haz seguimiento de cada oportunidad.</p>
        </div>
        <Link href="/quotes/new" className="rounded-lg bg-[#1769c2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1259a8]">+ Nueva cotización</Link>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Todas las cotizaciones</h2>
          <p className="mt-1 text-xs text-slate-500">{quotes.length} registros</p>
        </div>
        {quotes.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">Todavía no has creado cotizaciones</p>
            <p className="mt-1 text-xs text-slate-500">Crea una propuesta para comenzar el seguimiento comercial.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Cotización</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Creada</th>
                  <th className="px-4 py-3 font-semibold">Vigencia</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <Link href={`/quotes/${quote.id}`} className="font-semibold text-[#1769c2] hover:underline">AQ-{String(quote.number).padStart(5, "0")}</Link>
                      <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">{quote.title}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-700">{quote.client.name}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDate(quote.createdAt)}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{quote.validUntil ? formatDate(quote.validUntil) : "—"}</td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-xs font-semibold text-slate-800">{formatCop(quote.total)}</p>
                      <p className="mt-1 text-[10px] text-slate-400">Utilidad {formatCop(quote.estimatedProfit)}</p>
                      <p className="mt-1 text-[10px] text-slate-400">Margen {quote.estimatedMargin}%</p>
                    </td>
                    <td className="px-5 py-4"><QuoteStatusControl id={quote.id} status={quote.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
