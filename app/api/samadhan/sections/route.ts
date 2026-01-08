// SAMADHAN Sections API (for dropdown selection)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const sections = await prisma.section.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error("Sections fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch sections" },
      { status: 500 }
    );
  }
}
