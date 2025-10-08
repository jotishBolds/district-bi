import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus, Prisma } from "@/app/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as ApplicationStatus | null;
    const serviceCategory = searchParams.get("serviceCategory") || "";

    const skip = (page - 1) * limit;

    // Build where conditions based on user role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let whereConditions: Record<string, any> = {};

    if (session.user.role === "FRONT_DESK") {
      // Get officer profiles assigned to this frontdesk
      const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
        where: {
          frontdeskUserId: session.user.id,
        },
        include: {
          officer: true,
        },
      });

      const officerProfiles = frontdeskAssignments
        .map((assignment) => assignment.officer)
        .filter((officer) => officer !== null);

      // Get the user IDs of these officers
      const officerUserIds = officerProfiles.map((profile) => profile.userId);

      // Frontdesk can see:
      // 1. Applications they directly validated
      // 2. Applications forwarded to them
      // 3. Applications forwarded by them
      // 4. Applications currently held by their assigned officers
      // 5. Applications created through their workflow
      whereConditions.OR = [
        {
          // Applications validated by this frontdesk user
          validation: {
            validatedById: session.user.id,
          },
        },
        {
          // Applications forwarded to this frontdesk
          frontdeskForwardings: {
            some: {
              toFrontdeskId: session.user.id,
              isActive: true,
            },
          },
        },
        {
          // Applications forwarded by this frontdesk
          frontdeskForwardings: {
            some: {
              fromFrontdeskId: session.user.id,
            },
          },
        },
        {
          // Applications in workflow where this frontdesk made changes
          workflow: {
            some: {
              changedById: session.user.id,
            },
          },
        },
        {
          // Applications currently held by officers assigned to this frontdesk
          currentHolderId: {
            in: officerUserIds,
          },
        },
        {
          // Applications where current holder is this frontdesk user
          currentHolderId: session.user.id,
        },
      ];
    } else if (
      [
        "DC",
        "ADC",
        "RO",
        "SDM",
        "DYDIR",
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
      ].includes(session.user.role)
    ) {
      // Officers can see:
      // 1. Applications assigned to them
      // 2. Applications they've forwarded
      // 3. Applications where they are current holder
      // 4. Applications in their workflow history
      whereConditions.OR = [
        {
          // Applications assigned to this officer
          officerAssignments: {
            some: {
              assignedToId: session.user.id,
            },
          },
        },
        {
          // Applications forwarded by this officer
          officerForwardings: {
            some: {
              fromOfficerId: session.user.id,
            },
          },
        },
        {
          // Applications forwarded to this officer
          officerForwardings: {
            some: {
              toOfficerId: session.user.id,
            },
          },
        },
        {
          // Applications in workflow where this officer made changes
          workflow: {
            some: {
              changedById: session.user.id,
            },
          },
        },
        {
          // Applications where current holder is this officer
          currentHolderId: session.user.id,
        },
      ];
    } else if (session.user.role === "DISPATCH_HANDLER") {
      // Dispatch handlers can see completed applications ready for dispatch
      whereConditions = {
        status: {
          in: [ApplicationStatus.RESOLVED, ApplicationStatus.CLOSED],
        },
      };
    } else if (["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      // Admins can see all applications
      whereConditions = {};
    } else {
      // Default: no access
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Add search filters
    if (search) {
      // Check if search term looks like a complete RR number (format: RR-XXXXXX-XXXX-XX)
      const rrNumberPattern = /^RR-\d{6}-\d{4}-\d{2}$/;
      const isCompleteRRNumber = rrNumberPattern.test(search.trim());

      const searchConditions = {
        OR: [
          {
            rrNumber: isCompleteRRNumber
              ? {
                  equals: search.trim(),
                  mode: "insensitive",
                }
              : {
                  contains: search,
                  mode: "insensitive",
                },
          },
          {
            citizenName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            citizenPhone: {
              contains: search,
            },
          },
          {
            subject: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      };

      // Apply search conditions to role-based filters
      if (whereConditions.OR) {
        // For role-based OR conditions, apply search filter to each condition
        whereConditions.OR = whereConditions.OR.map((condition: unknown) => ({
          ...(condition as Record<string, unknown>),
          ...searchConditions,
        }));
      } else {
        // For non-role-based filters (like admin), just add search conditions
        whereConditions = {
          ...whereConditions,
          ...searchConditions,
        };
      }
    }

    // Add status filter
    if (status) {
      whereConditions.status = status;
    }

    // Add service category filter
    if (serviceCategory) {
      whereConditions.serviceCategoryId = serviceCategory;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: whereConditions,
        include: {
          serviceCategory: {
            select: {
              id: true,
              name: true,
              color: true,
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
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          workflow: {
            include: {
              changedBy: {
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
            take: 5, // Latest 5 workflow entries for preview
          },
          officerAssignments: {
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
              assignedBy: {
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
          },
          officerForwardings: {
            where: {
              isActive: true,
            },
            include: {
              fromOfficer: {
                include: {
                  officerProfile: {
                    select: {
                      fullName: true,
                      designation: true,
                    },
                  },
                },
              },
              toOfficer: {
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
          },
          frontdeskForwardings: {
            where: {
              isActive: true,
            },
            include: {
              fromFrontdesk: {
                include: {
                  citizenProfile: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
              toFrontdesk: {
                include: {
                  citizenProfile: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              fileName: true,
              isVerified: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              workflow: true,
              officerAssignments: true,
              documents: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.application.count({
        where: whereConditions,
      }),
    ]);

    return NextResponse.json({
      applications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      userRole: session.user.role,
    });
  } catch (error) {
    console.error("Error fetching tracking data:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
