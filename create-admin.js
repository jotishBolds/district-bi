const { PrismaClient } = require("./app/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Creating admin user...");

  const adminPassword = await bcrypt.hash("admin123", 10);

  // Create an admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@district.gov.in" },
    update: {
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@district.gov.in",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log("Admin User:", {
    email: "admin@district.gov.in",
    password: "admin123",
  });
}

main()
  .catch((e) => {
    console.error("❌ Admin creation failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
