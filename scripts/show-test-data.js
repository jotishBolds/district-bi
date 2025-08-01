const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("📊 Sample Applications for Testing\n");

  // Get some sample applications with their RR numbers and phone numbers
  const applications = await prisma.application.findMany({
    take: 10,
    include: {
      serviceCategory: true,
      currentHolder: {
        include: {
          officerProfile: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log("🔍 Test with these RR Numbers or Phone Numbers:\n");

  applications.forEach((app, index) => {
    console.log(`${index + 1}. RR Number: ${app.rrNumber || "N/A"}`);
    console.log(`   Phone: ${app.citizenPhone}`);
    console.log(`   Citizen: ${app.citizenName}`);
    console.log(`   Service: ${app.serviceCategory.name}`);
    console.log(`   Status: ${app.status}`);
    if (app.currentHolder && app.currentHolder.officerProfile) {
      console.log(
        `   Current Handler: ${app.currentHolder.officerProfile.fullName} (${app.currentHolder.role})`
      );
    }
    console.log(`   Subject: ${app.subject}`);
    console.log("   ---");
  });

  console.log(
    "\n💡 Go to http://localhost:3000/track and try any of the above RR numbers or phone numbers!"
  );
}

main()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
