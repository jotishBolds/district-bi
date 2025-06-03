// app/api/admin/service-categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

const updateServiceCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Service category name is required")
    .max(100)
    .optional(),
  description: z.string().optional(),
  slaDays: z.number().min(1, "SLA days must be at least 1").max(365).optional(),
  isActive: z.boolean().optional(),
});

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

    if (
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const serviceCategory = await prisma.serviceCategory.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!serviceCategory) {
      return NextResponse.json(
        { error: "Service category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: serviceCategory });
  } catch (error) {
    console.error("Error fetching service category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    if (
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateServiceCategorySchema.parse(body);

    // Check if service category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Service category not found" },
        { status: 404 }
      );
    }

    // Check if name already exists for another category
    if (validatedData.name) {
      const duplicateName = await prisma.serviceCategory.findFirst({
        where: {
          name: {
            equals: validatedData.name,
            mode: "insensitive",
          },
          id: {
            not: resolvedParams.id,
          },
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: "Service category with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await prisma.serviceCategory.update({
      where: { id: resolvedParams.id },
      data: validatedData,
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return NextResponse.json({ data: updatedCategory });
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

export async function DELETE(
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

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    // Check if service category exists
    const existingCategory = await prisma.serviceCategory.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Service category not found" },
        { status: 404 }
      );
    }

    if (existingCategory._count.applications > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete service category with existing applications. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await prisma.serviceCategory.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json(
      { message: "Service category deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting service category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
