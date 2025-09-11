/*
  Warnings:

  - You are about to drop the column `citizenAadhaar` on the `applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."applications" DROP COLUMN "citizenAadhaar",
ADD COLUMN     "citizenAlternateNumber" TEXT;
