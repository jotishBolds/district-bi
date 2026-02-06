// SAMADHAN Appeal API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateSamadhanReferenceId,
  calculateSLADeadline,
  findAvailableOfficer,
} from "@/lib/samadhan";

const appealSchema = z.object({
  reason: z.string().min(20, "Appeal reason must be at least 20 characters"),
});

type RouteParams = { params: Promise<{ ticketId: string }> };

// Helper function to find ticket by ID or referenceId
async function findTicket(ticketIdOrRef: string) {
  // First try by UUID
  let ticket = await prisma.samadhanTicket.findUnique({
    where: { id: ticketIdOrRef },
  });

  // If not found, try by referenceId
  if (!ticket) {
    ticket = await prisma.samadhanTicket.findUnique({
      where: { referenceId: ticketIdOrRef },
    });
  }

  return ticket;
}

// POST - File appeal
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;

    const body = await request.json();
    const validatedData = appealSchema.parse(body);

    // Get original ticket by ID or referenceId WITH assigned officer info and status history
    const originalTicket = await prisma.samadhanTicket.findFirst({
      where: {
        OR: [{ id: ticketId }, { referenceId: ticketId }],
      },
      include: {
        assignedOfficer: {
          select: {
            id: true,
            role: true,
            officerProfile: { select: { fullName: true, designation: true } },
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                officerProfile: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" as const },
        },
      },
    });

    if (!originalTicket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    // Feedback tickets cannot be appealed
    if (originalTicket.queryType === "FEEDBACK") {
      return NextResponse.json(
        { success: false, message: "Feedback submissions cannot be appealed" },
        { status: 400 },
      );
    }

    // Check if ticket is closed
    if (!["CLOSED", "RESOLVED"].includes(originalTicket.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Can only appeal closed or resolved tickets",
        },
        { status: 400 },
      );
    }

    // Check appeal window (7 days)
    const closedAt = originalTicket.closedAt || originalTicket.resolvedAt;
    if (closedAt) {
      const appealDeadline = new Date(closedAt);
      appealDeadline.setDate(appealDeadline.getDate() + 7);

      if (new Date() > appealDeadline) {
        return NextResponse.json(
          {
            success: false,
            message: "Appeal window has expired (7 days from closure)",
          },
          { status: 400 },
        );
      }
    }

    // Check for existing appeal
    const existingAppeal = await prisma.samadhanTicket.findFirst({
      where: {
        originalTicketId: originalTicket.id,
        isAppeal: true,
      },
    });

    if (existingAppeal) {
      return NextResponse.json(
        {
          success: false,
          message: "An appeal has already been filed for this ticket",
        },
        { status: 400 },
      );
    }

    // Generate new reference ID
    const referenceId = await generateSamadhanReferenceId();

    // SLA will be calculated when the ticket is viewed (UNSEEN → SEEN)
    // Not calculating SLA deadline here as it should start only when officer views the ticket

    // Find higher authority officer - prioritize DC, then ADC, then ADMIN/SUPER_ADMIN
    let escalationOfficer = await prisma.user.findFirst({
      where: {
        role: "DC",
        isActive: true,
        officerProfile: { isAvailable: true },
      },
      include: { officerProfile: true },
    });

    if (!escalationOfficer) {
      escalationOfficer = await prisma.user.findFirst({
        where: {
          role: "ADC",
          isActive: true,
          officerProfile: { isAvailable: true },
        },
        include: { officerProfile: true },
      });
    }

    if (!escalationOfficer) {
      escalationOfficer = await prisma.user.findFirst({
        where: {
          role: { in: ["ADMIN", "SUPER_ADMIN"] },
          isActive: true,
        },
        include: { officerProfile: true },
      });
    }

    // If still no officer found, assign to any available officer in the same section
    if (!escalationOfficer) {
      escalationOfficer = await findAvailableOfficer(originalTicket.sectionId)
        .then(async (officerId) => {
          if (officerId) {
            return await prisma.user.findUnique({
              where: { id: officerId },
              include: { officerProfile: true },
            });
          }
          return null;
        })
        .catch(() => null);
    }

    // Create appeal ticket - assigned to DC/higher authority
    // Status is UNSEEN so SLA starts when DC views it
    const appealTicket = await prisma.samadhanTicket.create({
      data: {
        referenceId,
        queryType: "GRIEVANCE",
        priority: "HIGH",
        status: "UNSEEN", // Appeal ticket starts as UNSEEN for DC
        citizenId: originalTicket.citizenId,
        citizenName: originalTicket.citizenName,
        citizenEmail: originalTicket.citizenEmail,
        citizenPhone: originalTicket.citizenPhone,
        citizenPseudonym: originalTicket.citizenPseudonym,
        isAnonymous: originalTicket.isAnonymous,
        isAnonymousToOfficer: originalTicket.isAnonymousToOfficer,
        sectionId: originalTicket.sectionId,
        serviceAvailed: originalTicket.serviceAvailed,
        description: `APPEAL for Ticket ${originalTicket.referenceId}\n\nOriginal Description:\n${originalTicket.description}\n\nAppeal Reason:\n${validatedData.reason}`,
        assignedOfficerId: escalationOfficer?.id || null, // Assigned to DC/ADC/ADMIN
        slaDeadline: null, // Will be set when DC views the ticket
        submissionChannel: originalTicket.submissionChannel,
        isAppeal: true,
        originalTicketId: originalTicket.id,
      },
    });

    // Update original ticket status to APPEALED (not UNSEEN)
    // This means the assigned officer sees it as "Appealed" - forwarded to higher authority
    await prisma.samadhanTicket.update({
      where: { id: originalTicket.id },
      data: { status: "APPEALED" },
    });

    // Create status history for original ticket
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: originalTicket.id,
        fromStatus: originalTicket.status,
        toStatus: "APPEALED",
        isSystemGenerated: true,
        changeReason: `Citizen filed appeal - Forwarded to ${
          escalationOfficer?.officerProfile?.fullName || "Higher Authority"
        } (${
          escalationOfficer?.role || "DC/ADC"
        }) - New ticket: ${referenceId}`,
      },
    });

    // Copy original ticket's status history to appeal ticket (preserving the complete history)
    // This ensures DC and citizen can see the full journey of the ticket
    const originalOfficerName =
      originalTicket.assignedOfficer?.officerProfile?.fullName ||
      "Unknown Officer";
    const originalOfficerDesignation =
      originalTicket.assignedOfficer?.officerProfile?.designation ||
      originalTicket.assignedOfficer?.role ||
      "";

    // First create a history entry showing the original ticket's history context
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: appealTicket.id,
        toStatus: "UNSEEN",
        isSystemGenerated: true,
        changeReason: `--- ORIGINAL TICKET HISTORY (${
          originalTicket.referenceId
        }) ---\nOriginally assigned to: ${originalOfficerName}${
          originalOfficerDesignation ? ` (${originalOfficerDesignation})` : ""
        }`,
        createdAt: new Date(Date.now() - 2000), // Slightly earlier to appear first
      },
    });

    // Copy each original status history entry to the appeal ticket
    for (const history of originalTicket.statusHistory) {
      await prisma.samadhanStatusHistory.create({
        data: {
          ticketId: appealTicket.id,
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          changeReason: `[Original Ticket] ${
            history.changeReason || "Status changed"
          }`,
          isSystemGenerated: true,
          createdAt: new Date(history.createdAt.getTime() - 1000), // Slightly earlier timestamp
        },
      });
    }

    // Create the appeal ticket's own status history entry (newest)
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: appealTicket.id,
        toStatus: "UNSEEN",
        isSystemGenerated: true,
        changeReason: `--- APPEAL FILED ---\nAppeal ticket created for ${
          originalTicket.referenceId
        }\nPrevious Officer: ${originalOfficerName}${
          originalOfficerDesignation ? ` (${originalOfficerDesignation})` : ""
        }\nNow assigned to: ${
          escalationOfficer?.officerProfile?.fullName || "Higher Authority"
        } (${escalationOfficer?.role || "DC/ADC"})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Appeal filed successfully and forwarded to higher authority",
      data: {
        referenceId: appealTicket.referenceId,
        appealTicketId: appealTicket.id,
        originalTicketId: ticketId,
        originalTicketReferenceId: originalTicket.referenceId,
        assignedTo: escalationOfficer
          ? {
              name: escalationOfficer.officerProfile?.fullName,
              role: escalationOfficer.role,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Appeal filing error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to file appeal" },
      { status: 500 },
    );
  }
}
