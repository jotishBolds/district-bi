// app/api/dispatch/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";

// GET - Get dispatch statistics
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
    const timeframe = searchParams.get("timeframe") || "all"; // today, week, month, all

    let dateFilter = {};

    if (timeframe === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      dateFilter = {
        completedAt: {
          gte: today,
          lt: tomorrow,
        },
      };
    } else if (timeframe === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      dateFilter = {
        completedAt: {
          gte: weekAgo,
        },
      };
    } else if (timeframe === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      dateFilter = {
        completedAt: {
          gte: monthAgo,
        },
      };
    }

    // Get basic counts
    const [
      totalClosedApplications,
      totalDispatchedApplications,
      pendingDispatchApplications,
    ] = await Promise.all([
      prisma.application.count({
        where: {
          status: ApplicationStatus.CLOSED,
          ...dateFilter,
        },
      }),
      prisma.application.count({
        where: {
          status: ApplicationStatus.CLOSED,
          isDispatched: true,
          ...dateFilter,
        },
      }),
      prisma.application.count({
        where: {
          status: ApplicationStatus.CLOSED,
          isDispatched: false,
          ...dateFilter,
        },
      }),
    ]);

    // Get department-wise statistics
    const departmentStats = await prisma.application.groupBy({
      by: ["departmentId", "isDispatched"],
      where: {
        status: ApplicationStatus.CLOSED,
        ...dateFilter,
      },
      _count: true,
    });

    // Get departments for mapping
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const departmentMap = departments.reduce((acc, dept) => {
      acc[dept.id] = dept.name;
      return acc;
    }, {} as Record<string, string>);

    // Process department statistics
    const departmentSummary = departmentStats.reduce((acc, stat) => {
      const deptName = departmentMap[stat.departmentId] || "Unknown";

      if (!acc[deptName]) {
        acc[deptName] = {
          total: 0,
          dispatched: 0,
          pending: 0,
        };
      }

      acc[deptName].total += stat._count;

      if (stat.isDispatched) {
        acc[deptName].dispatched += stat._count;
      } else {
        acc[deptName].pending += stat._count;
      }

      return acc;
    }, {} as Record<string, { total: number; dispatched: number; pending: number }>);

    // Get recent dispatch activity (last 10 dispatched applications)
    const recentDispatches = await prisma.application.findMany({
      where: {
        status: ApplicationStatus.CLOSED,
        isDispatched: true,
        dispatchedAt: { not: null },
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
          },
        },
        department: {
          select: {
            name: true,
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
      orderBy: {
        dispatchedAt: "desc",
      },
      take: 10,
    });

    return NextResponse.json({
      overview: {
        totalClosed: totalClosedApplications,
        totalDispatched: totalDispatchedApplications,
        pendingDispatch: pendingDispatchApplications,
        dispatchRate:
          totalClosedApplications > 0
            ? Math.round(
                (totalDispatchedApplications / totalClosedApplications) * 100
              )
            : 0,
      },
      departmentStats: departmentSummary,
      recentDispatches,
      timeframe,
    });
  } catch (error) {
    console.error("Error fetching dispatch statistics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
