/**
 * Rate Limiter with Redis Support
 *
 * For production use with Vercel, install @upstash/redis:
 * npm install @upstash/redis
 *
 * Then set environment variables:
 * UPSTASH_REDIS_REST_URL=your-redis-url
 * UPSTASH_REDIS_REST_TOKEN=your-redis-token
 */

import { NextRequest } from "next/server";
import { getClientIP } from "./security";

// ============================================
// Types
// ============================================

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Identifier prefix for namespacing */
  prefix?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  retryAfter?: number; // Seconds until retry is allowed
}

// ============================================
// In-Memory Rate Limiter (Development/Fallback)
// ============================================

// Note: In-memory storage does NOT work reliably in serverless environments
// Use Redis for production deployments

const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (value.resetTime < now) {
      inMemoryStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

async function inMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `${config.prefix || "rl"}:${identifier}`;
  const windowMs = config.windowSeconds * 1000;

  const existing = inMemoryStore.get(key);

  if (!existing || existing.resetTime < now) {
    // New window
    inMemoryStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      reset: Math.floor((now + windowMs) / 1000),
    };
  }

  if (existing.count >= config.maxRequests) {
    const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      reset: Math.floor(existing.resetTime / 1000),
      retryAfter,
    };
  }

  existing.count++;
  return {
    success: true,
    remaining: config.maxRequests - existing.count,
    reset: Math.floor(existing.resetTime / 1000),
  };
}

// ============================================
// Redis Rate Limiter (Production)
// ============================================

let redisClient: {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  ttl: (key: string) => Promise<number>;
} | null = null;

async function initRedis(): Promise<boolean> {
  if (redisClient) return true;

  try {
    // Dynamic import to avoid issues if package is not installed
    // @ts-expect-error - @upstash/redis is an optional dependency
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    return true;
  } catch {
    console.warn(
      "Redis not available, falling back to in-memory rate limiting"
    );
    return false;
  }
}

async function redisRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!redisClient) {
    return inMemoryRateLimit(identifier, config);
  }

  const key = `${config.prefix || "rl"}:${identifier}`;

  try {
    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.expire(key, config.windowSeconds);
    }

    const ttl = await redisClient.ttl(key);
    const reset = Math.floor(Date.now() / 1000) + ttl;

    if (count > config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset,
        retryAfter: ttl,
      };
    }

    return {
      success: true,
      remaining: config.maxRequests - count,
      reset,
    };
  } catch (error) {
    console.error("Redis rate limit error:", error);
    // Fallback to in-memory on Redis error
    return inMemoryRateLimit(identifier, config);
  }
}

// ============================================
// Main Rate Limiter Function
// ============================================

/**
 * Check rate limit for a request
 *
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Try to use Redis if available
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    await initRedis();
    return redisRateLimit(identifier, config);
  }

  // Fall back to in-memory
  return inMemoryRateLimit(identifier, config);
}

// ============================================
// Pre-configured Rate Limiters
// ============================================

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  AUTH_LOGIN: {
    maxRequests: 5,
    windowSeconds: 15 * 60, // 15 minutes
    prefix: "auth_login",
  },
  AUTH_OTP: {
    maxRequests: 3,
    windowSeconds: 15 * 60, // 15 minutes
    prefix: "auth_otp",
  },
  AUTH_REGISTER: {
    maxRequests: 3,
    windowSeconds: 60 * 60, // 1 hour
    prefix: "auth_register",
  },
  PASSWORD_RESET: {
    maxRequests: 3,
    windowSeconds: 60 * 60, // 1 hour
    prefix: "pwd_reset",
  },

  // SMS endpoints - prevent SMS bombing
  SMS_SEND: {
    maxRequests: 3,
    windowSeconds: 15 * 60, // 15 minutes
    prefix: "sms",
  },

  // Track endpoint - public access with limits
  TRACK: {
    maxRequests: 10,
    windowSeconds: 15 * 60, // 15 minutes
    prefix: "track",
  },

  // General API endpoints
  API_GENERAL: {
    maxRequests: 100,
    windowSeconds: 60, // 1 minute
    prefix: "api",
  },

  // File uploads
  UPLOAD: {
    maxRequests: 20,
    windowSeconds: 60 * 60, // 1 hour
    prefix: "upload",
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Create rate limit identifier from request
 */
export function createRateLimitIdentifier(
  request: NextRequest,
  suffix?: string
): string {
  const ip = getClientIP(request);
  const identifier = suffix ? `${ip}:${suffix}` : ip;
  return identifier;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };

  if (!result.success && result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Rate limit middleware helper
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<{ allowed: boolean; result: RateLimitResult }> {
  const id = identifier || createRateLimitIdentifier(request);
  const result = await checkRateLimit(id, config);
  return { allowed: result.success, result };
}
