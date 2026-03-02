// SAMADHAN Draft Ticket API - Get draft data for editing
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSamadhanSession } from "@/lib/samadhan-auth";

type RouteParams = { params: Promise<{ referenceId: string }> };

// GET - Get draft ticket data for editing
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { referenceId } = await params;

    // Require SAMADHAN session - drafts are only for logged-in users
    const samadhanSession = await getSamadhanSession();

    if (!samadhanSession?.userId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    // Find the draft ticket
    const ticket = await prisma.samadhanTicket.findFirst({
      where: {
        referenceId,
        citizenId: samadhanSession.userId, // Ensure user owns this draft
        isDraft: true,
        status: "DRAFT",
      },
      select: {
        id: true,
        referenceId: true,
        queryType: true,
        sectionId: true,
        subject: true,
        serviceAvailed: true, // JSON array of service IDs
        description: true,
        visitedDC: true,
        visitDate: true,
        citizenName: true,
        citizenEmail: true,
        citizenPhone: true,
        isAnonymousToOfficer: true,
        section: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Draft not found or access denied" },
        { status: 404 },
      );
    }

    // Parse serviceAvailed from JSON - supports both old format (array) and new format (object)
    let selectedServiceId: string = "";
    let selectedCategories: string[] = [];

    if (ticket.serviceAvailed) {
      try {
        const parsed = JSON.parse(ticket.serviceAvailed);

        // Check if it's the new format with serviceId and categoryIds
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          selectedServiceId = parsed.serviceId || "";
          selectedCategories = parsed.categoryIds || [];
        } else if (Array.isArray(parsed)) {
          // Old format - array of IDs (could be service IDs or category IDs)
          // For backwards compatibility, treat as category IDs
          selectedCategories = parsed;
        }
      } catch {
        // If parsing fails, leave as empty
        selectedServiceId = "";
        selectedCategories = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        referenceId: ticket.referenceId,
        queryType: ticket.queryType,
        sectionId: ticket.sectionId,
        section: ticket.section,
        subject: ticket.subject || "",
        selectedServiceId,
        selectedCategories,
        description: ticket.description || "",
        visitedDC: ticket.visitedDC,
        visitDate: ticket.visitDate
          ? ticket.visitDate.toISOString().split("T")[0]
          : "",
        citizenName: ticket.citizenName || "",
        citizenEmail: ticket.citizenEmail || "",
        citizenPhone: ticket.citizenPhone || "",
        isAnonymousToOfficer: ticket.isAnonymousToOfficer || false,
        attachments: ticket.attachments || [],
      },
    });
  } catch (error) {
    console.error("Failed to fetch draft:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch draft" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a draft ticket
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { referenceId } = await params;

    // Require SAMADHAN session
    const samadhanSession = await getSamadhanSession();

    if (!samadhanSession?.userId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    // Find and delete the draft
    const ticket = await prisma.samadhanTicket.findFirst({
      where: {
        referenceId,
        citizenId: samadhanSession.userId,
        isDraft: true,
        status: "DRAFT",
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Draft not found or access denied" },
        { status: 404 },
      );
    }

    // Delete related records first
    await prisma.samadhanStatusHistory.deleteMany({
      where: { ticketId: ticket.id },
    });

    await prisma.samadhanTicket.delete({
      where: { id: ticket.id },
    });

    return NextResponse.json({
      success: true,
      message: "Draft deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete draft:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete draft" },
      { status: 500 },
    );
  }
}
