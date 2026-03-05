// SAMADHAN Officers API - List officers for ticket assignment
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Roles that can view officers list for assignment
const QUEUE_MANAGER_ROLES = [
  "DC",
  "ADC",
  "ADC_GTK",
  "ADC_HQ",
  "US_ADM",
  "ADMIN",
  "SUPER_ADMIN",
];

// GET - Get all officers for ticket assignment
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has queue access
    const hasQueueAccess = QUEUE_MANAGER_ROLES.includes(session.user.role);
    if (!hasQueueAccess) {
      return NextResponse.json(
        { success: false, message: "Not authorized to view officers list" },
        { status: 403 }
      );
    }

    // Get all active officers with their section info
    const officers = await prisma.officerProfile.findMany({
      where: {
        isAvailable: true,
        user: { isActive: true },
      },
      select: {
        userId: true,
        fullName: true,
        designation: true,
        section: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ section: { name: "asc" } }, { fullName: "asc" }],
    });

    // Transform the data to match the expected frontend interface
    const transformedOfficers = officers.map((officer) => ({
      odId: officer.userId,
      fullName: officer.fullName,
      email: officer.user.email,
      role: officer.user.role,
      designation: officer.designation,
      section: officer.section
        ? {
            sectionId: officer.section.id,
            name: officer.section.name,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: transformedOfficers,
    });
  } catch (error) {
    console.error("Failed to fetch officers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch officers" },
      { status: 500 }
    );
  }
}
