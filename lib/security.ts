/**
 * Security Utilities Library
 * Centralized security functions for the application
 */

import { NextRequest } from "next/server";
import crypto from "crypto";

// ============================================
// CORS Configuration
// ============================================

/**
 * Allowed origins for CORS
 * Add all legitimate domains here
 */
export const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "https://dacgangtok.in",
  "https://samadhan.dacgangtok.in",
  "https://myapplication.dacgangtok.in",
  // Development origins
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
].filter(Boolean) as string[];

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed
      ? origin
      : ALLOWED_ORIGINS[0] || "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin requests don't have origin header
  return ALLOWED_ORIGINS.includes(origin);
}

// ============================================
// Security Headers
// ============================================

/**
 * Security headers to add to all responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// ============================================
// Input Sanitization
// ============================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

// ============================================
// UUID Validation
// ============================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Validate and sanitize UUID
 */
export function validateUUID(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  return isValidUUID(trimmed) ? trimmed : null;
}

// ============================================
// Secure Token Generation
// ============================================

/**
 * Generate cryptographically secure OTP
 */
export function generateSecureOTP(length: number = 6): string {
  const max = Math.pow(10, length);
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  const otp = (randomNumber % max).toString().padStart(length, "0");
  return otp;
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// ============================================
// Request Validation
// ============================================

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Validate content type for JSON endpoints
 */
export function isValidJSONContentType(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type");
  return contentType?.includes("application/json") ?? false;
}

// ============================================
// Pagination Limits
// ============================================

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
};

/**
 * Parse and validate pagination parameters
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || String(PAGINATION.DEFAULT_PAGE))
  );
  const requestedLimit = parseInt(
    searchParams.get("limit") || String(PAGINATION.DEFAULT_LIMIT)
  );
  const limit = Math.min(Math.max(1, requestedLimit), PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// ============================================
// Sensitive Data Masking
// ============================================

/**
 * Mask email address for logs
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";

  const maskedLocal =
    local.length <= 2 ? "***" : `${local[0]}***${local[local.length - 1]}`;

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number for logs
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return "****";

  return `****${cleaned.slice(-4)}`;
}

/**
 * Mask sensitive data in object for logging
 */
export function maskSensitiveData<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ["password", "otp", "token", "secret", "aadhaar"]
): T {
  const masked: Record<string, unknown> = { ...obj };

  for (const field of sensitiveFields) {
    if (field in masked) {
      masked[field] = "***REDACTED***";
    }
  }

  // Special handling for email and phone
  if ("email" in masked && typeof masked.email === "string") {
    masked.email = maskEmail(masked.email);
  }
  if ("phone" in masked && typeof masked.phone === "string") {
    masked.phone = maskPhone(masked.phone);
  }

  return masked as T;
}

// ============================================
// File Validation
// ============================================

/**
 * Magic bytes for common file types
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff, 0xe0],
    [0xff, 0xd8, 0xff, 0xe1],
    [0xff, 0xd8, 0xff, 0xe2],
    [0xff, 0xd8, 0xff, 0xe3],
  ],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header (need to also check WEBP)
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

/**
 * Validate file magic bytes
 */
export async function validateFileMagicBytes(
  file: File,
  declaredType: string
): Promise<boolean> {
  const signatures = FILE_SIGNATURES[declaredType];
  if (!signatures) return true; // Unknown type, skip magic byte check

  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  return signatures.some((sig) =>
    sig.every((byte, index) => bytes[index] === byte)
  );
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const sanitized = filename
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  // Ensure filename is not empty
  return sanitized || `file_${Date.now()}`;
}
