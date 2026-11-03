import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const required = ["DATABASE_URL", "INITIAL_ADMIN_EMAIL", "INITIAL_ADMIN_PASSWORD", "ORGANIZATION_NAME"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

if (process.env.INITIAL_ADMIN_PASSWORD.length < 12) {
  throw new Error("INITIAL_ADMIN_PASSWORD must contain at least 12 characters.");
}

const prisma = new PrismaClient();
const email = process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
const slug =
  process.env.ORGANIZATION_SLUG?.trim() ||
  process.env.ORGANIZATION_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

try {
  const passwordHash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, 12);
  const organization = await prisma.organization.upsert({
    where: { slug },
    update: { name: process.env.ORGANIZATION_NAME.trim() },
    create: { name: process.env.ORGANIZATION_NAME.trim(), slug },
  });
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.INITIAL_ADMIN_NAME?.trim() || "Administrador",
    },
    create: {
      name: process.env.INITIAL_ADMIN_NAME?.trim() || "Administrador",
      email,
      passwordHash,
      mustChangePassword: true,
    },
  });

  await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { role: "ADMIN" },
    create: { organizationId: organization.id, userId: user.id, role: "ADMIN" },
  });
  await prisma.companySettings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: { organizationId: organization.id },
  });
  await prisma.quoteCounter.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: { organizationId: organization.id, nextNumber: 1 },
  });
} finally {
  await prisma.$disconnect();
}
