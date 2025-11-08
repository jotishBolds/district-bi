import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier");

    if (!identifier) {
      return NextResponse.json(
        { error: "Identifier parameter is required" },
        { status: 400 }
      );
    }

    // Determine if identifier is email or phone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    let user;
    if (isEmail) {
      user = await prisma.user.findUnique({
        where: { email: identifier },
        select: {
          phone: true,
          email: true,
        },
      });
    } else {
      // Clean phone number for consistent format
      const cleanPhone = identifier.replace(/[\s\-\(\)]/g, "");
      user = await prisma.user.findUnique({
        where: { phone: cleanPhone },
        select: {
          phone: true,
          email: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      phone: user.phone,
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
