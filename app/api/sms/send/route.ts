import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOTP } from "@/lib/utils";
import { sendSms, generateOTPMessage } from "@/lib/thundersms.server";

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // Max 5 SMS per 15 minutes per IP

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIP =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limiting
    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { error: "Too many SMS requests. Please try again later." },
        { status: 429 }
      );
    }

    // Validate and clean phone number (strip non-digits)
    const cleanedPhone = phone.replace(/\D/g, "");

    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: "Phone number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // Check if user exists with this phone number
    const user = await prisma.user.findUnique({
      where: { phone: cleanedPhone },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found with this phone number" },
        { status: 404 }
      );
    }

    // Delete any existing SMS OTPs for this phone
    await prisma.smsOtp.deleteMany({
      where: {
        phone: cleanedPhone,
        isUsed: false,
      },
    });

    // Generate new 6-digit OTP
    const otp = generateOTP();
    const expiryMinutes = 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    console.log("=".repeat(50));
    console.log("📱 SMS OTP GENERATED FOR:", cleanedPhone);
    console.log("🔐 OTP CODE:", otp);
    console.log("⏰ EXPIRES IN:", expiryMinutes, "minutes");
    console.log("=".repeat(50));

    // Generate the official message using the template
    const message = generateOTPMessage(otp, expiryMinutes);

    // Send SMS via ThunderSMS
    const smsResult = await sendSms(cleanedPhone, message, {
      templateId: process.env.THUNDERSMS_TEMPLATE_ID,
      custRef: `otp_${Date.now()}`,
    });

    // Determine status based on SMS result
    const status = smsResult.success ? "SENT" : "FAILED";

    // Save SMS OTP record to database
    const smsOtpRecord = await prisma.smsOtp.create({
      data: {
        phone: cleanedPhone,
        otp,
        status,
        providerResponse: JSON.stringify(smsResult.raw),
        type: "VERIFICATION",
        expires: expiresAt,
        attempts: 1,
      },
    });

    if (!smsResult.success) {
      console.error("❌ SMS sending failed:", smsResult);
      return NextResponse.json(
        {
          error: "Failed to send SMS",
          details: smsResult.desc,
        },
        { status: 500 }
      );
    }

    console.log("✅ SMS OTP SENT SUCCESSFULLY TO:", cleanedPhone);
    console.log("📊 Provider Response Code:", smsResult.code);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to your mobile number",
      phone: cleanedPhone,
      expiresIn: expiryMinutes,
      otpId: smsOtpRecord.id,
    });
  } catch (error) {
    console.error("❌ Send SMS OTP error:", error);

    return NextResponse.json(
      {
        error: "Failed to send SMS OTP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
