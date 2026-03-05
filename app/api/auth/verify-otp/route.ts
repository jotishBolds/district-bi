import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { getToken } from "next-auth/jwt";
import { signIn } from "next-auth/react";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, identifier, otp, type = "EMAIL_VERIFICATION" } = body;

    // Support both legacy email parameter and new identifier parameter
    const userIdentifier = identifier || email;

    console.log("🔍 OTP Verification Debug:", {
      email,
      identifier: userIdentifier,
      otp,
      type,
    });

    // Log the OTP being verified for debugging
    console.log("🔐 OTP VERIFICATION ATTEMPT:");
    console.log("📧 User:", userIdentifier);
    console.log("🔑 Entered OTP:", otp);
    console.log("📋 Type:", type);
    console.log("⏰ Current Time:", new Date().toISOString());

    if (!userIdentifier || !otp) {
      return NextResponse.json(
        { error: "Identifier and OTP are required" },
        { status: 400 }
      );
    }

    // Find the verification token - check both email and phone
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: userIdentifier,
        token: otp,
        expires: {
          gt: new Date(),
        },
        type,
      },
    });

    console.log("📧 Email verification token found:", !!verificationToken);
    if (verificationToken) {
      console.log("📧 Token details:", {
        id: verificationToken.id,
        token: verificationToken.token,
        type: verificationToken.type,
        expires: verificationToken.expires,
        hasMetadata: !!verificationToken.metadata,
      });
    }

    // If not found in email verification, check SMS OTP table
    let smsOtpRecord = null;
    if (!verificationToken) {
      // Get user by identifier (email or phone)
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userIdentifier);
      let user;

      if (isEmail) {
        user = await prisma.user.findUnique({
          where: { email: userIdentifier },
          select: { phone: true, email: true },
        });
      } else {
        // Clean phone number for consistent format
        const cleanPhone = userIdentifier.replace(/[\s\-\(\)]/g, "");
        user = await prisma.user.findUnique({
          where: { phone: cleanPhone },
          select: { phone: true, email: true },
        });
      }

      if (user?.phone) {
        smsOtpRecord = await prisma.smsOtp.findFirst({
          where: {
            phone: user.phone,
            otp: otp,
            status: "SENT", // Check for SENT status instead of PENDING
            type: type === "login" ? "LOGIN_OTP" : type, // Handle legacy 'login' type
            expires: {
              gt: new Date(),
            },
          },
        });

        console.log("📱 SMS OTP record found:", !!smsOtpRecord);
        if (smsOtpRecord) {
          console.log("📱 SMS OTP details:", {
            id: smsOtpRecord.id,
            otp: smsOtpRecord.otp,
            status: smsOtpRecord.status,
            isUsed: smsOtpRecord.isUsed,
            expires: smsOtpRecord.expires,
          });
        }
      }
    }

    // If OTP not found in either table, return error
    if (!verificationToken && !smsOtpRecord) {
      console.log("❌ No valid OTP found in either email or SMS tables");
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    console.log("✅ Valid OTP found - proceeding with verification");

    // Validate pre-auth metadata for login OTP (only for email verification token)
    // Skip metadata validation if using SMS OTP or if email token has no metadata
    if (
      type === "EMAIL_VERIFICATION" &&
      verificationToken &&
      verificationToken.metadata
    ) {
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
    if (
      type === "EMAIL_VERIFICATION" ||
      type === "login" ||
      type === "LOGIN_OTP"
    ) {
      // For login OTP verification - verify user exists and is valid
      // Determine if userIdentifier is email or phone
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userIdentifier);

      let user;
      if (isEmail) {
        user = await prisma.user.findUnique({
          where: { email: userIdentifier },
          include: {
            officerProfile: {
              select: { fullName: true, designation: true },
            },
            citizenProfile: {
              select: { fullName: true },
            },
          },
        });
      } else {
        // Clean phone number for consistent format
        const cleanPhone = userIdentifier.replace(/[\s\-\(\)]/g, "");
        user = await prisma.user.findUnique({
          where: { phone: cleanPhone },
          include: {
            officerProfile: {
              select: { fullName: true, designation: true },
            },
            citizenProfile: {
              select: { fullName: true },
            },
          },
        });
      }

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 400 });
      }

      // Update user as active and last login time
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          lastLoginAt: new Date(),
        },
      });

      // Delete the used token(s)
      if (verificationToken) {
        await prisma.verificationToken.delete({
          where: {
            id: verificationToken.id,
          },
        });
      }

      if (smsOtpRecord) {
        await prisma.smsOtp.update({
          where: {
            id: smsOtpRecord.id,
          },
          data: {
            status: "USED",
            isUsed: true,
          },
        });
      }

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
      // For password reset, only use email verification token
      if (!verificationToken) {
        return NextResponse.json(
          { error: "Password reset requires email verification" },
          { status: 400 }
        );
      }

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
