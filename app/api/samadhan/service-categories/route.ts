import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Fetch all service categories (optionally by serviceId)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: Record<string, unknown> = {};

    if (serviceId) {
      where.serviceId = serviceId;
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await prisma.samadhanServiceCategory.findMany({
      where,
      include: {
        service: {
          include: {
            section: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch service categories" },
      { status: 500 }
    );
  }
}

// POST - Create a new service category
export async function POST(request: Request) {
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

    const body = await request.json();
    const { name, description, serviceId, isActive } = body;

    if (!name || !serviceId) {
      return NextResponse.json(
        { success: false, message: "Name and service ID are required" },
        { status: 400 }
      );
    }

    // Check if service exists
    const service = await prisma.samadhanService.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "Service not found" },
        { status: 404 }
      );
    }

    // Check for duplicate
    const existing = await prisma.samadhanServiceCategory.findUnique({
      where: {
        name_serviceId: {
          name,
          serviceId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "A category with this name already exists for this service",
        },
        { status: 400 }
      );
    }

    const category = await prisma.samadhanServiceCategory.create({
      data: {
        name,
        description: description || null,
        serviceId,
        isActive: isActive ?? true,
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
    console.error("Error creating service category:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create service category" },
      { status: 500 }
    );
  }
}
