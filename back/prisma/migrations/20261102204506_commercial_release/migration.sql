-- CreateEnum
CREATE TYPE "ClientResponse" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'CHANGES_REQUESTED';

-- AlterTable
ALTER TABLE "OrganizationMembership" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "commercialNotes" TEXT,
ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryTime" TEXT,
ADD COLUMN     "exclusions" TEXT,
ADD COLUMN     "executionTime" TEXT,
ADD COLUMN     "paymentTerms" TEXT;

-- AlterTable
ALTER TABLE "QuoteHistory" ADD COLUMN     "actorLabel" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Backfill the gross subtotal; previous totals stored the net value after discounts.
UPDATE "Quote" SET "subtotal" = "subtotal" + "discount";

-- CreateTable
CREATE TABLE "QuoteVersion" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "response" "ClientResponse",
    "responseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_tokenHash_key" ON "QuoteVersion"("tokenHash");

-- CreateIndex
CREATE INDEX "QuoteVersion_quoteId_publishedAt_idx" ON "QuoteVersion"("quoteId", "publishedAt");

-- CreateIndex
CREATE INDEX "QuoteVersion_tokenExpiresAt_idx" ON "QuoteVersion"("tokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_quoteId_version_key" ON "QuoteVersion"("quoteId", "version");

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
