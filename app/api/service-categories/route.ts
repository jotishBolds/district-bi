// app/api/service-categories/route.ts
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
        slaDays: true,
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
