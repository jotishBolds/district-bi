// app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@/app/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as bcrypt from "bcryptjs";
import { z } from "zod";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Schema for updating users
const updateUserSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  fullName: z.string().min(2, { message: "Full name is required" }).optional(),
  isActive: z.boolean().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  officeLocation: z.string().optional(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .optional(),
});

// Helper function to check officer role
function isOfficerRole(role: UserRole): boolean {
  return [UserRole.FRONT_DESK, UserRole.DC, UserRole.ADC, UserRole.RO].includes(
    role as
      | typeof UserRole.FRONT_DESK
      | typeof UserRole.DC
      | typeof UserRole.ADC
      | typeof UserRole.RO
  );
}

// GET a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData: {
      email?: string;
      phone?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
    } = {
      ...(validatedData.email && { email: validatedData.email }),
      ...(validatedData.phone && { phone: validatedData.phone }),
      ...(validatedData.role && { role: validatedData.role }),
      ...(validatedData.isActive !== undefined && {
        isActive: validatedData.isActive,
      }),
    };

    if (validatedData.password) {
      userData.passwordHash = await bcrypt.hash(validatedData.password, 10);
    }

    const role = validatedData.role || existingUser.role;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: userData,
      });

      if (isOfficerRole(role)) {
        if (existingUser.officerProfile) {
          await tx.officerProfile.update({
            where: { userId: userId },
            data: {
              ...(validatedData.fullName && {
                fullName: validatedData.fullName,
              }),
              ...(validatedData.designation && {
                designation: validatedData.designation,
              }),
              ...(validatedData.department && {
                department: validatedData.department,
              }),
              ...(validatedData.officeLocation && {
                officeLocation: validatedData.officeLocation,
              }),
            },
          });
        } else {
          await tx.officerProfile.create({
            data: {
              userId: userId,
              fullName:
                validatedData.fullName ||
                existingUser.citizenProfile?.fullName ||
                "Unknown",
              designation: validatedData.designation || "Officer",
              department: validatedData.department || "General",
              officeLocation: validatedData.officeLocation || null,
            },
          });

          if (existingUser.citizenProfile) {
            await tx.citizenProfile.delete({
              where: { userId: userId },
            });
          }
        }
      } else {
        if (existingUser.citizenProfile) {
          await tx.citizenProfile.update({
            where: { userId: userId },
            data: {
              ...(validatedData.fullName && {
                fullName: validatedData.fullName,
              }),
              ...(validatedData.phone && { phone: validatedData.phone }),
            },
          });
        } else {
          await tx.citizenProfile.create({
            data: {
              userId: userId,
              fullName:
                validatedData.fullName ||
                existingUser.officerProfile?.fullName ||
                "Unknown",
              phone: validatedData.phone || existingUser.phone || "",
              address: "",
            },
          });

          if (existingUser.officerProfile) {
            await tx.officerProfile.delete({
              where: { userId: userId },
            });
          }
        }
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
      },
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser!;
    return NextResponse.json({
      message: "User updated successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (session.user.id === userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
