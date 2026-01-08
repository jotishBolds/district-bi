// SAMADHAN SLA Escalation API
// Automatically escalates overdue tickets to DC
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Find DC user for escalation
async function findDCUser(): Promise<string | null> {
  const dcUser = await prisma.user.findFirst({
    where: {
      role: "DC",
      isActive: true,
    },
    select: { id: true },
  });
  return dcUser?.id || null;
}

// POST - Run SLA escalation (can be triggered by cron or manually by admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow admins or system to run escalation
    const isAdmin =
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "SUPER_ADMIN" ||
      session?.user?.role === "DC";

    // Check for API key for cron jobs
    const apiKey = request.headers.get("x-api-key");
    const isSystemCall = apiKey === process.env.CRON_API_KEY;

    if (!isAdmin && !isSystemCall) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    // Find DC user for escalation
    const dcUserId = await findDCUser();
    if (!dcUserId) {
      return NextResponse.json(
        { success: false, message: "No DC user found for escalation" },
        { status: 500 }
      );
    }

    // Find overdue tickets that haven't been escalated yet
    const now = new Date();
    const overdueTickets = await prisma.samadhanTicket.findMany({
      where: {
        status: {
          in: ["UNSEEN", "SEEN", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING_INFORMATION"],
        },
        slaDeadline: {
          lt: now,
        },
        slaBreachedAt: null, // Not already breached
        escalatedToId: null, // Not already escalated
      },
      include: {
        assignedOfficer: {
          select: {
            officerProfile: { select: { fullName: true } },
          },
        },
        section: { select: { name: true } },
      },
    });

    if (overdueTickets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No overdue tickets to escalate",
        escalatedCount: 0,
      });
    }

    // Escalate each ticket
    const escalationResults = await Promise.all(
      overdueTickets.map(async (ticket) => {
        try {
          // Update ticket with escalation
          await prisma.samadhanTicket.update({
            where: { id: ticket.id },
            data: {
              status: "ESCALATED",
              escalatedToId: dcUserId,
              slaBreachedAt: now,
            },
          });

          // Create status history entry
          await prisma.samadhanStatusHistory.create({
            data: {
              ticketId: ticket.id,
              fromStatus: ticket.status,
              toStatus: "ESCALATED",
              changeReason: `SLA breached - Automatically escalated to DC. Original assignee: ${
                ticket.assignedOfficer?.officerProfile?.fullName || "Unassigned"
              }`,
              isSystemGenerated: true,
            },
          });

          // Create internal note
          await prisma.samadhanInternalNote.create({
            data: {
              ticketId: ticket.id,
              createdById: dcUserId,
              content: `⚠️ SLA BREACH: This ticket was automatically escalated due to SLA deadline expiry.\n\nOriginal SLA Deadline: ${ticket.slaDeadline?.toISOString()}\nBreach Time: ${now.toISOString()}\nPrevious Status: ${ticket.status}\nSection: ${ticket.section.name}\nOriginal Assignee: ${
                ticket.assignedOfficer?.officerProfile?.fullName || "Unassigned"
              }`,
            },
          });

          // TODO: Send notification to DC and original officer
          // await sendEscalationNotification(ticket, dcUserId);

          return { ticketId: ticket.id, referenceId: ticket.referenceId, success: true };
        } catch (error) {
          console.error(`Failed to escalate ticket ${ticket.id}:`, error);
          return { ticketId: ticket.id, referenceId: ticket.referenceId, success: false, error };
        }
      })
    );

    const successCount = escalationResults.filter((r) => r.success).length;
    const failedCount = escalationResults.filter((r) => !r.success).length;

    console.log(
      `[SLA Escalation] Processed ${overdueTickets.length} tickets. Success: ${successCount}, Failed: ${failedCount}`
    );

    return NextResponse.json({
      success: true,
      message: `Escalated ${successCount} overdue tickets to DC`,
      escalatedCount: successCount,
      failedCount,
      results: escalationResults,
    });
  } catch (error) {
    console.error("SLA escalation error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to run SLA escalation" },
      { status: 500 }
    );
  }
}

// GET - Get escalation statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const isAdmin =
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "SUPER_ADMIN" ||
      session?.user?.role === "DC";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    const now = new Date();

    // Get statistics
    const [
      totalOverdue,
      pendingEscalation,
      alreadyEscalated,
      breachedThisWeek,
    ] = await Promise.all([
      // Total overdue (including escalated)
      prisma.samadhanTicket.count({
        where: {
          status: { notIn: ["RESOLVED", "CLOSED"] },
          slaDeadline: { lt: now },
        },
      }),
      // Pending escalation (overdue but not escalated)
      prisma.samadhanTicket.count({
        where: {
          status: { in: ["UNSEEN", "SEEN", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING_INFORMATION"] },
          slaDeadline: { lt: now },
          escalatedToId: null,
        },
      }),
      // Already escalated
      prisma.samadhanTicket.count({
        where: {
          status: "ESCALATED",
        },
      }),
      // Breached in last 7 days
      prisma.samadhanTicket.count({
        where: {
          slaBreachedAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get tickets pending escalation
    const pendingTickets = await prisma.samadhanTicket.findMany({
      where: {
        status: { in: ["UNSEEN", "SEEN", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING_INFORMATION"] },
        slaDeadline: { lt: now },
        escalatedToId: null,
      },
      include: {
        section: { select: { name: true } },
        assignedOfficer: {
          select: {
            officerProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { slaDeadline: "asc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalOverdue,
          pendingEscalation,
          alreadyEscalated,
          breachedThisWeek,
        },
        pendingTickets: pendingTickets.map((t) => ({
          id: t.id,
          referenceId: t.referenceId,
          status: t.status,
          section: t.section.name,
          assignedOfficer: t.assignedOfficer?.officerProfile?.fullName || "Unassigned",
          slaDeadline: t.slaDeadline,
          overdueBy: t.slaDeadline
            ? Math.floor((now.getTime() - new Date(t.slaDeadline).getTime()) / (1000 * 60 * 60))
            : 0, // hours overdue
        })),
      },
    });
  } catch (error) {
    console.error("Escalation stats error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch escalation statistics" },
      { status: 500 }
    );
  }
}
