// app/api/debug/all-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        officerProfile: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { email: "asc" },
    });

    // Get frontdesk assignments
    const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
      include: {
        frontdeskUser: {
          select: {
            email: true,
            role: true,
          },
        },
        officer: {
          select: {
            fullName: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({
      currentUser: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      allUsers: users,
      frontdeskAssignments,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
