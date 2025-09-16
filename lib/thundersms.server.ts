/**
 * ThunderSMS Server-side Integration
 * Secure server-only wrapper for sending SMS via ThunderSMS API
 */

import prisma from "@/lib/prisma";

// Handle SSL certificate issues for ThunderSMS API globally
// This is needed because ThunderSMS API may have certificate issues
if (typeof window === "undefined") {
  // Only set this on server-side
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
}

export interface ThunderSMSResponse {
  success: boolean;
  code: string;
  desc: string;
  raw: Record<string, unknown> | null;
}

export interface SendSmsOptions {
  templateId?: string;
  custRef?: string;
  msgType?: "PM" | "UC";
  campaign?: string;
  entityId?: string;
}

export interface ThunderSMSConfig {
  username: string;
  apiKey: string;
  senderId: string;
  baseUrl: string;
  entityId?: string;
  templateId?: string;
}

/**
 * Get ThunderSMS configuration from environment variables
 */
function getThunderSMSConfig(): ThunderSMSConfig {
  // Add validation for undefined environment
  if (typeof process === "undefined" || !process.env) {
    throw new Error("Server environment not available");
  }

  const username = process.env.THUNDERSMS_USERNAME;
  const apiKey = process.env.THUNDERSMS_API_KEY;
  const senderId = process.env.THUNDERSMS_SENDER_ID;
  const baseUrl =
    process.env.THUNDERSMS_BASE_URL ||
    "https://newportal.thundersms.com/pushapi/sendmsg";
  const entityId = process.env.THUNDERSMS_ENTITY_ID;
  const templateId = process.env.THUNDERSMS_TEMPLATE_ID;

  // Better error messaging
  const missing = [];
  if (!username) missing.push("THUNDERSMS_USERNAME");
  if (!apiKey) missing.push("THUNDERSMS_API_KEY");
  if (!senderId) missing.push("THUNDERSMS_SENDER_ID");

  if (missing.length > 0) {
    throw new Error(
      `Missing required ThunderSMS environment variables: ${missing.join(
        ", "
      )}\n` +
        `Please check your .env.local file and restart your development server.`
    );
  }

  return {
    username: username!,
    apiKey: apiKey!,
    senderId: senderId!,
    baseUrl,
    entityId,
    templateId,
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send SMS via ThunderSMS API with retry logic
 */
export async function sendSms(
  dest: string,
  text: string,
  opts: SendSmsOptions = {}
): Promise<ThunderSMSResponse> {
  // Ensure SSL certificate issues are handled for this specific call
  if (typeof window === "undefined") {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
  }

  const config = getThunderSMSConfig();

  // Validate phone number (should be 10 digits)
  const cleanedDest = dest.replace(/\D/g, "");
  if (cleanedDest.length !== 10) {
    return {
      success: false,
      code: "INVALID_PHONE",
      desc: "Phone number must be 10 digits",
      raw: null,
    };
  }

  // Build query parameters for ThunderSMS API format
  const params = new URLSearchParams({
    username: config.username,
    apikey: config.apiKey,
    signature: config.senderId,
    msgtxt: text,
    msgtype: opts.msgType || "PM",
    dest: cleanedDest,
  });

  // Add optional parameters
  if (opts.templateId || config.templateId) {
    params.append("templateid", opts.templateId || config.templateId!);
  }

  if (opts.entityId || config.entityId) {
    params.append("entityid", opts.entityId || config.entityId!);
  }

  if (opts.custRef) {
    params.append("custref", opts.custRef);
  }

  if (opts.campaign) {
    params.append("campaign", opts.campaign);
  }

  const url = `${config.baseUrl}?${params.toString()}`;

  // Retry configuration
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📱 ThunderSMS attempt ${attempt + 1}/${
          maxRetries + 1
        } for ${cleanedDest}`
      );

      // Create a simple fetch call with proper error handling
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "District-BI-App/1.0",
        },
        // Set timeout for 30 seconds
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log("📱 ThunderSMS Response:", responseData);

      // Check if response indicates success (code 6001)
      const success =
        responseData.code === "6001" || responseData.code === 6001;

      return {
        success,
        code: String(responseData.code || "UNKNOWN"),
        desc: responseData.desc || responseData.message || "No description",
        raw: responseData,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`📱 ThunderSMS attempt ${attempt + 1} failed:`, error);

      // Don't retry for certain error types
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("invalid destination") ||
          errorMessage.includes("invalid signature") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("forbidden")
        ) {
          console.log(
            "📱 ThunderSMS: Non-retryable error detected, stopping retries"
          );
          break;
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`📱 ThunderSMS: Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  return {
    success: false,
    code: "NETWORK_ERROR",
    desc: `Failed after ${maxRetries + 1} attempts: ${
      lastError?.message || "Unknown error"
    }`,
    raw: { error: lastError?.message },
  };
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSms(
  recipients: Array<{
    phoneNumber: string;
    message?: string;
    custRef?: string;
  }>,
  defaultMessage: string,
  opts: SendSmsOptions = {}
): Promise<{
  success: boolean;
  results: Array<{ phoneNumber: string; success: boolean; error?: string }>;
}> {
  const results: Array<{
    phoneNumber: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const recipient of recipients) {
    const result = await sendSms(
      recipient.phoneNumber,
      recipient.message || defaultMessage,
      {
        ...opts,
        custRef: recipient.custRef,
      }
    );

    results.push({
      phoneNumber: recipient.phoneNumber,
      success: result.success,
      error: result.success ? undefined : result.desc,
    });

    // Add small delay between requests to avoid rate limiting
    await sleep(100);
  }

  const successCount = results.filter((r) => r.success).length;

  return {
    success: successCount > 0,
    results,
  };
}

/**
 * Generate the official District Collector OTP message template
 */
export function generateOTPMessage(
  otp: string,
  expiryMinutes: number = 10
): string {
  return `District Collector:\nYour verification code is ${otp}. This code will expire in ${expiryMinutes} minutes. For your security, please do not share it with anyone. -DACGOV`;
}

/**
 * Generate and send OTP
 */
export async function sendOtp(
  phoneNumber: string,
  userId?: string,
  type: string = "VERIFICATION"
): Promise<{
  success: boolean;
  otp?: string;
  expiresAt?: Date;
  error?: string;
}> {
  try {
    // Clean phone number
    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    if (cleanedPhone.length !== 10) {
      return {
        success: false,
        error: "Phone number must be exactly 10 digits",
      };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this phone
    await prisma.smsOtp.deleteMany({
      where: {
        phone: cleanedPhone,
        isUsed: false,
        type,
      },
    });

    // Generate the official message
    const message = generateOTPMessage(otp, 10);

    // Send OTP message
    const result = await sendSms(cleanedPhone, message, {
      templateId: process.env.THUNDERSMS_TEMPLATE_ID,
      custRef: `${type.toLowerCase()}_${Date.now()}`,
      campaign: `OTP_${type}`,
    });

    // Store OTP in database
    await prisma.smsOtp.create({
      data: {
        phone: cleanedPhone,
        otp,
        status: result.success ? "SENT" : "FAILED",
        providerResponse: result.raw ? JSON.stringify(result.raw) : null,
        type,
        expires: expiresAt,
        attempts: 1,
      },
    });

    if (result.success) {
      return {
        success: true,
        otp,
        expiresAt,
      };
    } else {
      return {
        success: false,
        error: result.desc,
      };
    }
  } catch (error) {
    console.error("OTP Send Error:", error);
    return {
      success: false,
      error: "Failed to send OTP",
    };
  }
}

/**
 * Verify OTP
 */
export async function verifyOtp(
  phoneNumber: string,
  otp: string,
  type: string = "VERIFICATION"
): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    phone: string | null;
    officerProfile?: {
      fullName: string;
      designation: string;
    } | null;
    citizenProfile?: {
      fullName: string;
    } | null;
  };
  error?: string;
}> {
  try {
    const cleanedPhone = phoneNumber.replace(/\D/g, "");

    // Find the OTP record
    const otpRecord = await prisma.smsOtp.findFirst({
      where: {
        phone: cleanedPhone,
        otp,
        type,
        isUsed: false,
        status: "SENT",
        expires: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      return {
        success: false,
        error: "Invalid or expired OTP",
      };
    }

    // Find user with this phone number
    const user = await prisma.user.findUnique({
      where: { phone: cleanedPhone },
      include: {
        officerProfile: {
          select: { fullName: true, designation: true },
        },
        citizenProfile: {
          select: { fullName: true },
        },
      },
    });

    // Mark OTP as used and update user
    await prisma.$transaction([
      prisma.smsOtp.update({
        where: { id: otpRecord.id },
        data: {
          isUsed: true,
          status: "USED",
        },
      }),
      ...(user
        ? [
            prisma.user.update({
              where: { phone: cleanedPhone },
              data: {
                lastLoginAt: new Date(),
              },
            }),
          ]
        : []),
    ]);

    return {
      success: true,
      user: user || undefined,
    };
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return {
      success: false,
      error: "Failed to verify OTP",
    };
  }
}

/**
 * Validate SMS configuration on startup
 */
export function validateThunderSMSConfig(): boolean {
  try {
    getThunderSMSConfig();
    console.log("✅ ThunderSMS configuration validated successfully");
    return true;
  } catch (error) {
    console.error(
      "❌ ThunderSMS configuration validation failed:",
      (error as Error).message
    );
    return false;
  }
}

// Log configuration status on module load (server-side only)
if (typeof window === "undefined") {
  validateThunderSMSConfig();
}
