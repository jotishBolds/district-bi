// SAMADHAN Information Request API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

const infoRequestSchema = z.object({
  description: z.string().min(5, "Description must be at least 5 characters"),
  documentTypes: z.array(z.string()).optional(),
  deadlineDays: z.number().min(1).max(30).default(7),
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

// POST - Create info request
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

    const body = await request.json();
    const validatedData = infoRequestSchema.parse(body);

    // Get ticket by ID or referenceId
    const ticket = await findTicket(ticketId);

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

    if (!isAdmin && !isHigherAuthority && !isAssignedOfficer) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    // Calculate deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + validatedData.deadlineDays);

    // Create info request
    const infoRequest = await prisma.samadhanInfoRequest.create({
      data: {
        ticketId: ticket.id,
        requestedById: session.user.id,
        description: validatedData.description,
        documentTypes: validatedData.documentTypes
          ? JSON.stringify(validatedData.documentTypes)
          : null,
        deadline,
      },
    });

    // Update ticket status to PENDING_INFORMATION
    await prisma.samadhanTicket.update({
      where: { id: ticket.id },
      data: { status: "PENDING_INFORMATION" },
    });

    // Create status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: "PENDING_INFORMATION",
        changedById: session.user.id,
        changeReason: "Information request sent to citizen",
      },
    });

    // TODO: Send notification to citizen

    return NextResponse.json({
      success: true,
      message: "Information request sent successfully",
      data: infoRequest,
    });
  } catch (error) {
    console.error("Info request creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create info request" },
      { status: 500 }
    );
  }
}
