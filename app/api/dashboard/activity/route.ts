// app/api/dashboard/activity/route.ts
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import { isOfficerOrOfficial } from "@/lib/officer-roles";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  date: string;
  unread?: boolean;
}

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;

    // Get recent activities from application workflow
    let activities: ActivityItem[] = [];
    let notifications: ActivityItem[] = [];

    if (userRole === UserRole.FRONT_DESK) {
      // Front desk activities
      const recentWorkflow = await prisma.applicationWorkflow.findMany({
        where: {
          changedById: session.user.id,
        },
        include: {
          application: {
            select: {
              rrNumber: true,
              serviceCategory: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });

      activities = recentWorkflow.map((workflow) => ({
        id: workflow.id,
        title: getActivityTitle(workflow.toStatus),
        description: `${
          workflow.application.serviceCategory?.name || "Application"
        } ${workflow.application.rrNumber}`,
        date: workflow.createdAt.toISOString().split("T")[0],
        unread: false,
      }));

      // Get pending notifications
      const pendingNotifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      });

      notifications = pendingNotifications.map((notif) => ({
        id: notif.id,
        title: notif.title,
        description: notif.message,
        date: notif.createdAt.toISOString().split("T")[0],
        unread: !notif.isRead,
      }));
    } else if (userRole && isOfficerOrOfficial(userRole)) {
      // Officer/Official activities
      const recentAssignments = await prisma.officerAssignment.findMany({
        where: {
          OR: [
            { assignedToId: session.user.id },
            { assignedById: session.user.id },
          ],
        },
        include: {
          application: {
            select: {
              rrNumber: true,
              serviceCategory: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });

      activities = recentAssignments.map((assignment) => ({
        id: assignment.id,
        title:
          assignment.assignedToId === session.user.id
            ? "New Assignment"
            : "Assignment Given",
        description: `${
          assignment.application.serviceCategory?.name || "Application"
        } ${assignment.application.rrNumber}`,
        date: assignment.createdAt.toISOString().split("T")[0],
        unread: false,
      }));

      // Get officer notifications
      const officerNotifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      });

      notifications = officerNotifications.map((notif) => ({
        id: notif.id,
        title: notif.title,
        description: notif.message,
        date: notif.createdAt.toISOString().split("T")[0],
        unread: !notif.isRead,
      }));
    } else if (
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN
    ) {
      // Admin activities
      const recentSystemChanges = await prisma.applicationAuditLog.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        include: {
          application: {
            select: {
              rrNumber: true,
            },
          },
          performedBy: {
            select: {
              officerProfile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });

      activities = recentSystemChanges.map((log) => ({
        id: log.id,
        title: formatAuditAction(log.action),
        description: `${log.application?.rrNumber || "System"} by ${
          log.performedBy?.officerProfile?.fullName || "System"
        }`,
        date: log.createdAt.toISOString().split("T")[0],
        unread: false,
      }));

      // System notifications (placeholder)
      notifications = [
        {
          id: "sys-1",
          title: "System Update",
          description: "All systems operational",
          date: new Date().toISOString().split("T")[0],
          unread: false,
        },
      ];
    }

    return NextResponse.json({
      activities,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getActivityTitle(status: string): string {
  switch (status) {
    case "VALIDATED":
      return "Application Validated";
    case "OPEN":
      return "Application Opened";
    case "IN_PROGRESS":
      return "Processing Started";
    case "RESOLVED":
      return "Application Resolved";
    case "CLOSED":
      return "Application Closed";
    default:
      return "Status Updated";
  }
}

function formatAuditAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
