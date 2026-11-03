import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { MemberRole, Prisma } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((email) => email.trim().toLowerCase()),
  role: z.enum(MemberRole),
});

export async function GET() {
  const result = await getApiContext([MemberRole.ADMIN]);
  if (result.error) return result.error;

  const members = await prisma.organizationMembership.findMany({
    where: { organizationId: result.context.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      active: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, mustChangePassword: true } },
    },
  });
  return Response.json(members);
}

export async function POST(request: Request) {
  const result = await getApiContext([MemberRole.ADMIN]);
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const temporaryPassword = randomBytes(18).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  try {
    const membership = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          mustChangePassword: true,
        },
        select: { id: true, name: true, email: true },
      });
      return transaction.organizationMembership.create({
        data: {
          organizationId: result.context.organizationId,
          userId: user.id,
          role: parsed.data.role,
        },
        select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
      });
    });

    return Response.json({ ...membership, temporaryPassword }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json(
        { error: "Ese correo ya tiene una cuenta. En esta versión no se pueden vincular cuentas existentes a otra organización." },
        { status: 409 },
      );
    }
    throw error;
  }
}
