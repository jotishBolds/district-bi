import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Fetch all query status requests with optional filters
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { queryDescription: { contains: search, mode: "insensitive" } },
      ];
    }

    const queries = await prisma.samadhanQueryStatusRequest.findMany({
      where,
      orderBy: [
        { status: "asc" }, // PENDING first
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      queries,
    });
  } catch (error) {
    console.error("Error fetching query status requests:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch queries" },
      { status: 500 }
    );
  }
}
