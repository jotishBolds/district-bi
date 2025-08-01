/*
  Warnings:

  - Added the required column `departmentId` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DISPATCH_HANDLER';

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- Insert default departments
INSERT INTO "departments" ("id", "name", "description", "updatedAt") VALUES 
  (gen_random_uuid(), 'Government Department', 'Government related applications', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Private Department', 'Private sector applications', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'General Department', 'General purpose applications', CURRENT_TIMESTAMP);

-- AlterTable - Add columns with default values for existing records
ALTER TABLE "applications" 
ADD COLUMN "departmentId" TEXT,
ADD COLUMN "dispatchedAt" TIMESTAMP(3),
ADD COLUMN "dispatchedById" TEXT,
ADD COLUMN "isDispatched" BOOLEAN NOT NULL DEFAULT false;

-- Update existing applications to use Government Department as default
UPDATE "applications" 
SET "departmentId" = (SELECT "id" FROM "departments" WHERE "name" = 'Government Department' LIMIT 1)
WHERE "departmentId" IS NULL;

-- Now make departmentId NOT NULL
ALTER TABLE "applications" ALTER COLUMN "departmentId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
