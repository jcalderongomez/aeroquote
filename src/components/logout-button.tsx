"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
    >
      Cerrar sesión
    </button>
  );
}
