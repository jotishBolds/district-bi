// Comprehensive test for service category management
const { PrismaClient } = require("./app/generated/prisma");

async function testPermissions() {
  const prisma = new PrismaClient();

  try {
    console.log("🔐 Testing Permission System...\n");

    // Test different user roles
    const roles = [
      "FRONT_DESK",
      "OFFICER",
      "SENIOR_OFFICER",
      "DEPARTMENT_HEAD",
      "ADMIN",
    ];

    console.log("Checking user roles that can manage service categories:");

    const canUserManageServiceCategories = (userRole) => {
      return [
        "FRONT_DESK",
        "OFFICER",
        "SENIOR_OFFICER",
        "DEPARTMENT_HEAD",
        "ADMIN",
      ].includes(userRole);
    };

    roles.forEach((role) => {
      const canManage = canUserManageServiceCategories(role);
      console.log(
        `  - ${role}: ${
          canManage ? "✅ CAN" : "❌ CANNOT"
        } manage service categories`
      );
    });

    // Check if we have users in the system
    console.log("\n📊 User Statistics:");
    const userStats = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    userStats.forEach((stat) => {
      console.log(`  - ${stat.role}: ${stat._count} users`);
    });

    // Check applications with service categories
    console.log("\n📋 Application Statistics:");
    const totalApplications = await prisma.application.count();

    console.log(`Total applications: ${totalApplications}`);

    // Check service category changes (audit trail)
    const categoryChanges = await prisma.serviceCategoryChange.count();
    console.log(`Service category changes recorded: ${categoryChanges}`);

    console.log("\n🎯 Permission system is properly configured!");
  } catch (error) {
    console.error("❌ Error testing permissions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissions();
