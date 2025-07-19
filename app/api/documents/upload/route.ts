// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole, DocumentType } from "@/app/generated/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only front desk can upload documents for applications
    if (session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json(
        { error: "Only front desk can upload documents" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const applicationId = formData.get("applicationId") as string;
    const documentType = formData.get("documentType") as DocumentType;

    if (!file || !applicationId || !documentType) {
      return NextResponse.json(
        { error: "File, application ID, and document type are required" },
        { status: 400 }
      );
    }

    // Verify application exists
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPG, PNG, and PDF files are allowed",
        },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(
      process.cwd(),
      "uploads",
      "applications",
      applicationId
    );
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;
    const filePath = join(uploadDir, fileName);
    const relativePath = join(
      "uploads",
      "applications",
      applicationId,
      fileName
    );

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save document record to database
    const document = await prisma.document.create({
      data: {
        applicationId,
        documentType,
        fileName: file.name,
        filePath: relativePath,
        fileSize: file.size,
        uploadedById: session.user.id,
        isVerified: false,
      },
    });

    // Create audit log
    await prisma.applicationAuditLog.create({
      data: {
        applicationId,
        action: "DOCUMENT_UPLOADED",
        performedById: session.user.id,
        oldValues: {},
        newValues: {
          documentId: document.id,
          fileName: file.name,
          documentType,
        },
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    return NextResponse.json({
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        fileName: document.fileName,
        documentType: document.documentType,
        fileSize: document.fileSize,
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
