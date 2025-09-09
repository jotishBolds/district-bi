import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  getPresignedUrl,
  extractS3Key,
  getContentTypeFromExtension,
} from "@/lib/s3-storage";
import prisma from "@/lib/prisma";
import { isOfficerOrOfficial, isAdminRole } from "@/lib/officer-roles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const { documentId } = await params;

    // Require authentication to access files
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the document in database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        application: {
          select: {
            id: true,
            currentHolderId: true,
            officerAssignments: {
              select: {
                assignedToId: true,
                assignedById: true,
              },
            },
            frontdeskForwardings: {
              select: {
                fromFrontdeskId: true,
                toFrontdeskId: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Debug logging
    console.log("=== Document Authorization Debug ===");
    console.log("User ID:", session.user.id);
    console.log("User Role:", session.user.role);
    console.log("Document ID:", documentId);
    console.log("Application ID:", document.application.id);
    console.log("Current Holder ID:", document.application.currentHolderId);
    console.log(
      "Officer Assignments:",
      document.application.officerAssignments
    );
    console.log(
      "Frontdesk Forwardings:",
      document.application.frontdeskForwardings
    );

    // Check authorization - allow all officers and admin roles access to documents
    // Officers need to view documents to process applications
    const isAuthorized =
      isAdminRole(session.user.role) ||
      isOfficerOrOfficial(session.user.role) ||
      document.application.currentHolderId === session.user.id ||
      document.application.officerAssignments.some(
        (assignment) =>
          assignment.assignedToId === session.user.id ||
          assignment.assignedById === session.user.id
      ) ||
      document.application.frontdeskForwardings.some(
        (forwarding) =>
          forwarding.fromFrontdeskId === session.user.id ||
          forwarding.toFrontdeskId === session.user.id
      );

    console.log("Is Authorized:", isAuthorized);
    console.log("=== End Debug ===");

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate S3 presigned URL with proper content type and extended expiry
    const s3Key = extractS3Key(document.filePath);
    const contentType = getContentTypeFromExtension(document.fileName);

    // Check if user wants direct file serving (no expiration)
    const directServe = request.nextUrl.searchParams.get("direct") === "true";

    if (directServe) {
      // Redirect to the direct file serving endpoint (no expiration)
      const fileUrl = new URL(`/api/documents/${documentId}/file`, request.url);
      // Preserve download parameter if present
      if (request.nextUrl.searchParams.get("download") === "true") {
        fileUrl.searchParams.set("download", "true");
      }
      return NextResponse.redirect(fileUrl.toString());
    }

    // Generate presigned URL with 7 days expiry
    const presignedUrl = await getPresignedUrl(s3Key, 604800, contentType);

    // For API usage, return the URL with metadata
    const response = NextResponse.json({
      url: presignedUrl,
      directUrl: `/api/documents/${documentId}/file`, // URL for permanent access
      fileName: document.fileName,
      contentType: contentType,
      size: document.fileSize,
      documentType: document.documentType,
      expiresAt: new Date(Date.now() + 604800 * 1000).toISOString(), // 7 days from now
    });

    // Add CORS headers for browser compatibility
    response.headers.set(
      "Access-Control-Allow-Origin",
      request.headers.get("origin") || "*"
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Type, Last-Modified, ETag"
    );

    return response;
  } catch (error) {
    console.error("Error serving document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
