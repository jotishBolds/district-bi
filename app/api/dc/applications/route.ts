import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus, Prisma } from "@/app/generated/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();

    // Verify user is DC
    if (!session?.user || session.user.role !== UserRole.DC) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || ""; // Build where clause
    const where: Prisma.ApplicationWhereInput = {};
    if (status && status !== "ALL") {
      where.status = status as ApplicationStatus;
    }

    if (search) {
      where.OR = [
        { rrNumber: { contains: search, mode: "insensitive" } },
        {
          citizen: {
            citizenProfile: {
              fullName: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          serviceCategory: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Get applications with all necessary relations
    const applications = await prisma.application.findMany({
      where,
      include: {
        serviceCategory: {
          select: {
            name: true,
            slaDays: true,
          },
        },
        citizen: {
          include: {
            citizenProfile: {
              select: {
                fullName: true,
                phone: true,
              },
            },
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
        workflow: {
          select: {
            toStatus: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        officerAssignments: {
          include: {
            assignedTo: {
              include: {
                officerProfile: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate stats
    const stats = {
      total: await prisma.application.count(),
      pending: await prisma.application.count({
        where: { status: ApplicationStatus.PENDING },
      }),
      inProgress: await prisma.application.count({
        where: { status: ApplicationStatus.IN_PROGRESS },
      }),
      completed: await prisma.application.count({
        where: { status: ApplicationStatus.APPROVED },
      }),
      overdue: await prisma.application.count({
        where: {
          status: {
            in: [ApplicationStatus.VALIDATED, ApplicationStatus.IN_PROGRESS],
          },
          validatedAt: {
            not: null,
          },
          completedAt: null,
          serviceCategory: {
            slaDays: {
              not: undefined,
            },
          },
        },
      }),
    };

    return NextResponse.json({
      applications,
      stats,
    });
  } catch (error) {
    console.error("Error fetching DC applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
