// SAMADHAN Admin Dashboard and Configuration API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketStatistics, DEFAULT_SLA_CONFIG } from "@/lib/samadhan";

// SLA Config schema
const slaConfigSchema = z.object({
  queryType: z.enum(["FEEDBACK", "GRIEVANCE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  slaHours: z.number().min(1).max(2160), // Max 90 days
});

// GET - Admin dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("report");

    // Overall statistics
    const overallStats = await getTicketStatistics();

    // Query type breakdown
    const queryTypeStats = await prisma.samadhanTicket.groupBy({
      by: ["queryType"],
      _count: { id: true },
    });

    // Section breakdown
    const sectionStats = await prisma.samadhanTicket.groupBy({
      by: ["sectionId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Get section names
    const sectionIds = sectionStats.map((s) => s.sectionId);
    const sections = await prisma.section.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true, name: true },
    });
    const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

    // Daily volume (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyVolume = (await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM samadhan_tickets
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `) as { date: Date; count: bigint }[];

    // SLA compliance
    const totalResolved = await prisma.samadhanTicket.count({
      where: { status: { in: ["RESOLVED", "CLOSED"] } },
    });
    const breachedResolved = await prisma.samadhanTicket.count({
      where: {
        status: { in: ["RESOLVED", "CLOSED"] },
        slaBreachedAt: { not: null },
      },
    });
    const slaCompliance =
      totalResolved > 0
        ? ((totalResolved - breachedResolved) / totalResolved) * 100
        : 100;

    // Get current SLA configurations
    const slaConfigs = await prisma.samadhanSLAConfig.findMany();

    // Average resolution time
    const avgResolutionTime = (await prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
      FROM samadhan_tickets
      WHERE resolved_at IS NOT NULL
    `) as { avg_hours: number }[];

    return NextResponse.json({
      success: true,
      data: {
        statistics: overallStats,
        queryTypeBreakdown: queryTypeStats.map((q) => ({
          type: q.queryType,
          count: q._count.id,
        })),
        sectionBreakdown: sectionStats.map((s) => ({
          sectionId: s.sectionId,
          sectionName: sectionMap.get(s.sectionId) || "Unknown",
          count: s._count.id,
        })),
        dailyVolume: dailyVolume.map((d) => ({
          date: d.date,
          count: Number(d.count),
        })),
        slaMetrics: {
          complianceRate: slaCompliance.toFixed(2),
          totalResolved,
          breached: breachedResolved,
          averageResolutionHours:
            avgResolutionTime[0]?.avg_hours?.toFixed(2) || "N/A",
        },
        slaConfigurations:
          slaConfigs.length > 0
            ? slaConfigs
            : Object.entries(DEFAULT_SLA_CONFIG).flatMap(
                ([queryType, priorities]) =>
                  Object.entries(priorities).map(([priority, hours]) => ({
                    queryType,
                    priority,
                    slaHours: hours,
                    isDefault: true,
                  }))
              ),
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}

// POST - Update SLA configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = slaConfigSchema.parse(body);

    // Upsert SLA configuration
    const config = await prisma.samadhanSLAConfig.upsert({
      where: {
        queryType_priority: {
          queryType: validatedData.queryType,
          priority: validatedData.priority,
        },
      },
      update: {
        slaHours: validatedData.slaHours,
      },
      create: {
        queryType: validatedData.queryType,
        priority: validatedData.priority,
        slaHours: validatedData.slaHours,
      },
    });

    return NextResponse.json({
      success: true,
      message: "SLA configuration updated",
      data: config,
    });
  } catch (error) {
    console.error("SLA config update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update SLA configuration" },
      { status: 500 }
    );
  }
}
