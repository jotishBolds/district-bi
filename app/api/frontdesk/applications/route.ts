// app/api/frontdesk/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, ApplicationStatus } from "@/app/generated/prisma";

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
        officerId: { not: null },
      },
    });

    if (frontdeskAssignments.length === 0) {
      return NextResponse.json(
        { error: "Only specific frontdesk users can access applications" },
        { status: 403 }
      );
    }

    const officerIds = frontdeskAssignments
      .filter((assignment) => assignment.officerId)
      .map((assignment) => assignment.officerId!);

    // Get the User IDs for these officers
    const officerProfiles = await prisma.officerProfile.findMany({
      where: {
        id: { in: officerIds },
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        designation: true,
        department: true,
      },
    });

    const officerUserIds = officerProfiles.map((profile) => profile.userId);

    // Debug logging to understand the data structure
    console.log("Debug - Frontdesk user ID:", session.user.id);
    console.log("Debug - Officer profiles:", officerProfiles);
    console.log("Debug - Officer User IDs:", officerUserIds);

    // Get all applications assigned to this frontdesk's officers OR forwarded to this frontdesk
    const applications = await prisma.application.findMany({
      where: {
        OR: [
          // Applications currently held by this frontdesk's officers
          {
            currentHolderId: {
              in: officerUserIds,
            },
          },
          // Applications forwarded to this frontdesk (but not yet forwarded out)
          {
            frontdeskForwardings: {
              some: {
                toFrontdeskId: session.user.id,
                isActive: true,
              },
            },
          },
        ],
        status: {
          in: [ApplicationStatus.IN_PROGRESS, ApplicationStatus.REOPENED],
        },
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
            slaDays: true,
          },
        },
        currentHolder: {
          include: {
            officerProfile: true,
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
        frontdeskForwardings: {
          where: {
            isActive: true,
          },
          include: {
            fromFrontdesk: {
              include: {
                citizenProfile: true,
              },
            },
            toFrontdesk: {
              include: {
                citizenProfile: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Debug logging for applications
    console.log("Debug - Found applications:", applications.length);
    console.log(
      "Debug - Applications currentHolderIds:",
      applications.map((app) => ({
        id: app.id,
        currentHolderId: app.currentHolderId,
        rrNumber: app.rrNumber,
      }))
    );

    // Get applications forwarded TO this frontdesk (for forwarded history)
    const forwardedToMe = await prisma.application.findMany({
      where: {
        frontdeskForwardings: {
          some: {
            toFrontdeskId: session.user.id,
            isActive: true,
          },
        },
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
            slaDays: true,
          },
        },
        currentHolder: {
          include: {
            officerProfile: true,
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
        frontdeskForwardings: {
          where: {
            toFrontdeskId: session.user.id,
            isActive: true,
          },
          include: {
            fromFrontdesk: {
              include: {
                citizenProfile: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Categorize applications based on forwarding status
    const activeApplications = applications.filter((app) => {
      // Check if application is currently held by this frontdesk's officers
      const heldByMyOfficers = app.currentHolderId
        ? officerUserIds.includes(app.currentHolderId)
        : false;

      // Check if this application was forwarded TO this frontdesk (received)
      const forwardedToMe = app.frontdeskForwardings.some(
        (forwarding) =>
          forwarding.toFrontdeskId === session.user.id && forwarding.isActive
      );

      // Application is active if it's held by my officers OR forwarded to me
      // Even if it was previously forwarded by me, if it's back with my officers, it's active
      return heldByMyOfficers || forwardedToMe;
    });

    // Get applications forwarded OUT by this frontdesk (complete history)
    const forwardedOutByMe = await prisma.application.findMany({
      where: {
        frontdeskForwardings: {
          some: {
            fromFrontdeskId: session.user.id,
            // Don't filter by isActive - show complete history
          },
        },
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
            slaDays: true,
          },
        },
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
        frontdeskForwardings: {
          where: {
            fromFrontdeskId: session.user.id,
          },
          include: {
            toFrontdesk: {
              include: {
                citizenProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Get applications forwarded TO this frontdesk (complete history)
    const receivedByMe = await prisma.application.findMany({
      where: {
        frontdeskForwardings: {
          some: {
            toFrontdeskId: session.user.id,
            // Don't filter by isActive - show complete history
          },
        },
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
            slaDays: true,
          },
        },
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
        frontdeskForwardings: {
          where: {
            toFrontdeskId: session.user.id,
          },
          include: {
            fromFrontdesk: {
              include: {
                citizenProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Debug categorization
    console.log("Debug - Active applications:", activeApplications.length);
    console.log("Debug - Forwarded out by me:", forwardedOutByMe.length);
    console.log("Debug - Received by me:", receivedByMe.length);

    // Get completed/closed applications for this frontdesk
    const completedApplications = await prisma.application.findMany({
      where: {
        OR: [
          // Applications currently held by this frontdesk's officers
          {
            currentHolderId: {
              in: officerUserIds,
            },
          },
          // Applications that were forwarded to this frontdesk
          {
            frontdeskForwardings: {
              some: {
                toFrontdeskId: session.user.id,
              },
            },
          },
        ],
        status: {
          in: [ApplicationStatus.RESOLVED, ApplicationStatus.CLOSED],
        },
      },
      include: {
        serviceCategory: {
          select: {
            name: true,
            slaDays: true,
          },
        },
        currentHolder: {
          include: {
            officerProfile: true,
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
        frontdeskForwardings: {
          include: {
            fromFrontdesk: {
              include: {
                citizenProfile: true,
              },
            },
            toFrontdesk: {
              include: {
                citizenProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    console.log(
      "Debug - Completed applications:",
      completedApplications.length
    );
    // Get officer information for current user (their assigned officers)
    const assignedOfficers = officerProfiles;

    return NextResponse.json({
      activeApplications: activeApplications,
      forwardedOutByMe,
      receivedByMe,
      completedApplications,
      assignedOfficers: assignedOfficers.map((officer) => ({
        id: officer.id, // OfficerProfile ID for frontend
        fullName: officer.fullName,
        designation: officer.designation,
        department: officer.department,
      })),
      summary: {
        active: activeApplications.length,
        forwardedOut: forwardedOutByMe.length,
        received: receivedByMe.length,
        completed: completedApplications.length,
        total: activeApplications.length,
      },
    });
  } catch (error) {
    console.error("Error fetching frontdesk applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
