// SAMADHAN Services API - CRUD operations for services per section
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Validation schemas
const createServiceSchema = z.object({
  name: z.string().min(2, "Service name must be at least 2 characters"),
  description: z.string().optional(),
  sectionId: z.string().min(1, "Section is required"),
});

const updateServiceSchema = z.object({
  id: z.string().min(1, "Service ID is required"),
  name: z
    .string()
    .min(2, "Service name must be at least 2 characters")
    .optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - List services (public for citizen forms, filtered by section)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build query
    const where: Record<string, unknown> = {};

    if (sectionId) {
      where.sectionId = sectionId;
    }

    // Only include inactive services for admin users
    if (!includeInactive) {
      where.isActive = true;
    }

    const services = await prisma.samadhanService.findMany({
      where,
      include: {
        section: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ section: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST - Create a new service (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createServiceSchema.parse(body);

    // Verify section exists
    const section = await prisma.section.findUnique({
      where: { id: validatedData.sectionId },
    });

    if (!section) {
      return NextResponse.json(
        { success: false, message: "Section not found" },
        { status: 404 }
      );
    }

    // Check if service with same name exists in section
    const existingService = await prisma.samadhanService.findFirst({
      where: {
        name: validatedData.name,
        sectionId: validatedData.sectionId,
      },
    });

    if (existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "A service with this name already exists in this section",
        },
        { status: 400 }
      );
    }

    // Create service
    const service = await prisma.samadhanService.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        sectionId: validatedData.sectionId,
      },
      include: {
        section: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Service created successfully",
        data: service,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create service:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create service" },
      { status: 500 }
    );
  }
}

// PUT - Update a service (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateServiceSchema.parse(body);

    // Verify service exists
    const existingService = await prisma.samadhanService.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingService) {
      return NextResponse.json(
        { success: false, message: "Service not found" },
        { status: 404 }
      );
    }

    // Check for name conflict if name is being updated
    if (validatedData.name && validatedData.name !== existingService.name) {
      const conflictingService = await prisma.samadhanService.findFirst({
        where: {
          name: validatedData.name,
          sectionId: existingService.sectionId,
          id: { not: validatedData.id },
        },
      });

      if (conflictingService) {
        return NextResponse.json(
          {
            success: false,
            message: "A service with this name already exists in this section",
          },
          { status: 400 }
        );
      }
    }

    // Update service
    const service = await prisma.samadhanService.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description,
        }),
        ...(validatedData.isActive !== undefined && {
          isActive: validatedData.isActive,
        }),
      },
      include: {
        section: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("Failed to update service:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update service" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a service (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Service ID is required" },
        { status: 400 }
      );
    }

    // Verify service exists
    const service = await prisma.samadhanService.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "Service not found" },
        { status: 404 }
      );
    }

    // Delete the service
    await prisma.samadhanService.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete service:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete service" },
      { status: 500 }
    );
  }
}
