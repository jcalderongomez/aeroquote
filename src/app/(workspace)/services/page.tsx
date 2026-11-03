import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ServiceCreateForm, ServiceEditForm } from "@/components/data-forms";
import { prisma } from "@/lib/prisma";
import { formatCop } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user || session.user.role === "OPERATOR") redirect("/dashboard");

  const services = await prisma.service.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      unit: true,
      basePrice: true,
      quoteMode: true,
      active: true,
    },
  });

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Portafolio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Servicios</h1>
        <p className="mt-2 text-sm text-slate-500">Configura el catálogo y las tarifas de tu organización.</p>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Catálogo</h2>
            <p className="mt-1 text-xs text-slate-500">{services.length} servicios configurados</p>
          </div>
          {services.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">Aún no hay servicios en el catálogo.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {services.map((service) => (
                <article key={service.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-[190px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{service.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${service.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {service.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{service.category} · por {service.unit.replace("_", " ")}</p>
                      {service.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{service.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatCop(service.basePrice.toString())}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{service.quoteMode === "AUTOMATIC" ? "Automática" : "Evaluación"}</p>
                    </div>
                  </div>
                  <ServiceEditForm service={{ ...service, basePrice: service.basePrice.toString() }} />
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <h2 className="text-sm font-semibold text-slate-800">Agregar servicio</h2>
          <p className="mb-5 mt-1 text-xs text-slate-500">Define un precio base; podrás ajustarlo al cotizar.</p>
          <ServiceCreateForm />
        </section>
      </div>
    </div>
  );
}
