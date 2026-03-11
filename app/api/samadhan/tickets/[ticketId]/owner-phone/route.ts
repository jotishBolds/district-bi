import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { maskPhoneNumber } from "@/lib/samadhan";

// GET - Get ticket owner's phone number (masked info for verification)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const { ticketId } = await params;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, message: "Reference ID is required" },
        { status: 400 },
      );
    }

    // Find the ticket by referenceId (ticketId in URL is actually the referenceId)
    const ticket = await prisma.samadhanTicket.findUnique({
      where: { referenceId: ticketId },
      select: {
        citizenPhone: true,
        isAnonymous: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    // For anonymous tickets, don't allow tracking
    if (ticket.isAnonymous || !ticket.citizenPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This ticket was submitted anonymously and cannot be tracked",
        },
        { status: 403 },
      );
    }

    // Return the phone number (will be used to send OTP)
    return NextResponse.json({
      success: true,
      phone: maskPhoneNumber(ticket.citizenPhone),
    });
  } catch (error) {
    console.error("Error fetching ticket owner phone:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch ticket information" },
      { status: 500 },
    );
  }
}
