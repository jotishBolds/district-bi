// app/api/frontdesk/service-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

const createServiceCategorySchema = z.object({
  name: z.string().min(1, "Service category name is required").max(100),
  description: z.string().optional(),
});

const searchServiceCategoriesSchema = z.object({
  search: z.string().min(1, "Search term is required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json(
        { error: "Forbidden - Frontdesk access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const serviceCategories = await prisma.serviceCategory.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: serviceCategories,
    });
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json(
        { error: "Forbidden - Frontdesk access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createServiceCategorySchema.parse(body);

    // Check if service category with same name already exists
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive",
        },
      },
    });

    if (existingCategory) {
      // If category exists, return it for selection instead of error
      return NextResponse.json(
        {
          message: "Service category already exists",
          existingCategory: {
            id: existingCategory.id,
            name: existingCategory.name,
            description: existingCategory.description,
          },
        },
        { status: 200 }
      );
    }

    // Create the service category
    const serviceCategory = await prisma.serviceCategory.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Service category created successfully",
        data: serviceCategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating service category:", error);

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
