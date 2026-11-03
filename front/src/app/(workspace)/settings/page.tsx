import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrganizationEditForm, SettingsForm } from "@/components/data-forms";
import { fetchBackend } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const [organization, settings] = await Promise.all([
    fetchBackend<{
      name: string;
      taxId: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
    }>("/api/organization"),
    fetchBackend<{ taxRate: string; currency: string; quoteValidityDays: number }>("/api/settings"),
  ]);

  return (
    <div className="mx-auto max-w-[1000px]">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Administración</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Configuración</h1>
        <p className="mt-2 text-sm text-slate-500">Ajustes comerciales que se utilizarán en las nuevas cotizaciones.</p>
      </header>
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">Empresa</h2>
          <p className="mb-5 mt-1 text-xs text-slate-500">Actualiza los datos de contacto y facturación de tu organización.</p>
          <OrganizationEditForm initialValues={{
            name: organization.name,
            taxId: organization.taxId ?? "",
            email: organization.email ?? "",
            phone: organization.phone ?? "",
            address: organization.address ?? "",
            city: organization.city ?? "",
          }} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">Impuestos y vigencia</h2>
          <p className="mt-1 text-xs text-slate-500">Moneda actual: {settings.currency}. Estos valores aplican a cotizaciones nuevas; no modifican las existentes.</p>
          <div className="mt-5">
            <SettingsForm initialTaxRate={settings.taxRate} initialValidityDays={settings.quoteValidityDays} />
          </div>
        </section>
      </div>
    </div>
  );
}
