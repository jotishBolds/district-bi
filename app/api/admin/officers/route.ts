// app/api/admin/officers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

// GET - List all officers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.FRONT_DESK)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const officers = await prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.DC,
            UserRole.ADC,
            UserRole.RO,
            UserRole.SDM,
            UserRole.DYDIR,
          ],
        },
        isActive: true,
      },
      include: {
        officerProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedOfficers = officers.map((officer) => ({
      id: officer.id,
      email: officer.email,
      role: officer.role,
      isActive: officer.isActive,
      profile: officer.officerProfile
        ? {
            id: officer.officerProfile.id,
            fullName: officer.officerProfile.fullName,
            designation: officer.officerProfile.designation,
            department: officer.officerProfile.department,
            officeLocation: officer.officerProfile.officeLocation,
            isAvailable: officer.officerProfile.isAvailable,
          }
        : null,
    }));

    return NextResponse.json({ officers: formattedOfficers });
  } catch (error) {
    console.error("Error fetching officers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
