import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TeamManager } from "@/components/team-manager";
import { fetchBackend } from "@/lib/backend-api";
import { MemberRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== MemberRole.ADMIN) redirect("/dashboard");

  const members = await fetchBackend<Array<{
    id: string;
    role: MemberRole;
    active: boolean;
    user: { id: string; name: string; email: string; mustChangePassword: boolean };
  }>>("/api/members");

  return (
    <div className="mx-auto max-w-[1000px]">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2874d0]">Administración</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172338]">Equipo</h1>
        <p className="mt-2 text-sm text-slate-500">Administra accesos de esta organización y asigna roles.</p>
      </header>
      <TeamManager members={members} currentUserId={session.user.id} />
    </div>
  );
}
