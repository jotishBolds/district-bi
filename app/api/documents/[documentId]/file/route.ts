import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  getFileFromS3,
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

    // Require authentication to access files
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
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

    // Check authorization - allow all officers and admin roles access to documents
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

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    try {
      // Extract S3 key from filePath
      const s3Key = extractS3Key(document.filePath);

      // Get file directly from S3
      const fileData = await getFileFromS3(s3Key);

      // Determine content type
      const contentType = getContentTypeFromExtension(document.fileName);

      // Check if it's a download request
      const isDownload =
        request.nextUrl.searchParams.get("download") === "true";

      // Create response with file stream
      const response = new NextResponse(fileData.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": fileData.contentLength.toString(),
          "Last-Modified": fileData.lastModified.toUTCString(),
          "Cache-Control": "public, max-age=31536000", // Cache for 1 year
          ETag: `"${documentId}-${fileData.lastModified.getTime()}"`,
          // Set Content-Disposition based on whether it's a download
          "Content-Disposition": isDownload
            ? `attachment; filename="${encodeURIComponent(document.fileName)}"`
            : `inline; filename="${encodeURIComponent(document.fileName)}"`,
          // CORS headers
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Expose-Headers":
            "Content-Length, Content-Type, Last-Modified, ETag, Content-Disposition",
        },
      });

      return response;
    } catch (s3Error) {
      console.error("Error accessing file from S3:", s3Error);
      return NextResponse.json(
        { error: "File not found or access failed" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving document file:", error);
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Support HEAD requests for metadata
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return new NextResponse(null, { status: 401 });
    }

    const { documentId } = await params;

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
      return new NextResponse(null, { status: 404 });
    }

    // Check authorization
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

    if (!isAuthorized) {
      return new NextResponse(null, { status: 403 });
    }

    const contentType = getContentTypeFromExtension(document.fileName);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": document.fileSize.toString(),
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error in HEAD request:", error);
    return new NextResponse(null, { status: 500 });
  }
}
