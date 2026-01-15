import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT - Update a query status request
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN", "DC"].includes(
        (session.user as { role?: string }).role || ""
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, adminNotes, matchedTickets } = body;

    // Check if query exists
    const existingQuery = await prisma.samadhanQueryStatusRequest.findUnique({
      where: { id },
    });

    if (!existingQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }

    // Update the query
    const updatedQuery = await prisma.samadhanQueryStatusRequest.update({
      where: { id },
      data: {
        status: status || existingQuery.status,
        adminNotes: adminNotes || null,
        matchedTickets: matchedTickets || null,
        respondedAt:
          status === "RESPONDED" ? new Date() : existingQuery.respondedAt,
        respondedBy:
          status === "RESPONDED"
            ? (session.user as { id?: string }).id || session.user.email || null
            : existingQuery.respondedBy,
      },
    });

    return NextResponse.json({
      success: true,
      query: updatedQuery,
    });
  } catch (error) {
    console.error("Error updating query status request:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update query" },
      { status: 500 }
    );
  }
}

// GET - Get single query details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN", "DC"].includes(
        (session.user as { role?: string }).role || ""
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const query = await prisma.samadhanQueryStatusRequest.findUnique({
      where: { id },
    });

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      query,
    });
  } catch (error) {
    console.error("Error fetching query:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch query" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a query
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes(
        (session.user as { role?: string }).role || ""
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    await prisma.samadhanQueryStatusRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Query deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting query:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete query" },
      { status: 500 }
    );
  }
}
