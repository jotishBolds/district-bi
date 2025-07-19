/*
  Warnings:

  - The values [CITIZEN] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `citizenId` on the `applications` table. All the data in the column will be lost.
  - Added the required column `citizenAddress` to the `applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `citizenName` to the `applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `citizenPhone` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('FRONT_DESK', 'DC', 'ADC', 'RO', 'SDM', 'DYDIR', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'FRONT_DESK';
COMMIT;

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_citizenId_fkey";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "citizenId",
ADD COLUMN     "citizenAadhaar" TEXT,
ADD COLUMN     "citizenAddress" TEXT NOT NULL,
ADD COLUMN     "citizenEmail" TEXT,
ADD COLUMN     "citizenGender" TEXT,
ADD COLUMN     "citizenName" TEXT NOT NULL,
ADD COLUMN     "citizenPhone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'FRONT_DESK';

-- CreateTable
CREATE TABLE "frontdesk_officers" (
    "id" TEXT NOT NULL,
    "frontdeskUserId" TEXT NOT NULL,
    "officerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frontdesk_officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_tracking_otps" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "otpType" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_tracking_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "frontdesk_officers_frontdeskUserId_officerId_key" ON "frontdesk_officers"("frontdeskUserId", "officerId");

-- AddForeignKey
ALTER TABLE "frontdesk_officers" ADD CONSTRAINT "frontdesk_officers_frontdeskUserId_fkey" FOREIGN KEY ("frontdeskUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frontdesk_officers" ADD CONSTRAINT "frontdesk_officers_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "officer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
