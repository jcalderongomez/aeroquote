import Link from "next/link";
import { QuoteStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCop, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const quoteStatuses: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Cambios solicitados",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

function MetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`mt-1 h-2 w-2 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#172338]">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </article>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.role === "OPERATOR") {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2874d0]">Espacio de trabajo</p>
        <h1 className="mt-2 text-2xl font-semibold">Bienvenido, {session.user.name}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          La gestión operativa de proyectos asignados todavía no está incluida en esta primera entrega.
        </p>
      </section>
    );
  }

  const organizationId = session.user.organizationId;
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

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Visión general</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Resumen comercial</h1>
          <p className="mt-2 text-sm text-slate-500">Indicadores de actividad de tu organización.</p>
        </div>
        <Link href="/quotes/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1769c2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1259a8]">
          <span aria-hidden="true">+</span> Nueva cotización
        </Link>
      </header>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Cotizaciones" value={String(totalQuotes)} detail="Total registrado" accent="bg-blue-500" />
        <MetricCard label="Pendientes" value={String(pendingQuotes)} detail="Enviadas o en revisión" accent="bg-amber-400" />
        <MetricCard label="Aprobadas" value={String(approvedQuotes)} detail="Contratadas por el cliente" accent="bg-emerald-500" />
        <MetricCard label="Total cotizado" value={formatCop(quotedValue._sum.total?.toString() ?? "0")} detail={`${formatCop(contractedValue._sum.total?.toString() ?? "0")} aprobados`} accent="bg-[#35c0aa]" />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.8fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Actividad reciente</h2>
              <p className="mt-1 text-xs text-slate-500">Últimas cotizaciones registradas</p>
            </div>
            <Link href="/quotes" className="text-xs font-semibold text-[#1769c2] hover:underline">Ver cotizaciones</Link>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">Aún no hay cotizaciones</p>
              <p className="mt-1 text-xs text-slate-500">Crea la primera propuesta para iniciar el seguimiento.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentQuotes.map((quote) => (
                <Link key={quote.id} href={`/quotes/${quote.id}`} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                  <div className="min-w-[180px]">
                    <p className="text-sm font-semibold text-slate-800">AQ-{String(quote.number).padStart(5, "0")} · {quote.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{quote.client.name} <span className="mx-1.5 text-slate-300">·</span>{formatDate(quote.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">{formatCop(quote.total.toString())}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{quoteStatuses[quote.status]}</p>
                    </div>
                    <span className="text-slate-300" aria-hidden="true">›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Clientes nuevos</p>
                <p className="mt-1 text-xs text-slate-500">Registrados este mes</p>
              </div>
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">MES</span>
            </div>
            <p className="mt-5 text-3xl font-semibold text-[#172338]">{clients}</p>
            <Link href="/clients" className="mt-4 inline-block text-xs font-semibold text-[#1769c2] hover:underline">Gestionar clientes →</Link>
          </div>
          <div className="rounded-xl border border-[#d9eee9] bg-[#edfaf7] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#177e70]">Rentabilidad privada</p>
            <h2 className="mt-2 text-sm font-semibold text-slate-800">Costos y márgenes protegidos</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">Los costos internos solo están disponibles para usuarios con permisos comerciales y nunca forman parte de la propuesta al cliente.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
