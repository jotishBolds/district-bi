// app/api/admin/service-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

const createServiceCategorySchema = z.object({
  name: z.string().min(1, "Service category name is required").max(100),
  description: z.string().optional(),
  slaDays: z.number().min(1, "SLA days must be at least 1").max(365),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    // Check if user is authenticated and has admin role
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
      return NextResponse.json(
        { error: "Service category with this name already exists" },
        { status: 400 }
      );
    }

    // Create the service category
    const serviceCategory = await prisma.serviceCategory.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        slaDays: validatedData.slaDays,
        isActive: validatedData.isActive,
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(isActive !== null && { isActive: isActive === "true" }),
    };

    const [serviceCategories, total] = await Promise.all([
      prisma.serviceCategory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { applications: true },
          },
        },
      }),
      prisma.serviceCategory.count({ where }),
    ]);

    return NextResponse.json({
      data: serviceCategories,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
