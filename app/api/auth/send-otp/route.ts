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
import { sendOtp as sendSMSOtp } from "@/lib/thundersms.server";

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
      if (type === "EMAIL_VERIFICATION") {
        await sendVerificationEmail(email, otp);
      } else if (type === "PASSWORD_RESET") {
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
    }

    // Also send SMS if user has a phone number
    let smsResult = null;
    if (user.phone) {
      try {
        console.log("📱 Attempting to send SMS OTP to:", user.phone);
        smsResult = await sendSMSOtp(user.phone, user.id, type);

        if (smsResult.success) {
          console.log("✅ SMS OTP SENT SUCCESSFULLY TO:", user.phone);
        } else {
          console.error("❌ SMS sending failed:", smsResult.error);
        }
      } catch (smsError) {
        console.error("❌ SMS sending error:", smsError);
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
      phone: user.phone ? user.phone.replace(/(\d{6})\d{4}/, "$1****") : null, // Mask phone for security
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Failed to generate OTP" },
      { status: 500 }
    );
  }
}
