// app/api/debug/fix-frontdesk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user || session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newOfficerId } = await request.json();

    if (!newOfficerId) {
      return NextResponse.json(
        { error: "Officer ID required" },
        { status: 400 }
      );
    }

    // Update the frontdesk assignment
    const updated = await prisma.frontdeskOfficer.updateMany({
      where: {
        frontdeskUserId: session.user.id,
      },
      data: {
        officerId: newOfficerId,
      },
    });

    return NextResponse.json({
      message: "Frontdesk assignment updated",
      updated: updated.count,
      newOfficerId,
    });
  } catch (error) {
    console.error("Error updating frontdesk assignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
