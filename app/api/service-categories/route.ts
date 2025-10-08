// app/api/service-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceCategories = await prisma.serviceCategory.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(serviceCategories);
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new service category (only for FRONT_DESK and ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.FRONT_DESK)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if service category with same name already exists
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: {
        name: {
          equals: name.trim(),
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

    const serviceCategory = await prisma.serviceCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: "Service category created successfully",
      serviceCategory: {
        id: serviceCategory.id,
        name: serviceCategory.name,
        description: serviceCategory.description,
      },
    });
  } catch (error) {
    console.error("Error creating service category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
