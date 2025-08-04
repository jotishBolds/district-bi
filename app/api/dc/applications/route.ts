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
    const search = searchParams.get("search") || "";
    const officerId = searchParams.get("officerId") || "";
    const departmentId = searchParams.get("departmentId") || "";
    const ageFilter = searchParams.get("ageFilter") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ApplicationWhereInput = {};

    if (status && status !== "ALL") {
      where.status = status as ApplicationStatus;
    }

    if (search) {
      where.OR = [
        { rrNumber: { contains: search, mode: "insensitive" } },
        { citizenName: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        {
          serviceCategory: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Officer filter
    if (officerId) {
      where.currentHolderId = officerId;
    }

    // Department filter
    if (departmentId) {
      where.departmentId = departmentId;
    }

    // Age filter (only for OPEN and IN_PROGRESS status)
    if (
      ageFilter &&
      (status === "OPEN" || status === "IN_PROGRESS" || status === "ALL")
    ) {
      const now = new Date();
      let dateThreshold: Date;

      switch (ageFilter) {
        case "recent": // < 3 days
          dateThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          where.submittedAt = { gte: dateThreshold };
          break;
        case "medium": // 3-7 days
          const sevenDaysAgo = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000
          );
          const threeDaysAgo = new Date(
            now.getTime() - 3 * 24 * 60 * 60 * 1000
          );
          where.submittedAt = {
            gte: sevenDaysAgo,
            lt: threeDaysAgo,
          };
          break;
        case "old": // > 7 days
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          where.submittedAt = { lt: dateThreshold };
          break;
      }
    }

    // Get applications with all necessary relations
    const applications = await prisma.application.findMany({
      where,
      skip,
      take: limit,
      include: {
        serviceCategory: {
          select: {
            name: true,
          },
        },
        currentHolder: {
          select: {
            id: true,
            level: true,
            role: true,
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
            fromStatus: true,
            toStatus: true,
            comments: true,
            createdAt: true,
            changedBy: {
              select: {
                id: true,
                role: true,
                level: true,
                email: true,
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
            createdAt: "asc",
          },
        },
        officerAssignments: {
          include: {
            assignedTo: {
              select: {
                id: true,
                level: true,
                role: true,
                officerProfile: {
                  select: {
                    fullName: true,
                    designation: true,
                  },
                },
              },
            },
            assignedBy: {
              select: {
                id: true,
                level: true,
                role: true,
                email: true,
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
            createdAt: "asc",
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            filePath: true,
            fileSize: true,
            isVerified: true,
            verificationNotes: true,
            createdAt: true,
            uploadedBy: {
              select: {
                id: true,
                role: true,
                email: true,
                citizenProfile: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            verifiedBy: {
              select: {
                id: true,
                role: true,
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
        },
        officerForwardings: {
          select: {
            id: true,
            instructions: true,
            priority: true,
            isActive: true,
            createdAt: true,
            fromOfficer: {
              select: {
                id: true,
                level: true,
                role: true,
                officerProfile: {
                  select: {
                    fullName: true,
                    designation: true,
                  },
                },
              },
            },
            toOfficer: {
              select: {
                id: true,
                level: true,
                role: true,
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
        },
        frontdeskForwardings: {
          select: {
            id: true,
            instructions: true,
            isActive: true,
            createdAt: true,
            fromFrontdesk: {
              select: {
                id: true,
                role: true,
                email: true,
              },
            },
            toFrontdesk: {
              select: {
                id: true,
                role: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.application.count({ where });

    // Calculate stats for status overview
    const statusStats = await Promise.all([
      prisma.application.count({
        where: { status: ApplicationStatus.OPEN },
      }),
      prisma.application.count({
        where: { status: ApplicationStatus.IN_PROGRESS },
      }),
      prisma.application.count({
        where: { status: ApplicationStatus.RESOLVED },
      }),
      prisma.application.count({
        where: { status: ApplicationStatus.CLOSED },
      }),
      prisma.application.count({
        where: { status: ApplicationStatus.REOPENED },
      }),
    ]);

    // Get age-wise stats for OPEN and IN_PROGRESS
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const ageStats = await Promise.all([
      // Recent (< 3 days) for OPEN and IN_PROGRESS
      prisma.application.count({
        where: {
          status: {
            in: [ApplicationStatus.OPEN, ApplicationStatus.IN_PROGRESS],
          },
          submittedAt: { gte: threeDaysAgo },
        },
      }),
      // Medium (3-7 days) for OPEN and IN_PROGRESS
      prisma.application.count({
        where: {
          status: {
            in: [ApplicationStatus.OPEN, ApplicationStatus.IN_PROGRESS],
          },
          submittedAt: {
            gte: sevenDaysAgo,
            lt: threeDaysAgo,
          },
        },
      }),
      // Old (> 7 days) for OPEN and IN_PROGRESS
      prisma.application.count({
        where: {
          status: {
            in: [ApplicationStatus.OPEN, ApplicationStatus.IN_PROGRESS],
          },
          submittedAt: { lt: sevenDaysAgo },
        },
      }),
    ]);

    // Get officers with application counts
    const officersWithCounts = await prisma.user.findMany({
      where: {
        role: {
          in: Object.values(UserRole).filter((role) =>
            [
              "DC",
              "ADC_GTK",
              "ADC_HQ",
              "SDM_GTK",
              "SDM_HQ",
              "AC",
              "DPO_DDMA",
              "DD_REV",
              "DD_ACQ",
              "US_ADM",
              "AO",
              "TO_DDMA",
              "AD_IT",
              "US_ELECTION",
              "OS_COI_RC",
              "OS_RC",
              "RI_LEGAL",
            ].includes(role)
          ),
        },
      },
      select: {
        id: true,
        role: true,
        level: true,
        officerProfile: {
          select: {
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: [{ level: "asc" }, { officerProfile: { fullName: "asc" } }],
    });

    // Get application counts for each officer
    const officersWithApplicationCounts = await Promise.all(
      officersWithCounts.map(async (officer) => {
        const count = await prisma.application.count({
          where: { currentHolderId: officer.id },
        });
        return { ...officer, applicationCount: count };
      })
    );

    // Get departments
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: "asc" },
    });

    // Calculate stats
    const stats = {
      total: await prisma.application.count(),
      open: statusStats[0],
      inProgress: statusStats[1],
      resolved: statusStats[2],
      closed: statusStats[3],
      reopened: statusStats[4],
      ageStats: {
        recent: ageStats[0],
        medium: ageStats[1],
        old: ageStats[2],
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    };

    return NextResponse.json({
      applications,
      stats,
      officers: officersWithApplicationCounts,
      departments,
    });
  } catch (error) {
    console.error("Error fetching DC applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
