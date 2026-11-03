import { notFound } from "next/navigation";
import { ProposalResponseForm } from "@/app/propuesta/[token]/response-form";
import { formatCop, formatDate } from "@/lib/format";
import { getProposalByToken } from "@/lib/quotes/proposal";

export const dynamic = "force-dynamic";

const responseLabels = {
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CHANGES_REQUESTED: "Cambios solicitados",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Cambios solicitados",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);
  if (!proposal) notFound();

  const { snapshot } = proposal;
  const canRespond = proposal.isCurrent &&
    !proposal.version.response &&
    ["SENT", "IN_REVIEW"].includes(proposal.quoteStatus);

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 sm:px-7 sm:py-12">
      <article className="mx-auto max-w-[880px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-[#13243a] px-6 py-7 text-white sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-[#68d7c3]">AEROQUOTE · PROPUESTA COMERCIAL</p>
              <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{snapshot.title}</h1>
              <p className="mt-2 text-sm text-slate-300">{snapshot.company.name}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-300">Propuesta</p>
              <p className="mt-1 text-sm font-semibold">AQ-{String(snapshot.quoteNumber).padStart(5, "0")} · v{snapshot.version}</p>
            </div>
          </div>
        </header>

        <div className="space-y-7 px-6 py-7 sm:px-10">
          {proposal.version.response && (
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Esta versión fue respondida: <strong>{responseLabels[proposal.version.response]}</strong>.
            </p>
          )}
          {!proposal.isCurrent && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Esta es una versión anterior. Estado actual: {statusLabels[proposal.quoteStatus] ?? proposal.quoteStatus}. Consulta el enlace de la versión más reciente con la empresa.
            </p>
          )}

          <section className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Preparada para</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{snapshot.client.name}</p>
              {snapshot.client.email && <p className="mt-1 text-xs text-slate-500">{snapshot.client.email}</p>}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Proveedor</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{snapshot.company.name}</p>
              {snapshot.company.taxId && <p className="mt-1 text-xs text-slate-500">NIT: {snapshot.company.taxId}</p>}
              {[snapshot.company.email, snapshot.company.phone, snapshot.company.address, snapshot.company.city].filter(Boolean).map((value) => (
                <p key={value} className="mt-1 text-xs text-slate-500">{value}</p>
              ))}
            </div>
          </section>

          {snapshot.description && <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{snapshot.description}</p>}
          {snapshot.location && <p className="text-xs text-slate-500"><strong className="text-slate-700">Lugar del servicio:</strong> {snapshot.location}</p>}

          <section>
            <h2 className="text-sm font-semibold text-slate-800">Servicios incluidos</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3 font-semibold">Servicio</th><th className="px-3 py-3 text-right font-semibold">Cantidad</th><th className="px-3 py-3 text-right font-semibold">Precio unitario</th><th className="px-4 py-3 text-right font-semibold">Subtotal</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshot.items.map((item, index) => (
                    <tr key={`${item.description}-${index}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.description}</p>
                        <p className="mt-1 text-[10px] text-slate-400">por {item.unit.replace("_", " ")}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-slate-600">{item.quantity}</td>
                      <td className="px-3 py-3 text-right text-xs text-slate-600">{formatCop(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800">{formatCop(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto mt-4 max-w-xs space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatCop(snapshot.subtotal)}</dd></div>
              {Number(snapshot.discount) > 0 && <div className="flex justify-between"><dt className="text-slate-500">Descuentos</dt><dd>-{formatCop(snapshot.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Impuestos ({snapshot.taxRate}%)</dt><dd>{formatCop(snapshot.taxAmount)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold"><dt>Total</dt><dd className="text-[#1769c2]">{formatCop(snapshot.total)}</dd></div>
            </dl>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {[
              ["Vigencia", snapshot.validUntil ? formatDate(snapshot.validUntil) : null],
              ["Tiempo de ejecución", snapshot.executionTime],
              ["Tiempo de entrega", snapshot.deliveryTime],
              ["Forma de pago", snapshot.paymentTerms],
              ["Exclusiones", snapshot.exclusions],
              ["Observaciones", snapshot.commercialNotes],
            ].map(([label, value]) => value && (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-700">{value}</p>
              </div>
            ))}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <a href={`/api/public/proposals/${token}/pdf`} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Descargar propuesta PDF
            </a>
            <p className="text-[11px] text-slate-400">Versión {snapshot.version} · publicada {formatDate(snapshot.publishedAt)}</p>
          </div>

          {canRespond && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <h2 className="text-sm font-semibold text-slate-800">¿Cómo deseas responder?</h2>
              <p className="mb-4 mt-1 text-xs text-slate-500">Tu respuesta se guardará como evidencia asociada a esta versión.</p>
              <ProposalResponseForm token={token} />
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
