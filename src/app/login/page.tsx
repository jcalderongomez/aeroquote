import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id && session.user.organizationId) redirect("/dashboard");

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#13243a] p-12 text-white lg:flex xl:p-16">
        <div className="absolute -right-36 -top-32 h-[440px] w-[440px] rounded-full border border-white/10" />
        <div className="absolute -right-16 -top-12 h-[280px] w-[280px] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#35c0aa] font-black text-[#102b38]">AQ</span>
          <span className="text-sm font-bold tracking-[0.18em]">AEROQUOTE</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#68d7c3]">Una operación más clara</p>
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            Cada proyecto empieza con una buena propuesta.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
            Clientes, servicios y cotizaciones profesionales para empresas que trabajan con drones.
          </p>
        </div>
        <p className="relative text-xs text-slate-400">Gestión comercial para operaciones aéreas</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[410px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#35c0aa] text-sm font-black text-[#102b38]">AQ</span>
            <span className="text-sm font-bold tracking-[0.16em]">AEROQUOTE</span>
          </div>
          <p className="text-sm font-semibold text-[#2874d0]">Bienvenido</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#172338]">Ingresa a tu cuenta</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Accede al espacio de trabajo de tu organización.</p>
          <LoginForm />
          <p className="mt-7 text-center text-xs leading-5 text-slate-400">
            Las cuentas se habilitan desde la administración de la empresa.
          </p>
        </div>
      </section>
    </main>
  );
}
