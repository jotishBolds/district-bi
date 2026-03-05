-- CreateEnum
CREATE TYPE "public"."SamadhanQueryType" AS ENUM ('FEEDBACK', 'GRIEVANCE', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "public"."SamadhanPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."SamadhanTicketStatus" AS ENUM ('UNSEEN', 'SEEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_INFORMATION', 'AWAITING_ESCALATION', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CLOSED_NO_RESPONSE', 'APPEAL_FILED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."SamadhanSubmissionChannel" AS ENUM ('WEB_PORTAL', 'WHATSAPP', 'MOBILE_APP');

-- CreateEnum
CREATE TYPE "public"."SamadhanInfoRequestStatus" AS ENUM ('PENDING', 'RESPONDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."samadhan_tickets" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "queryType" "public"."SamadhanQueryType" NOT NULL,
    "priority" "public"."SamadhanPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."SamadhanTicketStatus" NOT NULL DEFAULT 'UNSEEN',
    "citizenId" TEXT,
    "citizenName" TEXT,
    "citizenEmail" TEXT,
    "citizenPhone" TEXT,
    "citizenPseudonym" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymousToOfficer" BOOLEAN NOT NULL DEFAULT false,
    "sectionId" TEXT NOT NULL,
    "serviceAvailed" TEXT,
    "description" TEXT NOT NULL,
    "assignedOfficerId" TEXT,
    "escalatedToId" TEXT,
    "submissionChannel" "public"."SamadhanSubmissionChannel" NOT NULL DEFAULT 'WEB_PORTAL',
    "whatsappNumber" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaBreachedAt" TIMESTAMP(3),
    "resolutionMessage" TEXT,
    "isAppeal" BOOLEAN NOT NULL DEFAULT false,
    "originalTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samadhan_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."samadhan_attachments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "infoRequestId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "uploadedByType" TEXT NOT NULL DEFAULT 'CITIZEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "samadhan_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."samadhan_info_requests" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "documentTypes" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "public"."SamadhanInfoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "citizenResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samadhan_info_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."samadhan_status_history" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "public"."SamadhanTicketStatus",
    "toStatus" "public"."SamadhanTicketStatus" NOT NULL,
    "changedById" TEXT,
    "changeReason" TEXT,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "samadhan_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."samadhan_internal_notes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "samadhan_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."samadhan_sla_config" (
    "id" TEXT NOT NULL,
    "queryType" "public"."SamadhanQueryType" NOT NULL,
    "priority" "public"."SamadhanPriority" NOT NULL,
    "slaHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samadhan_sla_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."samadhan_daily_sequence" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samadhan_daily_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "samadhan_tickets_referenceId_key" ON "public"."samadhan_tickets"("referenceId");

-- CreateIndex
CREATE INDEX "samadhan_tickets_referenceId_idx" ON "public"."samadhan_tickets"("referenceId");

-- CreateIndex
CREATE INDEX "samadhan_tickets_citizenId_idx" ON "public"."samadhan_tickets"("citizenId");

-- CreateIndex
CREATE INDEX "samadhan_tickets_assignedOfficerId_idx" ON "public"."samadhan_tickets"("assignedOfficerId");

-- CreateIndex
CREATE INDEX "samadhan_tickets_status_idx" ON "public"."samadhan_tickets"("status");

-- CreateIndex
CREATE INDEX "samadhan_tickets_sectionId_idx" ON "public"."samadhan_tickets"("sectionId");

-- CreateIndex
CREATE INDEX "samadhan_tickets_createdAt_idx" ON "public"."samadhan_tickets"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "samadhan_sla_config_queryType_priority_key" ON "public"."samadhan_sla_config"("queryType", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "samadhan_daily_sequence_date_key" ON "public"."samadhan_daily_sequence"("date");

-- AddForeignKey
ALTER TABLE "public"."samadhan_tickets" ADD CONSTRAINT "samadhan_tickets_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_tickets" ADD CONSTRAINT "samadhan_tickets_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_tickets" ADD CONSTRAINT "samadhan_tickets_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_tickets" ADD CONSTRAINT "samadhan_tickets_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_tickets" ADD CONSTRAINT "samadhan_tickets_originalTicketId_fkey" FOREIGN KEY ("originalTicketId") REFERENCES "public"."samadhan_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_attachments" ADD CONSTRAINT "samadhan_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."samadhan_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_attachments" ADD CONSTRAINT "samadhan_attachments_infoRequestId_fkey" FOREIGN KEY ("infoRequestId") REFERENCES "public"."samadhan_info_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_attachments" ADD CONSTRAINT "samadhan_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_info_requests" ADD CONSTRAINT "samadhan_info_requests_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."samadhan_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_info_requests" ADD CONSTRAINT "samadhan_info_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_status_history" ADD CONSTRAINT "samadhan_status_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."samadhan_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_status_history" ADD CONSTRAINT "samadhan_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_internal_notes" ADD CONSTRAINT "samadhan_internal_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."samadhan_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."samadhan_internal_notes" ADD CONSTRAINT "samadhan_internal_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
