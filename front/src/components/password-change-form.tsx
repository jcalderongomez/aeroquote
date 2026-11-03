"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/password-input";

export function PasswordChangeForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword: formData.get("newPassword"),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "No se pudo cambiar la contraseña.";
        throw new Error(errorMessage);
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cambiar la contraseña.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-xs font-semibold text-slate-600">
        Contraseña actual
        <PasswordInput name="currentPassword" aria-label="Contraseña actual" autoComplete="current-password" required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        Contraseña nueva
        <PasswordInput name="newPassword" aria-label="Contraseña nueva" autoComplete="new-password" minLength={12} maxLength={128} required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
      </label>
      {message && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-[#1769c2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1259a8] disabled:opacity-60">
        {pending ? "Actualizando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}
