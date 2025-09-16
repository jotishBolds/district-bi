import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 }
      );
    }

    // Validate and clean phone number
    const cleanedPhone = phone.replace(/\D/g, "");

    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: "Phone number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "OTP must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Find the SMS OTP record
    const smsOtpRecord = await prisma.smsOtp.findFirst({
      where: {
        phone: cleanedPhone,
        otp: otp,
        isUsed: false,
        status: "SENT",
        expires: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: "desc", // Get the most recent OTP
      },
    });

    if (!smsOtpRecord) {
      console.log(
        `❌ SMS OTP verification failed for ${cleanedPhone}: Invalid or expired OTP`
      );
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Check if user exists with this phone number
    const user = await prisma.user.findUnique({
      where: { phone: cleanedPhone },
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
      return NextResponse.json(
        { error: "User not found with this phone number" },
        { status: 404 }
      );
    }

    // Mark the OTP as used and update user login information
    await prisma.$transaction([
      // Mark OTP as used
      prisma.smsOtp.update({
        where: { id: smsOtpRecord.id },
        data: {
          isUsed: true,
          status: "USED",
        },
      }),
      // Update user last login
      prisma.user.update({
        where: { phone: cleanedPhone },
        data: {
          isActive: true,
          lastLoginAt: new Date(),
        },
      }),
    ]);

    console.log("✅ SMS OTP verification successful for:", cleanedPhone);
    console.log("👤 User ID:", user.id);
    console.log("📧 User Email:", user.email);

    // Return success with user data for session creation
    return NextResponse.json({
      success: true,
      message: "SMS OTP verification successful",
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: true,
        level: user.level,
        fullName:
          user.officerProfile?.fullName || user.citizenProfile?.fullName,
        designation: user.officerProfile?.designation,
      },
    });
  } catch (error) {
    console.error("❌ SMS OTP verification error:", error);

    return NextResponse.json(
      {
        error: "SMS OTP verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
