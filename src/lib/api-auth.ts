import type { MemberRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getApiContext(
  allowedRoles?: MemberRole[],
  options: { allowPasswordChange?: boolean } = {},
) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.organizationId || !user.role) {
    return { error: Response.json({ error: "Debes iniciar sesión." }, { status: 401 }) };
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: user.id,
      organizationId: user.organizationId,
      active: true,
      user: { active: true },
    },
    select: { role: true, user: { select: { mustChangePassword: true } } },
  });
  if (!membership) {
    return { error: Response.json({ error: "Tu acceso a esta organización ya no está activo." }, { status: 401 }) };
  }
  if (membership.user.mustChangePassword && !options.allowPasswordChange) {
    return {
      error: Response.json(
        { error: "Debes cambiar tu contraseña antes de continuar.", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 },
      ),
    };
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    return { error: Response.json({ error: "No tienes permiso para esta acción." }, { status: 403 }) };
  }

  return {
    context: {
      userId: user.id,
      organizationId: user.organizationId,
      role: membership.role,
    },
  };
}

export function validationError(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
