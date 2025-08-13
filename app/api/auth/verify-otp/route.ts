import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { getToken } from "next-auth/jwt";
import { signIn } from "next-auth/react";

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

    // Validate pre-auth metadata for login OTP
    if (type === "EMAIL_VERIFICATION" && verificationToken.metadata) {
      try {
        const metadata = JSON.parse(verificationToken.metadata);
        if (!metadata.preAuthValidated || !metadata.userId) {
          return NextResponse.json(
            { error: "Invalid verification token" },
            { status: 400 }
          );
        }

        // Check if token was created recently (within 10 minutes)
        const tokenAge = Date.now() - metadata.timestamp;
        if (tokenAge > 10 * 60 * 1000) {
          return NextResponse.json(
            { error: "Verification token expired" },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { error: "Invalid verification token format" },
          { status: 400 }
        );
      }
    }

    // Handle different verification types
    if (type === "EMAIL_VERIFICATION") {
      // For login OTP verification - verify user exists and is valid
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          officerProfile: {
            select: { fullName: true, designation: true },
          },
          citizenProfile: {
            select: { fullName: true },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 400 });
      }

      // Update user as active and last login time
      await prisma.user.update({
        where: { email },
        data: {
          isActive: true,
          lastLoginAt: new Date(),
        },
      });

      // Delete the used token
      await prisma.verificationToken.delete({
        where: {
          id: verificationToken.id,
        },
      });

      // Return success with user data for session creation
      return NextResponse.json({
        success: true,
        message: "OTP verification successful",
        verified: true,
        clearOtpFlag: true, // Signal to clear the OTP verification requirement
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: true,
          level: user.level,
          fullName:
            user.officerProfile?.fullName || user.citizenProfile?.fullName,
          designation: user.officerProfile?.designation,
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
