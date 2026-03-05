import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Get single service category
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await prisma.samadhanServiceCategory.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            section: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error fetching service category:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch service category" },
      { status: 500 }
    );
  }
}

// PUT - Update a service category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes(
        (session.user as { role?: string }).role || ""
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, serviceId, isActive } = body;

    // Check if category exists
    const existing = await prisma.samadhanServiceCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Check for duplicate name in same service (if changing name or service)
    if (name !== existing.name || serviceId !== existing.serviceId) {
      const duplicate = await prisma.samadhanServiceCategory.findUnique({
        where: {
          name_serviceId: {
            name: name || existing.name,
            serviceId: serviceId || existing.serviceId,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A category with this name already exists for this service",
          },
          { status: 400 }
        );
      }
    }

    const category = await prisma.samadhanServiceCategory.update({
      where: { id },
      data: {
        name: name || existing.name,
        description:
          description !== undefined ? description : existing.description,
        serviceId: serviceId || existing.serviceId,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        service: {
          include: {
            section: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error updating service category:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update service category" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a service category
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes(
        (session.user as { role?: string }).role || ""
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if category exists
    const existing = await prisma.samadhanServiceCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    await prisma.samadhanServiceCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting service category:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete service category" },
      { status: 500 }
    );
  }
}
