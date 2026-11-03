import { MemberRole } from "@prisma/client";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function getApiContext(
  allowedRoles?: MemberRole[],
  options: { allowPasswordChange?: boolean } = {},
) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurado en el backend.");
  const requestHeaders = await headers();
  const token = await getToken({
    req: new Request("http://localhost", { headers: requestHeaders }),
    secret,
    secureCookie: process.env.AUTH_URL?.startsWith("https://") ?? false,
  });
  const userId = token?.userId;
  const organizationId = token?.organizationId;
  const role = Object.values(MemberRole).find((candidate) => candidate === token?.role);
  if (typeof userId !== "string" || typeof organizationId !== "string" || !role) {
    return { error: Response.json({ error: "Debes iniciar sesión." }, { status: 401 }) };
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
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
      userId,
      organizationId,
      role: membership.role,
    },
  };
}

export function validationError(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
