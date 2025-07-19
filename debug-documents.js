// Quick script to debug document records
const { PrismaClient } = require("./app/generated/prisma");

const prisma = new PrismaClient();

async function debugDocuments() {
  try {
    console.log("Checking document records...");

    // Get a few document records
    const documents = await prisma.document.findMany({
      take: 5,
      select: {
        id: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        createdAt: true,
        documentType: true,
        applicationId: true,
      },
    });

    console.log("Found documents:", documents.length);
    documents.forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log("  ID:", doc.id);
      console.log("  fileName:", doc.fileName);
      console.log("  filePath:", doc.filePath);
      console.log("  fileSize:", doc.fileSize);
      console.log("  createdAt:", doc.createdAt);
      console.log("  documentType:", doc.documentType);
      console.log("  applicationId:", doc.applicationId);
    });

    // Check for any records with empty filePath
    const emptyPathDocs = await prisma.document.findMany({
      where: {
        OR: [{ filePath: "" }, { fileSize: 0 }],
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        createdAt: true,
      },
    });

    console.log(
      "\nDocuments with empty/null filePath or zero fileSize:",
      emptyPathDocs.length
    );
    emptyPathDocs.forEach((doc, index) => {
      console.log(`\nEmpty Document ${index + 1}:`);
      console.log("  ID:", doc.id);
      console.log("  fileName:", doc.fileName);
      console.log("  filePath:", doc.filePath);
      console.log("  fileSize:", doc.fileSize);
      console.log("  createdAt:", doc.createdAt);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDocuments();
