-- CreateTable
CREATE TABLE "frontdesk_forwardings" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromFrontdeskId" TEXT NOT NULL,
    "toFrontdeskId" TEXT NOT NULL,
    "fromOfficerId" TEXT NOT NULL,
    "toOfficerId" TEXT NOT NULL,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frontdesk_forwardings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "frontdesk_forwardings" ADD CONSTRAINT "frontdesk_forwardings_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frontdesk_forwardings" ADD CONSTRAINT "frontdesk_forwardings_fromFrontdeskId_fkey" FOREIGN KEY ("fromFrontdeskId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frontdesk_forwardings" ADD CONSTRAINT "frontdesk_forwardings_toFrontdeskId_fkey" FOREIGN KEY ("toFrontdeskId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
