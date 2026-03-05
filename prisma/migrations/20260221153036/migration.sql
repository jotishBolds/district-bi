-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SamadhanTicketStatus" ADD VALUE 'DRAFT';
ALTER TYPE "SamadhanTicketStatus" ADD VALUE 'QUEUED';
ALTER TYPE "SamadhanTicketStatus" ADD VALUE 'APPEALED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CITIZEN';

-- AlterTable
ALTER TABLE "citizen_profiles" ADD COLUMN     "samadhanPseudonym" TEXT;

-- AlterTable
ALTER TABLE "samadhan_tickets" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSavedAt" TIMESTAMP(3),
ADD COLUMN     "queuedAt" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "visitDate" TIMESTAMP(3),
ADD COLUMN     "visitedDC" BOOLEAN,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "samadhan_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sectionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samadhan_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samadhan_service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samadhan_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "samadhan_services_name_sectionId_key" ON "samadhan_services"("name", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "samadhan_service_categories_name_serviceId_key" ON "samadhan_service_categories"("name", "serviceId");

-- AddForeignKey
ALTER TABLE "samadhan_services" ADD CONSTRAINT "samadhan_services_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samadhan_service_categories" ADD CONSTRAINT "samadhan_service_categories_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "samadhan_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samadhan_tickets" ADD CONSTRAINT "samadhan_tickets_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
