// app/api/admin/create-temp-admin/route.ts
// SECURITY: This endpoint has been disabled for security reasons
// Temporary admin creation should be done via database seeding or CLI tools

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // This endpoint is disabled for security
  // Use the seed script or database CLI to create admin users
  console.warn(
    "[SECURITY] Blocked attempt to access disabled admin creation endpoint"
  );

  return NextResponse.json(
    {
      error: "This endpoint has been disabled for security reasons",
      message:
        "Please use the database seed script or contact system administrator",
    },
    { status: 403 }
  );
}

// Also block GET requests
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
