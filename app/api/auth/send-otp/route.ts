// File : app/api/auth/send-otp/route.ts

// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { generateOTP } from "@/lib/utils";
// import {
//   sendOTPEmail,
//   sendPasswordResetEmail,
//   sendVerificationEmail,
// } from "@/lib/mail";

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { email, type = "EMAIL_VERIFICATION" } = body;

//     if (!email) {
//       return NextResponse.json({ error: "Email is required" }, { status: 400 });
//     }

//     // Check if user exists
//     const user = await prisma.user.findUnique({
//       where: { email },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     // Delete any existing OTP for this user and type
//     await prisma.verificationToken.deleteMany({
//       where: {
//         identifier: email,
//         type,
//       },
//     });

//     // Generate new OTP
//     const otp = generateOTP();
//     console.log("Generated OTP:", otp, "for email:", email);
//     await prisma.verificationToken.create({
//       data: {
//         identifier: email,
//         token: otp,
//         expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
//         type,
//       },
//     });

//     // Send appropriate email based on type
//     if (type === "EMAIL_VERIFICATION") {
//       await sendVerificationEmail(email, otp);
//     } else if (type === "PASSWORD_RESET") {
//       await sendPasswordResetEmail(email, otp);
//     } else {
//       await sendOTPEmail(email, otp);
//     }

//     return NextResponse.json({
//       success: true,
//       message: "OTP sent successfully",
//     });
//   } catch (error) {
//     console.error("Send OTP error:", error);
//     return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
//   }
// }

// console otp
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOTP } from "@/lib/utils";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginOTPEmail,
} from "@/lib/mail-new";
import { sendSms, generateOTPMessage } from "@/lib/thundersms.server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type = "EMAIL_VERIFICATION" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        officerProfile: true,
        citizenProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete any existing OTP for this user and type
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        type,
      },
    });

    // Generate new OTP
    const otp = generateOTP();

    // Always log OTP to console for development
    console.log("=".repeat(50));
    console.log("📧 OTP GENERATED FOR:", email);
    console.log("🔐 OTP CODE:", otp);
    console.log("📋 TYPE:", type);
    console.log("⏰ EXPIRES IN: 10 minutes");
    console.log("=".repeat(50));

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        type,
      },
    });

    // Send appropriate email based on type
    try {
      console.log("📧 Attempting to send email OTP to:", email);
      console.log("📧 Email Type:", type);

      // Check if email environment variables are configured
      const hasEmailConfig =
        process.env.EMAIL_SERVER_HOST &&
        process.env.EMAIL_SERVER_USER &&
        process.env.EMAIL_SERVER_PASSWORD &&
        process.env.EMAIL_FROM;

      if (!hasEmailConfig) {
        console.warn("⚠️ Email server not configured properly");
        console.log("📧 Available email env vars:", {
          host: !!process.env.EMAIL_SERVER_HOST,
          user: !!process.env.EMAIL_SERVER_USER,
          password: !!process.env.EMAIL_SERVER_PASSWORD,
          from: !!process.env.EMAIL_FROM,
        });
      }

      if (type === "EMAIL_VERIFICATION") {
        await sendVerificationEmail(email, otp);
      } else if (type === "PASSWORD_RESET") {
        console.log("🔄 Sending PASSWORD_RESET email...");
        await sendPasswordResetEmail(email, otp);
      } else if (type === "LOGIN_OTP") {
        await sendLoginOTPEmail(email, otp);
      } else {
        await sendVerificationEmail(email, otp); // Default fallback
      }
      console.log("✅ OTP EMAIL SENT SUCCESSFULLY TO:", email);
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("❌ Email sending error:", emailError);
      console.error("📧 Email Error Details:", {
        type,
        email,
        otp,
        error: emailError instanceof Error ? emailError.message : emailError,
      });
    }

    // Also send SMS if user has a phone number
    let smsResult = null;
    if (user.phone) {
      try {
        console.log(
          "============================================================"
        );
        console.log(`🚨 SMS SENDING ATTEMPT - TYPE: ${type}`);
        console.log("📱 Attempting to send SMS OTP to:", user.phone);
        console.log("📱 SMS Type:", type);
        console.log("🔐 SMS OTP to send:", otp);
        console.log(
          "============================================================"
        );

        // Validate phone number format
        const phoneDigits = user.phone.replace(/\D/g, "");
        console.log("📱 Phone validation:", {
          original: user.phone,
          cleaned: phoneDigits,
          length: phoneDigits.length,
          isValid: phoneDigits.length === 10,
        });

        // Check if SMS environment variables are configured
        const hasThunderSMSConfig =
          process.env.THUNDERSMS_USERNAME &&
          process.env.THUNDERSMS_API_KEY &&
          process.env.THUNDERSMS_SENDER_ID;

        console.log("🔧 Environment variables check:", {
          hasUsername: !!process.env.THUNDERSMS_USERNAME,
          hasApiKey: !!process.env.THUNDERSMS_API_KEY,
          hasSenderId: !!process.env.THUNDERSMS_SENDER_ID,
          hasConfig: hasThunderSMSConfig,
        });

        if (!hasThunderSMSConfig) {
          console.warn("⚠️ ThunderSMS not configured - SMS will not be sent");
          smsResult = { success: false, error: "SMS service not configured" };
        } else {
          // Create a custom SMS OTP record with the same OTP as email
          await prisma.smsOtp.deleteMany({
            where: {
              phone: user.phone,
              type: type,
            },
          });

          // Create SMS OTP record with the same OTP
          await prisma.smsOtp.create({
            data: {
              phone: user.phone,
              otp: otp, // Use the same OTP as email
              status: "SENT",
              type: type, // Use the exact type passed (PASSWORD_RESET, LOGIN_OTP, etc.)
              expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
              isUsed: false,
            },
          });

          // Send SMS using the Thunder SMS service with the same OTP
          // Use the exact same SMS configuration as login OTP for better delivery
          const customMessage = generateOTPMessage(otp, 10);
          console.log("📱 Sending SMS with message:", customMessage);
          console.log("📱 Original message type was:", type);

          const smsResponse = await sendSms(user.phone, customMessage, {
            templateId: process.env.THUNDERSMS_TEMPLATE_ID,
            custRef: `login_${Date.now()}`, // Use same custRef format as login
          });
          console.log("📱 SMS Raw Response:", smsResponse);

          smsResult = {
            success: smsResponse.success,
            error: smsResponse.success ? null : smsResponse.desc,
          };

          if (smsResult.success) {
            console.log("✅ SMS OTP SENT SUCCESSFULLY TO:", user.phone);
            console.log("📱 SMS Type:", type);
            console.log("🔐 SMS OTP:", otp);
          } else {
            console.error("❌ SMS sending failed:", smsResult.error);
            console.error("📱 SMS Response:", smsResponse);
          }
        }
      } catch (smsError) {
        console.error("❌ SMS sending error:", smsError);
        smsResult = { success: false, error: smsError };
      }
    }

    const successMessage = user.phone
      ? "OTP sent successfully to your email and phone number"
      : "OTP sent successfully to your email";

    return NextResponse.json({
      success: true,
      message: successMessage,
      emailSent: true,
      smsSent: smsResult?.success || false,
      phone: user.phone || null, // Return actual phone for verification
      maskedPhone: user.phone
        ? user.phone.replace(/(\d{2})\d{6}(\d{2})/, "$1****$2")
        : null, // Mask phone for display
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Failed to generate OTP" },
      { status: 500 }
    );
  }
}
