import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateOTP, isValidEmail, validatePassword } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/mail";
import { UserRole } from "@/app/generated/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      fullName,
      phone,
      role = "FRONT_DESK",
      designation,
      department,
    } = body;

    // Validate input fields
    if (!email || !password || !fullName || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role - only allow ADMIN and FRONT_DESK
    if (!["ADMIN", "FRONT_DESK"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Only ADMIN and FRONT_DESK are allowed" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user and profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          phone,
          role: role as UserRole,
          isActive: true, // Admin and frontdesk users are active by default
        },
      });

      // Create officer profile if needed (for admin users or frontdesk with designation)
      if (role === "ADMIN" || (role === "FRONT_DESK" && designation)) {
        await tx.officerProfile.create({
          data: {
            userId: newUser.id,
            fullName,
            designation:
              designation ||
              (role === "ADMIN" ? "Administrator" : "Front Desk Officer"),
            department: department || "Administration",
            officeLocation: "District Office",
            isAvailable: true,
          },
        });
      }

      return newUser;
    });

    // Generate and store OTP for email verification
    const otp = generateOTP();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        type: "EMAIL_VERIFICATION",
      },
    });

    // Send verification email
    await sendVerificationEmail(email, otp);

    return NextResponse.json(
      {
        message:
          "Registration successful. Please check your email for verification code.",
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
