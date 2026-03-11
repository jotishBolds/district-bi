// API to check ticket information for OTP requirement
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { maskPhoneNumber } from "@/lib/samadhan";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get("referenceId");

    if (!referenceId) {
      return NextResponse.json(
        { success: false, message: "Reference ID is required" },
        { status: 400 },
      );
    }

    // Find the ticket by reference ID
    const ticket = await prisma.samadhanTicket.findUnique({
      where: { referenceId },
      select: {
        id: true,
        referenceId: true,
        citizenId: true,
        citizenPhone: true,
        queryType: true,
        citizen: {
          select: {
            id: true,
            phone: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({
        success: true,
        data: {
          exists: false,
          isGuestTicket: false,
          citizenPhone: null,
          isRegisteredPhone: false,
          queryType: null,
        },
      });
    }

    // Determine if ticket has a registered phone number
    const isGuestTicket = !ticket.citizenId;
    const ticketPhone = ticket.citizenPhone || ticket.citizen?.phone || null;

    // Check if the phone number belongs to a registered user
    let isRegisteredPhone = false;
    if (ticketPhone) {
      const cleanPhone = ticketPhone.replace(/[\s\-\(\)]/g, "");
      const registeredUser = await prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          role: "CITIZEN",
        },
        select: { id: true },
      });
      isRegisteredPhone = !!registeredUser;
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        isGuestTicket,
        citizenPhone: ticketPhone ? maskPhoneNumber(ticketPhone) : null,
        isRegisteredPhone,
        queryType: ticket.queryType,
      },
    });
  } catch (error) {
    console.error("Ticket check error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check ticket" },
      { status: 500 },
    );
  }
}
