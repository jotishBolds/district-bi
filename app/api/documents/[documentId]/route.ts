import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getPresignedUrl, extractS3Key } from "@/lib/s3-storage";
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

    // Get document details from database
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

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    try {
      // Extract S3 key from filePath
      const s3Key = extractS3Key(document.filePath);

      // Check if user wants direct file serving (no expiration)
      const directServe = request.nextUrl.searchParams.get("direct") === "true";

      if (directServe) {
        // Redirect to the direct file serving endpoint (no expiration)
        const fileUrl = new URL(
          `/api/documents/${documentId}/file`,
          request.url
        );
        // Preserve download parameter if present
        if (request.nextUrl.searchParams.get("download") === "true") {
          fileUrl.searchParams.set("download", "true");
        }
        return NextResponse.redirect(fileUrl.toString());
      }

      // Generate presigned URL with extended expiry (7 days)
      const presignedUrl = await getPresignedUrl(s3Key, 604800); // 7 days instead of 1 hour

      return NextResponse.json(
        {
          url: presignedUrl,
          directUrl: `/api/documents/${documentId}/file`, // URL for permanent access
          fileName: document.fileName,
          fileSize: document.fileSize,
          documentType: document.documentType,
          expiresAt: new Date(Date.now() + 604800 * 1000).toISOString(), // 7 days from now
        },
        {
          headers: {
            "Cache-Control": "public, max-age=3600", // Cache response for 1 hour
            Pragma: "public",
          },
        }
      );
    } catch (s3Error) {
      console.error("Error accessing file from S3:", s3Error);
      return NextResponse.json(
        { error: "File access failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error serving document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
