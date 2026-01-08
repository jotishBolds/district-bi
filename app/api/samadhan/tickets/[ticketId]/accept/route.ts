// SAMADHAN Accept Resolution API
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

// POST - Accept resolution
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;

    // Get ticket by ID or referenceId
    const ticket = await findTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Verify ticket is in RESOLVED status
    if (ticket.status !== "RESOLVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Can only accept resolution for resolved tickets",
        },
        { status: 400 }
      );
    }

    // Verify citizen owns the ticket (for authenticated users)
    const session = await getServerSession(authOptions);
    if (
      session?.user?.id &&
      ticket.citizenId &&
      session.user.id !== ticket.citizenId
    ) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    // Update ticket status to CLOSED
    await prisma.samadhanTicket.update({
      where: { id: ticket.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    // Create status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: "RESOLVED",
        toStatus: "CLOSED",
        isSystemGenerated: true,
        changeReason: "Citizen accepted resolution",
      },
    });

    // TODO: Notify officer

    return NextResponse.json({
      success: true,
      message: "Resolution accepted. Ticket has been closed.",
    });
  } catch (error) {
    console.error("Accept resolution error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to accept resolution" },
      { status: 500 }
    );
  }
}
