/*
  Warnings:

  - The values [ADC_GTK,ADC_HQ,SDM_GTK,SDM_HQ,AC,DPO_DDMA,DD_REV,DD_ACQ,US_ADM,AO,TO_DDMA,AD_IT,US_ELECTION,OS_COI_RC,OS_RC,RI_LEGAL] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `level` on the `officer_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `section` on the `officer_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `shortDesignation` on the `officer_profiles` table. All the data in the column will be lost.

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

-- AlterTable
ALTER TABLE "officer_profiles" DROP COLUMN "level",
DROP COLUMN "section",
DROP COLUMN "shortDesignation";
