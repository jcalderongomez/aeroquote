import { ClientType, MemberRole } from "@prisma/client";
import { z } from "zod";
import { getApiContext, validationError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(ClientType),
  document: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function GET() {
  const result = await getApiContext();
  if (result.error) return result.error;
  if (result.context.role === "OPERATOR") {
    return Response.json({ error: "No tienes permiso para consultar clientes." }, { status: 403 });
  }

  const clients = await prisma.client.findMany({
    where: { organizationId: result.context.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      name: true,
      document: true,
      email: true,
      phone: true,
      city: true,
      createdAt: true,
      _count: { select: { quotes: true } },
    },
  });
  return Response.json(clients);
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

  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  try {
    const client = await prisma.client.create({
      data: {
        ...parsed.data,
        document: parsed.data.document || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        notes: parsed.data.notes || null,
        organizationId: result.context.organizationId,
      },
      select: { id: true, name: true, type: true, email: true, phone: true, createdAt: true },
    });
    return Response.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return Response.json({ error: "Ya existe un cliente con ese documento." }, { status: 409 });
    }
    throw error;
  }
}
