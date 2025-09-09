import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendAccountCreationEmail } from "@/lib/mail";
import { UserRole } from "@/app/generated/prisma";
import * as z from "zod";

const emailSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.string().min(1, "Role is required"),
  designation: z.string().optional(),
  department: z.string().optional(),
  loginUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = emailSchema.parse(body);

    // Send account creation email
    await sendAccountCreationEmail(validatedData);

    return NextResponse.json({
      message: "Account creation email sent successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error sending account creation email:", error);
    return NextResponse.json(
      { error: "Failed to send account creation email" },
      { status: 500 }
    );
  }
}
