// SAMADHAN Info Request Response API (Citizen responding to info request)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSamadhanSession } from "@/lib/samadhan-auth";

const responseSchema = z.object({
  response: z.string().min(1, "Response is required"),
});

type RouteParams = { params: Promise<{ ticketId: string; requestId: string }> };

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

// POST - Submit response to info request (citizen only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId, requestId } = await params;

    const body = await request.json();
    const validatedData = responseSchema.parse(body);

    // Find ticket by ID or referenceId
    const ticket = await findTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Get info request with ticket
    const infoRequest = await prisma.samadhanInfoRequest.findUnique({
      where: { id: requestId },
      include: { ticket: true },
    });

    if (!infoRequest || infoRequest.ticketId !== ticket.id) {
      return NextResponse.json(
        { success: false, message: "Info request not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (infoRequest.deadline < new Date()) {
      return NextResponse.json(
        { success: false, message: "Response deadline has passed" },
        { status: 400 }
      );
    }

    // Check if already responded
    if (infoRequest.status === "RESPONDED") {
      return NextResponse.json(
        { success: false, message: "Already responded to this request" },
        { status: 400 }
      );
    }

    // Verify citizen owns the ticket
    // Support multiple verification methods:
    // 1. SAMADHAN session (logged in)
    // 2. OTP pre-verified via URL (?verified=true) - user proved ownership on home page
    // 3. Anonymous tickets can respond without auth

    const samadhanSession = await getSamadhanSession();
    const isPreVerified = request.headers.get("x-preverified") === "true";
    const trackingToken = request.headers.get("x-tracking-token");

    // Check if user has valid tracking token (contains :verified at end)
    const hasValidTrackingToken =
      trackingToken && trackingToken.endsWith(":verified");

    if (
      samadhanSession?.userId &&
      infoRequest.ticket.citizenId !== samadhanSession.userId
    ) {
      // User is logged in but doesn't own this ticket
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    // Allow access if:
    // 1. User has samadhan session and owns the ticket
    // 2. User has pre-verified via OTP
    // 3. User has valid tracking token from OTP verification
    // 4. Ticket is anonymous (no citizenId)
    const hasAccess =
      (samadhanSession &&
        infoRequest.ticket.citizenId === samadhanSession.userId) ||
      isPreVerified ||
      hasValidTrackingToken ||
      !infoRequest.ticket.citizenId; // Anonymous ticket

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification required. Please verify via OTP.",
        },
        { status: 401 }
      );
    }

    // Update info request
    await prisma.samadhanInfoRequest.update({
      where: { id: requestId },
      data: {
        citizenResponse: validatedData.response,
        status: "RESPONDED",
        respondedAt: new Date(),
      },
    });

    // Update ticket status back to IN_PROGRESS
    await prisma.samadhanTicket.update({
      where: { id: ticket.id },
      data: { status: "IN_PROGRESS" },
    });

    // Create status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: "PENDING_INFORMATION",
        toStatus: "IN_PROGRESS",
        isSystemGenerated: true,
        changeReason: "Citizen provided requested information",
      },
    });

    // TODO: Notify officer

    return NextResponse.json({
      success: true,
      message: "Response submitted successfully",
    });
  } catch (error) {
    console.error("Info request response error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to submit response" },
      { status: 500 }
    );
  }
}
