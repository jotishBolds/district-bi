const { PrismaClient } = require("./app/generated/prisma");

const prisma = new PrismaClient();

async function checkTicket() {
  try {
    const ticket = await prisma.samadhanTicket.findUnique({
      where: { id: "46f3330b-ec67-499d-b44d-3c3fb9ae4750" },
      select: {
        id: true,
        status: true,
        slaBreachedAt: true,
        slaDeadline: true,
        escalatedToId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!ticket) {
      console.log("Ticket not found");
      return;
    }

    console.log("Ticket details:");
    console.log(JSON.stringify(ticket, null, 2));

    // Check conditions
    const isSlaBreached = !!ticket.slaBreachedAt;
    const isOverdue =
      ticket.slaDeadline &&
      new Date(ticket.slaDeadline) < new Date() &&
      !["RESOLVED", "CLOSED", "CLOSED_NO_RESPONSE"].includes(ticket.status);
    const isAppealed = ["APPEALED", "APPEAL_FILED"].includes(ticket.status);
    const isEscalated = !!ticket.escalatedToId;

    console.log("\nPermission conditions:");
    console.log("isSlaBreached:", isSlaBreached);
    console.log("isOverdue:", isOverdue);
    console.log("isAppealed:", isAppealed);
    console.log("isEscalated:", isEscalated);

    console.log(
      "\nCan higher authority modify:",
      isSlaBreached || isOverdue || isAppealed || isEscalated
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTicket();
