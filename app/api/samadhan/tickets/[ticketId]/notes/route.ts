// SAMADHAN Internal Notes API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
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

// POST - Add internal note
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

    // Only officers can add notes
    const isOfficer = session.user.role && session.user.role !== "FRONT_DESK";
    if (!isOfficer) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = noteSchema.parse(body);

    // Verify ticket exists by ID or referenceId
    const ticket = await findTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Create note
    const note = await prisma.samadhanInternalNote.create({
      data: {
        ticketId: ticket.id,
        createdById: session.user.id,
        content: validatedData.content,
      },
      include: {
        createdBy: {
          select: {
            officerProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Note added successfully",
      data: {
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        createdByName: note.createdBy?.officerProfile?.fullName || "Unknown",
      },
    });
  } catch (error) {
    console.error("Internal note creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to add note" },
      { status: 500 }
    );
  }
}

// GET - Get all notes for a ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only officers can view notes
    const isOfficer = session.user.role && session.user.role !== "FRONT_DESK";
    if (!isOfficer) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    // Find ticket by ID or referenceId
    const ticket = await findTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 }
      );
    }

    const notes = await prisma.samadhanInternalNote.findMany({
      where: { ticketId: ticket.id },
      include: {
        createdBy: {
          select: {
            officerProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        createdByName: note.createdBy?.officerProfile?.fullName || "Unknown",
      })),
    });
  } catch (error) {
    console.error("Internal notes fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}
