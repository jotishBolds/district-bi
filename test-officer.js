const { PrismaClient } = require("./app/generated/prisma");

const prisma = new PrismaClient();

async function testOfficerApplications() {
  console.log("🧪 Testing officer application retrieval...");

  try {
    // Get the officer user
    const officer = await prisma.user.findUnique({
      where: { email: "dc@district.gov.in" },
    });

    if (!officer) {
      console.error("❌ Officer not found");
      return;
    }

    console.log("✅ Found officer:", officer.email, "ID:", officer.id);

    // Check applications assigned to this officer
    const applications = await prisma.application.findMany({
      where: {
        currentHolderId: officer.id,
      },
      include: {
        serviceCategory: true,
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
      },
    });

    console.log("📋 Applications assigned to officer:", applications.length);

    applications.forEach((app, index) => {
      console.log(`${index + 1}. App ID: ${app.id}`);
      console.log(`   RR Number: ${app.rrNumber}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Citizen: ${app.citizenName}`);
      console.log(`   Service: ${app.serviceCategory.name}`);
      console.log(`   Current Holder ID: ${app.currentHolderId}`);
      console.log("");
    });

    console.log("🎯 API filtering test:");

    // Test the same query the API would use for officers
    const apiQuery = await prisma.application.findMany({
      where: {
        currentHolderId: officer.id,
        status: "IN_PROGRESS", // Test with IN_PROGRESS status
      },
      include: {
        serviceCategory: true,
        currentHolder: {
          include: {
            officerProfile: true,
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            isVerified: true,
          },
        },
        officerAssignments: {
          include: {
            assignedTo: {
              include: {
                officerProfile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      "📊 API query result (IN_PROGRESS):",
      apiQuery.length,
      "applications"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testOfficerApplications();
