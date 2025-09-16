import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Find user by email and return only the phone number
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        phone: true,
        email: true, // Include email for verification
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      phone: user.phone,
      email: user.email,
    });
  } catch (error) {
    console.error("Get user phone error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user phone" },
      { status: 500 }
    );
  }
}
