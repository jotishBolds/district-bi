import { NextRequest, NextResponse } from "next/server";
import { sendFeedbackEmail } from "@/lib/mail";
import { z } from "zod";

// Schema for feedback validation
const feedbackSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be at most 1000 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validatedData = feedbackSchema.parse(body);

    const { email, phone, message } = validatedData;

    // Send the feedback email
    await sendFeedbackEmail(email, phone, message);

    return NextResponse.json(
      {
        success: true,
        message:
          "Thank you for your feedback! We have received your message and will review it shortly.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Feedback submission error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check your input and try again.",
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send feedback. Please try again later.",
      },
      { status: 500 }
    );
  }
}
