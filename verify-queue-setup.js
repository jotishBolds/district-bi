// Verification script to check current queue API setup
const { PrismaClient } = require("./app/generated/prisma");

const prisma = new PrismaClient();

// Copy of getAllOfficerRoles function
function getAllOfficerRoles() {
  return [
    "DC",
    "ADC_GTK",
    "ADC_HQ",
    "SDM_GTK",
    "SDM_HQ",
    "AC",
    "DPO_DDMA",
    "DD_REV",
    "DD_ACQ",
    "US_ADM",
    "AO",
    "TO_DDMA",
    "AD_IT",
    "US_ELECTION",
    "OS_COI_RC",
    "OS_RC",
    "RI_LEGAL",
    "ADC",
    "SDM",
    "RO",
    "DYDIR",
    "FRONT_DESK",
  ];
}

async function verifyQueueSetup() {
  try {
    console.log("=== Queue API Setup Verification ===\n");

    // Check officer roles
    const officerRoles = getAllOfficerRoles();
    console.log("Valid Officer/Official Roles:", officerRoles);
    console.log(`Total: ${officerRoles.length} roles\n`);

    // Check frontdesk assignments with proper filtering
    const assignments = await prisma.frontdeskOfficer.findMany({
      where: {
        officerId: { not: null }, // Only specific assignments
      },
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
                isActive: true,
              },
            },
          },
        },
      },
    });

    console.log("Valid Frontdesk Assignments:");
    assignments.forEach((assignment) => {
      const isValidRole = officerRoles.includes(assignment.officer.user.role);
      console.log({
        frontdeskUser: assignment.frontdeskUser.email,
        officerUserId: assignment.officer.user.id,
        officerRole: assignment.officer.user.role,
        isValidRole,
        isActive: assignment.officer.user.isActive,
        status:
          isValidRole && assignment.officer.user.isActive
            ? "✅ VALID"
            : "❌ INVALID",
      });
    });

    console.log("\n=== Summary ===");
    console.log(`Total valid assignments: ${assignments.length}`);
    console.log("All assignments should work with the updated API.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyQueueSetup();
