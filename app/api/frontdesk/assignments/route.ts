// app/api/frontdesk/assignments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

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

    const assignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
      },
      include: {
        officer: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            department: true,
            user: {
              select: {
                role: true, // Include the officer's role
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      userId: session.user.id,
      userEmail: session.user.email,
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        officerId: assignment.officerId,
        officer: assignment.officer
          ? {
              ...assignment.officer,
              role: assignment.officer.user?.role, // Include the officer's role
            }
          : null,
        createdAt: assignment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching frontdesk assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
