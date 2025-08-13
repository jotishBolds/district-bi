const { PrismaClient } = require("./app/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create users
  const frontdeskPassword = await bcrypt.hash("password123", 10);
  const officerPassword = await bcrypt.hash("password123", 10);

  // Create a frontdesk user
  const frontdesk = await prisma.user.upsert({
    where: { email: "frontdesk@district.gov.in" },
    update: {},
    create: {
      email: "frontdesk@district.gov.in",
      passwordHash: frontdeskPassword,
      role: "FRONT_DESK",
      isActive: true,
    },
  });

  // Create an officer user
  const officer = await prisma.user.upsert({
    where: { email: "dc@district.gov.in" },
    update: {},
    create: {
      email: "dc@district.gov.in",
      passwordHash: officerPassword,
      role: "DC",
      isActive: true,
      officerProfile: {
        create: {
          fullName: "District Collector",
          designation: "DC",
          department: "Revenue",
          isAvailable: true,
        },
      },
    },
  });

  // Create service categories
  const uncategorisedCategory = await prisma.serviceCategory.upsert({
    where: { name: "Uncategorised" },
    update: {},
    create: {
      name: "Uncategorised",
      description:
        "Default category for applications without specific categorization",
      isActive: true,
    },
  });

  const serviceCategory = await prisma.serviceCategory.upsert({
    where: { name: "Revenue Certificate" },
    update: {},
    create: {
      name: "Revenue Certificate",
      description: "Certificate for revenue-related matters",
      isActive: true,
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("Frontend User:", {
    email: "frontdesk@district.gov.in",
    password: "password123",
  });
  console.log("Officer User:", {
    email: "dc@district.gov.in",
    password: "password123",
  });
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
