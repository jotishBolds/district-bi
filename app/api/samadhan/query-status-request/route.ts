// API endpoint for guest users to request status updates on their queries
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, queryDescription, submissionDate } = body;

    // Validate required fields
    if (!name || !phone || !queryDescription) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, phone, and query description are required",
        },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Try to find existing tickets with this phone number
    const existingTickets = await prisma.samadhanTicket.findMany({
      where: {
        OR: [
          { citizenPhone: cleanPhone },
          { citizenPhone: phone },
          { citizenPhone: `+91${cleanPhone}` },
        ],
      },
      select: {
        id: true,
        referenceId: true,
        subject: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Create a query status request record
    // This will be reviewed by admin/officer and responded to manually
    const statusRequest = await prisma.samadhanQueryStatusRequest.create({
      data: {
        name,
        phone: cleanPhone,
        email: email || null,
        queryDescription,
        submissionDate: submissionDate ? new Date(submissionDate) : null,
        status: "PENDING",
        matchedTickets:
          existingTickets.length > 0
            ? JSON.stringify(existingTickets.map((t) => t.referenceId))
            : null,
      },
    });

    console.log("=".repeat(50));
    console.log("📋 GUEST STATUS REQUEST RECEIVED");
    console.log("👤 Name:", name);
    console.log("📱 Phone:", cleanPhone);
    console.log("📧 Email:", email || "Not provided");
    console.log("📝 Description:", queryDescription.substring(0, 100) + "...");
    console.log("🔍 Matched tickets:", existingTickets.length);
    if (existingTickets.length > 0) {
      console.log(
        "   Ticket IDs:",
        existingTickets.map((t) => t.referenceId).join(", ")
      );
    }
    console.log("=".repeat(50));

    return NextResponse.json({
      success: true,
      message:
        "Status request submitted successfully. We will contact you soon.",
      requestId: statusRequest.id,
      matchedTicketsCount: existingTickets.length,
    });
  } catch (error) {
    console.error("Error processing query status request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // This endpoint could be used by admins to view pending status requests
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    const requests = await prisma.samadhanQueryStatusRequest.findMany({
      where: {
        status: status as "PENDING" | "REVIEWED" | "RESPONDED",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching query status requests:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
