/*
  Warnings:

  - The values [REJECTED] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'PENDING', 'VALIDATED', 'IN_PROGRESS', 'APPROVED', 'CLOSED_WITH_ACTION', 'COMPLETED');
ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "applications" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING ("status"::text::"ApplicationStatus_new");
ALTER TABLE "application_workflow" ALTER COLUMN "fromStatus" TYPE "ApplicationStatus_new" USING ("fromStatus"::text::"ApplicationStatus_new");
ALTER TABLE "application_workflow" ALTER COLUMN "toStatus" TYPE "ApplicationStatus_new" USING ("toStatus"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "ApplicationStatus_old";
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;
