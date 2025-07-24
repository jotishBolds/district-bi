// app/api/debug/frontdesk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user || session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get frontdesk assignments
    const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
      },
      include: {
        officer: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    // Get all applications for debugging
    const allApplications = await prisma.application.findMany({
      select: {
        id: true,
        rrNumber: true,
        status: true,
        currentHolderId: true,
        citizenName: true,
        serviceCategory: {
          select: { name: true },
        },
        currentHolder: {
          select: {
            id: true,
            officerProfile: {
              select: {
                fullName: true,
                designation: true,
              },
            },
          },
        },
        officerAssignments: {
          select: {
            id: true,
            assignedToId: true,
            assignedTo: {
              select: {
                id: true,
                officerProfile: {
                  select: {
                    fullName: true,
                    designation: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    // Get all officers for reference
    const allOfficers = await prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.DC,
            UserRole.ADC,
            UserRole.ADC_GTK,
            UserRole.ADC_HQ,
            UserRole.SDM,
            UserRole.SDM_GTK,
            UserRole.SDM_HQ,
            UserRole.AC,
            UserRole.DPO_DDMA,
            UserRole.DD_REV,
            UserRole.DD_ACQ,
            UserRole.US_ADM,
            UserRole.AO,
            UserRole.TO_DDMA,
            UserRole.AD_IT,
            UserRole.US_ELECTION,
            UserRole.OS_COI_RC,
            UserRole.OS_RC,
            UserRole.RI_LEGAL,
            UserRole.RO,
            UserRole.DYDIR,
          ],
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        officerProfile: {
          select: {
            fullName: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({
      userId: session.user.id,
      userEmail: session.user.email,
      frontdeskAssignments,
      assignedOfficerIds: frontdeskAssignments
        .map((a) => a.officerId)
        .filter(Boolean),
      allApplications,
      allOfficers,
      summary: {
        totalApplications: allApplications.length,
        applicationsWithCurrentHolder: allApplications.filter(
          (a) => a.currentHolderId
        ).length,
        applicationsWithOfficerAssignments: allApplications.filter(
          (a) => a.officerAssignments.length > 0
        ).length,
      },
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
