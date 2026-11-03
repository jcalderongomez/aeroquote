import bcrypt from "bcryptjs";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

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
  if (!user || !organization) {
    return Response.json({ error: "No se encontró la cuenta o la organización." }, { status: 404 });
  }
  return Response.json({ mustChangePassword: user.mustChangePassword, organization: organization.name });
}

export async function PATCH(request: Request) {
  const result = await getApiContext(undefined, { allowPasswordChange: true });
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }

  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Contraseña inválida.");
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return validationError("La nueva contraseña debe ser diferente a la actual.");
  }

  const user = await prisma.user.findFirst({
    where: { id: result.context.userId, active: true },
    select: { passwordHash: true },
  });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return Response.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: result.context.userId },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.newPassword, 12),
      mustChangePassword: false,
    },
  });
  return Response.json({ changed: true });
}
