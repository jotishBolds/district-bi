// app/api/dashboard/recent-applications/route.ts
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";
import { isOfficerOrOfficial, getAllOfficerRoles } from "@/lib/officer-roles";

interface Application {
  id: string;
  rrNumber: string | null;
  service: string;
  status: string;
  updatedAt: string;
}

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    let applications: Application[] = [];
    let title = "Recent Applications";

    if (userRole === UserRole.FRONT_DESK) {
      // Front desk sees pending validation applications
      title = "Applications in Queue";

      const pendingApps = await prisma.application.findMany({
        where: {
          status: {
            in: [ApplicationStatus.PENDING, ApplicationStatus.VALIDATED],
          },
        },
        include: {
          serviceCategory: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 6,
      });

      applications = pendingApps.map((app) => ({
        id: app.id,
        rrNumber: app.rrNumber,
        service: app.serviceCategory?.name || "Unknown Service",
        status: app.status,
        updatedAt: app.updatedAt.toISOString(),
      }));
    } else if (userRole && isOfficerOrOfficial(userRole)) {
      // Officers see assigned applications
      title = "Assigned Applications";

      const assignedApps = await prisma.application.findMany({
        where: {
          officerAssignments: {
            some: {
              assignedTo: {
                role: userRole,
              },
            },
          },
          status: ApplicationStatus.IN_PROGRESS,
        },
        include: {
          serviceCategory: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 6,
      });

      applications = assignedApps.map((app) => ({
        id: app.id,
        rrNumber: app.rrNumber,
        service: app.serviceCategory?.name || "Unknown Service",
        status: app.status,
        updatedAt: app.updatedAt.toISOString(),
      }));
    } else if (
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN
    ) {
      // Admins see all recent applications
      title = "System Overview";

      const recentApps = await prisma.application.findMany({
        include: {
          serviceCategory: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 6,
      });

      applications = recentApps.map((app) => ({
        id: app.id,
        rrNumber: app.rrNumber,
        service: app.serviceCategory?.name || "Unknown Service",
        status: app.status,
        updatedAt: app.updatedAt.toISOString(),
      }));
    } else {
      // For other users (citizens would typically access via tracking page, not dashboard)
      // Return empty for now as citizens don't have dashboard access
      title = "My Applications";
      applications = [];
    }

    return NextResponse.json({
      applications,
      title,
      count: applications.length,
    });
  } catch (error) {
    console.error("Error fetching recent applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent applications" },
      { status: 500 }
    );
  }
}
