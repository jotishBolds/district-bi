/*
  Warnings:

  - You are about to drop the column `slaDays` on the `service_categories` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('PUBLIC', 'GOVERNMENT');

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_departmentId_fkey";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "applicationSource" "ApplicationSource" NOT NULL DEFAULT 'PUBLIC',
ALTER COLUMN "departmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "service_categories" DROP COLUMN "slaDays";

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
