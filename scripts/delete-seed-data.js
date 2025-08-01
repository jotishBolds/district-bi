const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️ Deleting all application seed data...");

  try {
    // Delete in order to respect foreign key constraints
    console.log("📋 Deleting application audit logs...");
    await prisma.applicationAuditLog.deleteMany({});

    console.log("📋 Deleting application tracking OTPs...");
    await prisma.applicationTrackingOTP.deleteMany({});

    console.log("📋 Deleting frontdesk forwardings...");
    await prisma.frontdeskForwarding.deleteMany({});

    console.log("📋 Deleting officer forwarding history...");
    await prisma.officerForwardingHistory.deleteMany({});

    console.log("📋 Deleting notifications...");
    await prisma.notification.deleteMany({});

    console.log("📋 Deleting document requests...");
    await prisma.documentRequest.deleteMany({});

    console.log("📋 Deleting documents...");
    await prisma.document.deleteMany({});

    console.log("📋 Deleting officer assignments...");
    await prisma.officerAssignment.deleteMany({});

    console.log("📋 Deleting application validations...");
    await prisma.applicationValidation.deleteMany({});

    console.log("📋 Deleting application workflow...");
    await prisma.applicationWorkflow.deleteMany({});

    console.log("📋 Deleting applications...");
    const deletedApplications = await prisma.application.deleteMany({});

    console.log(
      `✅ Successfully deleted ${deletedApplications.count} applications and all related data`
    );

    console.log("\n🎉 All application seed data deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting seed data:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Deletion failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
