import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateOTP, isValidEmail, validatePassword } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone, address } = body;

    // Validate input fields
    if (!email || !password || !fullName || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Create user and citizen profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          phone,
          role: "CITIZEN",
          isActive: false, // Initially inactive until email verification
        },
      });

      // Create citizen profile
      await tx.citizenProfile.create({
        data: {
          userId: newUser.id,
          fullName,
          phone,
          address: address || "",
        },
      });

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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
