// app/api/debug/user-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canUserManageServiceCategories } from "@/lib/service-category-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can manage service categories
    const canManage = await canUserManageServiceCategories(session.user.role);

    // For frontdesk users, check assignments
    let assignments: Array<{
      id: string;
      frontdeskUserId: string;
      officerId: string | null;
      createdAt: Date;
      officer: {
        id: string;
        fullName: string;
        designation: string;
      } | null;
    }> = [];
    if (session.user.role === "FRONT_DESK") {
      assignments = await prisma.frontdeskOfficer.findMany({
        where: { frontdeskUserId: session.user.id },
        include: {
          officer: true,
        },
      });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      permissions: {
        canManageServiceCategories: canManage,
        hasOfficerAssignments: assignments.length > 0,
        assignments: assignments.length,
      },
      debug: {
        assignments,
      },
    });
  } catch (error) {
    console.error("Error getting user info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
