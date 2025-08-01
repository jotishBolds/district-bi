// app/api/admin/departments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import { z } from "zod";

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional(),
});

// GET - List all departments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN &&
      session.user.role !== UserRole.FRONT_DESK
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new department
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createDepartmentSchema.parse(body);

    // Check if department with same name already exists
    const existingDepartment = await prisma.department.findUnique({
      where: { name: validatedData.name },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: "Department with this name already exists" },
        { status: 409 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isActive: true,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
