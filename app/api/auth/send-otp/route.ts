// File : app/api/auth/send-otp/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOTP } from "@/lib/utils";
import {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/mail";

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
    console.log("Generated OTP:", otp, "for email:", email);
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        type,
      },
    });

    // Send appropriate email based on type
    if (type === "EMAIL_VERIFICATION") {
      await sendVerificationEmail(email, otp);
    } else if (type === "PASSWORD_RESET") {
      await sendPasswordResetEmail(email, otp);
    } else {
      await sendOTPEmail(email, otp);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

// console otp
// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { generateOTP } from "@/lib/utils";

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

//     // Console log the OTP instead of sending email
//     console.log("=".repeat(50));
//     console.log("📧 OTP GENERATED FOR:", email);
//     console.log("🔐 OTP CODE:", otp);
//     console.log("📋 TYPE:", type);
//     console.log("⏰ EXPIRES IN: 10 minutes");
//     console.log("=".repeat(50));

//     await prisma.verificationToken.create({
//       data: {
//         identifier: email,
//         token: otp,
//         expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
//         type,
//       },
//     });

//     // Email sending is disabled - OTP is only logged to console
//     // Previously would send: sendVerificationEmail, sendPasswordResetEmail, or sendOTPEmail

//     return NextResponse.json({
//       success: true,
//       message: "OTP generated successfully (check console for development)",
//     });
//   } catch (error) {
//     console.error("Send OTP error:", error);
//     return NextResponse.json(
//       { error: "Failed to generate OTP" },
//       { status: 500 }
//     );
//   }
// }
