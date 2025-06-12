// app/api/applications/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  UserRole,
  ApplicationStatus,
  Application,
  User,
} from "@/app/generated/prisma";

// Define types for our application interfaces
interface ApplicationWithIncludes extends Application {
  serviceCategory: {
    name: string;
    slaDays: number;
  };
  officerAssignments: Array<{
    assignedTo: {
      id: string;
      officerProfile?: {
        fullName: string;
      } | null;
    };
  }>;
}

interface ValidationData {
  isDocumentsComplete?: boolean;
  isEligibilityVerified?: boolean;
  validationNotes?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applicationId = (await params).id;
    const { status, comments, action, ...additionalData } =
      await request.json();

    // Get the current application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        serviceCategory: true,
        citizen: {
          include: {
            citizenProfile: true,
          },
        },
        documents: true,
        officerAssignments: {
          include: {
            assignedTo: {
              include: {
                officerProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // If action is specified, delegate to the main PATCH handler
    if (action) {
      const response = await fetch(
        `${request.nextUrl.origin}/api/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(request.headers.entries()),
          },
          body: JSON.stringify({ action, ...additionalData, comments }),
        }
      );

      return response;
    }

    // Legacy status change handler for backward compatibility
    const canChangeStatus = await checkStatusChangePermission(
      session.user,
      application,
      status
    );

    if (!canChangeStatus) {
      return NextResponse.json(
        { error: "Insufficient permissions to change status" },
        { status: 403 }
      );
    }

    // Handle specific status transitions
    let result;

    switch (status) {
      case ApplicationStatus.PENDING:
        if (
          session.user.role === UserRole.CITIZEN &&
          application.status === ApplicationStatus.DRAFT
        ) {
          result = await handleStatusTransition(
            application,
            status,
            session.user.id,
            comments || "Application submitted for validation",
            request
          );
        } else {
          throw new Error("Invalid status transition");
        }
        break;

      case ApplicationStatus.VALIDATED:
        if (
          session.user.role === UserRole.FRONT_DESK &&
          application.status === ApplicationStatus.PENDING
        ) {
          result = await handleValidationTransition(
            application,
            session.user.id,
            additionalData,
            comments,
            request
          );
        } else {
          throw new Error("Invalid status transition");
        }
        break;
      case ApplicationStatus.IN_PROGRESS:
        if (
          [
            UserRole.DC,
            UserRole.ADC,
            UserRole.RO,
            UserRole.SDM,
            UserRole.DYDIR,
          ].includes(
            session.user.role as
              | typeof UserRole.DC
              | typeof UserRole.ADC
              | typeof UserRole.RO
              | typeof UserRole.SDM
              | typeof UserRole.DYDIR
          ) &&
          application.status === ApplicationStatus.VALIDATED &&
          application.currentHolderId === session.user.id
        ) {
          result = await handleStatusTransition(
            application,
            status,
            session.user.id,
            comments || "Application processing started",
            request
          );
        } else {
          throw new Error("Invalid status transition");
        }
        break;
      case ApplicationStatus.APPROVED:
        if (
          [
            UserRole.DC,
            UserRole.ADC,
            UserRole.RO,
            UserRole.SDM,
            UserRole.DYDIR,
          ].includes(
            session.user.role as
              | typeof UserRole.DC
              | typeof UserRole.ADC
              | typeof UserRole.RO
              | typeof UserRole.SDM
              | typeof UserRole.DYDIR
          ) &&
          application.status === ApplicationStatus.IN_PROGRESS &&
          application.currentHolderId === session.user.id
        ) {
          result = await handleApprovalTransition(
            application,
            session.user.id,
            comments,
            request
          );
        } else {
          throw new Error("Invalid status transition");
        }
        break;

      case ApplicationStatus.REJECTED:
        result = await handleRejectionTransition(
          application,
          session.user.id,
          comments || "Application rejected",
          request
        );
        break;

      default:
        throw new Error("Invalid status provided");
    }

    return NextResponse.json({
      message: "Application status updated successfully",
      application: result,
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update application status",
      },
      { status: 500 }
    );
  }
}

// Check if user has permission to change application status
async function checkStatusChangePermission(
  user: {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    fullName?: string;
  },
  application: ApplicationWithIncludes,
  newStatus: ApplicationStatus
): Promise<boolean> {
  // Super admin and admin can change any status
  if (
    [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(
      user.role as typeof UserRole.SUPER_ADMIN | typeof UserRole.ADMIN
    )
  ) {
    return true;
  }

  // Citizens can only submit their own draft applications
  if (user.role === UserRole.CITIZEN) {
    return (
      application.citizenId === user.id &&
      application.status === ApplicationStatus.DRAFT &&
      newStatus === ApplicationStatus.PENDING
    );
  }

  // Front desk can validate pending applications
  if (user.role === UserRole.FRONT_DESK) {
    return (
      application.status === ApplicationStatus.PENDING &&
      [ApplicationStatus.VALIDATED, ApplicationStatus.REJECTED].includes(
        newStatus as
          | typeof ApplicationStatus.VALIDATED
          | typeof ApplicationStatus.REJECTED
      )
    );
  }
  // Officers can process their assigned applications
  if (
    [
      UserRole.DC,
      UserRole.ADC,
      UserRole.RO,
      UserRole.SDM,
      UserRole.DYDIR,
    ].includes(
      user.role as
        | typeof UserRole.DC
        | typeof UserRole.ADC
        | typeof UserRole.RO
        | typeof UserRole.SDM
        | typeof UserRole.DYDIR
    )
  ) {
    return (
      application.currentHolderId === user.id &&
      ((application.status === ApplicationStatus.VALIDATED &&
        newStatus === ApplicationStatus.IN_PROGRESS) ||
        (application.status === ApplicationStatus.IN_PROGRESS &&
          [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(
            newStatus as
              | typeof ApplicationStatus.APPROVED
              | typeof ApplicationStatus.REJECTED
          )))
    );
  }

  return false;
}

// Handle basic status transitions
async function handleStatusTransition(
  application: ApplicationWithIncludes,
  newStatus: ApplicationStatus,
  userId: string,
  comments: string,
  request: NextRequest
) {
  return await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: newStatus,
        ...(newStatus === ApplicationStatus.PENDING && {
          submittedAt: new Date(),
        }),
        ...(newStatus === ApplicationStatus.APPROVED && {
          completedAt: new Date(),
        }),
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: newStatus,
        changedById: userId,
        comments,
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: `STATUS_CHANGED_TO_${newStatus}`,
        performedById: userId,
        oldValues: { status: application.status },
        newValues: { status: newStatus },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    }); // Create notification for citizen
    const statusMessages: Record<ApplicationStatus, string> = {
      [ApplicationStatus.DRAFT]: "Your application has been saved as draft.",
      [ApplicationStatus.PENDING]:
        "Your application has been submitted and is pending validation.",
      [ApplicationStatus.VALIDATED]: "Your application has been validated.",
      [ApplicationStatus.IN_PROGRESS]:
        "Your application is now being processed.",
      [ApplicationStatus.APPROVED]:
        "Congratulations! Your application has been approved.",
      [ApplicationStatus.REJECTED]: "Your application has been rejected.",
      [ApplicationStatus.COMPLETED]:
        "Your application process has been completed.",
    };

    await tx.notification.create({
      data: {
        userId: application.citizenId,
        notificationType: "STATUS_CHANGED",
        applicationId: application.id,
        title: "Application Status Updated",
        message: `${statusMessages[newStatus]} Application: ${
          application.rrNumber || application.id
        }`,
        isRead: false,
      },
    });

    return updatedApplication;
  });
}

// Handle validation transition with RR number generation
async function handleValidationTransition(
  application: ApplicationWithIncludes,
  userId: string,
  additionalData: ValidationData,
  comments: string,
  request: NextRequest
) {
  const {
    isDocumentsComplete = true,
    isEligibilityVerified = true,
    validationNotes,
  } = additionalData;

  // Generate RR Number
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");

  // Get count of applications validated today for sequential numbering
  const startOfDay = new Date(currentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dailyCount = await prisma.application.count({
    where: {
      validatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      rrNumber: {
        not: null,
      },
    },
  });

  const sequentialNumber = (dailyCount + 1).toString().padStart(4, "0");
  const rrNumber = `RR${year}${month}${sequentialNumber}`;

  // Get the preferred officer from assignments
  const preferredOfficer = application.officerAssignments[0]?.assignedTo;

  return await prisma.$transaction(async (tx) => {
    // Update application status to VALIDATED and assign RR number
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.VALIDATED,
        rrNumber,
        validatedAt: new Date(),
        currentHolderId: preferredOfficer?.id,
        updatedAt: new Date(),
      },
    });

    // Create validation record
    await tx.applicationValidation.create({
      data: {
        applicationId: application.id,
        validatedById: userId,
        rrNumber,
        isDocumentsComplete,
        isEligibilityVerified,
        validationNotes:
          validationNotes || comments || "Application validated by front desk",
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: ApplicationStatus.VALIDATED,
        changedById: userId,
        comments:
          comments ||
          `Application validated and assigned RR Number: ${rrNumber}`,
      },
    });

    // Update officer assignment with expected completion date
    if (application.officerAssignments.length > 0) {
      await tx.officerAssignment.updateMany({
        where: {
          applicationId: application.id,
        },
        data: {
          expectedCompletionDate: new Date(
            Date.now() +
              application.serviceCategory.slaDays * 24 * 60 * 60 * 1000
          ),
        },
      });
    }

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_VALIDATED",
        performedById: userId,
        oldValues: { status: application.status },
        newValues: {
          status: ApplicationStatus.VALIDATED,
          rrNumber,
          currentHolderId: preferredOfficer?.id,
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    // Create notification for citizen
    await tx.notification.create({
      data: {
        userId: application.citizenId,
        notificationType: "STATUS_CHANGED",
        applicationId: application.id,
        title: "Application Validated",
        message: `Your application has been validated and assigned RR Number: ${rrNumber}. It has been forwarded to ${
          preferredOfficer?.officerProfile?.fullName || "the assigned officer"
        }.`,
        isRead: false,
      },
    });

    // Create notification for assigned officer
    if (preferredOfficer) {
      await tx.notification.create({
        data: {
          userId: preferredOfficer.id,
          notificationType: "APPLICATION_SUBMITTED",
          applicationId: application.id,
          title: "Application Assigned for Processing",
          message: `Application ${rrNumber} for ${application.serviceCategory.name} has been assigned to you for processing.`,
          isRead: false,
        },
      });
    }

    return updatedApplication;
  });
}

// Handle approval transition
async function handleApprovalTransition(
  application: ApplicationWithIncludes,
  userId: string,
  comments: string,
  request: NextRequest
) {
  return await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.APPROVED,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: ApplicationStatus.APPROVED,
        changedById: userId,
        comments: comments || "Application approved",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_APPROVED",
        performedById: userId,
        oldValues: { status: application.status },
        newValues: {
          status: ApplicationStatus.APPROVED,
          completedAt: new Date(),
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    // Create notification for citizen
    await tx.notification.create({
      data: {
        userId: application.citizenId,
        notificationType: "STATUS_CHANGED",
        applicationId: application.id,
        title: "Application Approved",
        message: `Congratulations! Your application ${application.rrNumber} for ${application.serviceCategory.name} has been approved.`,
        isRead: false,
      },
    });

    return updatedApplication;
  });
}

// Handle rejection transition
async function handleRejectionTransition(
  application: ApplicationWithIncludes,
  userId: string,
  comments: string,
  request: NextRequest
) {
  return await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.REJECTED,
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: ApplicationStatus.REJECTED,
        changedById: userId,
        comments: comments || "Application rejected",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_REJECTED",
        performedById: userId,
        oldValues: { status: application.status },
        newValues: { status: ApplicationStatus.REJECTED },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    // Create notification for citizen
    await tx.notification.create({
      data: {
        userId: application.citizenId,
        notificationType: "STATUS_CHANGED",
        applicationId: application.id,
        title: "Application Rejected",
        message: `Your application ${
          application.rrNumber || application.id
        } has been rejected. ${
          comments
            ? `Reason: ${comments}`
            : "Please contact the office for details."
        }`,
        isRead: false,
      },
    });

    return updatedApplication;
  });
}
