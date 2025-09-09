// app/api/admin/sections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import { z } from "zod";

// Schema for creating/updating sections
const sectionSchema = z.object({
  name: z.string().min(1, "Section name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET - List all sections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sections = await prisma.section.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { officers: true },
        },
      },
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new section
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = sectionSchema.parse(body);

    // Check if section with same name already exists
    const existingSection = await prisma.section.findUnique({
      where: { name: validatedData.name },
    });

    if (existingSection) {
      return NextResponse.json(
        { error: "Section with this name already exists" },
        { status: 400 }
      );
    }

    const section = await prisma.section.create({
      data: validatedData,
      include: {
        _count: {
          select: {
            officers: true,
          },
        },
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
