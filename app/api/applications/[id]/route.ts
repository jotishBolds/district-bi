// app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  UserRole,
  ApplicationStatus,
  DocumentType,
} from "@/app/generated/prisma";

type AuthenticatedSession = {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    fullName?: string;
  };
  requiresOtp: boolean;
};

type ApplicationWithRelations = {
  id: string;
  rrNumber: string | null;
  serviceCategoryId: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail: string | null;
  citizenAddress: string;
  citizenGender: string | null;
  citizenAadhaar: string | null;
  status: ApplicationStatus;
  currentHolderId: string | null;
  submittedAt: Date | null;
  validatedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  serviceCategory: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  documents: Array<{
    id: string;
    applicationId: string;
    documentType: DocumentType;
    fileName: string;
    filePath: string;
    fileSize: number;
    uploadedById: string;
    isVerified: boolean;
    verifiedById: string | null;
    verificationNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  officerAssignments: Array<{
    id: string;
    applicationId: string;
    assignedById: string;
    assignedToId: string;
    expectedCompletionDate: Date | null;
    priority: number;
    instructions: string | null;
    createdAt: Date;
    assignedTo: {
      id: string;
      email: string;
      role: UserRole;
      isActive: boolean;
      officerProfile: {
        id: string;
        userId: string;
        fullName: string;
        designation: string;
        department: string;
        officeLocation: string | null;
        isAvailable: boolean;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    };
  }>;
};

interface ValidationData {
  isDocumentsComplete: boolean;
  isEligibilityVerified: boolean;
  validationNotes?: string;
  shouldReject?: boolean;
  rejectionReason?: string;
}

interface ProcessingData {
  comments?: string;
}

interface ForwardData {
  forwardToOfficerId: string;
  priority?: number;
  instructions: string;
  forwardedBy?: string;
  currentAssignedOfficer?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session =
      (await getServerAuthSession()) as AuthenticatedSession | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applicationId = (await params).id;

    const application = await prisma.application.findFirst({
      where: { id: applicationId },
      include: {
        serviceCategory: true,
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
        workflow: {
          include: {
            changedBy: {
              include: {
                officerProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        validation: {
          include: {
            validatedBy: {
              include: {
                officerProfile: true,
              },
            },
          },
        },
        officerAssignments: {
          include: {
            assignedBy: {
              include: {
                officerProfile: true,
              },
            },
            assignedTo: {
              include: {
                officerProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        documents: {
          include: {
            uploadedBy: {
              include: {
                officerProfile: true,
              },
            },
            verifiedBy: {
              include: {
                officerProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        documentRequests: {
          include: {
            requestedBy: {
              include: {
                officerProfile: true,
              },
            },
          },
          where: {
            isCompleted: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        auditLogs: {
          include: {
            performedBy: {
              include: {
                officerProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20, // Limit to last 20 audit logs
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session =
      (await getServerAuthSession()) as AuthenticatedSession | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applicationId = (await params).id;
    const { action, ...requestData } = await request.json();

    // Get the current application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        serviceCategory: true,
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

    // Handle different actions
    switch (action) {
      case "submit":
        return handleSubmitApplication(application, session, request);
      case "validate":
        return handleValidateApplication(
          application,
          session,
          request,
          requestData
        );
      case "process":
        return handleProcessApplication(
          application,
          session,
          request,
          requestData
        );
      case "approve":
        return handleApproveApplication(
          application,
          session,
          request,
          requestData
        );
      case "reject":
        return handleRejectApplication(
          application,
          session,
          request,
          requestData
        );
      case "forward":
        return handleForwardApplication(
          application,
          session,
          request,
          requestData
        );
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

// Handle application submission by front desk
async function handleSubmitApplication(
  application: ApplicationWithRelations,
  session: AuthenticatedSession,
  request: NextRequest
) {
  // Only FRONT_DESK users can submit applications
  if (session.user.role !== UserRole.FRONT_DESK) {
    return NextResponse.json(
      { error: "Unauthorized to submit this application" },
      { status: 403 }
    );
  }

  // Can only submit DRAFT applications
  if (application.status !== ApplicationStatus.DRAFT) {
    return NextResponse.json(
      { error: "Application can only be submitted from DRAFT status" },
      { status: 400 }
    );
  }

  // Validate that application has required documents
  if (application.documents.length === 0) {
    return NextResponse.json(
      { error: "Application must have at least one document" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update application status to PENDING
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.PENDING,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: ApplicationStatus.DRAFT,
        toStatus: ApplicationStatus.PENDING,
        changedById: session.user.id,
        comments: "Application submitted for front desk validation",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_SUBMITTED",
        performedById: session.user.id,
        oldValues: { status: ApplicationStatus.DRAFT },
        newValues: { status: ApplicationStatus.PENDING },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    // Notify front desk staff about new application
    const frontDeskUsers = await tx.user.findMany({
      where: {
        role: UserRole.FRONT_DESK,
        isActive: true,
        id: { not: session.user.id }, // Don't notify the submitter
      },
    });

    for (const frontDeskUser of frontDeskUsers) {
      await tx.notification.create({
        data: {
          userId: frontDeskUser.id,
          notificationType: "APPLICATION_SUBMITTED",
          applicationId: application.id,
          title: "New Application for Validation",
          message: `Application for ${application.serviceCategory.name} submitted by ${application.citizenName} is pending validation.`,
          isRead: false,
        },
      });
    }

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application submitted successfully",
    application: result,
  });
}

// Handle application validation by front desk
async function handleValidateApplication(
  application: ApplicationWithRelations,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: ValidationData
) {
  // Only front desk can validate applications
  if (session.user.role !== UserRole.FRONT_DESK) {
    return NextResponse.json(
      { error: "Only front desk staff can validate applications" },
      { status: 403 }
    );
  }

  // Can only validate PENDING applications
  if (application.status !== ApplicationStatus.PENDING) {
    return NextResponse.json(
      { error: "Application can only be validated from PENDING status" },
      { status: 400 }
    );
  }

  const {
    isDocumentsComplete,
    isEligibilityVerified,
    validationNotes,
    shouldReject = false,
    rejectionReason,
  } = requestData;

  if (shouldReject) {
    // Close the application with action
    const result = await prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.CLOSED,
          updatedAt: new Date(),
        },
      });

      // Create workflow entry
      await tx.applicationWorkflow.create({
        data: {
          applicationId: application.id,
          fromStatus: ApplicationStatus.PENDING,
          toStatus: ApplicationStatus.CLOSED,
          changedById: session.user.id,
          comments: rejectionReason || "Application closed",
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId: application.id,
          action: "APPLICATION_CLOSED",
          performedById: session.user.id,
          oldValues: { status: ApplicationStatus.PENDING },
          newValues: { status: ApplicationStatus.CLOSED },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
      });

      return updatedApplication;
    });

    return NextResponse.json({
      message: "Application closed with action",
      application: result,
    });
  }

  // Generate RR Number
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");

  // Get count of applications validated today for sequential numbering
  const startOfDay = new Date(currentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get the latest application with RR number from today to ensure uniqueness
  const latestApplication = await prisma.application.findFirst({
    where: {
      validatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      rrNumber: {
        not: null,
        startsWith: `RR${year}${month}`,
      },
    },
    orderBy: {
      rrNumber: "desc",
    },
  });

  let sequentialNumber;
  if (latestApplication && latestApplication.rrNumber) {
    // Extract the sequential number from the latest RR number and increment it
    const latestSequential = parseInt(latestApplication.rrNumber.slice(-4), 10);
    sequentialNumber = (latestSequential + 1).toString().padStart(4, "0");
  } else {
    // First application of the day
    sequentialNumber = "0001";
  }

  const rrNumber = `RR${year}${month}${sequentialNumber}`;

  const result = await prisma.$transaction(async (tx) => {
    // Double-check that the RR number is unique before updating
    const existingWithRR = await tx.application.findFirst({
      where: { rrNumber },
    });

    if (existingWithRR) {
      throw new Error("RR number conflict. Please try again.");
    }

    // Update application status to VALIDATED and assign RR number
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.VALIDATED,
        rrNumber,
        validatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create validation record
    await tx.applicationValidation.create({
      data: {
        applicationId: application.id,
        validatedById: session.user.id,
        rrNumber,
        isDocumentsComplete,
        isEligibilityVerified,
        validationNotes,
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: ApplicationStatus.PENDING,
        toStatus: ApplicationStatus.VALIDATED,
        changedById: session.user.id,
        comments: `Application validated. RR Number: ${rrNumber}`,
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_VALIDATED",
        performedById: session.user.id,
        oldValues: { status: ApplicationStatus.PENDING },
        newValues: {
          status: ApplicationStatus.VALIDATED,
          rrNumber: rrNumber,
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    // If there are officer assignments, notify the assigned officer
    if (
      application.officerAssignments &&
      application.officerAssignments.length > 0
    ) {
      const assignedOfficer = application.officerAssignments[0].assignedTo;
      await tx.notification.create({
        data: {
          userId: assignedOfficer.id,
          notificationType: "STATUS_CHANGED",
          applicationId: application.id,
          title: "Application Validated and Ready for Processing",
          message: `Application for ${application.serviceCategory.name} (RR: ${rrNumber}) has been validated and is ready for your review.`,
          isRead: false,
        },
      });

      // Update application current holder to the assigned officer
      await tx.application.update({
        where: { id: application.id },
        data: {
          currentHolderId: assignedOfficer.id,
          status: ApplicationStatus.IN_PROGRESS,
        },
      });

      // Create another workflow entry for IN_PROGRESS status
      await tx.applicationWorkflow.create({
        data: {
          applicationId: application.id,
          fromStatus: ApplicationStatus.VALIDATED,
          toStatus: ApplicationStatus.IN_PROGRESS,
          changedById: session.user.id,
          comments: `Application assigned to ${
            assignedOfficer.officerProfile?.fullName || assignedOfficer.email
          }`,
        },
      });
    }

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application validated successfully",
    application: result,
    rrNumber,
  });
}

// Handle application processing by officers
async function handleProcessApplication(
  application: ApplicationWithRelations,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: ProcessingData
) {
  // Only officers (not FRONT_DESK, ADMIN, SUPER_ADMIN) can process applications
  if (
    [UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
      session.user.role as
        | typeof UserRole.FRONT_DESK
        | typeof UserRole.ADMIN
        | typeof UserRole.SUPER_ADMIN
    )
  ) {
    return NextResponse.json(
      { error: "Only officers can process applications" },
      { status: 403 }
    );
  }

  // Can only process VALIDATED or IN_PROGRESS applications
  if (
    !(
      [
        ApplicationStatus.VALIDATED,
        ApplicationStatus.IN_PROGRESS,
      ] as ApplicationStatus[]
    ).includes(application.status)
  ) {
    return NextResponse.json(
      {
        error:
          "Application can only be processed from VALIDATED or IN_PROGRESS status",
      },
      { status: 400 }
    );
  }

  const { comments } = requestData;

  const result = await prisma.$transaction(async (tx) => {
    // Update application status to IN_PROGRESS
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.IN_PROGRESS,
        currentHolderId: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: ApplicationStatus.IN_PROGRESS,
        changedById: session.user.id,
        comments: comments || "Application processing started",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_PROCESSING_STARTED",
        performedById: session.user.id,
        oldValues: { status: application.status },
        newValues: { status: ApplicationStatus.IN_PROGRESS },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application processing started",
    application: result,
  });
}

// Handle application approval
async function handleApproveApplication(
  application: ApplicationWithRelations,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: ProcessingData
) {
  // Only officers can approve applications
  if (
    [UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
      session.user.role as
        | typeof UserRole.FRONT_DESK
        | typeof UserRole.ADMIN
        | typeof UserRole.SUPER_ADMIN
    )
  ) {
    return NextResponse.json(
      { error: "Only officers can approve applications" },
      { status: 403 }
    );
  }

  // Can only approve IN_PROGRESS applications
  if (application.status !== ApplicationStatus.IN_PROGRESS) {
    return NextResponse.json(
      { error: "Application can only be approved from IN_PROGRESS status" },
      { status: 400 }
    );
  }

  const { comments } = requestData;

  const result = await prisma.$transaction(async (tx) => {
    // Update application status to RESOLVED
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.RESOLVED,
        currentHolderId: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: ApplicationStatus.IN_PROGRESS,
        toStatus: ApplicationStatus.RESOLVED,
        changedById: session.user.id,
        comments: comments || "Application resolved",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_RESOLVED",
        performedById: session.user.id,
        oldValues: { status: ApplicationStatus.IN_PROGRESS },
        newValues: { status: ApplicationStatus.RESOLVED },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application resolved successfully",
    application: result,
  });
}

// Handle application rejection
async function handleRejectApplication(
  application: ApplicationWithRelations,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: ProcessingData
) {
  // Only officers can reject applications
  if (
    [UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
      session.user.role as
        | typeof UserRole.FRONT_DESK
        | typeof UserRole.ADMIN
        | typeof UserRole.SUPER_ADMIN
    )
  ) {
    return NextResponse.json(
      { error: "Only officers can reject applications" },
      { status: 403 }
    );
  }

  // Can only reject IN_PROGRESS applications
  if (application.status !== ApplicationStatus.IN_PROGRESS) {
    return NextResponse.json(
      { error: "Application can only be rejected from IN_PROGRESS status" },
      { status: 400 }
    );
  }

  const { comments } = requestData;

  if (!comments) {
    return NextResponse.json(
      { error: "Rejection reason is required" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update application status to CLOSED
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.CLOSED,
        currentHolderId: session.user.id,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: ApplicationStatus.IN_PROGRESS,
        toStatus: ApplicationStatus.CLOSED,
        changedById: session.user.id,
        comments: comments,
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_REJECTED",
        performedById: session.user.id,
        oldValues: { status: ApplicationStatus.IN_PROGRESS },
        newValues: { status: ApplicationStatus.CLOSED },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application rejected",
    application: result,
  });
}

// Handle application forwarding to another officer
async function handleForwardApplication(
  application: ApplicationWithRelations,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: ForwardData
) {
  // Only officers and frontdesk can forward applications
  if (
    [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
      session.user.role as typeof UserRole.ADMIN | typeof UserRole.SUPER_ADMIN
    )
  ) {
    return NextResponse.json(
      { error: "Unauthorized to forward applications" },
      { status: 403 }
    );
  }

  // Check application status based on user role
  if (session.user.role === UserRole.FRONT_DESK) {
    // Frontdesk can forward IN_PROGRESS and VALIDATED applications
    if (
      application.status !== ApplicationStatus.IN_PROGRESS &&
      application.status !== ApplicationStatus.VALIDATED
    ) {
      return NextResponse.json(
        {
          error:
            "Application can only be forwarded from IN_PROGRESS or VALIDATED status",
        },
        { status: 400 }
      );
    }
  } else {
    // Officers can only forward IN_PROGRESS applications
    if (application.status !== ApplicationStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: "Application can only be forwarded from IN_PROGRESS status" },
        { status: 400 }
      );
    }
  }

  const {
    forwardToOfficerId,
    priority = 2,
    instructions,
    forwardedBy,
    currentAssignedOfficer,
  } = requestData;

  if (!forwardToOfficerId) {
    return NextResponse.json(
      { error: "Officer to forward to is required" },
      { status: 400 }
    );
  }

  // Verify the target officer exists and is active
  const targetOfficer = await prisma.user.findFirst({
    where: {
      id: forwardToOfficerId,
      isActive: true,
      role: {
        in: [
          UserRole.DC,
          UserRole.ADC,
          UserRole.RO,
          UserRole.SDM,
          UserRole.DYDIR,
        ],
      },
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

  const result = await prisma.$transaction(async (tx) => {
    // Update application current holder and status if needed
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        currentHolderId: forwardToOfficerId,
        // If frontdesk is forwarding a VALIDATED application, change status to IN_PROGRESS
        status:
          forwardedBy === "frontdesk" &&
          application.status === ApplicationStatus.VALIDATED
            ? ApplicationStatus.IN_PROGRESS
            : application.status,
        updatedAt: new Date(),
      },
    });

    // Create new officer assignment
    await tx.officerAssignment.create({
      data: {
        applicationId: application.id,
        assignedById: session.user.id,
        assignedToId: forwardToOfficerId,
        priority,
        instructions,
      },
    });

    // Create workflow entry
    const targetStatus =
      forwardedBy === "frontdesk" &&
      application.status === ApplicationStatus.VALIDATED
        ? ApplicationStatus.IN_PROGRESS
        : ApplicationStatus.IN_PROGRESS;

    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: targetStatus,
        changedById: session.user.id,
        comments:
          forwardedBy === "frontdesk"
            ? `Application forwarded by frontdesk to ${
                targetOfficer.officerProfile?.fullName || targetOfficer.email
              }. Instructions: ${instructions}`
            : `Application forwarded to ${
                targetOfficer.officerProfile?.fullName || targetOfficer.email
              }. Instructions: ${instructions}`,
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action:
          forwardedBy === "frontdesk"
            ? "APPLICATION_FORWARDED_BY_FRONTDESK"
            : "APPLICATION_FORWARDED",
        performedById: session.user.id,
        oldValues: { currentHolderId: application.currentHolderId },
        newValues: { currentHolderId: forwardToOfficerId },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    // Notify the target officer
    await tx.notification.create({
      data: {
        userId: forwardToOfficerId,
        notificationType: "STATUS_CHANGED",
        applicationId: application.id,
        title:
          forwardedBy === "frontdesk"
            ? "Application Forwarded by Front Desk"
            : "Application Forwarded to You",
        message:
          forwardedBy === "frontdesk"
            ? `Application for ${application.serviceCategory.name} (RR: ${
                application.rrNumber || "No RR"
              }) has been forwarded to you by the front desk. Instructions: ${instructions}`
            : `Application for ${application.serviceCategory.name} (RR: ${
                application.rrNumber || "No RR"
              }) has been forwarded to you for review. Instructions: ${instructions}`,
        isRead: false,
      },
    });

    // If frontdesk is forwarding and there was a previously assigned officer, notify them too
    if (
      forwardedBy === "frontdesk" &&
      currentAssignedOfficer &&
      currentAssignedOfficer !== forwardToOfficerId
    ) {
      await tx.notification.create({
        data: {
          userId: currentAssignedOfficer,
          notificationType: "STATUS_CHANGED",
          applicationId: application.id,
          title: "Application Forwarded by Front Desk",
          message: `The application for ${
            application.serviceCategory.name
          } (RR: ${
            application.rrNumber || "No RR"
          }) has been forwarded by the front desk to another officer.`,
          isRead: false,
        },
      });
    }

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application forwarded successfully",
    application: result,
  });
}
