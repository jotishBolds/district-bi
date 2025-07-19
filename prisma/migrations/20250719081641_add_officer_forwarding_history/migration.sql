-- CreateTable
CREATE TABLE "officer_forwarding_history" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromOfficerId" TEXT NOT NULL,
    "toOfficerId" TEXT NOT NULL,
    "instructions" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officer_forwarding_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "officer_forwarding_history" ADD CONSTRAINT "officer_forwarding_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_forwarding_history" ADD CONSTRAINT "officer_forwarding_history_fromOfficerId_fkey" FOREIGN KEY ("fromOfficerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_forwarding_history" ADD CONSTRAINT "officer_forwarding_history_toOfficerId_fkey" FOREIGN KEY ("toOfficerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
