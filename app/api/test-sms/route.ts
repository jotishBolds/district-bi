// Test endpoint for SMS debugging
import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/thundersms.server";

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json();
    
    console.log("🧪 Testing SMS send to:", phone);
    console.log("🧪 Message:", message);
    
    const result = await sendSms(phone, message || "Test message from District BI");
    
    console.log("🧪 Test SMS Result:", result);
    
    return NextResponse.json({
      success: true,
      smsResult: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("🧪 Test SMS Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}