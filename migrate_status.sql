-- CreateEnum
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'PENDING', 'VALIDATED', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED');

-- AlterTable - change column to text first and drop default
ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "applications" ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE "application_workflow" ALTER COLUMN "fromStatus" TYPE TEXT;
ALTER TABLE "application_workflow" ALTER COLUMN "toStatus" TYPE TEXT;

-- Migrate existing data
UPDATE "applications" SET status = 'OPEN' WHERE status = 'QUEUED';
UPDATE "applications" SET status = 'RESOLVED' WHERE status = 'APPROVED';
UPDATE "applications" SET status = 'CLOSED' WHERE status = 'CLOSED_WITH_ACTION';
UPDATE "applications" SET status = 'RESOLVED' WHERE status = 'COMPLETED';

-- Update workflow table
UPDATE "application_workflow" SET "fromStatus" = 'OPEN' WHERE "fromStatus" = 'QUEUED';
UPDATE "application_workflow" SET "toStatus" = 'OPEN' WHERE "toStatus" = 'QUEUED';
UPDATE "application_workflow" SET "fromStatus" = 'RESOLVED' WHERE "fromStatus" = 'APPROVED';
UPDATE "application_workflow" SET "toStatus" = 'RESOLVED' WHERE "toStatus" = 'APPROVED';
UPDATE "application_workflow" SET "fromStatus" = 'CLOSED' WHERE "fromStatus" = 'CLOSED_WITH_ACTION';
UPDATE "application_workflow" SET "toStatus" = 'CLOSED' WHERE "toStatus" = 'CLOSED_WITH_ACTION';
UPDATE "application_workflow" SET "fromStatus" = 'RESOLVED' WHERE "fromStatus" = 'COMPLETED';
UPDATE "application_workflow" SET "toStatus" = 'RESOLVED' WHERE "toStatus" = 'COMPLETED';

-- Convert back to enum
ALTER TABLE "applications" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING ("status"::"ApplicationStatus_new");
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "application_workflow" ALTER COLUMN "fromStatus" TYPE "ApplicationStatus_new" USING ("fromStatus"::"ApplicationStatus_new");
ALTER TABLE "application_workflow" ALTER COLUMN "toStatus" TYPE "ApplicationStatus_new" USING ("toStatus"::"ApplicationStatus_new");

-- DropEnum
DROP TYPE "ApplicationStatus";

-- RenameEnum
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
