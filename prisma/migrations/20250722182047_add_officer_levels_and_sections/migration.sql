-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'ADC_GTK';
ALTER TYPE "UserRole" ADD VALUE 'ADC_HQ';
ALTER TYPE "UserRole" ADD VALUE 'SDM_GTK';
ALTER TYPE "UserRole" ADD VALUE 'SDM_HQ';
ALTER TYPE "UserRole" ADD VALUE 'AC';
ALTER TYPE "UserRole" ADD VALUE 'DPO_DDMA';
ALTER TYPE "UserRole" ADD VALUE 'DD_REV';
ALTER TYPE "UserRole" ADD VALUE 'DD_ACQ';
ALTER TYPE "UserRole" ADD VALUE 'US_ADM';
ALTER TYPE "UserRole" ADD VALUE 'AO';
ALTER TYPE "UserRole" ADD VALUE 'TO_DDMA';
ALTER TYPE "UserRole" ADD VALUE 'AD_IT';
ALTER TYPE "UserRole" ADD VALUE 'US_ELECTION';
ALTER TYPE "UserRole" ADD VALUE 'OS_COI_RC';
ALTER TYPE "UserRole" ADD VALUE 'OS_RC';
ALTER TYPE "UserRole" ADD VALUE 'RI_LEGAL';

-- AlterTable
ALTER TABLE "officer_profiles" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level" INTEGER;

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sections_name_key" ON "sections"("name");

-- AddForeignKey
ALTER TABLE "officer_profiles" ADD CONSTRAINT "officer_profiles_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
