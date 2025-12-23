import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Check database connectivity
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;

    // Check S3 configuration
    const s3Config = {
      region: !!process.env.AWS_REGION,
      accessKey: !!process.env.AWS_ACCESS_KEY_ID,
      secretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      bucket: !!process.env.AWS_BUCKET_NAME,
    };

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTimeMs: dbResponseTime,
      },
      s3: {
        configured: Object.values(s3Config).every(Boolean),
        config: s3Config,
      },
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        database: {
          connected: false,
        },
      },
      { status: 503 }
    );
  }
}
