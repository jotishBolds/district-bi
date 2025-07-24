// Debug script to check frontdesk assignments
const { PrismaClient } = require("./app/generated/prisma");

const prisma = new PrismaClient();

async function debugFrontdeskAssignments() {
  try {
    console.log("=== Debugging Frontdesk Assignments ===\n");

    // Get all frontdesk users
    const frontdeskUsers = await prisma.user.findMany({
      where: {
        role: "FRONT_DESK",
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log("Frontdesk Users:", frontdeskUsers);
    console.log("\n");

    // Get all frontdesk assignments
    const assignments = await prisma.frontdeskOfficer.findMany({
      include: {
        frontdeskUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        officer: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                level: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    console.log("Frontdesk Assignments:");
    assignments.forEach((assignment) => {
      console.log({
        frontdeskUser: assignment.frontdeskUser.email,
        officerId: assignment.officer?.id,
        officerUserId: assignment.officer?.user?.id,
        officerEmail: assignment.officer?.user?.email,
        officerRole: assignment.officer?.user?.role,
        officerName: assignment.officer?.fullName,
        isActive: assignment.officer?.user?.isActive,
      });
    });

    console.log("\n");

    // Get all officers
    const officers = await prisma.user.findMany({
      where: {
        role: {
          not: "FRONT_DESK",
        },
        officerProfile: {
          isNot: null,
        },
      },
      include: {
        officerProfile: true,
      },
    });

    console.log("All Officers:");
    officers.forEach((officer) => {
      console.log({
        userId: officer.id,
        email: officer.email,
        role: officer.role,
        level: officer.level,
        fullName: officer.officerProfile?.fullName,
        isActive: officer.isActive,
        profileAvailable: officer.officerProfile?.isAvailable,
      });
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFrontdeskAssignments();
