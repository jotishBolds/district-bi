// app/api/debug/frontdesk-data/route.ts
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

    // Debug information for frontdesk applications
    const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
        officerId: { not: null },
      },
      include: {
        officer: {
          include: {
            user: true,
          },
        },
      },
    });

    const officerIds = frontdeskAssignments
      .filter((assignment) => assignment.officerId)
      .map((assignment) => assignment.officerId!);

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

    // Get all applications where currentHolderId matches our officers
    const applicationsForMyOfficers = await prisma.application.findMany({
      where: {
        currentHolderId: {
          in: officerUserIds,
        },
      },
      select: {
        id: true,
        rrNumber: true,
        currentHolderId: true,
        status: true,
        currentHolder: {
          select: {
            email: true,
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

    // Get all applications forwarded to this frontdesk
    const applicationsForwardedToMe = await prisma.application.findMany({
      where: {
        frontdeskForwardings: {
          some: {
            toFrontdeskId: session.user.id,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        rrNumber: true,
        currentHolderId: true,
        status: true,
        currentHolder: {
          select: {
            email: true,
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
      debug: {
        frontdeskUserId: session.user.id,
        frontdeskAssignments: frontdeskAssignments.map((fa) => ({
          officerId: fa.officerId,
          officerEmail: fa.officer?.user?.email,
          officerName: fa.officer?.fullName,
        })),
        officerProfiles,
        officerUserIds,
        applicationsForMyOfficers,
        applicationsForwardedToMe,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Debug error" }, { status: 500 });
  }
}
