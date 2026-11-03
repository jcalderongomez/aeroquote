import { MemberRole } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  taxId: z.string().trim().max(40),
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(200),
  city: z.string().trim().max(100),
});

export async function PATCH(request: Request) {
  const result = await getApiContext([MemberRole.ADMIN]);
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }

  const parsed = organizationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const updated = await prisma.organization.updateMany({
    where: { id: result.context.organizationId },
    data: {
      ...parsed.data,
      taxId: parsed.data.taxId || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
    },
  });
  if (updated.count !== 1) return Response.json({ error: "No se encontró la organización." }, { status: 404 });

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: result.context.organizationId },
    select: { id: true, name: true, taxId: true, email: true, phone: true, address: true, city: true },
  });
  return Response.json(organization);
}
