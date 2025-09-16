// app/api/track/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/track/[id] - Get specific application details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Find application by ID with full details
    const application = await prisma.application.findUnique({
      where: {
        id: id,
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

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Return application details
    return NextResponse.json({
      application: {
        id: application.id,
        rrNumber: application.rrNumber,
        subject: application.subject,
        status: application.status,
        citizenName: application.citizenName,
        citizenPhone: application.citizenPhone,
        citizenAlternateNumber: application.citizenAlternateNumber,
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
    });
  } catch (error) {
    console.error("Error fetching application details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
