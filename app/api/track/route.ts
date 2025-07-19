// app/api/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOTP } from "@/lib/utils";
import { ApplicationStatus } from "@/app/generated/prisma";

// Rate limiting map (in production, use Redis or similar)
const otpRequestCount = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_MAX = 3; // 3 attempts per 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userAttempts = otpRequestCount.get(identifier);

  if (!userAttempts || now > userAttempts.resetTime) {
    // Reset or create new entry
    otpRequestCount.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userAttempts.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userAttempts.count++;
  return true;
}

// POST /api/track - Request OTP for tracking
export async function POST(request: NextRequest) {
  try {
    const { identifier, type } = await request.json();

    if (!identifier || !type) {
      return NextResponse.json(
        { error: "Missing identifier or type" },
        { status: 400 }
      );
    }

    if (!["RR_NUMBER", "PHONE_NUMBER"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be RR_NUMBER or PHONE_NUMBER" },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let application;

    if (type === "RR_NUMBER") {
      // Find application by RR number
      application = await prisma.application.findFirst({
        where: {
          rrNumber: identifier,
          status: {
            not: ApplicationStatus.DRAFT, // Only validated applications have RR numbers
          },
        },
        select: {
          id: true,
          citizenEmail: true,
          citizenPhone: true,
          citizenName: true,
        },
      });

      if (!application) {
        return NextResponse.json(
          { error: "Application not found with this RR number" },
          { status: 404 }
        );
      }
    } else {
      // Find application by phone number
      application = await prisma.application.findFirst({
        where: {
          citizenPhone: identifier,
        },
        select: {
          id: true,
          citizenEmail: true,
          citizenPhone: true,
          citizenName: true,
        },
      });

      if (!application) {
        return NextResponse.json(
          { error: "Application not found with this phone number" },
          { status: 404 }
        );
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await prisma.applicationTrackingOTP.create({
      data: {
        identifier,
        otp,
        otpType: type,
        sentTo:
          type === "RR_NUMBER"
            ? application.citizenEmail || application.citizenPhone
            : application.citizenPhone,
        expires,
      },
    });

    // In production, send SMS/Email here
    // For now, console log the OTP
    console.log("=".repeat(50));
    console.log("🔐 APPLICATION TRACKING OTP");
    console.log("📱 IDENTIFIER:", identifier);
    console.log(
      "📧 SENT TO:",
      type === "RR_NUMBER"
        ? application.citizenEmail || application.citizenPhone
        : application.citizenPhone
    );
    console.log("🔐 OTP CODE:", otp);
    console.log("⏰ EXPIRES IN: 10 minutes");
    console.log("=".repeat(50));

    return NextResponse.json({
      message: "OTP sent successfully",
      sentTo:
        type === "RR_NUMBER"
          ? application.citizenEmail
            ? "email"
            : "phone"
          : "phone",
      maskedContact:
        type === "RR_NUMBER"
          ? application.citizenEmail
            ? application.citizenEmail.replace(/(.{2}).*(@.*)/, "$1***$2")
            : application.citizenPhone.replace(/(.{2}).*(.{2})/, "$1***$2")
          : application.citizenPhone.replace(/(.{2}).*(.{2})/, "$1***$2"),
    });
  } catch (error) {
    console.error("Error in track OTP request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/track - Verify OTP and get application details
export async function PUT(request: NextRequest) {
  try {
    const { identifier, otp } = await request.json();

    if (!identifier || !otp) {
      return NextResponse.json(
        { error: "Missing identifier or OTP" },
        { status: 400 }
      );
    }

    // Find and verify OTP
    const otpRecord = await prisma.applicationTrackingOTP.findFirst({
      where: {
        identifier,
        otp,
        isUsed: false,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      // Increment attempts for invalid OTP
      await prisma.applicationTrackingOTP.updateMany({
        where: {
          identifier,
          isUsed: false,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await prisma.applicationTrackingOTP.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        isUsed: true,
      },
    });

    // Find application details
    let application;

    if (otpRecord.otpType === "RR_NUMBER") {
      application = await prisma.application.findFirst({
        where: {
          rrNumber: identifier,
        },
        include: {
          serviceCategory: true,
          workflow: {
            include: {
              changedBy: {
                include: {
                  officerProfile: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          validation: {
            include: {
              validatedBy: {
                include: {
                  officerProfile: true,
                },
              },
            },
          },
          currentHolder: {
            include: {
              officerProfile: true,
            },
          },
        },
      });
    } else {
      // For phone number tracking, find all applications for this citizen
      const applications = await prisma.application.findMany({
        where: {
          citizenPhone: identifier,
        },
        include: {
          serviceCategory: true,
          workflow: {
            include: {
              changedBy: {
                include: {
                  officerProfile: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          validation: {
            include: {
              validatedBy: {
                include: {
                  officerProfile: true,
                },
              },
            },
          },
          currentHolder: {
            include: {
              officerProfile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (applications.length === 0) {
        return NextResponse.json(
          { error: "No applications found for this phone number" },
          { status: 404 }
        );
      }

      // For phone number tracking, return all applications
      return NextResponse.json({
        applications: applications.map((app) => ({
          id: app.id,
          rrNumber: app.rrNumber,
          subject: app.subject,
          status: app.status,
          citizenName: app.citizenName,
          citizenPhone: app.citizenPhone,
          serviceCategoryName: app.serviceCategory.name,
          submittedAt: app.submittedAt,
          validatedAt: app.validatedAt,
          completedAt: app.completedAt,
          createdAt: app.createdAt,
          currentHolder: app.currentHolder?.officerProfile?.fullName,
          workflow: app.workflow.map((w) => ({
            status: w.toStatus,
            changedAt: w.createdAt,
            changedBy: w.changedBy.officerProfile?.fullName || "System",
            comments: w.comments,
          })),
          validation: app.validation
            ? {
                rrNumber: app.validation.rrNumber,
                validatedBy:
                  app.validation.validatedBy.officerProfile?.fullName,
                validationNotes: app.validation.validationNotes,
              }
            : null,
        })),
        isMultipleApplications: true,
      });
    }

    if (!application && otpRecord.otpType === "RR_NUMBER") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // For RR_NUMBER tracking, return single application
    if (otpRecord.otpType === "RR_NUMBER" && application) {
      return NextResponse.json({
        application: {
          id: application.id,
          rrNumber: application.rrNumber,
          subject: application.subject,
          status: application.status,
          citizenName: application.citizenName,
          citizenPhone: application.citizenPhone,
          serviceCategoryName: application.serviceCategory.name,
          submittedAt: application.submittedAt,
          validatedAt: application.validatedAt,
          completedAt: application.completedAt,
          createdAt: application.createdAt,
          currentHolder: application.currentHolder?.officerProfile?.fullName,
          workflow: application.workflow.map((w) => ({
            status: w.toStatus,
            changedAt: w.createdAt,
            changedBy: w.changedBy.officerProfile?.fullName || "System",
            comments: w.comments,
          })),
          validation: application.validation
            ? {
                rrNumber: application.validation.rrNumber,
                validatedBy:
                  application.validation.validatedBy.officerProfile?.fullName,
                validationNotes: application.validation.validationNotes,
              }
            : null,
        },
        isMultipleApplications: false,
      });
    }
  } catch (error) {
    console.error("Error in track OTP verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
