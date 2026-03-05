// API to check if a phone number is already registered in SAMADHAN
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, message: "Valid phone number required" },
        { status: 400 },
      );
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Check if user exists with this phone number
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: cleanPhone,
        role: "CITIZEN",
      },
      select: {
        id: true,
        citizenProfile: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // Count tickets submitted with this phone (both linked and guest)
    const ticketCount = await prisma.samadhanTicket.count({
      where: {
        OR: [{ citizenId: existingUser?.id }, { citizenPhone: cleanPhone }],
        isDraft: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isRegistered: !!existingUser,
        userId: existingUser?.id || null,
        name: existingUser?.citizenProfile?.fullName || null,
        ticketCount,
      },
    });
  } catch (error) {
    console.error("Phone check error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check phone" },
      { status: 500 },
    );
  }
}
