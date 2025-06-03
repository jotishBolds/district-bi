// app/api/admin/users/[userId]/toggle-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@/app/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Check authorization
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request: isActive must be a boolean" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the user is trying to deactivate themselves
    if (session.user.id === userId && !isActive) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Toggle user active status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}
