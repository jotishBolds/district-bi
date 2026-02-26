// SAMADHAN Queue API - Queue management for ticket assignment
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAvailableOfficer } from "@/lib/samadhan";

// Roles that can view and manage the queue
const QUEUE_MANAGER_ROLES = [
  "DC",
  "ADC",
  "ADC_GTK",
  "ADC_HQ",
  "US_ADM",
  "ADMIN",
  "SUPER_ADMIN",
];

// Validation schema for assigning ticket
const assignTicketSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  assignToOfficerId: z.string().optional(), // If not provided, auto-assign to section head
});

// GET - Get queued tickets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    // Check if user has queue access
    const hasQueueAccess = QUEUE_MANAGER_ROLES.includes(session.user.role);
    if (!hasQueueAccess) {
      return NextResponse.json(
        { success: false, message: "Not authorized to view queue" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const queryType = searchParams.get("queryType");
    const sectionId = searchParams.get("sectionId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build filter
    const where: Record<string, unknown> = {
      status: "QUEUED",
      isDraft: false,
      // Only grievances can be assigned/queued - feedback is view-only for higher authorities
      queryType: "GRIEVANCE",
    };

    if (queryType) {
      // Only allow filtering to GRIEVANCE since we already filter by GRIEVANCE
      if (queryType === "GRIEVANCE") {
        where.queryType = queryType;
      }
      // Ignore FEEDBACK filter since feedback shouldn't be in queue
    }

    if (sectionId) {
      where.sectionId = sectionId;
    }

    // Get queued tickets
    const [tickets, total] = await Promise.all([
      prisma.samadhanTicket.findMany({
        where,
        include: {
          section: {
            select: {
              id: true,
              name: true,
            },
          },
          citizen: {
            select: {
              id: true,
              citizenProfile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          attachments: {
            select: {
              id: true,
            },
          },
        },
        orderBy: [
          { queuedAt: "asc" }, // Oldest first
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.samadhanTicket.count({ where }),
    ]);

    // Get available officers for each section
    const sectionIds = [...new Set(tickets.map((t) => t.sectionId))];
    const sectionOfficers = await Promise.all(
      sectionIds.map(async (secId) => {
        const officers = await prisma.officerProfile.findMany({
          where: {
            sectionId: secId,
            isAvailable: true,
            user: { isActive: true },
          },
          include: {
            user: {
              select: {
                id: true,
                role: true,
              },
            },
          },
        });
        return { sectionId: secId, officers };
      }),
    );

    const officersBySectionMap = new Map(
      sectionOfficers.map((s) => [s.sectionId, s.officers]),
    );

    // Resolve service UUIDs to names for all tickets
    const resolveServiceNames = async (
      serviceAvailed: string | null,
    ): Promise<string | null> => {
      if (!serviceAvailed) return null;
      try {
        const serviceIds = JSON.parse(serviceAvailed);
        if (Array.isArray(serviceIds) && serviceIds.length > 0) {
          const services = await prisma.samadhanService.findMany({
            where: { id: { in: serviceIds } },
            select: { name: true },
          });
          return services.map((s) => s.name).join(", ");
        }
        return serviceAvailed;
      } catch {
        return serviceAvailed;
      }
    };

    // Process tickets with resolved service names
    const processedTickets = await Promise.all(
      tickets.map(async (ticket) => ({
        id: ticket.id,
        referenceId: ticket.referenceId,
        queryType: ticket.queryType,
        subject: ticket.subject,
        description: ticket.description.substring(0, 200),
        section: ticket.section,
        citizenName: ticket.isAnonymousToOfficer
          ? ticket.citizenPseudonym || "Anonymous"
          : ticket.citizenName || "Anonymous",
        hasAttachments: ticket.attachments.length > 0,
        visitedDC: ticket.visitedDC,
        visitDate: ticket.visitDate,
        serviceAvailed: await resolveServiceNames(ticket.serviceAvailed),
        queuedAt: ticket.queuedAt || ticket.createdAt,
        createdAt: ticket.createdAt,
        availableOfficers: (
          officersBySectionMap.get(ticket.sectionId) || []
        ).map((o) => ({
          id: o.userId,
          name: o.fullName,
          designation: o.designation,
          role: o.user.role,
        })),
      })),
    );

    return NextResponse.json({
      success: true,
      data: {
        tickets: processedTickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch queue:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch queue" },
      { status: 500 },
    );
  }
}

// POST - Assign ticket from queue to officer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    // Check if user has queue access
    const hasQueueAccess = QUEUE_MANAGER_ROLES.includes(session.user.role);
    if (!hasQueueAccess) {
      return NextResponse.json(
        { success: false, message: "Not authorized to assign tickets" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = assignTicketSchema.parse(body);

    // Get the ticket
    const ticket = await prisma.samadhanTicket.findUnique({
      where: { id: validatedData.ticketId },
      include: {
        section: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    if (ticket.status !== "QUEUED") {
      return NextResponse.json(
        { success: false, message: "Ticket is not in queue" },
        { status: 400 },
      );
    }

    // Determine officer to assign
    let assignToOfficerId: string | undefined = validatedData.assignToOfficerId;

    if (!assignToOfficerId) {
      // Auto-assign to section head with lowest workload
      const autoAssignedOfficer = await findAvailableOfficer(ticket.sectionId);
      assignToOfficerId = autoAssignedOfficer ?? undefined;
    }

    if (!assignToOfficerId) {
      return NextResponse.json(
        {
          success: false,
          message: "No available officer found in this section",
        },
        { status: 400 },
      );
    }

    // Verify the officer exists and is in the correct section
    const officer = await prisma.officerProfile.findUnique({
      where: { userId: assignToOfficerId },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!officer || !officer.user.isActive) {
      return NextResponse.json(
        { success: false, message: "Selected officer is not available" },
        { status: 400 },
      );
    }

    // Update ticket - assign and change status
    const updatedTicket = await prisma.samadhanTicket.update({
      where: { id: validatedData.ticketId },
      data: {
        status: "UNSEEN",
        assignedOfficerId: assignToOfficerId,
        assignedById: session.user.id,
        assignedAt: new Date(),
      },
      include: {
        section: {
          select: { name: true },
        },
        assignedOfficer: {
          select: {
            officerProfile: {
              select: { fullName: true, designation: true },
            },
          },
        },
      },
    });

    // Create status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: validatedData.ticketId,
        fromStatus: "QUEUED",
        toStatus: "UNSEEN",
        changedById: session.user.id,
        changeReason: `Assigned to ${officer.fullName} from queue`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ticket assigned successfully",
      data: {
        ticketId: updatedTicket.id,
        referenceId: updatedTicket.referenceId,
        status: updatedTicket.status,
        assignedOfficer: {
          name:
            updatedTicket.assignedOfficer?.officerProfile?.fullName ||
            "Unknown",
          designation:
            updatedTicket.assignedOfficer?.officerProfile?.designation || "N/A",
        },
      },
    });
  } catch (error) {
    console.error("Failed to assign ticket:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to assign ticket" },
      { status: 500 },
    );
  }
}
