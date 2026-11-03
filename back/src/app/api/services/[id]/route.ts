import { MemberRole, Prisma, QuoteMode } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(40),
  basePrice: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "El precio debe ser un importe válido con hasta dos decimales."),
  quoteMode: z.enum(QuoteMode),
  active: z.boolean(),
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

  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const { id } = await params;

  try {
    const updated = await prisma.service.updateMany({
      where: { id, organizationId: result.context.organizationId },
      data: {
        ...parsed.data,
        basePrice: new Prisma.Decimal(parsed.data.basePrice),
        description: parsed.data.description || null,
      },
    });

    if (updated.count !== 1) {
      return Response.json({ error: "No se encontró el servicio en esta organización." }, { status: 404 });
    }

    const service = await prisma.service.findFirst({
      where: { id, organizationId: result.context.organizationId },
      select: { id: true, name: true, category: true, unit: true, basePrice: true, active: true },
    });
    return Response.json(service);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Ya existe otro servicio con ese nombre." }, { status: 409 });
    }
    throw error;
  }
}
