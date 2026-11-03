import { getApiContext } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await getApiContext(undefined, { allowPasswordChange: true });
  if (result.error) return result.error;

  const [user, organization] = await Promise.all([
    prisma.user.findFirst({
      where: { id: result.context.userId, active: true },
      select: { mustChangePassword: true },
    }),
    prisma.organization.findUnique({
      where: { id: result.context.organizationId },
      select: { name: true },
    }),
  ]);
  if (!user || !organization) return Response.json({ error: "La sesión ya no tiene acceso activo." }, { status: 401 });
  return Response.json({
    id: result.context.userId,
    organization: organization.name,
    mustChangePassword: user.mustChangePassword,
  });
}
