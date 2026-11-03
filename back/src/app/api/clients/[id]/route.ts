import { MemberRole, Prisma } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(["INDIVIDUAL", "COMPANY"]),
  document: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getApiContext([MemberRole.ADMIN, MemberRole.COMMERCIAL]);
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const { id } = await params;

  try {
    const updated = await prisma.client.updateMany({
      where: { id, organizationId: result.context.organizationId },
      data: {
        ...parsed.data,
        document: parsed.data.document || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        notes: parsed.data.notes || null,
      },
    });
    if (updated.count !== 1) {
      return Response.json({ error: "No se encontró el cliente en esta organización." }, { status: 404 });
    }

    const client = await prisma.client.findFirst({
      where: { id, organizationId: result.context.organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        document: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        notes: true,
      },
    });
    return Response.json(client);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Ya existe otro cliente con ese documento." }, { status: 409 });
    }
    throw error;
  }
}
