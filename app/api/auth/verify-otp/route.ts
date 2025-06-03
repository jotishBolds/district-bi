import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid"; // Make sure to install uuid package

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, type = "EMAIL_VERIFICATION" } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: otp,
        expires: {
          gt: new Date(),
        },
        type,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Handle different verification types
    if (type === "EMAIL_VERIFICATION") {
      // For login OTP verification or email verification
      await prisma.user.update({
        where: { email },
        data: {
          isActive: true,
          lastLoginAt: new Date(), // Update the last login time
        },
      });

      // Delete the used token for email verification
      await prisma.verificationToken.delete({
        where: {
          id: verificationToken.id,
        },
      });
    } else if (type === "PASSWORD_RESET") {
      // For password reset, generate a secure reset token
      const resetToken = uuidv4();

      // Update the token instead of deleting it
      await prisma.verificationToken.update({
        where: {
          id: verificationToken.id,
        },
        data: {
          // Store the original OTP in the token field for verification later
          token: resetToken,
          // Extend expiration time for password reset completion
          expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        },
      });

      // Return the reset token
      return NextResponse.json({
        success: true,
        message: "Verification successful",
        verified: true,
        resetToken: resetToken,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Verification successful",
      verified: true,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
