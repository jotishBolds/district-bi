import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  getPresignedUrl,
  extractS3Key,
  getContentTypeFromExtension,
} from "@/lib/s3-storage";
import prisma from "@/lib/prisma";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerAuthSession();

    // Require authentication to access files
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await params;

    if (!path || path.length === 0) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Legacy file path handling - convert to S3 key
    try {
      // For legacy paths like: /uploads/applications/applicationId/documentId.ext
      if (path[0] === "applications" && path.length >= 3) {
        const applicationId = path[1];
        const fileName = path[path.length - 1];

        // Find the document in database to verify access
        const document = await prisma.document.findFirst({
          where: {
            applicationId: applicationId,
            fileName: {
              endsWith: fileName,
            },
          },
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

        // Check authorization
        const isAuthorized =
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

        // Generate S3 presigned URL with proper content type
        const s3Key = extractS3Key(document.filePath);
        const contentType = getContentTypeFromExtension(document.fileName);
        const presignedUrl = await getPresignedUrl(s3Key, 3600, contentType);

        // For direct file access, redirect to presigned URL
        if (request.nextUrl.searchParams.get("download") === "true") {
          return NextResponse.redirect(presignedUrl);
        }

        // For preview/inline display, return the URL with proper CORS headers
        const response = NextResponse.json({
          url: presignedUrl,
          fileName: document.fileName,
          contentType: contentType,
          size: document.fileSize,
        });

        // Add CORS headers
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set(
          "Access-Control-Allow-Methods",
          "GET, HEAD, OPTIONS"
        );
        response.headers.set(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization"
        );
        response.headers.set(
          "Access-Control-Expose-Headers",
          "Content-Length, Content-Type, Last-Modified, ETag"
        );

        return response;
      }

      return NextResponse.json(
        { error: "Invalid file path format" },
        { status: 400 }
      );
    } catch (s3Error) {
      console.error("Error accessing file from S3:", s3Error);
      return NextResponse.json(
        { error: "File access failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
