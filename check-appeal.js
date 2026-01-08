const { PrismaClient } = require("./app/generated/prisma");
const prisma = new PrismaClient();

async function fix() {
  const ticketId = "c31328ed-ce66-45d4-923b-fc137921c738";

  // Update the original ticket status to APPEALED
  const updated = await prisma.samadhanTicket.update({
    where: { id: ticketId },
    data: { status: "APPEALED" },
  });
  console.log("Updated original ticket status to:", updated.status);

  await prisma.$disconnect();
}

fix().catch(console.error);
