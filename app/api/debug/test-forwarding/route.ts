// app/api/debug/test-forwarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get all frontdesk forwardings
    const forwardings = await prisma.frontdeskForwarding.findMany({
      include: {
        application: {
          select: {
            id: true,
            rrNumber: true,
            status: true,
            currentHolderId: true,
          },
        },
        fromFrontdesk: {
          select: {
            id: true,
            email: true,
          },
        },
        toFrontdesk: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Get all frontdesk assignments
    const assignments = await prisma.frontdeskOfficer.findMany({
      include: {
        frontdeskUser: {
          select: {
            email: true,
          },
        },
        officer: {
          select: {
            fullName: true,
            userId: true,
          },
        },
      },
    });

    // Get all applications with their current holders
    const applications = await prisma.application.findMany({
      select: {
        id: true,
        rrNumber: true,
        status: true,
        currentHolderId: true,
        currentHolder: {
          select: {
            email: true,
            officerProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    return NextResponse.json({
      forwardings,
      assignments,
      applications,
      summary: {
        totalForwardings: forwardings.length,
        activeForwardings: forwardings.filter((f) => f.isActive).length,
        totalAssignments: assignments.length,
        totalApplications: applications.length,
      },
    });
  } catch (error) {
    console.error("Error in test forwarding:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
