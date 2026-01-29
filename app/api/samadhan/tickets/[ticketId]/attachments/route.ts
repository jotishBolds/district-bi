// SAMADHAN Attachments API
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateAttachment } from "@/lib/samadhan";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { getSamadhanSession } from "@/lib/samadhan-auth";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Maximum file sizes in bytes
const MAX_FILE_SIZES: Record<string, number> = {
  "image/jpeg": 5 * 1024 * 1024, // 5MB
  "image/png": 5 * 1024 * 1024, // 5MB
  "image/gif": 5 * 1024 * 1024, // 5MB
  "image/webp": 5 * 1024 * 1024, // 5MB
  "application/pdf": 10 * 1024 * 1024, // 10MB
  "application/msword": 5 * 1024 * 1024, // 5MB
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    5 * 1024 * 1024,
  "video/mp4": 50 * 1024 * 1024, // 50MB
  "video/quicktime": 50 * 1024 * 1024, // 50MB
};

// Default max size 5MB
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

type RouteParams = { params: Promise<{ ticketId: string }> };

// Helper function to find ticket by ID or referenceId
async function findTicket(ticketIdOrRef: string) {
  let ticket = await prisma.samadhanTicket.findUnique({
    where: { id: ticketIdOrRef },
  });

  if (!ticket) {
    ticket = await prisma.samadhanTicket.findUnique({
      where: { referenceId: ticketIdOrRef },
    });
  }

  return ticket;
}

// POST - Upload attachment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;
    const officerSession = await getServerSession(authOptions);
    const citizenSession = await getSamadhanSession();

    // Get ticket to verify it exists and check permissions (by ID or referenceId)
    const ticket = await findTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const infoRequestId = formData.get("infoRequestId") as string | null;
    const trackingToken = formData.get("trackingToken") as string | null;

    // For authenticated users, verify ownership or officer access
    const isOfficer =
      officerSession?.user?.role && officerSession.user.role !== "FRONT_DESK";
    const isCitizen =
      citizenSession?.userId === ticket.citizenId ||
      officerSession?.user?.id === ticket.citizenId;

    // Allow uploads with valid tracking token (for guest users viewing via track page)
    // Token format: referenceId:public:timestamp:verified
    let isValidTrackingToken = false;
    if (trackingToken && !isOfficer && !isCitizen) {
      const tokenParts = trackingToken.split(":");
      if (
        tokenParts.length >= 4 &&
        tokenParts[0] === ticket.referenceId &&
        tokenParts[3] === "verified"
      ) {
        isValidTrackingToken = true;
      }
    }

    // Allow uploads for tickets that are very recently created (within 5 minutes)
    // This handles the case when attachments are uploaded right after ticket creation
    // before any session can be established (for guests or during initial submission)
    const ticketAge = Date.now() - new Date(ticket.createdAt).getTime();
    const isRecentTicket = ticketAge < 5 * 60 * 1000; // 5 minutes

    // Also allow if this is a draft or queued ticket being updated by owner
    const isInitialSubmission =
      isRecentTicket &&
      (ticket.status === "DRAFT" ||
        ticket.status === "QUEUED" ||
        ticket.status === "UNSEEN");

    if (
      !isOfficer &&
      !isCitizen &&
      !isValidTrackingToken &&
      !isInitialSubmission
    ) {
      return NextResponse.json(
        { success: false, message: "Not authorized to upload attachments" },
        { status: 403 },
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 },
      );
    }

    // Check file size limit based on file type
    const maxSize = MAX_FILE_SIZES[file.type] || DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        {
          success: false,
          message: `File size exceeds maximum limit of ${maxSizeMB}MB for this file type`,
        },
        { status: 400 },
      );
    }

    // Validate file type and additional checks
    const validation = validateAttachment(file.name, file.size, file.type);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 },
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `samadhan/${ticket.id}/${fileName}`;

    // Verify AWS configuration
    if (!process.env.AWS_BUCKET_NAME) {
      console.error("AWS_BUCKET_NAME is not configured");
      return NextResponse.json(
        { success: false, message: "Storage not configured" },
        { status: 500 },
      );
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error("AWS credentials are not configured");
      return NextResponse.json(
        { success: false, message: "Storage credentials not configured" },
        { status: 500 },
      );
    }

    // Upload to S3
    console.log(
      `Uploading file to S3: ${filePath}, size: ${file.size}, type: ${file.type}`,
    );
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: filePath,
          Body: buffer,
          ContentType: file.type,
        }),
      );
      console.log(`File uploaded to S3 successfully: ${filePath}`);
    } catch (s3Error) {
      console.error("S3 upload error:", s3Error);
      return NextResponse.json(
        { success: false, message: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    // Determine uploader type
    const uploadedByType =
      officerSession?.user?.id && officerSession.user.role !== "FRONT_DESK"
        ? "OFFICER"
        : "CITIZEN";

    // Create attachment record
    const attachment = await prisma.samadhanAttachment.create({
      data: {
        ticketId: ticket.id,
        infoRequestId,
        fileName,
        originalName: file.name,
        filePath,
        fileType: file.type,
        fileSize: file.size,
        uploadedById:
          officerSession?.user?.id || citizenSession?.userId || null,
        uploadedByType,
      },
    });

    // Generate view URL
    const viewUrl = `/api/samadhan/tickets/${ticket.id}/attachments/${attachment.id}`;

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        id: attachment.id,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        viewUrl,
        downloadUrl: `${viewUrl}?download=true`,
      },
    });
  } catch (error) {
    console.error("Attachment upload error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload file" },
      { status: 500 },
    );
  }
}

// GET - List attachments for a ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;

    // Find ticket by ID or referenceId
    const ticket = await findTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    const attachments = await prisma.samadhanAttachment.findMany({
      where: { ticketId: ticket.id },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        fileType: true,
        fileSize: true,
        uploadedByType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Add view URLs to each attachment
    const attachmentsWithUrls = attachments.map((att) => ({
      ...att,
      viewUrl: `/api/samadhan/tickets/${ticket.id}/attachments/${att.id}`,
      downloadUrl: `/api/samadhan/tickets/${ticket.id}/attachments/${att.id}?download=true`,
    }));

    return NextResponse.json({
      success: true,
      data: attachmentsWithUrls,
    });
  } catch (error) {
    console.error("Attachments fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch attachments" },
      { status: 500 },
    );
  }
}
