// app/api/dispatch/[applicationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";

// PATCH - Toggle dispatch status for a single application
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.DISPATCH_HANDLER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { isDispatched } = await request.json();

    if (typeof isDispatched !== "boolean") {
      return NextResponse.json(
        { error: "isDispatched must be a boolean" },
        { status: 400 }
      );
    }

    // Find the application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
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
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Verify application is closed
    if (application.status !== ApplicationStatus.CLOSED) {
      return NextResponse.json(
        { error: "Application must be closed before dispatch" },
        { status: 400 }
      );
    }

    // Update dispatch status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        isDispatched,
        dispatchedAt: isDispatched ? new Date() : null,
        dispatchedById: isDispatched ? session.user.id : null,
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
        currentHolder: {
          include: {
            officerProfile: {
              select: {
                fullName: true,
                designation: true,
              },
            },
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
    });

    return NextResponse.json({
      message: isDispatched
        ? "Application dispatched successfully"
        : "Application dispatch status reverted",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Error updating dispatch status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
