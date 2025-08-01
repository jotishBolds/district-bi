// scripts/seed-departments.js
const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

async function seedDepartments() {
  try {
    console.log("🌱 Seeding departments...");

    // Create default departments
    const departments = [
      {
        name: "Government Department",
        description: "Government related applications and services",
      },
      {
        name: "Private Department",
        description: "Private sector applications and services",
      },
      {
        name: "Education Department",
        description: "Educational institutions and related services",
      },
      {
        name: "Health Department",
        description: "Healthcare related applications",
      },
      {
        name: "Revenue Department",
        description: "Revenue and taxation related applications",
      },
      {
        name: "Legal Department",
        description: "Legal and judicial related applications",
      },
      {
        name: "General Department",
        description: "General purpose applications and miscellaneous services",
      },
    ];

    // Create departments using upsert to avoid duplicates
    for (const dept of departments) {
      await prisma.department.upsert({
        where: { name: dept.name },
        update: {
          description: dept.description,
          isActive: true,
        },
        create: {
          name: dept.name,
          description: dept.description,
          isActive: true,
        },
      });
      console.log(`✅ Created/Updated department: ${dept.name}`);
    }

    // Get the default department (Government Department)
    const defaultDepartment = await prisma.department.findFirst({
      where: { name: "Government Department" },
    });

    if (defaultDepartment) {
      // Update existing applications without department to use Government Department
      const updateResult = await prisma.application.updateMany({
        where: { departmentId: null },
        data: { departmentId: defaultDepartment.id },
      });

      console.log(
        `✅ Updated ${updateResult.count} existing applications with default department`
      );
    }

    console.log("🎉 Department seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding departments:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedDepartments()
    .then(() => {
      console.log("✅ Department seeding script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Department seeding script failed:", error);
      process.exit(1);
    });
}

module.exports = { seedDepartments };
