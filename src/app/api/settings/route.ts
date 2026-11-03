import { MemberRole } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  taxRate: z.string().regex(/^\d{1,3}(?:\.\d{1,2})?$/, "El impuesto debe tener hasta dos decimales.").transform(Number).pipe(z.number().max(100)),
  quoteValidityDays: z.string().regex(/^\d{1,3}$/, "La vigencia debe ser un número entero de días.").transform(Number).pipe(z.number().int().min(1).max(365)),
});

export async function GET() {
  const result = await getApiContext([MemberRole.ADMIN]);
  if (result.error) return result.error;

  const settings = await prisma.companySettings.findUnique({
    where: { organizationId: result.context.organizationId },
    select: { currency: true, taxRate: true, quoteValidityDays: true },
  });
  if (!settings) return Response.json({ error: "La configuración de la empresa no está inicializada." }, { status: 404 });
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  const result = await getApiContext([MemberRole.ADMIN]);
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("El cuerpo de la solicitud debe ser JSON válido.");
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const settings = await prisma.companySettings.upsert({
    where: { organizationId: result.context.organizationId },
    update: parsed.data,
    create: { organizationId: result.context.organizationId, ...parsed.data },
    select: { currency: true, taxRate: true, quoteValidityDays: true },
  });
  return Response.json(settings);
}
