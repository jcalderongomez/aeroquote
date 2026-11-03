"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MemberRole } from "@/lib/domain";
import { LogoutButton } from "@/components/logout-button";

const links = [
  { href: "/dashboard", label: "Resumen", marker: "01" },
  { href: "/clients", label: "Clientes", marker: "02" },
  { href: "/services", label: "Servicios", marker: "03" },
  { href: "/quotes", label: "Cotizaciones", marker: "04" },
];

export function WorkspaceNav({
  name,
  email,
  role,
  organization,
}: {
  name: string;
  email: string;
  role: MemberRole;
  organization: string;
}) {
  const pathname = usePathname();
  const visibleLinks = role === "OPERATOR"
    ? links.slice(0, 1)
    : role === "ADMIN"
      ? [...links, { href: "/team", label: "Equipo", marker: "05" }]
      : links;

  return (
    <aside className="flex min-h-screen w-full flex-col bg-[#13243a] px-4 py-6 text-white md:sticky md:top-0 md:h-screen md:w-[248px] md:shrink-0 md:px-5">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#35c0aa] text-sm font-black text-[#102b38]">
          AQ
        </span>
        <span>
          <span className="block text-sm font-bold tracking-[0.16em]">AEROQUOTE</span>
          <span className="mt-1 block text-[11px] text-slate-400">OPERACIONES AÉREAS</span>
        </span>
      </Link>

      <div className="mt-9 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Organización</p>
        <p className="mt-1 truncate text-sm font-medium">{organization}</p>
      </div>

      <nav aria-label="Navegación principal" className="mt-8 space-y-1">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Espacio de trabajo</p>
        {visibleLinks.map((link) => {
          const active =
            pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active ? "bg-white/10 font-semibold text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className={`text-[10px] font-bold ${active ? "text-[#59d2bd]" : "text-slate-500"}`}>{link.marker}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {role === "ADMIN" && (
        <Link
          href="/settings"
          className={`mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
            pathname === "/settings" ? "bg-white/10 font-semibold text-white" : "text-slate-300 hover:bg-white/[0.06]"
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500">06</span>
          Configuración
        </Link>
      )}

      <div className="mt-auto border-t border-white/10 pt-5">
        <Link href="/account/password" className="mb-4 block px-2 text-xs font-medium text-slate-400 hover:text-white">
          Cambiar contraseña
        </Link>
        <div className="mb-4 flex min-w-0 items-center gap-3 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#263c57] text-xs font-semibold">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{name}</span>
            <span className="block truncate text-[11px] text-slate-400">{email}</span>
          </span>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
