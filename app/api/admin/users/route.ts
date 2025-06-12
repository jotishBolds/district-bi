// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma, UserRole } from "@/app/generated/prisma";

// Schema for creating users
const createUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  fullName: z.string().min(2, { message: "Full name is required" }),
  isActive: z.boolean().default(true),
  // For officer specific fields
  designation: z.string().optional(),
  department: z.string().optional(),
  officeLocation: z.string().optional(),
  // Password is optional - if not provided, a random one will be generated
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .optional(),
});

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

// Helper function to check if the role is an officer role
function isOfficerRole(role: UserRole) {
  return (
    [
      UserRole.FRONT_DESK,
      UserRole.DC,
      UserRole.ADC,
      UserRole.RO,
      UserRole.SDM,
      UserRole.DYDIR,
    ] as const
  ).includes(
    role as
      | typeof UserRole.FRONT_DESK
      | typeof UserRole.DC
      | typeof UserRole.ADC
      | typeof UserRole.RO
      | typeof UserRole.SDM
      | typeof UserRole.DYDIR
  );
}

// GET all users
export async function GET(req: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Fetch all users with their profiles
    const users = await prisma.user.findMany({
      include: {
        citizenProfile: {
          select: {
            fullName: true,
          },
        },
        officerProfile: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST create a new user
export async function POST(req: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Parse and validate the request body
    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate password if not provided
    const password = validatedData.password || generateRandomPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with transaction to ensure related profiles are created
    const user = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create the user
        const newUser = await tx.user.create({
          data: {
            email: validatedData.email,
            phone: validatedData.phone,
            passwordHash,
            role: validatedData.role,
            isActive: validatedData.isActive,
          },
        });

        // Create appropriate profile based on the role
        if (
          isOfficerRole(validatedData.role) ||
          validatedData.role === UserRole.ADMIN ||
          validatedData.role === UserRole.SUPER_ADMIN
        ) {
          await tx.officerProfile.create({
            data: {
              userId: newUser.id,
              fullName: validatedData.fullName,
              designation: validatedData.designation || "Officer",
              department: validatedData.department || "General",
              officeLocation: validatedData.officeLocation,
            },
          });
        } else {
          // Create citizen profile
          await tx.citizenProfile.create({
            data: {
              userId: newUser.id,
              fullName: validatedData.fullName,
              phone: validatedData.phone || "",
              address: "",
            },
          });
        }

        return newUser;
      }
    );

    // Fetch the created user with their profile
    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        citizenProfile: true,
        officerProfile: true,
      },
    });

    // Return the created user without the password hash
    const { passwordHash: _, ...userWithoutPassword } = createdUser!;

    // Return the password only on user creation so it can be shared
    return NextResponse.json({
      message: "User created successfully",
      user: userWithoutPassword,
      // Only include password when it was auto-generated
      ...(validatedData.password ? {} : { password }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
