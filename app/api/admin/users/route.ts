// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma, UserRole } from "@/app/generated/prisma";
import { OFFICER_ROLE_MAPPINGS } from "@/lib/officer-roles";

// Schema for creating users
const createUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  level: z.number().int().min(-2).max(7).optional(), // -2 for super admin, 0-6 for officers
  fullName: z.string().min(2, { message: "Full name is required" }),
  isActive: z.boolean().default(true),
  // For officer specific fields
  designation: z.string().optional(),
  department: z.string().optional(),
  officeLocation: z.string().optional(),
  sectionId: z.string().optional(),
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
      UserRole.ADC_GTK,
      UserRole.ADC_HQ,
      UserRole.SDM,
      UserRole.SDM_GTK,
      UserRole.SDM_HQ,
      UserRole.AC,
      UserRole.DPO_DDMA,
      UserRole.DD_REV,
      UserRole.DD_ACQ,
      UserRole.US_ADM,
      UserRole.AO,
      UserRole.TO_DDMA,
      UserRole.AD_IT,
      UserRole.US_ELECTION,
      UserRole.OS_COI_RC,
      UserRole.OS_RC,
      UserRole.RI_LEGAL,
      UserRole.RO,
      UserRole.DYDIR,
    ] as const
  ).includes(
    role as
      | typeof UserRole.FRONT_DESK
      | typeof UserRole.DC
      | typeof UserRole.ADC
      | typeof UserRole.ADC_GTK
      | typeof UserRole.ADC_HQ
      | typeof UserRole.SDM
      | typeof UserRole.SDM_GTK
      | typeof UserRole.SDM_HQ
      | typeof UserRole.AC
      | typeof UserRole.DPO_DDMA
      | typeof UserRole.DD_REV
      | typeof UserRole.DD_ACQ
      | typeof UserRole.US_ADM
      | typeof UserRole.AO
      | typeof UserRole.TO_DDMA
      | typeof UserRole.AD_IT
      | typeof UserRole.US_ELECTION
      | typeof UserRole.OS_COI_RC
      | typeof UserRole.OS_RC
      | typeof UserRole.RI_LEGAL
      | typeof UserRole.RO
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
          include: {
            section: true,
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
        // Get role mapping for default level and other properties
        const roleMapping = OFFICER_ROLE_MAPPINGS[validatedData.role];
        const level = validatedData.level ?? roleMapping?.level ?? 0; // Default to 0 if no mapping

        // Create the user
        const newUser = await tx.user.create({
          data: {
            email: validatedData.email,
            phone: validatedData.phone,
            passwordHash,
            role: validatedData.role,
            level: level,
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
              designation:
                validatedData.designation ||
                roleMapping?.shortDesignation ||
                "Officer",
              department:
                validatedData.department ||
                roleMapping?.defaultSection ||
                "General",
              officeLocation: validatedData.officeLocation,
              sectionId: validatedData.sectionId,
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
        officerProfile: {
          include: {
            section: true,
          },
        },
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
