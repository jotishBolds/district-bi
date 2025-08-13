const { PrismaClient } = require("./app/generated/prisma");
const prisma = new PrismaClient();

async function getUncategorisedId() {
  try {
    const category = await prisma.serviceCategory.findFirst({
      where: { name: "Uncategorised" },
    });
    console.log("Uncategorised category:", category);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

getUncategorisedId();
