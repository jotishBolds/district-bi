// app/api/officers/available/route.ts
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch available officers with DC, ADC, or RO roles, excluding the current user
    const officers = await prisma.user.findMany({
      where: {
        AND: [
          {
            role: {
              in: [UserRole.DC, UserRole.ADC, UserRole.RO],
            },
            isActive: true,
            officerProfile: {
              isAvailable: true,
            },
          },
          {
            // Exclude the currently logged in officer
            id: {
              not: session.user.id,
            },
          },
        ],
      },
      include: {
        officerProfile: {
          select: {
            fullName: true,
            designation: true,
            department: true,
            officeLocation: true,
          },
        },
      },
    });

    // Transform the data to match the expected format in the component
    const formattedOfficers = officers.map((officer) => ({
      id: officer.id,
      fullName: officer.officerProfile?.fullName || "",
      designation: officer.officerProfile?.designation || "",
      department: officer.officerProfile?.department || "",
      officeLocation: officer.officerProfile?.officeLocation || "",
      role: officer.role,
    }));

    return NextResponse.json(formattedOfficers);
  } catch (error) {
    console.error("Error fetching available officers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
