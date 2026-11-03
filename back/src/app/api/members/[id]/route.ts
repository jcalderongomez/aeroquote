import { MemberRole, Prisma } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateMemberSchema = z.object({
  role: z.enum(MemberRole),
  active: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getApiContext([MemberRole.ADMIN]);
  if (result.error) return result.error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const membership = await transaction.organizationMembership.findFirst({
        where: { id, organizationId: result.context.organizationId },
        select: { id: true, userId: true, role: true, active: true },
      });
      if (!membership) return { error: "No se encontró el usuario en esta organización.", status: 404 };
      if (membership.userId === result.context.userId && (!parsed.data.active || parsed.data.role !== MemberRole.ADMIN)) {
        return { error: "No puedes desactivar ni quitarte el rol de administrador.", status: 409 };
      }

      const removesAdmin = membership.active && membership.role === MemberRole.ADMIN &&
        (!parsed.data.active || parsed.data.role !== MemberRole.ADMIN);
      if (removesAdmin) {
        const activeAdmins = await transaction.organizationMembership.count({
          where: { organizationId: result.context.organizationId, active: true, role: MemberRole.ADMIN },
        });
        if (activeAdmins <= 1) {
          return { error: "La organización debe conservar al menos un administrador activo.", status: 409 };
        }
      }

      const changed = await transaction.organizationMembership.updateMany({
        where: { id, organizationId: result.context.organizationId, role: membership.role, active: membership.active },
        data: parsed.data,
      });
      if (changed.count !== 1) return { error: "El acceso cambió en otra operación. Actualiza e intenta de nuevo.", status: 409 };
      return { id, ...parsed.data };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ("error" in updated) return Response.json({ error: updated.error }, { status: updated.status });
    return Response.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return Response.json({ error: "El equipo cambió en otra operación. Actualiza e intenta de nuevo." }, { status: 409 });
    }
    throw error;
  }
}
