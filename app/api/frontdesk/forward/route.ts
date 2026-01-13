// app/api/frontdesk/forward/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json(
        { error: "Only frontdesk users can forward applications" },
        { status: 403 }
      );
    }

    const { applicationId, toOfficerId, instructions } = await request.json();

    if (!applicationId || !toOfficerId) {
      return NextResponse.json(
        { error: "Application ID and target officer are required" },
        { status: 400 }
      );
    }

    // Check if this is a self-forward (forwarding to self)
    const isSelfForward = toOfficerId === session.user.id;

    // Get the current frontdesk assignments
    const currentFrontdeskAssignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
        officerId: { not: null },
      },
    });

    // Check if this is a general frontdesk (no specific assignments)
    const allAssignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
      },
    });

    const isGeneralFrontdesk =
      allAssignments.length === 0 ||
      allAssignments.every((assignment) => assignment.officerId === null);

    // If it's not a general frontdesk and has no specific assignments, deny access
    // But allow self-forward
    if (
      !isGeneralFrontdesk &&
      currentFrontdeskAssignments.length === 0 &&
      !isSelfForward
    ) {
      return NextResponse.json(
        { error: "You are not assigned to any specific officers" },
        { status: 403 }
      );
    }

    // Find the target user profile by User ID
    const targetOfficerProfile = await prisma.user.findUnique({
      where: { id: toOfficerId },
      include: {
        officerProfile: true,
      },
    });

    // For self-forward, the target is the frontdesk user themselves
    // Allow even if they don't have an officer profile
    if (!targetOfficerProfile) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Only require officer profile if not self-forward
    if (!isSelfForward && !targetOfficerProfile.officerProfile) {
      return NextResponse.json(
        { error: "Target officer not found" },
        { status: 404 }
      );
    }

    const targetFrontdeskAssignment = await prisma.frontdeskOfficer.findFirst({
      where: {
        officer: {
          userId: toOfficerId, // Match by User ID
        },
      },
      include: {
        frontdeskUser: true,
      },
    });

    // For general frontdesk users, we don't require a target frontdesk assignment
    // For specific frontdesk users, we also allow forwarding to officers without frontdesk assignments
    // Only show error if we can't find any valid forwarding path
    if (!isGeneralFrontdesk && !targetFrontdeskAssignment) {
      console.log(
        "Warning: No frontdesk assignment found for target officer, proceeding with direct assignment"
      );
    }

    // Get the User IDs for officers assigned to this frontdesk (only for specific frontdesk)
    let officerUserIds: string[] = [];
    if (!isGeneralFrontdesk) {
      const officerProfiles = await prisma.officerProfile.findMany({
        where: {
          id: {
            in: currentFrontdeskAssignments.map(
              (assignment) => assignment.officerId!
            ),
          },
        },
        select: {
          userId: true,
        },
      });
      officerUserIds = officerProfiles.map((profile) => profile.userId);
    }

    // Verify the application exists and check if this frontdesk can forward it
    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        serviceCategory: true,
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
        frontdeskForwardings: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Debug logging
    console.log("Forward API - Application details:", {
      id: application.id,
      rrNumber: application.rrNumber,
      status: application.status,
      currentHolderId: application.currentHolderId,
      activeForwardings: application.frontdeskForwardings.length,
    });

    // Check if application can be forwarded based on status
    // Applications can be forwarded unless they are RESOLVED or CLOSED
    if (application.status === "RESOLVED" || application.status === "CLOSED") {
      return NextResponse.json(
        {
          error:
            "Cannot forward resolved or closed applications. Only in-progress or reopened applications can be forwarded.",
        },
        { status: 400 }
      );
    }

    // Check if this frontdesk has permission to forward this application
    // General frontdesk can forward any application
    // Specific frontdesk can only forward applications held by their officers or received via forwarding
    if (!isGeneralFrontdesk) {
      const isAssignedToMyOfficers = application.currentHolderId
        ? officerUserIds.includes(application.currentHolderId)
        : false;

      const receivedByMe = await prisma.frontdeskForwarding.findFirst({
        where: {
          applicationId,
          toFrontdeskId: session.user.id,
          isActive: true,
        },
      });

      // Check if this application is self-forwarded (current holder is this frontdesk user)
      const isSelfForwarded = application.currentHolderId === session.user.id;

      if (!isAssignedToMyOfficers && !receivedByMe && !isSelfForwarded) {
        return NextResponse.json(
          { error: "You don't have permission to forward this application" },
          { status: 403 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deactivate any existing active forwarding for this application
      await tx.frontdeskForwarding.updateMany({
        where: {
          applicationId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Update application holder to target user
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          currentHolderId: targetOfficerProfile.id, // Use User ID
          updatedAt: new Date(),
        },
      });

      // Create frontdesk forwarding record (only if target frontdesk exists and not self-forward)
      if (targetFrontdeskAssignment && !isSelfForward) {
        await tx.frontdeskForwarding.create({
          data: {
            applicationId,
            fromFrontdeskId: session.user.id,
            toFrontdeskId: targetFrontdeskAssignment.frontdeskUserId,
            fromOfficerId: application.currentHolderId!, // Current User ID
            toOfficerId: targetOfficerProfile.id, // Target User ID
            instructions: instructions || "Application forwarded",
            isActive: true,
          },
        });
      }

      // Create officer assignment record (skip for self-forward to avoid duplicate assignments)
      if (!isSelfForward) {
        await tx.officerAssignment.create({
          data: {
            applicationId,
            assignedById: session.user.id,
            assignedToId: targetOfficerProfile.id, // Use User ID
            instructions: instructions || "Application forwarded by frontdesk",
            priority: 1, // Always HIGH priority
          },
        });
      }

      // Create workflow entry
      await tx.applicationWorkflow.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: application.status, // Status remains same
          changedById: session.user.id,
          comments: isSelfForward
            ? `Application self-forwarded by frontdesk with instructions: ${
                instructions || "No specific instructions"
              }`
            : `Application forwarded by frontdesk to another officer`,
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          action: isSelfForward
            ? "APPLICATION_SELF_FORWARDED"
            : "APPLICATION_FORWARDED_BY_FRONTDESK",
          performedById: session.user.id,
          oldValues: { currentHolderId: application.currentHolderId },
          newValues: { currentHolderId: targetOfficerProfile.id },
        },
      });

      // Create notification for target frontdesk (only if target frontdesk exists)
      if (targetFrontdeskAssignment) {
        await tx.notification.create({
          data: {
            userId: targetFrontdeskAssignment.frontdeskUserId,
            notificationType: "STATUS_CHANGED",
            applicationId,
            title: "Application Forwarded to Your Officer",
            message: `Application ${
              application.rrNumber || application.id
            } has been forwarded to another officer`,
            isRead: false,
          },
        });
      }

      return updatedApplication;
    });

    return NextResponse.json({
      message: "Application forwarded successfully",
      application: result,
      forwardedTo: {
        frontdesk:
          targetFrontdeskAssignment?.frontdeskUser?.email ||
          "General forwarding",
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
