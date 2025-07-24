// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";
import { isOfficerOrOfficial, getRoleMapping } from "@/lib/officer-roles";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    let stats = {};

    if (userRole === UserRole.FRONT_DESK) {
      // Front desk stats
      const [pendingValidation, validated, inQueue, totalProcessed] =
        await Promise.all([
          prisma.application.count({
            where: {
              status: ApplicationStatus.PENDING,
            },
          }),
          prisma.application.count({
            where: {
              status: ApplicationStatus.VALIDATED,
            },
          }),
          prisma.application.count({
            where: {
              status: ApplicationStatus.OPEN,
            },
          }),
          prisma.application.count({
            where: {
              status: {
                in: [
                  ApplicationStatus.VALIDATED,
                  ApplicationStatus.OPEN,
                  ApplicationStatus.IN_PROGRESS,
                  ApplicationStatus.RESOLVED,
                  ApplicationStatus.CLOSED,
                ],
              },
            },
          }),
        ]);

      stats = {
        cards: [
          {
            title: "Pending Validation",
            value: pendingValidation,
            badge: "Pending",
            description: "Applications awaiting validation",
          },
          {
            title: "Validated",
            value: validated,
            badge: "Validated",
            description: "Applications ready for assignment",
          },
          {
            title: "In Queue",
            value: inQueue,
            badge: "Queue",
            description: "Applications in officer queue",
          },
          {
            title: "Total Processed",
            value: totalProcessed,
            badge: "Total",
            description: "All processed applications",
          },
        ],
      };
    } else if (userRole && isOfficerOrOfficial(userRole)) {
      // Officer/Official stats
      const [assignedToMe, inProgress, resolved, overdue] = await Promise.all([
        prisma.application.count({
          where: {
            currentHolderId: session.user.id,
            status: {
              in: [ApplicationStatus.OPEN, ApplicationStatus.IN_PROGRESS],
            },
          },
        }),
        prisma.application.count({
          where: {
            currentHolderId: session.user.id,
            status: ApplicationStatus.IN_PROGRESS,
          },
        }),
        prisma.application.count({
          where: {
            currentHolderId: session.user.id,
            status: ApplicationStatus.RESOLVED,
          },
        }),
        prisma.application.count({
          where: {
            currentHolderId: session.user.id,
            status: {
              in: [ApplicationStatus.OPEN, ApplicationStatus.IN_PROGRESS],
            },
            createdAt: {
              lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            },
          },
        }),
      ]);

      const roleMapping = getRoleMapping(userRole);
      const designation = roleMapping?.shortDesignation || userRole;

      stats = {
        cards: [
          {
            title: "Assigned to Me",
            value: assignedToMe,
            badge: "Assigned",
            description: `Applications assigned to ${designation}`,
          },
          {
            title: "In Progress",
            value: inProgress,
            badge: "Processing",
            description: "Applications being processed",
          },
          {
            title: "Resolved",
            value: resolved,
            badge: "Resolved",
            description: "Applications completed",
          },
          {
            title: "Overdue",
            value: overdue,
            badge: "Overdue",
            description: "Applications pending for >7 days",
          },
        ],
      };
    } else if (
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN
    ) {
      // Admin stats
      const [totalApplications, activeUsers, pendingApprovals, systemIssues] =
        await Promise.all([
          prisma.application.count(),
          prisma.user.count({
            where: {
              isActive: true,
            },
          }),
          prisma.application.count({
            where: {
              status: ApplicationStatus.PENDING,
            },
          }),
          // For now, system issues is a placeholder - could be actual error logs in the future
          Promise.resolve(0),
        ]);

      stats = {
        cards: [
          {
            title: "Total Applications",
            value: totalApplications,
            badge: "Total",
            description: "All applications in system",
          },
          {
            title: "Active Users",
            value: activeUsers,
            badge: "Active",
            description: "Currently active users",
          },
          {
            title: "Pending Approvals",
            value: pendingApprovals,
            badge: "Pending",
            description: "Awaiting administrative action",
          },
          {
            title: "System Health",
            value: systemIssues === 0 ? "Good" : `${systemIssues} Issues`,
            badge: systemIssues === 0 ? "Healthy" : "Issues",
            description: "System status overview",
          },
        ],
      };
    } else {
      // Default stats for other roles
      stats = {
        cards: [
          {
            title: "My Applications",
            value: 0,
            badge: "Personal",
            description: "Your submitted applications",
          },
        ],
      };
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
