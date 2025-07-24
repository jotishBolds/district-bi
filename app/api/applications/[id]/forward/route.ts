// app/api/applications/[id]/forward/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";
import {
  getAllOfficerRoles,
  getForwardableOfficerRoles,
  isOfficerOrOfficial,
  canAssignTo,
  getLevelPriority,
} from "@/lib/officer-roles";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only officers can forward applications
    if (!isOfficerOrOfficial(session.user.role)) {
      return NextResponse.json(
        { error: "Only officers can forward applications" },
        { status: 403 }
      );
    }

    const { assignedToId, instructions, priority = 2 } = await request.json();

    if (!assignedToId || !instructions) {
      return NextResponse.json(
        { error: "Assigned officer and instructions are required" },
        { status: 400 }
      );
    }

    const applicationId = id;

    // Verify application exists and officer has access
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        currentHolderId: session.user.id, // Only current holder can forward
      },
      include: {
        serviceCategory: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        {
          error:
            "Application not found or you don't have permission to forward it",
        },
        { status: 404 }
      );
    }

    // Verify the target officer exists and is active
    const targetOfficer = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        role: {
          in: getForwardableOfficerRoles(),
        },
        isActive: true,
      },
      include: {
        officerProfile: true,
      },
    });

    if (!targetOfficer) {
      return NextResponse.json(
        { error: "Target officer not found or inactive" },
        { status: 404 }
      );
    }

    // Check level-based hierarchy: current user can only forward to same level or lower
    if (!canAssignTo(session.user.role, targetOfficer.role)) {
      const currentLevel = getLevelPriority(session.user.role);
      const targetLevel = getLevelPriority(targetOfficer.role);
      return NextResponse.json(
        {
          error: `Cannot forward to higher level officer. Your level: ${currentLevel}, Target level: ${targetLevel}`,
        },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the current active forwarding to mark it as completed
      await tx.officerForwardingHistory.updateMany({
        where: {
          applicationId,
          isActive: true,
        },
        data: {
          isActive: false,
          completedAt: new Date(),
        },
      });

      // Update application holder
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          currentHolderId: assignedToId,
          updatedAt: new Date(),
        },
      });

      // Create officer assignment record
      await tx.officerAssignment.create({
        data: {
          applicationId,
          assignedById: session.user.id,
          assignedToId,
          instructions,
          priority,
        },
      });

      // Create new officer forwarding history entry
      await tx.officerForwardingHistory.create({
        data: {
          applicationId,
          fromOfficerId: session.user.id,
          toOfficerId: assignedToId,
          instructions,
          priority,
          isActive: true,
          forwardedAt: new Date(),
        },
      });

      // Create workflow entry
      await tx.applicationWorkflow.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: application.status, // Status remains same, just holder changes
          changedById: session.user.id,
          comments: `Application forwarded to ${targetOfficer.officerProfile?.fullName}: ${instructions}`,
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          action: "APPLICATION_FORWARDED",
          performedById: session.user.id,
          oldValues: { currentHolderId: session.user.id },
          newValues: { currentHolderId: assignedToId },
        },
      });

      // Create notification for target officer
      await tx.notification.create({
        data: {
          userId: assignedToId,
          notificationType: "STATUS_CHANGED",
          applicationId,
          title: "New Application Assigned",
          message: `Application ${
            application.rrNumber || application.id
          } has been forwarded to you by ${session.user.email}`,
          isRead: false,
        },
      });

      return updatedApplication;
    });

    return NextResponse.json({
      message: "Application forwarded successfully",
      application: result,
      forwardedTo: {
        id: targetOfficer.id,
        name: targetOfficer.officerProfile?.fullName,
        designation: targetOfficer.officerProfile?.designation,
      },
    });
  } catch (error) {
    console.error("Error forwarding application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
