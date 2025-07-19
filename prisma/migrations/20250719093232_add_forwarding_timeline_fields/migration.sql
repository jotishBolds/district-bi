-- AlterTable
ALTER TABLE "officer_forwarding_history" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "forwardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
