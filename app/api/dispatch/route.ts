// app/api/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";

// GET - Get all closed applications for dispatch
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.DISPATCH_HANDLER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || "";
    const dispatchStatus = searchParams.get("dispatchStatus") || "all"; // all, dispatched, pending

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: {
      status: typeof ApplicationStatus.CLOSED;
      OR?: Array<{
        rrNumber?: { contains: string; mode: "insensitive" };
        subject?: { contains: string; mode: "insensitive" };
        citizenName?: { contains: string; mode: "insensitive" };
        citizenPhone?: { contains: string; mode: "insensitive" };
      }>;
      departmentId?: string;
      isDispatched?: boolean;
    } = {
      status: ApplicationStatus.CLOSED,
    };

    if (search) {
      whereClause.OR = [
        { rrNumber: { contains: search, mode: "insensitive" } },
        { citizenName: { contains: search, mode: "insensitive" } },
        { citizenPhone: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    if (dispatchStatus === "dispatched") {
      whereClause.isDispatched = true;
    } else if (dispatchStatus === "pending") {
      whereClause.isDispatched = false;
    }

    const [applications, totalCount] = await Promise.all([
      prisma.application.findMany({
        where: whereClause,
        include: {
          serviceCategory: {
            select: {
              name: true,
              slaDays: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
          currentHolder: {
            include: {
              officerProfile: {
                select: {
                  fullName: true,
                  designation: true,
                },
              },
            },
          },
          dispatchedBy: {
            include: {
              officerProfile: {
                select: {
                  fullName: true,
                  designation: true,
                },
              },
            },
          },
        },
        orderBy: [
          { isDispatched: "asc" }, // Pending first
          { completedAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.application.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      applications,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching applications for dispatch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Dispatch multiple applications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.DISPATCH_HANDLER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { applicationIds } = await request.json();

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: "Application IDs are required" },
        { status: 400 }
      );
    }

    // Verify all applications are closed and not already dispatched
    const applications = await prisma.application.findMany({
      where: {
        id: { in: applicationIds },
        status: ApplicationStatus.CLOSED,
        isDispatched: false,
      },
    });

    if (applications.length !== applicationIds.length) {
      return NextResponse.json(
        {
          error:
            "Some applications are not eligible for dispatch (not closed or already dispatched)",
        },
        { status: 400 }
      );
    }

    // Dispatch applications in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedApplications = await tx.application.updateMany({
        where: {
          id: { in: applicationIds },
        },
        data: {
          isDispatched: true,
          dispatchedAt: new Date(),
          dispatchedById: session.user.id,
        },
      });

      // Create notifications for each application (if needed)
      // You can extend this to notify relevant parties

      return updatedApplications;
    });

    return NextResponse.json({
      message: `Successfully dispatched ${result.count} applications`,
      dispatchedCount: result.count,
    });
  } catch (error) {
    console.error("Error dispatching applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
