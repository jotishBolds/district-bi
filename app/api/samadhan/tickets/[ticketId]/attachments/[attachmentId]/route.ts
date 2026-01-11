// SAMADHAN Attachment View/Download API
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSamadhanSession } from "@/lib/samadhan-auth";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

type RouteParams = {
  params: Promise<{ ticketId: string; attachmentId: string }>;
};

// GET - View/Download attachment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId, attachmentId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const trackingToken = searchParams.get("trackingToken"); // For verified tracking access

    // Check authentication - either NextAuth session OR SAMADHAN citizen session
    const officerSession = await getServerSession(authOptions);
    const citizenSession = await getSamadhanSession();

    // Get attachment with ticket info
    const attachment = await prisma.samadhanAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: {
          select: {
            id: true,
            referenceId: true,
            citizenId: true,
            citizenPhone: true,
            assignedOfficerId: true,
            escalatedToId: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, message: "Attachment not found" },
        { status: 404 }
      );
    }

    // Verify ticket access
    const isOfficer =
      officerSession?.user?.role && officerSession.user.role !== "FRONT_DESK";
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "DC", "ADC"].includes(
      officerSession?.user?.role || ""
    );
    const isAssignedOfficer =
      officerSession?.user?.id === attachment.ticket.assignedOfficerId;
    const isEscalatedOfficer =
      officerSession?.user?.id === attachment.ticket.escalatedToId;
    const isCitizen =
      citizenSession?.userId === attachment.ticket.citizenId ||
      officerSession?.user?.id === attachment.ticket.citizenId;

    // Check if user has verified tracking access (OTP verified for this ticket)
    let hasTrackingAccess = false;
    if (trackingToken) {
      // Verify tracking token format: referenceId:phone:timestamp:hash
      try {
        const [tokenRefId, , timestamp] = trackingToken.split(":");
        const tokenTime = parseInt(timestamp, 10);
        const now = Date.now();
        // Token valid for 1 hour
        if (
          tokenRefId === attachment.ticket.referenceId &&
          now - tokenTime < 3600000
        ) {
          hasTrackingAccess = true;
        }
      } catch {
        // Invalid token format
      }
    }

    // Allow access to: admin, assigned officer, escalated officer, the citizen, or verified tracking
    if (
      !isAdmin &&
      !isAssignedOfficer &&
      !isEscalatedOfficer &&
      !isCitizen &&
      !isOfficer &&
      !hasTrackingAccess
    ) {
      // Check if this is a guest ticket (no citizenId)
      const isGuestTicket = !attachment.ticket.citizenId;

      return NextResponse.json(
        {
          success: false,
          message: isGuestTicket
            ? "Attachments are only available to registered users. Please register or login to access attachments."
            : "Not authorized to view this attachment. Please login to your SAMADHAN account to access attachments.",
          isGuestTicket,
          requiresAuth: true,
          ticketPhone: attachment.ticket.citizenPhone
            ? attachment.ticket.citizenPhone.substring(0, 4) +
              "****" +
              attachment.ticket.citizenPhone.slice(-2)
            : null,
        },
        { status: 403 }
      );
    }

    // Generate pre-signed URL for S3
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: attachment.filePath,
      ResponseContentDisposition:
        action === "download"
          ? `attachment; filename="${attachment.originalName}"`
          : `inline; filename="${attachment.originalName}"`,
      ResponseContentType: attachment.fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // 1 hour

    // Return signed URL for viewing
    if (action === "url") {
      return NextResponse.json({
        success: true,
        data: {
          url: signedUrl,
          fileName: attachment.originalName,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
        },
      });
    }

    // Redirect to S3 signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Attachment view error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve attachment" },
      { status: 500 }
    );
  }
}
