"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PasswordInput } from "@/components/password-input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No fue posible iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="mt-8 space-y-5">
      <label className="block text-sm font-medium text-slate-700">
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500"
          placeholder="tu@empresa.com"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Contraseña
        <PasswordInput
          name="password"
          aria-label="Contraseña"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500"
          placeholder="••••••••••••"
        />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#1769c2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1259a8] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Ingresando..." : "Ingresar al espacio de trabajo"}
      </button>
    </form>
  );
}
