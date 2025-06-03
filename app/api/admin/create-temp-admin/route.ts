// app/api/admin/create-temp-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@/app/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper function to generate a random password
function generateRandomPassword(length = 12) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST create a temporary admin user
export async function POST(req: NextRequest) {
  try {
    // This endpoint should only be accessible in development mode
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "This endpoint is only available in development mode" },
        { status: 403 }
      );
    }

    // Generate a temporary admin email with timestamp to avoid conflicts
    const timestamp = Date.now();
    const email = `admin-${timestamp}@example.com`;
    const password = generateRandomPassword(10);
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with transaction to ensure officer profile is created
    const user = await prisma.$transaction(async (tx) => {
      // Create the admin user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });

      // Create officer profile
      await tx.officerProfile.create({
        data: {
          userId: newUser.id,
          fullName: "Temporary Admin",
          designation: "Administrator",
          department: "System Administration",
          officeLocation: "Main Office",
        },
      });

      return newUser;
    });

    // Fetch the created user with their profile
    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        officerProfile: true,
      },
    });

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = createdUser!;

    // Log the credentials
    console.log("Temporary admin created with:");
    console.log("Email:", email);
    console.log("Password:", password);

    return NextResponse.json({
      message: "Temporary admin created successfully",
      user: userWithoutPassword,
      email,
      password,
    });
  } catch (error) {
    console.error("Error creating temporary admin:", error);
    return NextResponse.json(
      { error: "Failed to create temporary admin" },
      { status: 500 }
    );
  }
}
