// app/api/admin/frontdesk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import { hash } from "bcryptjs";

// GET - List all frontdesk users with their assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const frontdeskUsers = await prisma.user.findMany({
      where: {
        role: UserRole.FRONT_DESK,
      },
      include: {
        frontdeskAssignments: {
          include: {
            officer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ frontdeskUsers });
  } catch (error) {
    console.error("Error fetching frontdesk users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new frontdesk user with officer assignments
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password, assignedOfficerIds } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Validate assigned officers if provided
    if (assignedOfficerIds && assignedOfficerIds.length > 0) {
      const officers = await prisma.officerProfile.findMany({
        where: {
          id: {
            in: assignedOfficerIds,
          },
        },
      });

      if (officers.length !== assignedOfficerIds.length) {
        return NextResponse.json(
          { error: "One or more assigned officers not found" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create frontdesk user
      const frontdeskUser = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          role: UserRole.FRONT_DESK,
          isActive: true,
        },
      });

      // Create officer assignments
      const assignments = [];

      if (assignedOfficerIds && assignedOfficerIds.length > 0) {
        // Assign to specific officers
        for (const officerId of assignedOfficerIds) {
          const assignment = await tx.frontdeskOfficer.create({
            data: {
              frontdeskUserId: frontdeskUser.id,
              officerId: officerId,
            },
          });
          assignments.push(assignment);
        }
      } else {
        // Create general frontdesk (can handle all officers)
        const assignment = await tx.frontdeskOfficer.create({
          data: {
            frontdeskUserId: frontdeskUser.id,
            officerId: null, // null means general frontdesk
          },
        });
        assignments.push(assignment);
      }

      return { frontdeskUser, assignments };
    });

    return NextResponse.json({
      message: "Frontdesk user created successfully",
      frontdeskUser: {
        id: result.frontdeskUser.id,
        email: result.frontdeskUser.email,
        role: result.frontdeskUser.role,
        assignmentType:
          assignedOfficerIds && assignedOfficerIds.length > 0
            ? "specific_officers"
            : "general",
        assignedOfficersCount: assignedOfficerIds?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error creating frontdesk user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update frontdesk user officer assignments
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { frontdeskUserId, assignedOfficerIds } = await request.json();

    if (!frontdeskUserId) {
      return NextResponse.json(
        { error: "Frontdesk user ID is required" },
        { status: 400 }
      );
    }

    // Verify frontdesk user exists
    const frontdeskUser = await prisma.user.findFirst({
      where: {
        id: frontdeskUserId,
        role: UserRole.FRONT_DESK,
      },
    });

    if (!frontdeskUser) {
      return NextResponse.json(
        { error: "Frontdesk user not found" },
        { status: 404 }
      );
    }

    // Validate assigned officers if provided
    if (assignedOfficerIds && assignedOfficerIds.length > 0) {
      const officers = await prisma.officerProfile.findMany({
        where: {
          id: {
            in: assignedOfficerIds,
          },
        },
      });

      if (officers.length !== assignedOfficerIds.length) {
        return NextResponse.json(
          { error: "One or more assigned officers not found" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // Remove existing assignments
      await tx.frontdeskOfficer.deleteMany({
        where: {
          frontdeskUserId: frontdeskUserId,
        },
      });

      // Create new assignments
      if (assignedOfficerIds && assignedOfficerIds.length > 0) {
        // Assign to specific officers
        for (const officerId of assignedOfficerIds) {
          await tx.frontdeskOfficer.create({
            data: {
              frontdeskUserId: frontdeskUserId,
              officerId: officerId,
            },
          });
        }
      } else {
        // Create general frontdesk
        await tx.frontdeskOfficer.create({
          data: {
            frontdeskUserId: frontdeskUserId,
            officerId: null,
          },
        });
      }
    });

    return NextResponse.json({
      message: "Frontdesk assignments updated successfully",
    });
  } catch (error) {
    console.error("Error updating frontdesk assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
