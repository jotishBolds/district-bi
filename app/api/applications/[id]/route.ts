// app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  UserRole,
  ApplicationStatus,
  User,
  DocumentType,
} from "@/app/generated/prisma";
import type { Session } from "next-auth";

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

interface ApplicationWhereClause {
  id: string;
  citizenId?: string;
}

interface SessionUser extends User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  fullName?: string;
  needsOtp: boolean;
}

interface PrismaApplication {
  id: string;
  status: ApplicationStatus;
  citizenId: string;
  currentHolderId: string | null;
  rrNumber: string | null;
  validatedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  serviceCategory: {
    id: string;
    name: string;
    description: string | null;
    slaDays: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  citizen: User & {
    citizenProfile: { fullName: string } | null;
  };
  documents: {
    id: string;
    applicationId: string;
    documentType: DocumentType;
    fileName: string;
    filePath: string;
    fileSize: number;
    isVerified: boolean;
    verificationNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    uploadedById: string;
    verifiedById: string | null;
  }[];
  officerAssignments: {
    assignedTo: User & {
      officerProfile: { fullName: string } | null;
    };
  }[];
}

interface Profile {
  id: string;
  userId: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserWithProfile extends User {
  citizenProfile?: Profile | null;
  officerProfile?: Profile | null;
}

interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  isVerified: boolean;
  verificationNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  uploadedById: string;
  verifiedById: string | null;
}

interface OfficerAssignment {
  id: string;
  applicationId: string;
  assignedById: string;
  assignedToId: string;
  priority: number;
  instructions: string | null;
  createdAt: Date;
  updatedAt: Date;
  expectedCompletionDate: Date | null;
  assignedBy: UserWithProfile;
  assignedTo: UserWithProfile;
}

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

    const applicationId = (await params).id; // Build where clause based on user role
    const whereClause: ApplicationWhereClause =
      session.user.role === UserRole.CITIZEN
        ? { id: applicationId, citizenId: session.user.id }
        : { id: applicationId };

    const application = await prisma.application.findFirst({
      where: whereClause,
      include: {
        serviceCategory: true,
        citizen: {
          include: {
            citizenProfile: true,
          },
        },
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
        workflow: {
          include: {
            changedBy: {
              include: {
                citizenProfile: true,
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
                citizenProfile: true,
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
                citizenProfile: true,
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

// Submit application (from DRAFT to PENDING for front desk validation)
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

// Handle application submission by citizen
async function handleSubmitApplication(
  application: PrismaApplication,
  session: AuthenticatedSession,
  request: NextRequest
) {
  // Only citizens can submit their own applications
  if (
    session.user.role !== UserRole.CITIZEN ||
    application.citizenId !== session.user.id
  ) {
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

    // Create notification for citizen
    await tx.notification.create({
      data: {
        userId: session.user.id,
        notificationType: "APPLICATION_SUBMITTED",
        applicationId: application.id,
        title: "Application Submitted Successfully",
        message: `Your application for ${application.serviceCategory.name} has been submitted and is now pending validation.`,
        isRead: false,
      },
    });

    // Notify front desk staff
    const frontDeskUsers = await tx.user.findMany({
      where: {
        role: UserRole.FRONT_DESK,
        isActive: true,
      },
    });

    for (const frontDeskUser of frontDeskUsers) {
      await tx.notification.create({
        data: {
          userId: frontDeskUser.id,
          notificationType: "APPLICATION_SUBMITTED",
          applicationId: application.id,
          title: "New Application for Validation",
          message: `Application for ${application.serviceCategory.name} submitted by ${application.citizen.citizenProfile?.fullName} is pending validation.`,
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
  application: PrismaApplication,
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
      { error: "Only pending applications can be validated" },
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
    // Reject the application
    const result = await prisma.$transaction(async (tx) => {
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
          fromStatus: ApplicationStatus.PENDING,
          toStatus: ApplicationStatus.REJECTED,
          changedById: session.user.id,
          comments: rejectionReason || "Application rejected during validation",
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId: application.id,
          action: "APPLICATION_REJECTED",
          performedById: session.user.id,
          oldValues: { status: ApplicationStatus.PENDING },
          newValues: { status: ApplicationStatus.REJECTED },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
      });

      // Notify citizen
      await tx.notification.create({
        data: {
          userId: application.citizenId,
          notificationType: "STATUS_CHANGED",
          applicationId: application.id,
          title: "Application Rejected",
          message: `Your application for ${application.serviceCategory.name} has been rejected. Reason: ${rejectionReason}`,
          isRead: false,
        },
      });

      return updatedApplication;
    });

    return NextResponse.json({
      message: "Application rejected",
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

  const result = await prisma.$transaction(async (tx) => {
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
        validatedById: session.user.id,
        rrNumber,
        isDocumentsComplete: isDocumentsComplete || false,
        isEligibilityVerified: isEligibilityVerified || false,
        validationNotes:
          validationNotes || "Application validated by front desk",
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: ApplicationStatus.PENDING,
        toStatus: ApplicationStatus.VALIDATED,
        changedById: session.user.id,
        comments: `Application validated and assigned RR Number: ${rrNumber}`,
      },
    });

    // Update officer assignment with RR number
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
        performedById: session.user.id,
        oldValues: { status: ApplicationStatus.PENDING },
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

  return NextResponse.json({
    message: "Application validated successfully",
    rrNumber,
    application: result,
  });
}

// Handle application processing by officers
async function handleProcessApplication(
  application: PrismaApplication,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: ProcessingData
) {
  // Only assigned officers can process applications
  if (
    (session.user.role !== UserRole.DC &&
      session.user.role !== UserRole.ADC &&
      session.user.role !== UserRole.RO) ||
    application.currentHolderId !== session.user.id
  ) {
    return NextResponse.json(
      { error: "Unauthorized to process this application" },
      { status: 403 }
    );
  }

  // Can only process VALIDATED applications
  if (application.status !== ApplicationStatus.VALIDATED) {
    return NextResponse.json(
      { error: "Only validated applications can be processed" },
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
        updatedAt: new Date(),
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: ApplicationStatus.VALIDATED,
        toStatus: ApplicationStatus.IN_PROGRESS,
        changedById: session.user.id,
        comments: comments || "Application processing started",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "PROCESSING_STARTED",
        performedById: session.user.id,
        oldValues: { status: ApplicationStatus.VALIDATED },
        newValues: { status: ApplicationStatus.IN_PROGRESS },
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
        title: "Application Processing Started",
        message: `Your application ${
          application.rrNumber
        } is now being processed by ${
          session.user.fullName || "an assigned officer"
        }.`,
        isRead: false,
      },
    });

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application processing started",
    application: result,
  });
}

// Handle application approval by officers
async function handleApproveApplication(
  application: PrismaApplication,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: { comments?: string }
) {
  // Only assigned officers can approve applications
  if (
    (session.user.role !== UserRole.DC &&
      session.user.role !== UserRole.ADC &&
      session.user.role !== UserRole.RO) ||
    application.currentHolderId !== session.user.id
  ) {
    return NextResponse.json(
      { error: "Unauthorized to approve this application" },
      { status: 403 }
    );
  }

  // Can only approve IN_PROGRESS applications
  if (application.status !== ApplicationStatus.IN_PROGRESS) {
    return NextResponse.json(
      { error: "Only in-progress applications can be approved" },
      { status: 400 }
    );
  }

  const { comments } = requestData;

  const result = await prisma.$transaction(async (tx) => {
    // Update application status to APPROVED
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
        fromStatus: ApplicationStatus.IN_PROGRESS,
        toStatus: ApplicationStatus.APPROVED,
        changedById: session.user.id,
        comments: comments || "Application approved",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_APPROVED",
        performedById: session.user.id,
        oldValues: { status: ApplicationStatus.IN_PROGRESS },
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

  return NextResponse.json({
    message: "Application approved successfully",
    application: result,
  });
}

// Handle application rejection by officers
async function handleRejectApplication(
  application: PrismaApplication,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: { comments?: string; rejectionReason?: string }
) {
  // Only assigned officers or front desk can reject applications
  const isOfficer =
    session.user.role === UserRole.DC ||
    session.user.role === UserRole.ADC ||
    session.user.role === UserRole.RO;
  const canReject =
    session.user.role === UserRole.FRONT_DESK ||
    (isOfficer && application.currentHolderId === session.user.id);

  if (!canReject) {
    return NextResponse.json(
      { error: "Unauthorized to reject this application" },
      { status: 403 }
    );
  }

  const { comments, rejectionReason } = requestData;

  const result = await prisma.$transaction(async (tx) => {
    // Update application status to REJECTED
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
        changedById: session.user.id,
        comments: rejectionReason || comments || "Application rejected",
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "APPLICATION_REJECTED",
        performedById: session.user.id,
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
        } has been rejected. Reason: ${
          rejectionReason || "Please contact the office for details."
        }`,
        isRead: false,
      },
    });

    return updatedApplication;
  });

  return NextResponse.json({
    message: "Application rejected",
    application: result,
  });
}

// Handle forwarding application to another officer
async function handleForwardApplication(
  application: PrismaApplication,
  session: AuthenticatedSession,
  request: NextRequest,
  requestData: ForwardData
) {
  // Only assigned officers can forward applications
  const isOfficer =
    session.user.role === UserRole.DC ||
    session.user.role === UserRole.ADC ||
    session.user.role === UserRole.RO;

  if (!isOfficer || application.currentHolderId !== session.user.id) {
    return NextResponse.json(
      { error: "Not authorized to forward this application" },
      { status: 403 }
    );
  }

  const { forwardToOfficerId, priority = 2, instructions } = requestData;

  if (!forwardToOfficerId || !instructions) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Verify target officer exists and is available
  const targetOfficer = await prisma.user.findFirst({
    where: {
      id: forwardToOfficerId,
      role: {
        in: [UserRole.DC, UserRole.ADC, UserRole.RO],
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

  if (!targetOfficer) {
    return NextResponse.json(
      { error: "Invalid or unavailable target officer" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create new officer assignment
    const assignment = await tx.officerAssignment.create({
      data: {
        applicationId: application.id,
        assignedById: session.user.id,
        assignedToId: forwardToOfficerId,
        priority: priority,
        instructions: instructions,
        expectedCompletionDate: new Date(
          Date.now() + application.serviceCategory.slaDays * 24 * 60 * 60 * 1000
        ),
      },
      include: {
        assignedTo: {
          include: {
            officerProfile: true,
          },
        },
      },
    });

    // Update application's current holder
    const updatedApplication = await tx.application.update({
      where: { id: application.id },
      data: {
        currentHolderId: forwardToOfficerId,
        updatedAt: new Date(),
      },
      include: {
        serviceCategory: true,
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
      },
    });

    // Create workflow entry
    await tx.applicationWorkflow.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: application.status, // Status remains same, only holder changes
        changedById: session.user.id,
        comments: `Application forwarded to ${targetOfficer.officerProfile?.fullName} with priority ${priority}. Instructions: ${instructions}`,
      },
    });

    // Create audit log
    await tx.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        performedById: session.user.id,
        action: "FORWARD",
        oldValues: { currentHolderId: session.user.id },
        newValues: { currentHolderId: targetOfficer.id },
      },
    });

    return {
      application: updatedApplication,
      assignment,
    };
  });

  return NextResponse.json({
    message: "Application forwarded successfully",
    application: result.application,
    assignment: result.assignment,
  });
}
