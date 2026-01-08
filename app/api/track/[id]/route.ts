// app/api/track/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  checkRateLimit,
  RATE_LIMITS,
  createRateLimitIdentifier,
  getRateLimitHeaders,
} from "@/lib/rate-limiter";
import { isValidUUID } from "@/lib/security";

// GET /api/track/[id] - Get specific application details by ID
// SECURITY: This endpoint requires prior OTP verification via session token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!id || !isValidUUID(id)) {
      return NextResponse.json(
        { error: "Invalid application ID format" },
        { status: 400 }
      );
    }

    // Apply rate limiting
    const rateLimitId = createRateLimitIdentifier(request, id);
    const rateLimitResult = await checkRateLimit(
      rateLimitId,
      RATE_LIMITS.TRACK
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // SECURITY CHECK: Verify the request has a valid tracking session
    const sessionToken = request.headers.get("X-Track-Session");
    const cookieToken = request.cookies.get("track_session")?.value;
    const token = sessionToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        {
          error: "Verification required",
          code: "OTP_REQUIRED",
          message:
            "Please verify your identity with OTP before accessing application details",
        },
        { status: 401 }
      );
    }

    // Verify the tracking session token
    const trackingSession = await prisma.applicationTrackingOTP.findFirst({
      where: {
        identifier: id,
        otp: token,
        isUsed: true, // Must have been verified
        expires: { gt: new Date() }, // Must not be expired
      },
    });

    if (!trackingSession) {
      return NextResponse.json(
        {
          error: "Session expired or invalid",
          code: "SESSION_INVALID",
          message: "Your tracking session has expired. Please verify again.",
        },
        { status: 401 }
      );
    }

    // Find application by ID with limited details for security
    const application = await prisma.application.findUnique({
      where: {
        id: id,
      },
      include: {
        serviceCategory: {
          select: { name: true },
        },
        workflow: {
          select: {
            toStatus: true,
            createdAt: true,
            comments: true,
            changedBy: {
              select: {
                officerProfile: {
                  select: { designation: true },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Limit workflow history
        },
        currentHolder: {
          select: {
            officerProfile: {
              select: { designation: true },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Return limited application details (no PII exposed)
    const response = NextResponse.json({
      application: {
        id: application.id,
        rrNumber: application.rrNumber,
        subject: application.subject,
        status: application.status,
        serviceCategoryName: application.serviceCategory.name,
        submittedAt: application.submittedAt,
        validatedAt: application.validatedAt,
        completedAt: application.completedAt,
        currentHolder:
          application.currentHolder?.officerProfile?.designation ||
          "Processing",
        workflow: application.workflow.map((w) => ({
          status: w.toStatus,
          changedAt: w.createdAt,
          changedBy: w.changedBy.officerProfile?.designation || "System",
          comments: w.comments,
        })),
      },
    });

    // Add rate limit headers
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("[TRACK] Error fetching application details");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
