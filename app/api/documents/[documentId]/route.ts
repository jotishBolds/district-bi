import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getPresignedUrl, extractS3Key } from "@/lib/s3-storage";
import prisma from "@/lib/prisma";

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

    // Check authorization - user must be involved with the application or be a DC/Admin
    const isAuthorized =
      // DC and Admin have access to all documents
      session.user.role === "DC" ||
      session.user.role === "ADMIN" ||
      // User is involved with the application
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

      // Generate presigned URL
      const presignedUrl = await getPresignedUrl(s3Key, 3600); // 1 hour expiry

      return NextResponse.json(
        {
          url: presignedUrl,
          fileName: document.fileName,
          fileSize: document.fileSize,
          documentType: document.documentType,
        },
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
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
