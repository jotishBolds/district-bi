// app/api/admin/sections/[sectionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import { z } from "zod";

const updateSectionSchema = z.object({
  name: z.string().min(1, "Section name is required").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PATCH - Update section
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const session = await getServerAuthSession();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;
    const body = await request.json();
    const validatedData = updateSectionSchema.parse(body);

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!existingSection) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // If updating name, check for conflicts
    if (validatedData.name && validatedData.name !== existingSection.name) {
      const nameConflict = await prisma.section.findFirst({
        where: {
          name: validatedData.name,
          id: { not: sectionId },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "Section with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedSection = await prisma.section.update({
      where: { id: sectionId },
      data: validatedData,
    });

    return NextResponse.json({
      message: "Section updated successfully",
      section: updatedSection,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const session = await getServerAuthSession();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        _count: {
          select: { officers: true },
        },
      },
    });

    if (!existingSection) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check if section has officers assigned
    if (existingSection._count.officers > 0) {
      return NextResponse.json(
        { error: "Cannot delete section with assigned officers" },
        { status: 400 }
      );
    }

    await prisma.section.delete({
      where: { id: sectionId },
    });

    return NextResponse.json({
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
