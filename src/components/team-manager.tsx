"use client";

import { MemberRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = {
  id: string;
  role: MemberRole;
  active: boolean;
  user: { id: string; name: string; email: string; mustChangePassword: boolean };
};

const fieldClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500";
const roleLabels: Record<MemberRole, string> = {
  ADMIN: "Administrador",
  COMMERCIAL: "Comercial",
  OPERATOR: "Operador",
};

export function TeamManager({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [pending, setPending] = useState(false);

  async function request(url: string, method: "POST" | "PATCH", value: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const errorMessage =
        typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "No se pudo completar la operación.";
      throw new Error(errorMessage);
    }
    return body;
  }

  async function addMember(formData: FormData) {
    setPending(true);
    setMessage("");
    setTemporaryPassword("");
    try {
      const created = await request("/api/members", "POST", {
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
      }) as { temporaryPassword: string };
      setTemporaryPassword(created.temporaryPassword);
      setMessage("Usuario creado. Comparte la contraseña temporal de forma segura; solo se mostrará ahora.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setPending(false);
    }
  }

  async function saveMember(member: Member, formData: FormData) {
    setPendingId(member.id);
    setMessage("");
    try {
      await request(`/api/members/${member.id}`, "PATCH", {
        role: formData.get("role"),
        active: formData.get("active") === "on",
      });
      setMessage("Acceso actualizado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el acceso.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-800">Agregar usuario</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Se genera una contraseña temporal de un solo uso, que la persona deberá cambiar al ingresar.</p>
        <form action={addMember} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">Nombre
            <input name="name" required minLength={2} maxLength={120} className={`${fieldClass} mt-1.5 w-full`} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Correo electrónico
            <input name="email" type="email" required className={`${fieldClass} mt-1.5 w-full`} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Rol
            <select name="role" className={`${fieldClass} mt-1.5 w-full`} defaultValue={MemberRole.COMMERCIAL}>
              {Object.values(MemberRole).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button disabled={pending} className="rounded-lg bg-[#1769c2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1259a8] disabled:opacity-60">
              {pending ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
        {temporaryPassword && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Contraseña temporal (se muestra solo esta vez)</p>
            <p className="mt-1 select-all break-all font-mono">{temporaryPassword}</p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Usuarios de la organización</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <form key={member.id} action={(data) => saveMember(member, data)} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_180px_140px_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{member.user.name}</p>
                <p className="truncate text-xs text-slate-500">{member.user.email}</p>
                {member.user.mustChangePassword && <p className="mt-1 text-[11px] text-amber-700">Debe cambiar la contraseña al ingresar</p>}
              </div>
              <label className="text-xs font-semibold text-slate-600">Rol
                <select name="role" defaultValue={member.role} disabled={member.user.id === currentUserId} className={`${fieldClass} mt-1 block w-full disabled:bg-slate-50`}>
                  {Object.values(MemberRole).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input name="active" type="checkbox" defaultChecked={member.active} disabled={member.user.id === currentUserId} className="h-4 w-4 rounded border-slate-300" />
                Acceso activo
              </label>
              <button disabled={pendingId === member.id || member.user.id === currentUserId} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {pendingId === member.id ? "Guardando..." : member.user.id === currentUserId ? "Tu cuenta" : "Guardar"}
              </button>
            </form>
          ))}
        </div>
      </section>
      {message && <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
