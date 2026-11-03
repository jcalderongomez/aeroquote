import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { WorkspaceNav } from "@/components/workspace-nav";
import { fetchBackend } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) redirect("/login");

  const account = await fetchBackend<{
    organization: string;
    mustChangePassword: boolean;
  }>("/api/session");
  if (account.mustChangePassword) redirect("/account/password");

  return (
    <div className="min-h-screen md:flex">
      <WorkspaceNav
        name={session.user.name ?? "Usuario"}
        email={session.user.email ?? ""}
        role={session.user.role}
        organization={account.organization}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}
