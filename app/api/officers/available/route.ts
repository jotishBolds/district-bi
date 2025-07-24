// app/api/officers/available/route.ts
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import {
  getForwardableOfficerRoles,
  canAssignTo,
  getLevelPriority,
  getRoleMapping,
} from "@/lib/officer-roles";

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all officers first
    const allOfficers = await prisma.user.findMany({
      where: {
        AND: [
          {
            role: {
              in: getForwardableOfficerRoles(),
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

    // Filter officers based on user type:
    // - Front desk users can see ALL officers
    // - Officers can only assign to same or lower level based on hierarchy
    let officers;
    if (session.user.role === UserRole.FRONT_DESK) {
      // Frontdesk can forward to any officer
      officers = allOfficers;
    } else {
      // Officers can only assign to same or lower level
      officers = allOfficers.filter((officer) =>
        canAssignTo(session.user.role, officer.role)
      );
    }

    // Transform the data to match the expected format in the component
    const formattedOfficers = officers.map((officer) => {
      const roleMapping = getRoleMapping(officer.role);
      return {
        id: officer.id,
        role: officer.role,
        fullName: officer.officerProfile?.fullName || "",
        designation:
          officer.officerProfile?.designation || roleMapping?.fullName || "",
        department:
          officer.officerProfile?.department ||
          roleMapping?.defaultSection ||
          "",
        officeLocation: officer.officerProfile?.officeLocation || "",
        level: roleMapping?.level || 0,
        userType: roleMapping?.userType || "Officer",
      };
    });

    // Sort by level (ascending - lower numbers = higher priority)
    formattedOfficers.sort((a, b) => a.level - b.level);

    return NextResponse.json(formattedOfficers);
  } catch (error) {
    console.error("Error fetching available officers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
