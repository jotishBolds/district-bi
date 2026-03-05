// scripts/seed-samadhan-services.js
// Seeds SAMADHAN services and service categories using EXISTING sections.
// Sections are NOT created or modified by this script.

const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

// ─── Section name map ──────────────────────────────────────────────────────────
// Keys   = logical names used in this file (from mock data)
// Values = exact section names as they exist in the DB (fetched via /api/samadhan/sections)
//
// Actual sections in DB:
//   "Acquition Section"
//   "Default Section"
//   "District Disaster Management Authority"
//   "IT Section"
//   "Office of the Additional District Collector (Gangtok)"
//   "Office of the Additional District Collector (HQ)"
//   "Office of the District Collector Gangtok"
//   "Revenue Section"
const SECTION_MAP = {
  "Revenue Department": "Revenue Section",
  "Registration Department": "Default Section",
  "Certificate Services": "Default Section",
  "Public Works Department": "Default Section",
  "District Administration": "Office of the District Collector Gangtok",
  "NOC Services": "Revenue Section",
  "Residence Certificate (RC) Section": "Default Section",
  "Election Section": "Default Section",
  "Disaster Management & Compensation":
    "District Disaster Management Authority",
};

// ─── Services ─────────────────────────────────────────────────────────────────
// sectionKey must match a key in SECTION_MAP above
const SAMADHAN_SERVICES = [
  // ── Certificate Services / COI & RC Section
  {
    name: "COI Certificate",
    description: "Certificate of Identification services",
    sectionKey: "Certificate Services",
  },
  {
    name: "Caste Certificate",
    description: "SC/ST/OBC caste certificates",
    sectionKey: "Certificate Services",
  },

  // ── Revenue Section
  {
    name: "Land Records",
    description: "Fard, mutation and parcha related services",
    sectionKey: "Revenue Department",
  },
  {
    name: "Land Revenue",
    description: "Property tax and land revenue collection",
    sectionKey: "Revenue Department",
  },
  {
    name: "Mutation of Inheritance",
    description: "Mutation after death of landowner",
    sectionKey: "Revenue Department",
  },
  {
    name: "Non-Encumbrance Certificate (NEC)",
    description: "Certificate confirming no liabilities",
    sectionKey: "Revenue Department",
  },
  {
    name: "Encumbrance Certificate (EC)",
    description: "Encumbrance details for property",
    sectionKey: "Revenue Department",
  },

  // ── Registration Section
  {
    name: "Firm Registration",
    description: "Registration of firm and partnership",
    sectionKey: "Registration Department",
  },
  {
    name: "Land Registration",
    description: "Sale deed / Gift deed registration",
    sectionKey: "Registration Department",
  },

  // ── District Administration (Office of the District Collector)
  {
    name: "Trade License",
    description: "Trade license issuance and renewal",
    sectionKey: "District Administration",
  },
  {
    name: "Building Permission",
    description: "Building construction permits",
    sectionKey: "District Administration",
  },

  // ── Public Works Department (mapped to General Section)
  {
    name: "Road Maintenance",
    description: "Pothole and road repair complaints",
    sectionKey: "Public Works Department",
  },

  // ── NOC Services (mapped to Revenue Section)
  {
    name: "NOC for Loan",
    description: "No Objection Certificate for loan",
    sectionKey: "NOC Services",
  },
  {
    name: "NOC for Government Quarter",
    description: "No dwelling / government quarter NOC",
    sectionKey: "NOC Services",
  },

  // ── RC Section (COI & RC Section)
  {
    name: "New RC Application",
    description: "Residence Certificate issuance",
    sectionKey: "Residence Certificate (RC) Section",
  },
  {
    name: "Duplicate RC",
    description: "Duplicate Residence Certificate",
    sectionKey: "Residence Certificate (RC) Section",
  },

  // ── Election Section
  {
    name: "New EPIC Card",
    description: "New voter ID application",
    sectionKey: "Election Section",
  },
  {
    name: "EPIC Correction",
    description: "Correction in voter ID",
    sectionKey: "Election Section",
  },

  // ── DDMA Section
  {
    name: "Ex-Gratia Compensation",
    description: "Compensation for death, injury or house damage",
    sectionKey: "Disaster Management & Compensation",
  },
];

// ─── Categories ───────────────────────────────────────────────────────────────
// serviceName must exactly match a name in SAMADHAN_SERVICES above
const SAMADHAN_CATEGORIES = [
  // COI Certificate
  {
    name: "Processing Delay",
    description: null,
    serviceName: "COI Certificate",
  },
  {
    name: "Document Rejection",
    description: null,
    serviceName: "COI Certificate",
  },

  // Caste Certificate
  {
    name: "Caste Verification Delay",
    description: null,
    serviceName: "Caste Certificate",
  },
  {
    name: "Category Change Delay",
    description: null,
    serviceName: "Caste Certificate",
  },

  // Land Records
  { name: "Wrong Information", description: null, serviceName: "Land Records" },
  { name: "Staff Behavior", description: null, serviceName: "Land Records" },

  // Land Revenue
  {
    name: "Tax Payment Issues",
    description: null,
    serviceName: "Land Revenue",
  },
  {
    name: "Revenue Collection Delay",
    description: null,
    serviceName: "Land Revenue",
  },

  // Mutation of Inheritance
  {
    name: "Mutation Delay",
    description: null,
    serviceName: "Mutation of Inheritance",
  },
  {
    name: "Boundary Dispute",
    description: null,
    serviceName: "Mutation of Inheritance",
  },

  // NEC
  {
    name: "NEC Not Issued",
    description: null,
    serviceName: "Non-Encumbrance Certificate (NEC)",
  },

  // EC
  {
    name: "EC Not Issued",
    description: null,
    serviceName: "Encumbrance Certificate (EC)",
  },

  // Firm Registration
  {
    name: "Firm Registration Delay",
    description: null,
    serviceName: "Firm Registration",
  },
  {
    name: "Partnership Registration Issues",
    description: null,
    serviceName: "Firm Registration",
  },

  // Land Registration
  {
    name: "Registration Delay",
    description: null,
    serviceName: "Land Registration",
  },

  // Trade License
  {
    name: "License Renewal Delay",
    description: null,
    serviceName: "Trade License",
  },

  // Building Permission
  {
    name: "Permit Approval Delay",
    description: null,
    serviceName: "Building Permission",
  },

  // Road Maintenance
  {
    name: "Pothole Complaint",
    description: null,
    serviceName: "Road Maintenance",
  },
  { name: "Road Damage", description: null, serviceName: "Road Maintenance" },

  // NOC for Loan
  { name: "NOC Delay", description: null, serviceName: "NOC for Loan" },
  {
    name: "Amin Report Pending",
    description: null,
    serviceName: "NOC for Loan",
  },

  // NOC for Government Quarter
  {
    name: "Government Quarter NOC Delay",
    description: null,
    serviceName: "NOC for Government Quarter",
  },
  {
    name: "Quarter Allocation Issues",
    description: null,
    serviceName: "NOC for Government Quarter",
  },

  // New RC Application
  {
    name: "RC Verification Pending",
    description: null,
    serviceName: "New RC Application",
  },

  // Duplicate RC
  {
    name: "Duplicate RC Delay",
    description: null,
    serviceName: "Duplicate RC",
  },

  // New EPIC Card
  {
    name: "EPIC Not Delivered",
    description: null,
    serviceName: "New EPIC Card",
  },

  // EPIC Correction
  {
    name: "Name Correction Not Updated",
    description: null,
    serviceName: "EPIC Correction",
  },

  // Ex-Gratia Compensation
  {
    name: "Compensation Not Received",
    description: null,
    serviceName: "Ex-Gratia Compensation",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting SAMADHAN services & categories seed...\n");

  // 1. Load all existing sections into a name → id map
  const allSections = await prisma.section.findMany({
    select: { id: true, name: true },
  });
  const sectionIdByName = Object.fromEntries(
    allSections.map((s) => [s.name, s.id]),
  );
  console.log(`ℹ  Found ${allSections.length} existing sections in DB.\n`);

  // 2. Upsert services
  console.log("── Seeding SamadhanServices ──────────────────────────────────");
  const serviceIdByName = {}; // serviceName → db id (for category linking)

  for (const svc of SAMADHAN_SERVICES) {
    const realSectionName = SECTION_MAP[svc.sectionKey];
    if (!realSectionName) {
      console.warn(
        `  ⚠ No section map entry for key "${svc.sectionKey}" – skipped: ${svc.name}`,
      );
      continue;
    }
    const sectionId = sectionIdByName[realSectionName];
    if (!sectionId) {
      console.warn(
        `  ⚠ Section "${realSectionName}" not found in DB – skipped: ${svc.name}`,
      );
      continue;
    }

    try {
      const result = await prisma.samadhanService.upsert({
        where: { name_sectionId: { name: svc.name, sectionId } },
        update: { description: svc.description, isActive: true },
        create: {
          name: svc.name,
          description: svc.description,
          sectionId,
          isActive: true,
        },
        select: { id: true, name: true },
      });
      serviceIdByName[svc.name] = result.id;
      console.log(
        `  ✅ Upserted service: "${svc.name}" → section "${realSectionName}"`,
      );
    } catch (err) {
      console.error(`  ✗ Failed to upsert service "${svc.name}":`, err.message);
    }
  }

  // 3. Upsert categories
  console.log(
    "\n── Seeding SamadhanServiceCategories ────────────────────────",
  );
  for (const cat of SAMADHAN_CATEGORIES) {
    const serviceId = serviceIdByName[cat.serviceName];
    if (!serviceId) {
      console.warn(
        `  ⚠ Service "${cat.serviceName}" not seeded – skipped category: ${cat.name}`,
      );
      continue;
    }

    try {
      await prisma.samadhanServiceCategory.upsert({
        where: { name_serviceId: { name: cat.name, serviceId } },
        update: { description: cat.description, isActive: true },
        create: {
          name: cat.name,
          description: cat.description,
          serviceId,
          isActive: true,
        },
      });
      console.log(
        `  ✅ Upserted category: "${cat.name}" → service "${cat.serviceName}"`,
      );
    } catch (err) {
      console.error(
        `  ✗ Failed to upsert category "${cat.name}":`,
        err.message,
      );
    }
  }

  // 4. Summary
  const totalServices = await prisma.samadhanService.count();
  const totalCategories = await prisma.samadhanServiceCategory.count();
  console.log("\n✅ Seed complete.");
  console.log(`   SamadhanServices:          ${totalServices}`);
  console.log(`   SamadhanServiceCategories: ${totalCategories}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
