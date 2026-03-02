// SAMADHAN Officer Dashboard API
// Role-based access: DC sees all, ADC/SDM/higher authorities see escalated/SLA breached tickets
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketStatistics, getSLAStatus } from "@/lib/samadhan";
import { OFFICER_ROLE_MAPPINGS } from "@/lib/officer-roles";

// Officer role hierarchy - DC is highest (level 0), ADCs are level 1
const DC_LEVEL_ROLES = ["DC", "ADMIN", "SUPER_ADMIN"];
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

// Get role level for hierarchy-based access
function getRoleLevel(role: string): number {
  const mapping =
    OFFICER_ROLE_MAPPINGS[role as keyof typeof OFFICER_ROLE_MAPPINGS];
  return mapping?.level ?? 99; // Lower is higher authority, 99 for unknown
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = session.user.role;

    // Only officers can access (not FRONT_DESK or CITIZEN)
    if (!userRole || userRole === "FRONT_DESK" || userRole === "CITIZEN") {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const queryType = searchParams.get("queryType");
    const sectionId = searchParams.get("sectionId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const view = searchParams.get("view") || "my"; // my | section | all | escalated | overdue | sla-breached | awaiting-escalation

    // Check if user is DC or Admin (can see everything)
    const isDCOrAdmin = DC_LEVEL_ROLES.includes(userRole);
    // Check if user is higher authority (can see SLA breached and escalated tickets)
    const isHigherAuthority = HIGHER_AUTHORITY_ROLES.includes(userRole);
    // Get user's role level for hierarchy-based access
    const userRoleLevel = getRoleLevel(userRole);

    // Get officer's section for filtering
    const officerProfile = await prisma.officerProfile.findUnique({
      where: { userId: session.user.id },
      select: { sectionId: true },
    });

    const officerSectionId = officerProfile?.sectionId;

    // Build filter based on role and view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, unknown> = {
      // Base filters: exclude drafts and queued tickets from officer dashboard
      // QUEUED tickets should only be visible in the queue management page
      isDraft: false,
      status: { not: "QUEUED" },
    };

    if (view === "my") {
      // My tickets - assigned to me or escalated to me
      where.OR = [
        { assignedOfficerId: session.user.id },
        { escalatedToId: session.user.id },
      ];
    } else if (view === "section") {
      // Section tickets - only if user has section or is DC
      if (isDCOrAdmin) {
        // DC/Admin can filter by specific section or see all
        if (sectionId) {
          where.sectionId = sectionId;
        }
        // If no sectionId, show all tickets
      } else if (officerSectionId) {
        // Regular officers only see their section
        where.sectionId = officerSectionId;
      } else {
        // Officers without section can only see assigned tickets
        where.OR = [
          { assignedOfficerId: session.user.id },
          { escalatedToId: session.user.id },
        ];
      }
    } else if (view === "all") {
      // All tickets - only DC/Admin can see all
      if (!isDCOrAdmin) {
        // Non-DC officers can't see all, fallback to section
        if (officerSectionId) {
          where.sectionId = officerSectionId;
        } else {
          where.OR = [
            { assignedOfficerId: session.user.id },
            { escalatedToId: session.user.id },
          ];
        }
      }
      // DC/Admin: no section filter - see everything
    } else if (view === "escalated") {
      // Escalated tickets - DC sees all escalated, others see their escalations
      if (isDCOrAdmin) {
        where.escalatedToId = { not: null };
      } else {
        where.escalatedToId = session.user.id;
      }
    } else if (view === "overdue") {
      // Overdue tickets
      where.status = {
        in: [
          "UNSEEN",
          "SEEN",
          "ACKNOWLEDGED",
          "IN_PROGRESS",
          "PENDING_INFORMATION",
        ],
      };
      where.slaDeadline = { lt: new Date() };

      // Higher authorities (DC, ADC) can see ALL overdue tickets
      // Non-higher-authority officers only see their overdue tickets
      if (!isHigherAuthority) {
        where.OR = [
          { assignedOfficerId: session.user.id },
          { escalatedToId: session.user.id },
        ];
      }
      // Higher authorities see all overdue tickets in the system
    } else if (view === "sla-breached") {
      // SLA Breached tickets - accessible by higher authorities
      // These are tickets that have breached SLA but may or may not be escalated
      where.slaBreachedAt = { not: null };

      if (isHigherAuthority) {
        // Higher authorities can see all SLA breached tickets
        // Optionally filter by section
        if (sectionId) {
          where.sectionId = sectionId;
        }
      } else {
        // Non-higher-authority officers only see their own SLA breached tickets
        where.OR = [
          { assignedOfficerId: session.user.id },
          { escalatedToId: session.user.id },
        ];
      }
    } else if (view === "awaiting-escalation") {
      // Tickets about to breach SLA (within 24 hours) - for higher authorities to monitor
      const next24Hours = new Date();
      next24Hours.setHours(next24Hours.getHours() + 24);

      where.status = {
        in: [
          "UNSEEN",
          "SEEN",
          "ACKNOWLEDGED",
          "IN_PROGRESS",
          "PENDING_INFORMATION",
        ],
      };
      where.slaDeadline = {
        gt: new Date(),
        lt: next24Hours,
      };
      where.slaBreachedAt = null; // Not yet breached

      if (!isHigherAuthority) {
        // Non-higher-authority officers only see their own
        where.OR = [
          { assignedOfficerId: session.user.id },
          { escalatedToId: session.user.id },
        ];
      }
    } else if (view === "appealed") {
      // Appealed tickets - only for higher authorities
      where.status = { in: ["APPEALED", "APPEAL_FILED"] };

      if (!isHigherAuthority) {
        // Non-higher-authority officers only see their own appealed tickets
        where.OR = [
          { assignedOfficerId: session.user.id },
          { escalatedToId: session.user.id },
        ];
      }
      // Higher authorities see all appealed tickets
    } else if (view === "feedback") {
      // Feedback view - only for higher authorities
      if (!isHigherAuthority) {
        return NextResponse.json(
          { success: false, message: "Not authorized to view feedback" },
          { status: 403 },
        );
      }
      where.queryType = "FEEDBACK";
      // Remove the QUEUED status filter for feedback since feedback doesn't go through queue
      delete where.status;
      where.isDraft = false;
    }

    // For non-higher authorities viewing non-feedback views, exclude feedback tickets
    // (Feedback is view-only for higher authorities only)
    if (!isHigherAuthority && view !== "feedback") {
      where.queryType = "GRIEVANCE";
    }

    // Additional filters
    if (status && status !== "all") {
      where.status = status;
    }

    // queryType filter - but respect the feedback restriction above
    if (queryType && queryType !== "all") {
      // Only allow filtering by GRIEVANCE for non-higher authorities
      if (!isHigherAuthority && queryType === "FEEDBACK") {
        // Ignore feedback filter for non-higher authorities
      } else {
        where.queryType = queryType;
      }
    }

    // Get total count
    const total = await prisma.samadhanTicket.count({ where });

    // Get tickets
    const tickets = await prisma.samadhanTicket.findMany({
      where,
      include: {
        section: { select: { id: true, name: true } },
        assignedOfficer: {
          select: {
            id: true,
            role: true,
            officerProfile: { select: { fullName: true, designation: true } },
          },
        },
        escalatedTo: {
          select: {
            id: true,
            role: true,
            officerProfile: { select: { fullName: true, designation: true } },
          },
        },
        citizen: {
          select: {
            citizenProfile: {
              select: { fullName: true, samadhanPseudonym: true },
            },
          },
        },
        _count: {
          select: {
            attachments: true,
            infoRequests: true,
          },
        },
        infoRequests: {
          where: { status: "PENDING" },
          select: { id: true },
        },
      },
      orderBy: [
        { slaDeadline: "asc" }, // Most urgent first
        { createdAt: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get statistics
    const statistics = await getTicketStatistics(
      view === "my" ? session.user.id : undefined,
      isDCOrAdmin ? undefined : officerSectionId || undefined,
    );

    // Format tickets
    const formattedTickets = tickets.map((ticket) => {
      // Determine citizen name based on anonymity setting and user role
      let citizenName = "Anonymous";
      if (isDCOrAdmin) {
        // DC/Admin can see real names
        citizenName =
          ticket.citizenName ||
          ticket.citizen?.citizenProfile?.fullName ||
          ticket.citizenPseudonym ||
          "Anonymous";
      } else {
        // Regular officers see pseudonym if anonymous to officer
        citizenName = ticket.isAnonymousToOfficer
          ? ticket.citizenPseudonym || "Anonymous"
          : ticket.citizenName ||
            ticket.citizen?.citizenProfile?.fullName ||
            "Anonymous";
      }

      return {
        id: ticket.id,
        referenceId: ticket.referenceId,
        queryType: ticket.queryType,
        status: ticket.status,
        section: ticket.section,
        citizenName,
        subject: ticket.subject, // Issue title/subject
        description:
          ticket.description.substring(0, 150) +
          (ticket.description.length > 150 ? "..." : ""),
        visitDate: ticket.visitDate, // When citizen visited
        assignedOfficer: ticket.assignedOfficer
          ? {
              id: ticket.assignedOfficer.id,
              name:
                ticket.assignedOfficer.officerProfile?.fullName || "Unknown",
              designation: ticket.assignedOfficer.officerProfile?.designation,
              role: ticket.assignedOfficer.role,
            }
          : null,
        escalatedTo: ticket.escalatedTo
          ? {
              id: ticket.escalatedTo.id,
              name: ticket.escalatedTo.officerProfile?.fullName || "Unknown",
              designation: ticket.escalatedTo.officerProfile?.designation,
              role: ticket.escalatedTo.role,
            }
          : null,
        slaStatus: getSLAStatus(ticket.slaDeadline, ticket.status),
        slaDeadline: ticket.slaDeadline,
        slaBreachedAt: ticket.slaBreachedAt,
        createdAt: ticket.createdAt,
        hasAttachments: ticket._count.attachments > 0,
        pendingInfoRequests: ticket.infoRequests.length,
        isOverdue:
          ticket.slaDeadline &&
          new Date(ticket.slaDeadline) < new Date() &&
          !["RESOLVED", "CLOSED"].includes(ticket.status),
        isSlaBreached: !!ticket.slaBreachedAt,
      };
    });

    // Get all sections for filter dropdown (Higher authorities can filter)
    let sections: { id: string; name: string }[] = [];
    if (isHigherAuthority) {
      sections = await prisma.section.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    // Get additional stats for higher authorities
    let additionalStats = null;
    if (isHigherAuthority) {
      const [
        slaBreachedCount,
        awaitingEscalationCount,
        overdueCount,
        escalatedCount,
        appealedCount,
      ] = await Promise.all([
        prisma.samadhanTicket.count({
          where: {
            slaBreachedAt: { not: null },
            status: { notIn: ["CLOSED", "RESOLVED"] },
          },
        }),
        prisma.samadhanTicket.count({
          where: {
            status: {
              in: [
                "UNSEEN",
                "SEEN",
                "ACKNOWLEDGED",
                "IN_PROGRESS",
                "PENDING_INFORMATION",
              ],
            },
            slaDeadline: {
              gt: new Date(),
              lt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
            slaBreachedAt: null,
          },
        }),
        prisma.samadhanTicket.count({
          where: {
            status: {
              in: [
                "UNSEEN",
                "SEEN",
                "ACKNOWLEDGED",
                "IN_PROGRESS",
                "PENDING_INFORMATION",
              ],
            },
            slaDeadline: { lt: new Date() },
          },
        }),
        prisma.samadhanTicket.count({
          where: {
            escalatedToId: { not: null },
            status: { notIn: ["CLOSED", "RESOLVED"] },
          },
        }),
        prisma.samadhanTicket.count({
          where: {
            status: { in: ["APPEALED", "APPEAL_FILED"] },
          },
        }),
      ]);

      additionalStats = {
        slaBreachedCount,
        awaitingEscalationCount,
        overdueCount,
        escalatedCount,
        appealedCount,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        tickets: formattedTickets,
        statistics,
        additionalStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        userRole,
        userRoleLevel,
        isDCOrAdmin,
        isHigherAuthority,
        officerSectionId,
        sections,
      },
    });
  } catch (error) {
    console.error("Officer dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch dashboard data" },
      { status: 500 },
    );
  }
}
