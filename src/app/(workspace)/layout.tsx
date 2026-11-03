import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorkspaceNav } from "@/components/workspace-nav";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) redirect("/login");

  const [organization, user] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { name: true },
    }),
    prisma.user.findFirst({
      where: {
        id: session.user.id,
        active: true,
        memberships: { some: { organizationId: session.user.organizationId, active: true } },
      },
      select: { mustChangePassword: true },
    }),
  ]);
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/account/password");
  if (!organization) redirect("/login");

  return (
    <div className="min-h-screen md:flex">
      <WorkspaceNav
        name={session.user.name ?? "Usuario"}
        email={session.user.email ?? ""}
        role={session.user.role}
        organization={organization.name}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}
