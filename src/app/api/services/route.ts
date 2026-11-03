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
});

export async function GET() {
  const result = await getApiContext();
  if (result.error) return result.error;
  if (result.context.role === "OPERATOR") {
    return Response.json({ error: "No tienes permiso para consultar el catálogo." }, { status: 403 });
  }

  const services = await prisma.service.findMany({
    where: { organizationId: result.context.organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      unit: true,
      basePrice: true,
      quoteMode: true,
      active: true,
    },
  });
  return Response.json(services);
}

export async function POST(request: Request) {
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

  try {
    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        basePrice: new Prisma.Decimal(parsed.data.basePrice),
        description: parsed.data.description || null,
        organizationId: result.context.organizationId,
      },
      select: { id: true, name: true, category: true, basePrice: true, unit: true },
    });
    return Response.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return Response.json({ error: "Ya existe un servicio con ese nombre." }, { status: 409 });
    }
    throw error;
  }
}
