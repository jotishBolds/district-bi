// app/api/frontdesk/general-queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";

// GET: Fetch queue overview for general frontdesk users
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

    // Check if this frontdesk user is general (not assigned to specific officers)
    const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
        officerId: { not: null }, // Only specific assignments
      },
    });

    // If user has specific assignments, they're not general frontdesk
    if (frontdeskAssignments.length > 0) {
      return NextResponse.json(
        { error: "Only general frontdesk users can access this view" },
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
            slaDays: true,
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

    // Fetch recently processed applications that were originally in queue
    // (Applications that went from OPEN to IN_PROGRESS)
    const processedApplications = await prisma.application.findMany({
      where: {
        status: {
          in: [
            ApplicationStatus.IN_PROGRESS,
            ApplicationStatus.RESOLVED,
            ApplicationStatus.CLOSED,
          ],
        },
        // Find applications that have workflow entries showing they came from OPEN status
        workflow: {
          some: {
            fromStatus: ApplicationStatus.OPEN,
          },
        },
      },
      include: {
        serviceCategory: {
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
        officerAssignments: {
          include: {
            assignedBy: {
              select: {
                email: true,
              },
            },
            assignedTo: {
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
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the most recent assignment
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50, // Limit to recent 50 processed applications
    });

    // Calculate statistics
    const stats = {
      totalQueued: queuedApplications.length,
      totalProcessed: processedApplications.length,
      avgWaitTime: calculateAverageWaitTime(processedApplications),
      oldestInQueue:
        queuedApplications.length > 0
          ? queuedApplications[0].createdAt.toISOString()
          : null,
    };

    return NextResponse.json({
      queuedApplications,
      processedApplications,
      stats,
    });
  } catch (error) {
    console.error("Error fetching general queue data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to calculate average wait time
function calculateAverageWaitTime(
  applications: Array<{
    createdAt: Date;
    workflow?: Array<{
      fromStatus: ApplicationStatus;
      createdAt: Date;
    }>;
  }>
): number {
  if (applications.length === 0) return 0;

  const waitTimes = applications.map((app) => {
    // Find the workflow entry that shows transition from OPEN
    const queuedToProgressWorkflow = app.workflow?.find(
      (w) => w.fromStatus === ApplicationStatus.OPEN
    );
    if (!queuedToProgressWorkflow) return 0;

    const queuedTime = new Date(app.createdAt).getTime();
    const processingTime = new Date(
      queuedToProgressWorkflow.createdAt
    ).getTime();
    const waitHours = (processingTime - queuedTime) / (1000 * 60 * 60);

    return Math.max(0, waitHours);
  });

  const totalWaitTime = waitTimes.reduce((sum, time) => sum + time, 0);
  return Math.round(totalWaitTime / applications.length);
}
