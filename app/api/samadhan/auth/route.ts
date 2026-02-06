// SAMADHAN Citizen OTP Authentication API
// Completely separate from Officer NextAuth authentication
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { generateOTP } from "@/lib/utils";
import { generateCitizenPseudonym } from "@/lib/samadhan";
import {
  createSamadhanSession,
  setSamadhanSessionCookie,
  clearSamadhanSession,
  getSamadhanSession,
} from "@/lib/samadhan-auth";
import { sendSms, generateOTPMessage } from "@/lib/thundersms.server";

const phoneSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  action: z.string().optional(),
  verifyOnly: z.boolean().optional(), // Just verify, don't create session
  referenceId: z.string().optional(), // For tracking verification
});

const verifySchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6, "OTP must be 6 digits"),
  action: z.string().optional(),
  verifyOnly: z.boolean().optional(),
  referenceId: z.string().optional(),
});

// GET - Check session status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "session") {
    try {
      const session = await getSamadhanSession();

      if (!session) {
        return NextResponse.json({
          authenticated: false,
          session: null,
        });
      }

      return NextResponse.json({
        authenticated: true,
        session: {
          userId: session.userId,
          phone: session.phone,
          name: session.name,
          pseudonym: session.pseudonym,
          role: session.role,
        },
      });
    } catch (error) {
      console.error("Session check error:", error);
      return NextResponse.json({
        authenticated: false,
        session: null,
      });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// POST - Send OTP for citizen authentication
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let action = searchParams.get("action");

    // Handle logout first - doesn't need body parsing
    if (action === "logout") {
      return handleLogout();
    }

    // Parse body for other actions
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty for some requests
    }

    // Support action from body as well
    if (body.action) {
      action = body.action as string;
    }

    if (action === "verify" || action === "verify-otp") {
      return verifyOTP(request, body);
    }

    // Send OTP (default action or action === "send-otp")
    const { phone, verifyOnly, referenceId } = phoneSchema.parse(body);

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Generate OTP
    const otp = generateOTP();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10); // 10 minute expiry

    // Store OTP
    await prisma.smsOtp.create({
      data: {
        phone: cleanPhone,
        otp,
        type: "SAMADHAN_LOGIN",
        expires,
        status: "SENT",
      },
    });

    // Send SMS via ThunderSMS
    try {
      const message = generateOTPMessage(otp);
      const smsResult = await sendSms(cleanPhone, message, {
        templateId: process.env.THUNDERSMS_TEMPLATE_ID,
      });

      if (!smsResult.success) {
        console.warn(
          `[SAMADHAN OTP] SMS send failed for ${cleanPhone}:`,
          smsResult,
        );
      } else {
        console.log(`[SAMADHAN OTP] SMS sent successfully to ${cleanPhone}`);
      }
    } catch (smsError) {
      console.error(`[SAMADHAN OTP] SMS error for ${cleanPhone}:`, smsError);
      // Continue anyway - OTP is stored and can be verified
    }

    // For development, also log the OTP
    console.log(`[SAMADHAN OTP] Phone: ${cleanPhone}, OTP: ${otp}`);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      // Remove in production:
      debug: process.env.NODE_ENV === "development" ? { otp } : undefined,
    });
  } catch (error) {
    console.error("OTP send error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid phone number",
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to send OTP" },
      { status: 500 },
    );
  }
}

async function verifyOTP(request: NextRequest, body?: Record<string, unknown>) {
  try {
    const data = body || (await request.json());
    const { phone, otp, verifyOnly, referenceId } = verifySchema.parse(data);

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Find valid OTP
    const otpRecord = await prisma.smsOtp.findFirst({
      where: {
        phone: cleanPhone,
        otp,
        type: "SAMADHAN_LOGIN",
        isUsed: false,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    // Mark OTP as used
    await prisma.smsOtp.update({
      where: { id: otpRecord.id },
      data: { isUsed: true, status: "USED" },
    });

    // If verifyOnly mode, just return success without creating session
    // This is used for attachment access verification
    if (verifyOnly) {
      // Optionally verify if phone matches the ticket owner
      if (referenceId) {
        const ticket = await prisma.samadhanTicket.findUnique({
          where: { referenceId },
          select: { citizenPhone: true },
        });

        if (
          ticket &&
          ticket.citizenPhone &&
          ticket.citizenPhone !== cleanPhone
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Phone number doesn't match the ticket owner",
            },
            { status: 403 },
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Phone verified successfully",
        data: {
          phone: cleanPhone,
          verified: true,
        },
      });
    }

    // Check if user exists with any role first
    const existingUser = await prisma.user.findUnique({
      where: {
        phone: cleanPhone,
      },
      include: {
        citizenProfile: true,
      },
    });

    let user = existingUser;

    // If user exists but with different role, check if they have CITIZEN access
    if (existingUser && existingUser.role !== "CITIZEN") {
      // If user exists with different role (e.g., OFFICER, ADMIN), they cannot use SAMADHAN
      return NextResponse.json(
        {
          success: false,
          message:
            "This phone number is registered for official use and cannot be used for citizen services. Please use a different phone number.",
        },
        { status: 403 },
      );
    }

    // Create user if doesn't exist
    if (!existingUser) {
      try {
        // Generate a unique pseudonym for the citizen
        const pseudonym = generateCitizenPseudonym();

        user = await prisma.user.create({
          data: {
            email: `citizen_${cleanPhone}_${Date.now()}@samadhan.local`,
            phone: cleanPhone,
            role: "CITIZEN", // SAMADHAN Citizen role - separate from main app users
            isActive: true,
            citizenProfile: {
              create: {
                fullName: `Citizen ${cleanPhone.slice(-4)}`, // Default name with last 4 digits
                phone: cleanPhone,
                address: "",
                samadhanPseudonym: pseudonym, // Random pseudonym for anonymity
              },
            },
          },
          include: {
            citizenProfile: true,
          },
        });
      } catch (createError: unknown) {
        console.error("Error creating user:", createError);

        // If it's a unique constraint error, try to find the existing user again
        if (
          createError &&
          typeof createError === "object" &&
          "code" in createError &&
          createError.code === "P2002"
        ) {
          const retryUser = await prisma.user.findUnique({
            where: {
              phone: cleanPhone,
            },
            include: {
              citizenProfile: true,
            },
          });

          if (retryUser) {
            if (retryUser.role !== "CITIZEN") {
              return NextResponse.json(
                {
                  success: false,
                  message:
                    "This phone number is registered for official use and cannot be used for citizen services. Please use a different phone number.",
                },
                { status: 403 },
              );
            }
            user = retryUser;
          } else {
            return NextResponse.json(
              {
                success: false,
                message: "Unable to create account. Please try again.",
              },
              { status: 500 },
            );
          }
        } else {
          return NextResponse.json(
            {
              success: false,
              message: "Unable to create account. Please try again.",
            },
            { status: 500 },
          );
        }
      }
    }

    // Ensure user is not null before proceeding
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create or find user account. Please try again.",
        },
        { status: 500 },
      );
    }

    // Link any guest tickets with this phone number to this user
    // This ensures previously submitted tickets appear in their dashboard
    const linkedTickets = await prisma.samadhanTicket.updateMany({
      where: {
        citizenPhone: cleanPhone,
        citizenId: null, // Only update tickets that don't have a citizenId
      },
      data: {
        citizenId: user.id,
        isAnonymous: false,
      },
    });

    if (linkedTickets.count > 0) {
      console.log(
        `[SAMADHAN] Linked ${linkedTickets.count} guest ticket(s) to user ${user.id} (${cleanPhone})`,
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create SAMADHAN session token (separate from NextAuth)
    const sessionToken = await createSamadhanSession({
      id: user.id,
      phone: cleanPhone,
      name: user.citizenProfile?.fullName || `Citizen ${cleanPhone.slice(-4)}`,
      pseudonym: user.citizenProfile?.samadhanPseudonym || "Anonymous Citizen",
    });

    // Set session cookie
    await setSamadhanSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      data: {
        userId: user.id,
        phone: user.phone,
        name: user.citizenProfile?.fullName || "",
        pseudonym: user.citizenProfile?.samadhanPseudonym || "Anonymous",
        isNewUser:
          !user.citizenProfile?.fullName ||
          user.citizenProfile.fullName.startsWith("Citizen "),
        linkedTickets: linkedTickets.count, // Tell user how many tickets were linked
      },
    });
  } catch (error) {
    console.error("OTP verify error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to verify OTP" },
      { status: 500 },
    );
  }
}

async function handleLogout() {
  try {
    await clearSamadhanSession();
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to logout" },
      { status: 500 },
    );
  }
}
