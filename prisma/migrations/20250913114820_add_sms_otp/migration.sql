-- CreateTable
CREATE TABLE "public"."sms_otps" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerResponse" TEXT,
    "type" TEXT NOT NULL DEFAULT 'VERIFICATION',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_otps_pkey" PRIMARY KEY ("id")
);
