// scripts/seed-sections.js
const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

const DEFAULT_SECTIONS = [
  {
    name: "Office of the District Collector",
    description: "Main administrative office",
  },
  {
    name: "Office of the Additional District Collector (Gangtok)",
    description: "Gangtok regional office",
  },
  {
    name: "Office of the Additional District Collector (HQ)",
    description: "Headquarters regional office",
  },
  {
    name: "Office of the Subdivisional Magistrate (Gangtok)",
    description: "Gangtok subdivisional office",
  },
  {
    name: "Office of the Subdivisional Magistrate (HQ)",
    description: "Headquarters subdivisional office",
  },
  {
    name: "Office of the Assistant Collector",
    description: "Assistant Collector's office",
  },
  {
    name: "DDMA Section",
    description: "Disaster Management Authority section",
  },
  { name: "Revenue Section", description: "Revenue administration section" },
  { name: "Acquisition Section", description: "Land acquisition section" },
  { name: "General Section", description: "General administrative section" },
  { name: "Accounts Section", description: "Financial and accounts section" },
  { name: "IT Section", description: "Information Technology section" },
  { name: "Election Section", description: "Electoral administration section" },
  {
    name: "COI & RC Section",
    description: "Certificate of Identity & Revenue Certificate section",
  },
  {
    name: "Registration Section",
    description: "Document registration section",
  },
  { name: "Peshkar Section", description: "Legal and court-related section" },
  {
    name: "Front Desk",
    description: "Application reception and initial processing",
  },
  { name: "Administration", description: "System administration" },
  {
    name: "System Administration",
    description: "Super administrator functions",
  },
];

async function main() {
  console.log("Starting section seeding...");

  for (const sectionData of DEFAULT_SECTIONS) {
    try {
      const existingSection = await prisma.section.findUnique({
        where: { name: sectionData.name },
      });

      if (!existingSection) {
        await prisma.section.create({
          data: sectionData,
        });
        console.log(`✓ Created section: ${sectionData.name}`);
      } else {
        console.log(`○ Section already exists: ${sectionData.name}`);
      }
    } catch (error) {
      console.error(`✗ Error creating section ${sectionData.name}:`, error);
    }
  }

  console.log("Section seeding completed!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
