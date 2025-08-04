// app/api/frontdesk/recent-forwarded/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

// GET: Fetch applications recently forwarded by this frontdesk user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json(
        { error: "Not a frontdesk user" },
        { status: 403 }
      );
    }

    // Get applications that this frontdesk user has forwarded
    const recentForwarded = await prisma.application.findMany({
      where: {
        officerAssignments: {
          some: {
            assignedById: session.user.id,
          },
        },
      },
      include: {
        serviceCategory: {
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
        officerAssignments: {
          where: {
            assignedById: session.user.id,
          },
          include: {
            assignedTo: {
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
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the most recent assignment by this user
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 20, // Limit to last 20 forwarded applications
    });

    return NextResponse.json({
      applications: recentForwarded,
    });
  } catch (error) {
    console.error("Error fetching recent forwarded applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
