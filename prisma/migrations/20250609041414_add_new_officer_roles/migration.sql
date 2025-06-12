-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'ADC_HQ';
ALTER TYPE "UserRole" ADD VALUE 'ADC_GANGTOK';
ALTER TYPE "UserRole" ADD VALUE 'SDM_HQ';
ALTER TYPE "UserRole" ADD VALUE 'SDM_GANGTOK';
ALTER TYPE "UserRole" ADD VALUE 'DYDIR_REVENUE';
