import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const nullableText = z.string().nullable();

const proposalSnapshotSchema = z.object({
  quoteNumber: z.number().int().positive(),
  version: z.number().int().positive(),
  title: z.string(),
  description: nullableText,
  location: nullableText,
  executionTime: nullableText,
  deliveryTime: nullableText,
  paymentTerms: nullableText,
  exclusions: nullableText,
  commercialNotes: nullableText,
  currency: z.string().length(3),
  subtotal: z.string(),
  discount: z.string(),
  taxRate: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  validUntil: nullableText,
  publishedAt: z.string(),
  company: z.object({
    name: z.string(),
    taxId: nullableText,
    email: nullableText,
    phone: nullableText,
    address: nullableText,
    city: nullableText,
  }),
  client: z.object({ name: z.string(), email: nullableText }),
  items: z.array(z.object({
    description: z.string(),
    unit: z.string(),
    quantity: z.string(),
    unitPrice: z.string(),
    discount: z.string(),
    lineTotal: z.string(),
  })),
});

export type ProposalSnapshot = z.infer<typeof proposalSnapshotSchema>;

export function hashProposalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseProposalSnapshot(value: Prisma.JsonValue): ProposalSnapshot {
  const parsed = proposalSnapshotSchema.safeParse(value);
  if (!parsed.success) throw new Error("La versión pública de la propuesta tiene datos inválidos.");
  return parsed.data;
}

export async function getProposalByToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const version = await prisma.quoteVersion.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: {
      quote: { select: { status: true, currentVersion: true } },
    },
  });
  if (!version || version.tokenExpiresAt <= new Date()) return null;
  return {
    version,
    snapshot: parseProposalSnapshot(version.snapshot),
    isCurrent: version.version === version.quote.currentVersion,
    quoteStatus: version.quote.status,
  };
}
