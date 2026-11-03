import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PasswordChangeForm } from "@/components/password-change-form";

export default async function PasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6fa] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Seguridad de la cuenta</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Cambia tu contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Para proteger tu cuenta, establece una contraseña nueva de al menos 12 caracteres.
        </p>
        <div className="mt-6">
          <PasswordChangeForm />
        </div>
      </section>
    </main>
  );
}
