import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      name: session.user.name,
    });
  } catch (error) {
    console.error("Error getting user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
