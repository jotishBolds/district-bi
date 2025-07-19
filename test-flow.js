const { PrismaClient } = require("./app/generated/prisma");

const prisma = new PrismaClient();

async function testApplicationFlow() {
  console.log("🧪 Testing application creation flow...");

  try {
    // Get the frontdesk user and officer
    const frontdesk = await prisma.user.findUnique({
      where: { email: "frontdesk@district.gov.in" },
    });

    const officer = await prisma.user.findUnique({
      where: { email: "dc@district.gov.in" },
    });

    const serviceCategory = await prisma.serviceCategory.findFirst();

    if (!frontdesk || !officer || !serviceCategory) {
      console.error("❌ Missing required data. Please run seed.js first.");
      return;
    }

    console.log("✅ Found required data:");
    console.log("- Frontdesk user:", frontdesk.email);
    console.log("- Officer:", officer.email);
    console.log("- Service category:", serviceCategory.name);

    // Create a test application directly in the database
    const application = await prisma.application.create({
      data: {
        serviceCategoryId: serviceCategory.id,
        citizenName: "John Doe",
        citizenPhone: "9876543210",
        citizenEmail: "john.doe@example.com",
        citizenAddress: "123 Main Street, City",
        citizenGender: "Male",
        citizenAadhaar: "123456789012",
        status: "IN_PROGRESS",
        currentHolderId: officer.id,
        rrNumber: "RR-2025-1234",
        submittedAt: new Date(),
      },
    });

    console.log("✅ Created test application:", application.id);

    // Test fetching applications for frontdesk
    const frontdeskApps = await prisma.application.findMany({
      where: {
        status: {
          in: [
            "VALIDATED",
            "IN_PROGRESS",
            "APPROVED",
            "CLOSED_WITH_ACTION",
            "COMPLETED",
          ],
        },
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

    console.log("✅ Frontdesk can see", frontdeskApps.length, "applications");

    // Test fetching applications for officer
    const officerApps = await prisma.application.findMany({
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

    console.log(
      "✅ Officer can see",
      officerApps.length,
      "assigned applications"
    );

    console.log("🎉 Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testApplicationFlow();
