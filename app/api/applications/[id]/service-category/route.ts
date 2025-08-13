// app/api/applications/[id]/service-category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  canUserManageServiceCategories,
  recordServiceCategoryChange,
} from "@/lib/service-category-utils";

const updateServiceCategorySchema = z.object({
  serviceCategoryId: z.string().min(1, "Service category is required"),
  reason: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, resolvedParams] = await Promise.all([
      getServerAuthSession(),
      params,
    ]);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateServiceCategorySchema.parse(body);

    // Check if user can manage service categories
    const canManage = await canUserManageServiceCategories(session.user.role);
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to change service categories" },
        { status: 403 }
      );
    }

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id: resolvedParams.id },
      include: {
        serviceCategory: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check if the new category exists
    const newServiceCategory = await prisma.serviceCategory.findUnique({
      where: { id: validatedData.serviceCategoryId },
    });

    if (!newServiceCategory) {
      return NextResponse.json(
        { error: "Service category not found" },
        { status: 404 }
      );
    }

    // Don't update if it's the same category
    if (application.serviceCategoryId === validatedData.serviceCategoryId) {
      return NextResponse.json(
        { error: "Application is already in this service category" },
        { status: 400 }
      );
    }

    // Update the application and record the change
    const updatedApplication = await prisma.application.update({
      where: { id: resolvedParams.id },
      data: {
        serviceCategoryId: validatedData.serviceCategoryId,
        updatedAt: new Date(),
      },
      include: {
        serviceCategory: true,
      },
    });

    // Record the category change separately (if user exists in database)
    try {
      const categoryChange = await recordServiceCategoryChange(
        resolvedParams.id,
        application.serviceCategoryId,
        validatedData.serviceCategoryId,
        session.user.id,
        validatedData.reason
      );
    } catch (error) {
      // Log the error but don't fail the entire operation
      console.warn("Failed to record service category change:", error);
    }

    return NextResponse.json({
      message: "Service category updated successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Error updating service category:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, resolvedParams] = await Promise.all([
      getServerAuthSession(),
      params,
    ]);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get service category change history
    const categoryHistory = await prisma.serviceCategoryChange.findMany({
      where: { applicationId: resolvedParams.id },
      include: {
        previousCategory: true,
        newCategory: true,
        changedBy: {
          include: {
            officerProfile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      history: categoryHistory,
    });
  } catch (error) {
    console.error("Error fetching service category history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
