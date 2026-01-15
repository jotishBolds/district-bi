// SAMADHAN Ticket Detail and Officer Actions API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  canOfficerEditTicket,
  getSLAStatus,
  maskEmail,
  maskPhoneNumber,
} from "@/lib/samadhan";

// Higher authority roles that can intervene on appealed, overdue, SLA breached tickets
const HIGHER_AUTHORITY_ROLES = [
  "DC",
  "ADC",
  "ADC_GTK",
  "ADC_HQ",
  "SDM",
  "SDM_GTK",
  "SDM_HQ",
  "ADMIN",
  "SUPER_ADMIN",
];

// Schema for status update
const statusUpdateSchema = z.object({
  status: z.enum([
    "SEEN",
    "ACKNOWLEDGED",
    "IN_PROGRESS",
    "PENDING_INFORMATION",
    "AWAITING_ESCALATION",
    "RESOLVED",
    "CLOSED",
  ]),
  message: z.string().optional(),
  resolutionMessage: z.string().min(100).optional(),
});

// Schema for internal note
const internalNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

type RouteParams = { params: Promise<{ ticketId: string }> };

// Helper function to find ticket by ID or referenceId
async function findTicketWithIncludes(ticketIdOrRef: string) {
  const includeOptions = {
    section: { select: { id: true, name: true } },
    citizen: {
      select: {
        id: true,
        email: true,
        citizenProfile: { select: { fullName: true, phone: true } },
      },
    },
    assignedOfficer: {
      select: {
        id: true,
        officerProfile: { select: { fullName: true, designation: true } },
      },
    },
    escalatedTo: {
      select: {
        id: true,
        officerProfile: { select: { fullName: true, designation: true } },
      },
    },
    attachments: {
      select: {
        id: true,
        fileName: true,
        originalName: true,
        filePath: true,
        fileType: true,
        fileSize: true,
        uploadedByType: true,
        createdAt: true,
      },
    },
    infoRequests: {
      include: {
        attachments: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" as const },
    },
    statusHistory: {
      include: {
        changedBy: {
          select: {
            officerProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" as const },
    },
    internalNotes: {
      include: {
        createdBy: {
          select: {
            officerProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" as const },
    },
  };

  // First try by UUID
  let ticket = await prisma.samadhanTicket.findUnique({
    where: { id: ticketIdOrRef },
    include: includeOptions,
  });

  // If not found, try by referenceId
  if (!ticket) {
    ticket = await prisma.samadhanTicket.findUnique({
      where: { referenceId: ticketIdOrRef },
      include: includeOptions,
    });
  }

  return ticket;
}

// GET - Get ticket details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const ticket = await findTicketWithIncludes(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Determine access level
    const isOfficer = session?.user?.role && session.user.role !== "FRONT_DESK";
    const isAdmin =
      session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
    const isDC = session?.user?.role === "DC";
    const canViewRealCitizenInfo = isAdmin || isDC; // Admin and DC can see real citizen info even if anonymous
    const isAssignedOfficer = session?.user?.id === ticket.assignedOfficerId;
    const isCitizen = session?.user?.id === ticket.citizenId;

    // Build response based on access level
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let citizenInfo: Record<string, unknown> | null = null;

    if (canViewRealCitizenInfo) {
      // Admin and DC see everything including real identity
      citizenInfo = {
        name: ticket.citizenName || ticket.citizen?.citizenProfile?.fullName,
        email: ticket.citizenEmail || ticket.citizen?.email,
        phone: ticket.citizenPhone || ticket.citizen?.citizenProfile?.phone,
        pseudonym: ticket.citizenPseudonym,
        isAnonymous: ticket.isAnonymous,
        isAnonymousToOfficer: ticket.isAnonymousToOfficer,
      };
    } else if (isOfficer && !ticket.isAnonymousToOfficer) {
      // Officer sees real info if not anonymous
      citizenInfo = {
        name: ticket.citizenName || ticket.citizen?.citizenProfile?.fullName,
        email: ticket.citizenEmail || ticket.citizen?.email,
        phone: ticket.citizenPhone || ticket.citizen?.citizenProfile?.phone,
      };
    } else if (isOfficer && ticket.isAnonymousToOfficer) {
      // Officer sees masked info if anonymous to officer
      citizenInfo = {
        name: ticket.citizenPseudonym || "Anonymous Citizen",
        email: ticket.citizenEmail ? maskEmail(ticket.citizenEmail) : null,
        phone: ticket.citizenPhone
          ? maskPhoneNumber(ticket.citizenPhone)
          : null,
      };
    } else if (isCitizen) {
      // Citizen sees their own info
      citizenInfo = {
        name: ticket.citizenName,
        email: ticket.citizenEmail,
        phone: ticket.citizenPhone,
      };
    }

    // Auto-change UNSEEN tickets to SEEN when viewed by authorized officer
    // Only applies to UNSEEN tickets - APPEALED tickets stay as APPEALED (viewable but not editable by original officer)
    const officerRoles = [
      "DC",
      "ADC",
      "RO",
      "SDM",
      "DYDIR",
      "ADMIN",
      "SUPER_ADMIN",
      "ADC_GTK",
      "ADC_HQ",
      "SDM_GTK",
      "SDM_HQ",
      "AC",
      "DPO_DDMA",
      "DD_REV",
      "DD_ACQ",
      "US_ADM",
      "AO",
      "TO_DDMA",
      "AD_IT",
      "US_ELECTION",
      "OS_COI_RC",
      "OS_RC",
      "RI_LEGAL",
    ];

    const canTriggerAutoSeen =
      isAssignedOfficer ||
      isAdmin ||
      (session?.user?.role && officerRoles.includes(session.user.role)) ||
      session?.user?.role === "DC" ||
      session?.user?.role === "ADC";

    // Only trigger auto-seen for UNSEEN status (not for APPEALED or APPEAL_FILED)
    if (ticket.status === "UNSEEN" && canTriggerAutoSeen && session?.user?.id) {
      try {
        // Calculate SLA deadline when ticket is first viewed
        const { calculateSLADeadline } = await import("@/lib/samadhan");
        const slaDeadline =
          ticket.slaDeadline ||
          (await calculateSLADeadline(ticket.queryType, ticket.priority));

        // Update ticket to SEEN status with SLA
        await prisma.samadhanTicket.update({
          where: { id: ticket.id },
          data: {
            status: "SEEN",
            slaDeadline,
            seenAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create status history
        await prisma.samadhanStatusHistory.create({
          data: {
            ticketId: ticket.id,
            fromStatus: "UNSEEN",
            toStatus: "SEEN",
            changedById: session.user.id,
            changeReason: "Ticket viewed by officer - Auto-marked as SEEN",
            isSystemGenerated: true,
          },
        });

        // Update local ticket object for this response
        ticket.status = "SEEN";
        ticket.slaDeadline = slaDeadline;
        ticket.seenAt = new Date();
      } catch (error) {
        console.error("Error in auto-SEEN process:", error);
      }
    }

    const slaStatus = getSLAStatus(ticket.slaDeadline, ticket.status);
    const isEscalatedOfficer = session?.user?.id === ticket.escalatedToId;

    // Check for higher authority access
    const isHigherAuthority = HIGHER_AUTHORITY_ROLES.includes(
      session?.user?.role || ""
    );
    const isSlaBreached = !!ticket.slaBreachedAt;
    const isOverdue =
      ticket.slaDeadline &&
      new Date(ticket.slaDeadline) < new Date() &&
      !["RESOLVED", "CLOSED", "CLOSED_NO_RESPONSE"].includes(ticket.status);
    const isAppealed = ["APPEALED", "APPEAL_FILED"].includes(ticket.status);
    const isEscalated = !!ticket.escalatedToId;

    // Determine if this officer can edit the ticket
    // Higher authorities (DC, ADC, SDM, ADMIN) can take action on:
    // - Appealed tickets (original officer cannot)
    // - SLA breached tickets
    // - Overdue tickets
    // - Escalated tickets
    // Regular officers can only edit their own assigned/escalated tickets in editable statuses

    let canEdit = false;

    if (isHigherAuthority) {
      // Higher authorities can edit almost any active ticket
      // They can intervene on appealed, overdue, SLA breached, escalated tickets
      // BUT NOT QUEUED tickets - those should only be assigned from the queue page
      const isClosedStatus = [
        "CLOSED",
        "RESOLVED",
        "CLOSED_NO_RESPONSE",
      ].includes(ticket.status);
      const isQueuedStatus = ticket.status === "QUEUED";
      canEdit = !isClosedStatus && !isQueuedStatus; // Can edit any non-closed, non-queued ticket
    } else if (isAssignedOfficer || isEscalatedOfficer) {
      // Regular officers can edit if:
      // - They are assigned or escalated to them
      // - The ticket is in an editable status
      // - The ticket is NOT appealed (appealed tickets go to higher authority)
      // - The ticket is NOT escalated to someone else (for assigned officer)
      const isLockedByEscalation = isEscalated && !isEscalatedOfficer;
      canEdit =
        canOfficerEditTicket(ticket.status, isLockedByEscalation) &&
        !isAppealed;
    }

    // Resolve service UUIDs to names - handle both new format and old format
    let resolvedServiceNames: string | null = null;
    let resolvedCategoryNames: string | null = null;

    if (ticket.serviceAvailed) {
      try {
        const parsed = JSON.parse(ticket.serviceAvailed);

        // Check if it's the new format with serviceId and categoryIds
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          // New format: { serviceId, categoryIds }
          if (parsed.serviceId) {
            const service = await prisma.samadhanService.findUnique({
              where: { id: parsed.serviceId },
              select: { name: true },
            });
            resolvedServiceNames = service?.name || null;
          }

          if (
            parsed.categoryIds &&
            Array.isArray(parsed.categoryIds) &&
            parsed.categoryIds.length > 0
          ) {
            const categories = await prisma.samadhanServiceCategory.findMany({
              where: { id: { in: parsed.categoryIds } },
              select: { name: true },
            });
            resolvedCategoryNames = categories.map((c) => c.name).join(", ");
          }
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          // Old format: array of IDs (could be service IDs)
          const services = await prisma.samadhanService.findMany({
            where: { id: { in: parsed } },
            select: { name: true },
          });
          if (services.length > 0) {
            resolvedServiceNames = services.map((s) => s.name).join(", ");
          } else {
            // Try as category IDs
            const categories = await prisma.samadhanServiceCategory.findMany({
              where: { id: { in: parsed } },
              select: { name: true },
            });
            resolvedCategoryNames = categories.map((c) => c.name).join(", ");
          }
        }
      } catch {
        // If parsing fails, keep the original value
        resolvedServiceNames = ticket.serviceAvailed;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        referenceId: ticket.referenceId,
        queryType: ticket.queryType,
        priority: ticket.priority,
        status: ticket.status,
        section: ticket.section,
        subject: ticket.subject,
        serviceAvailed: resolvedServiceNames,
        serviceCategories: resolvedCategoryNames,
        visitDate: ticket.visitDate,
        visitedDC: ticket.visitedDC,
        description: ticket.description,
        resolutionMessage: ticket.resolutionMessage,
        isAppeal: ticket.isAppeal,
        originalTicketId: ticket.originalTicketId,
        citizen: citizenInfo,
        assignedOfficer: ticket.assignedOfficer
          ? {
              name: ticket.assignedOfficer.officerProfile?.fullName,
              designation: ticket.assignedOfficer.officerProfile?.designation,
            }
          : null,
        escalatedTo: ticket.escalatedTo
          ? {
              name: ticket.escalatedTo.officerProfile?.fullName,
              designation: ticket.escalatedTo.officerProfile?.designation,
            }
          : null,
        sla: {
          deadline: ticket.slaDeadline,
          status: slaStatus,
          seenAt: ticket.seenAt,
          acknowledgedAt: ticket.acknowledgedAt,
          resolvedAt: ticket.resolvedAt,
          closedAt: ticket.closedAt,
          breachedAt: ticket.slaBreachedAt,
        },
        attachments: ticket.attachments.map((att) => ({
          ...att,
          viewUrl: `/api/samadhan/tickets/${ticket.id}/attachments/${att.id}`,
          downloadUrl: `/api/samadhan/tickets/${ticket.id}/attachments/${att.id}?action=download`,
        })),
        infoRequests: ticket.infoRequests,
        statusHistory: ticket.statusHistory.map((h) => ({
          ...h,
          changedByName: h.changedBy?.officerProfile?.fullName || "System",
        })),
        // Include original ticket info for appeal tickets
        originalTicket:
          ticket.isAppeal && ticket.originalTicketId
            ? await (async () => {
                const original = await prisma.samadhanTicket.findUnique({
                  where: { id: ticket.originalTicketId! },
                  include: {
                    assignedOfficer: {
                      select: {
                        id: true,
                        role: true,
                        officerProfile: {
                          select: { fullName: true, designation: true },
                        },
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
                      orderBy: { createdAt: "desc" as const },
                    },
                  },
                });
                return original
                  ? {
                      referenceId: original.referenceId,
                      status: original.status,
                      assignedOfficer: original.assignedOfficer
                        ? {
                            name:
                              original.assignedOfficer.officerProfile
                                ?.fullName || "Unknown",
                            designation:
                              original.assignedOfficer.officerProfile
                                ?.designation || original.assignedOfficer.role,
                          }
                        : null,
                      statusHistory: original.statusHistory.map((h) => ({
                        ...h,
                        changedByName:
                          h.changedBy?.officerProfile?.fullName || "System",
                      })),
                    }
                  : null;
              })()
            : null,
        internalNotes: isOfficer || isAdmin ? ticket.internalNotes : [],
        permissions: {
          canEdit,
          canAddNote: isOfficer || isAdmin,
          canViewCitizenDetails:
            isAdmin || isDC || !ticket.isAnonymousToOfficer,
          canIntervene:
            isHigherAuthority &&
            (isSlaBreached || isOverdue || isAppealed || isEscalated),
          isAssignedOfficer,
          isEscalatedOfficer,
          isAdmin,
          isHigherAuthority,
          isSlaBreached,
          isOverdue,
          isAppealed,
        },
        timestamps: {
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("SAMADHAN ticket detail error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch ticket details" },
      { status: 500 }
    );
  }
}

// PATCH - Update ticket status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = statusUpdateSchema.parse(body);

    // Get current ticket by ID or referenceId
    // First try by UUID
    let ticket = await prisma.samadhanTicket.findUnique({
      where: { id: ticketId },
    });

    // If not found, try by referenceId
    if (!ticket) {
      ticket = await prisma.samadhanTicket.findUnique({
        where: { referenceId: ticketId },
      });
    }

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    const isHigherAuthority = HIGHER_AUTHORITY_ROLES.includes(
      session.user.role || ""
    );
    const isAssignedOfficer = session.user.id === ticket.assignedOfficerId;
    const isEscalatedOfficer = session.user.id === ticket.escalatedToId;

    // Check various ticket states
    const isSlaBreached = !!ticket.slaBreachedAt;
    const isOverdue =
      ticket.slaDeadline &&
      new Date(ticket.slaDeadline) < new Date() &&
      !["RESOLVED", "CLOSED", "CLOSED_NO_RESPONSE"].includes(ticket.status);
    const isAppealed = ["APPEALED", "APPEAL_FILED"].includes(ticket.status);
    const isEscalated = !!ticket.escalatedToId;

    // Authorization check - higher authorities can take action on:
    // - Any ticket (DC/ADC/SDM/Admin have full access)
    // - Assigned officers can modify their tickets
    // - Escalated officers can modify escalated tickets
    const canModify =
      isAdmin || isHigherAuthority || isAssignedOfficer || isEscalatedOfficer;

    if (!canModify) {
      return NextResponse.json(
        { success: false, message: "Not authorized to update this ticket" },
        { status: 403 }
      );
    }

    // Check if escalated officer is locked out (but higher authority can still override)
    if (ticket.escalatedToId && isAssignedOfficer && !isHigherAuthority) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket has been escalated. Original officer cannot modify.",
        },
        { status: 403 }
      );
    }

    // For appealed tickets, only higher authorities can modify
    if (isAppealed && !isHigherAuthority) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Appealed tickets can only be modified by higher authorities (DC/ADC/SDM/Admin)",
        },
        { status: 403 }
      );
    }

    // Validate resolution message for RESOLVED status
    if (
      validatedData.status === "RESOLVED" &&
      !validatedData.resolutionMessage
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Resolution message is required (minimum 100 characters)",
        },
        { status: 400 }
      );
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, unknown> = {
      status: validatedData.status,
    };

    // Set timestamps based on status
    const now = new Date();
    if (validatedData.status === "SEEN" && !ticket.seenAt) {
      updateData.seenAt = now;
    }
    if (validatedData.status === "ACKNOWLEDGED" && !ticket.acknowledgedAt) {
      updateData.acknowledgedAt = now;
    }
    if (validatedData.status === "RESOLVED") {
      updateData.resolvedAt = now;
      updateData.resolutionMessage = validatedData.resolutionMessage;
    }
    if (validatedData.status === "CLOSED") {
      updateData.closedAt = now;
    }

    // Update ticket
    const updatedTicket = await prisma.samadhanTicket.update({
      where: { id: ticket.id },
      data: updateData,
    });

    // Create status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: validatedData.status,
        changedById: session.user.id,
        changeReason: validatedData.message,
      },
    });

    // TODO: Send notifications based on status change

    return NextResponse.json({
      success: true,
      message: "Ticket status updated successfully",
      data: {
        status: updatedTicket.status,
        updatedAt: updatedTicket.updatedAt,
      },
    });
  } catch (error) {
    console.error("SAMADHAN ticket update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
