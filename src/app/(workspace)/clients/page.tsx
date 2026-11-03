import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ClientCreateForm, ClientEditForm } from "@/components/data-forms";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user || session.user.role === "OPERATOR") redirect("/dashboard");

  const clients = await prisma.client.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      name: true,
      document: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      notes: true,
      _count: { select: { quotes: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Relaciones comerciales</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Clientes</h1>
        <p className="mt-2 text-sm text-slate-500">Administra tus contactos y consulta su actividad comercial.</p>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Directorio</h2>
              <p className="mt-1 text-xs text-slate-500">{clients.length} clientes registrados</p>
            </div>
          </div>
          {clients.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">Aún no hay clientes registrados.</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr><th className="px-5 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Contacto</th><th className="px-4 py-3 font-semibold">Ciudad</th><th className="px-5 py-3 text-right font-semibold">Cotizaciones</th><th className="px-4 py-3"> </th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{client.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{client.type === "COMPANY" ? "Empresa" : "Persona"}{client.document ? ` · ${client.document}` : ""}</p>
                        </td>
                        <td className="px-4 py-4 text-xs leading-5 text-slate-600">{client.email ?? "—"}<br />{client.phone ?? ""}</td>
                        <td className="px-4 py-4 text-xs text-slate-600">{client.city ?? "—"}</td>
                        <td className="px-5 py-4 text-right text-xs font-medium text-slate-700">{client._count.quotes}</td>
                        <td className="px-4 py-4"><ClientEditForm client={client} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {clients.map((client) => (
                  <li key={client.id} className="flex items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{client.email ?? "Sin correo"} · {client.city ?? "Sin ciudad"}</p>
                      <p className="mt-2 text-[11px] text-slate-400">{client._count.quotes} cotizaciones</p>
                    </div>
                    <ClientEditForm client={client} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <h2 className="text-sm font-semibold text-slate-800">Agregar cliente</h2>
          <p className="mb-5 mt-1 text-xs text-slate-500">Los datos quedan asociados a tu organización.</p>
          <ClientCreateForm />
        </section>
      </div>
    </div>
  );
}
