// app/api/frontdesk/queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";
import { getAllOfficerRoles } from "@/lib/officer-roles";

// GET: Fetch open applications for specific frontdesk users
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

    // Check if this frontdesk user is assigned to specific officers
    const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
        officerId: { not: null }, // Only specific assignments
      },
      include: {
        officer: {
          include: {
            user: true, // Get the user information through officer profile
          },
        },
      },
    });

    // If no specific assignments, this user cannot access the queue
    if (frontdeskAssignments.length === 0) {
      return NextResponse.json(
        { error: "Only specific frontdesk users can access the queue" },
        { status: 403 }
      );
    }

    // Fetch all open applications
    const queuedApplications = await prisma.application.findMany({
      where: {
        status: ApplicationStatus.OPEN,
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
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
      },
      orderBy: {
        createdAt: "asc", // FIFO order
      },
    });

    return NextResponse.json({
      applications: queuedApplications,
      assignedOfficers: frontdeskAssignments
        .filter((assignment) => assignment.officer && assignment.officer.user) // Filter out null assignments
        .map((assignment) => ({
          id: assignment.officer!.user.id, // Use user ID, not officer profile ID
          fullName: assignment.officer!.fullName,
          designation: assignment.officer!.designation,
          department: assignment.officer!.department,
        })),
    });
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Pull an application from queue and assign to officer
export async function POST(request: NextRequest) {
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

    const {
      applicationId,
      officerId,
      // priority is always HIGH (1) - removed from UI
      instructions,
      serviceCategoryId,
    } = await request.json();

    if (!applicationId || !officerId) {
      return NextResponse.json(
        {
          error: "Missing required fields: applicationId, officerId",
        },
        { status: 400 }
      );
    }

    // Check if this frontdesk user is assigned to the specified officer
    const frontdeskAssignment = await prisma.frontdeskOfficer.findFirst({
      where: {
        frontdeskUserId: session.user.id,
        officer: {
          user: {
            id: officerId, // Find by user ID
          },
        },
      },
      include: {
        officer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!frontdeskAssignment) {
      return NextResponse.json(
        { error: "You are not assigned to this officer" },
        { status: 403 }
      );
    }

    // Verify application is in queue
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        status: ApplicationStatus.OPEN,
      },
      include: {
        serviceCategory: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found in queue" },
        { status: 404 }
      );
    }

    // Verify officer exists and is available
    const officer = await prisma.user.findFirst({
      where: {
        id: officerId, // Search by user ID directly
        role: {
          in: getAllOfficerRoles(), // Use all valid officer and official roles
        },
        isActive: true,
        officerProfile: {
          isAvailable: true,
        },
      },
      include: {
        officerProfile: true,
      },
    });

    if (!officer) {
      return NextResponse.json(
        { error: "Officer is not available" },
        { status: 400 }
      );
    }

    // Start transaction to pull application from queue
    const result = await prisma.$transaction(async (tx) => {
      // Update application status to IN_PROGRESS and assign officer
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.IN_PROGRESS,
          currentHolderId: officer.id,
          updatedAt: new Date(),
          ...(serviceCategoryId && { serviceCategoryId }),
        },
      });

      // Create workflow entry
      await tx.applicationWorkflow.create({
        data: {
          applicationId,
          fromStatus: ApplicationStatus.OPEN,
          toStatus: ApplicationStatus.IN_PROGRESS,
          changedById: session.user.id,
          comments: `Application pulled from queue and assigned to ${
            frontdeskAssignment.officer?.fullName
          }${instructions ? `: ${instructions}` : ""}`,
        },
      });

      // Create officer assignment
      await tx.officerAssignment.create({
        data: {
          applicationId,
          assignedById: session.user.id,
          assignedToId: officer.id,
          priority: 1, // Always HIGH priority
          instructions: instructions || "No specific instructions provided",
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          action: "APPLICATION_PULLED_FROM_QUEUE",
          performedById: session.user.id,
          oldValues: {
            status: ApplicationStatus.OPEN,
            currentHolderId: null,
          },
          newValues: {
            status: ApplicationStatus.IN_PROGRESS,
            currentHolderId: officer.id,
            assignedOfficerName: frontdeskAssignment.officer?.fullName,
          },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
      });

      // Create notification for assigned officer
      await tx.notification.create({
        data: {
          userId: officer.id,
          notificationType: "APPLICATION_SUBMITTED",
          applicationId,
          title: "New Application Assigned from Queue",
          message: `An open application for ${application.serviceCategory.name} (RR: ${application.rrNumber}) has been assigned to you.`,
          isRead: false,
        },
      });

      // If service category was changed, create a service category change log
      if (
        serviceCategoryId &&
        serviceCategoryId !== application.serviceCategoryId
      ) {
        await tx.serviceCategoryChange.create({
          data: {
            applicationId,
            previousCategoryId: application.serviceCategoryId,
            newCategoryId: serviceCategoryId,
            changedById: session.user.id,
            reason: "Service category assigned during queue pull",
          },
        });
      }

      return updatedApplication;
    });

    return NextResponse.json({
      message: `Application successfully pulled from queue and assigned to ${frontdeskAssignment.officer?.fullName}`,
      application: result,
    });
  } catch (error) {
    console.error("Error pulling application from queue:", error);
    return NextResponse.json(
      { error: "Failed to pull application from queue" },
      { status: 500 }
    );
  }
}
