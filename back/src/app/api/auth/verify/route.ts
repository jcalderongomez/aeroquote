import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Credenciales inválidas." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: {
      memberships: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
  if (!user?.active || user.memberships.length === 0) {
    return Response.json({ error: "Credenciales inválidas." }, { status: 401 });
  }
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return Response.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  const membership = user.memberships[0];
  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    organizationId: membership.organizationId,
    role: membership.role,
  });
}
