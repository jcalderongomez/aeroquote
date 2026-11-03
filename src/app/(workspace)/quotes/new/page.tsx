import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuoteCreateForm } from "@/components/data-forms";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role === "OPERATOR") redirect("/dashboard");
  const { clientId } = await searchParams;

  const [clients, services, settings] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { organizationId: session.user.organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, basePrice: true, active: true },
    }),
    prisma.companySettings.findUnique({
      where: { organizationId: session.user.organizationId },
      select: { taxRate: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1000px]">
      <header className="mb-7">
        <Link href="/quotes" className="text-xs font-semibold text-[#1769c2] hover:underline">← Volver a cotizaciones</Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Nueva propuesta</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Crear cotización</h1>
        <p className="mt-2 text-sm text-slate-500">Completa los datos comerciales y registra los costos de forma privada.</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-7">
        <QuoteCreateForm
          clients={clients}
          services={services.map((service) => ({ ...service, basePrice: service.basePrice.toString() }))}
          taxRate={settings?.taxRate.toString() ?? "0"}
          initialClientId={clients.some((client) => client.id === clientId) ? clientId : undefined}
        />
      </section>
    </div>
  );
}
