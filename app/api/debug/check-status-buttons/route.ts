// app/api/debug/check-status-buttons/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApplicationStatus } from "@/app/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get applications with RESOLVED or CLOSED status
    const resolvedAndClosedApps = await prisma.application.findMany({
      where: {
        status: {
          in: [ApplicationStatus.RESOLVED, ApplicationStatus.CLOSED],
        },
      },
      include: {
        currentHolder: {
          include: {
            officerProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        serviceCategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    });

    // Get status counts
    const statusCounts = await prisma.application.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      resolvedAndClosedApps,
      statusCounts,
      message: "These applications should have REOPEN buttons for officers",
    });
  } catch (error) {
    console.error("Error checking status buttons:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
