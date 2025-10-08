// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

// Schema for updating profile
const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
  // Citizen-specific fields
  address: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  // Officer-specific fields - these are accepted but ignored for officer users
  // Only admins can update these through admin endpoints
  designation: z.string().optional(),
  department: z.string().optional(),
  officeLocation: z.string().optional(),
  sectionId: z.string().optional(),
});

// Schema for updating password
const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        citizenProfile: true,
        officerProfile: {
          include: {
            section: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "updatePassword") {
      // Handle password update
      const validatedData = updatePasswordSchema.parse(data);

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json(
          { error: "User not found or password not set" },
          { status: 404 }
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        validatedData.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        message: "Password updated successfully",
      });
    } else {
      // Handle profile update
      const validatedData = updateProfileSchema.parse(data);

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          citizenProfile: true,
          officerProfile: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if phone number is already in use by another user
      if (validatedData.phone) {
        const existingUser = await prisma.user.findFirst({
          where: {
            phone: validatedData.phone,
            id: { not: session.user.id },
          },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "Phone number is already in use" },
            { status: 400 }
          );
        }
      }

      // Determine if this is an officer or citizen
      const isOfficer = user.officerProfile !== null;

      await prisma.$transaction(async (tx) => {
        // Update basic user info
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            ...(validatedData.phone && { phone: validatedData.phone }),
            updatedAt: new Date(),
          },
        });

        if (isOfficer) {
          // Update officer profile - only allow basic information updates
          await tx.officerProfile.update({
            where: { userId: session.user.id },
            data: {
              fullName: validatedData.fullName,
              // Officer-specific fields (designation, department, officeLocation, sectionId)
              // are intentionally excluded - only admins can update these
              updatedAt: new Date(),
            },
          });
        } else {
          // Update citizen profile
          await tx.citizenProfile.update({
            where: { userId: session.user.id },
            data: {
              fullName: validatedData.fullName,
              ...(validatedData.phone && { phone: validatedData.phone }),
              ...(validatedData.address && { address: validatedData.address }),
              ...(validatedData.aadhaarNumber && {
                aadhaarNumber: validatedData.aadhaarNumber,
              }),
              updatedAt: new Date(),
            },
          });
        }
      });

      // Fetch updated user
      const updatedUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          citizenProfile: true,
          officerProfile: {
            include: {
              section: true,
            },
          },
        },
      });

      const { passwordHash, ...userWithoutPassword } = updatedUser!;

      return NextResponse.json({
        message: "Profile updated successfully",
        user: userWithoutPassword,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
