// SAMADHAN Escalation API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const escalationSchema = z.object({
  escalateToId: z.string().uuid("Invalid officer ID"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type RouteParams = { params: Promise<{ ticketId: string }> };

// Helper function to find ticket by ID or referenceId
async function findTicket(ticketIdOrRef: string) {
  let ticket = await prisma.samadhanTicket.findUnique({
    where: { id: ticketIdOrRef },
  });

  if (!ticket) {
    ticket = await prisma.samadhanTicket.findUnique({
      where: { referenceId: ticketIdOrRef },
    });
  }

  return ticket;
}

// POST - Escalate ticket
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin or section heads can manually escalate
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    const canEscalate =
      isAdmin || ["DC", "ADC", "SDM"].includes(session.user.role || "");

    if (!canEscalate) {
      return NextResponse.json(
        { success: false, message: "Not authorized to escalate tickets" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = escalationSchema.parse(body);

    // Get ticket by ID or referenceId
    const ticket = await findTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Verify escalation target exists and is an officer
    const escalateToUser = await prisma.user.findUnique({
      where: { id: validatedData.escalateToId },
      include: { officerProfile: true },
    });

    if (!escalateToUser || !escalateToUser.officerProfile) {
      return NextResponse.json(
        { success: false, message: "Invalid escalation target" },
        { status: 400 }
      );
    }

    // Update ticket
    await prisma.samadhanTicket.update({
      where: { id: ticket.id },
      data: {
        status: "ESCALATED",
        escalatedToId: validatedData.escalateToId,
      },
    });

    // Create status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: "ESCALATED",
        changedById: session.user.id,
        changeReason: `Escalated to ${escalateToUser.officerProfile.fullName}: ${validatedData.reason}`,
      },
    });

    // TODO: Send notifications

    return NextResponse.json({
      success: true,
      message: "Ticket escalated successfully",
      data: {
        escalatedTo: escalateToUser.officerProfile.fullName,
      },
    });
  } catch (error) {
    console.error("Escalation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to escalate ticket" },
      { status: 500 }
    );
  }
}
