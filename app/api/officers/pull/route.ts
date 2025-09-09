// app/api/officers/pull/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";
import { getAllOfficerRoles } from "@/lib/officer-roles";

// GET: Fetch open applications that officers can pull
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only officers can access this endpoint
    const officerRoles = getAllOfficerRoles();
    if (!officerRoles.includes(session.user.role as keyof typeof UserRole)) {
      return NextResponse.json(
        { error: "Only officers can access pull queue" },
        { status: 403 }
      );
    }

    // Fetch all open applications
    const pullableApplications = await prisma.application.findMany({
      where: {
        status: ApplicationStatus.OPEN,
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
            color: true,
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
      applications: pullableApplications,
    });
  } catch (error) {
    console.error("Error fetching pullable applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Pull an application from queue and assign to self
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only officers can pull applications
    const officerRoles = getAllOfficerRoles();
    if (!officerRoles.includes(session.user.role as keyof typeof UserRole)) {
      return NextResponse.json(
        { error: "Only officers can pull applications" },
        { status: 403 }
      );
    }

    const {
      applicationId,
      // priority is always HIGH (1) - removed from UI
      instructions = "",
      serviceCategoryId,
    } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Verify officer exists and is available
    const officer = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        role: {
          in: getAllOfficerRoles(),
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
        { error: "Officer profile not found or unavailable" },
        { status: 400 }
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

    // Start transaction to pull application from queue
    const result = await prisma.$transaction(async (tx) => {
      // Update application status to IN_PROGRESS and assign to officer
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
          comments: `Application pulled from queue by ${
            officer.officerProfile?.fullName || officer.email
          }${instructions ? `: ${instructions}` : ""}`,
        },
      });

      // Create officer assignment (self-assignment)
      await tx.officerAssignment.create({
        data: {
          applicationId,
          assignedById: session.user.id, // Self-assigned
          assignedToId: officer.id, // Assigned to self
          priority: 1, // Always HIGH priority
          instructions: instructions || "Application pulled by officer",
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          action: "APPLICATION_PULLED_BY_OFFICER",
          performedById: session.user.id,
          oldValues: {
            status: ApplicationStatus.OPEN,
            currentHolderId: null,
          },
          newValues: {
            status: ApplicationStatus.IN_PROGRESS,
            currentHolderId: officer.id,
            assignedOfficerName: officer.officerProfile?.fullName,
          },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
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
            reason: "Service category updated during officer pull",
          },
        });
      }

      return updatedApplication;
    });

    return NextResponse.json({
      message: `Application successfully pulled and assigned to you`,
      application: result,
    });
  } catch (error) {
    console.error("Error pulling application:", error);
    return NextResponse.json(
      { error: "Failed to pull application" },
      { status: 500 }
    );
  }
}
