// scripts/seed-officers-frontdesk.js
const { PrismaClient } = require("../app/generated/prisma");
const { UserRole } = require("../app/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Common password for all users (for testing purposes)
const COMMON_PASSWORD = "password123";

// Officer roles with their sections and details (excluding DISPATCH_HANDLER which is deprecated)
const OFFICER_SEED_DATA = [
  // Level 0 - District Collector
  {
    email: "dc@district.gov.in",
    role: UserRole.DC,
    fullName: "Shri Rajesh Kumar",
    designation: "District Collector",
    department: "Revenue",
    section: "Office of the District Collector",
    officeLocation: "District Collectorate, Gangtok",
  },

  // Level 1 - Additional District Collectors
  {
    email: "adc.gtk@district.gov.in",
    role: UserRole.ADC_GTK,
    fullName: "Shri Tenzin Dorjee",
    designation: "Additional District Collector (Gangtok)",
    department: "Revenue",
    section: "Office of the Additional District Collector (Gangtok)",
    officeLocation: "ADC Office, Gangtok",
  },
  {
    email: "adc.hq@district.gov.in",
    role: UserRole.ADC_HQ,
    fullName: "Smt. Pema Wangmo",
    designation: "Additional District Collector (HQ)",
    department: "Revenue",
    section: "Office of the Additional District Collector (HQ)",
    officeLocation: "District Headquarters",
  },

  // Level 2 - Sub-Divisional Magistrates
  {
    email: "sdm.gtk@district.gov.in",
    role: UserRole.SDM_GTK,
    fullName: "Shri Karma Bhutia",
    designation: "Sub-Divisional Magistrate (Gangtok)",
    department: "Revenue",
    section: "Office of the Subdivisional Magistrate (Gangtok)",
    officeLocation: "SDM Office, Gangtok",
  },
  {
    email: "sdm.hq@district.gov.in",
    role: UserRole.SDM_HQ,
    fullName: "Smt. Diki Sherpa",
    designation: "Sub-Divisional Magistrate (HQ)",
    department: "Revenue",
    section: "Office of the Subdivisional Magistrate (HQ)",
    officeLocation: "District Headquarters",
  },

  // Level 3 - Assistant Collector
  {
    email: "ac@district.gov.in",
    role: UserRole.AC,
    fullName: "Shri Sonam Lepcha",
    designation: "Assistant Collector",
    department: "Revenue",
    section: "Office of the Assistant Collector",
    officeLocation: "District Collectorate",
  },

  // Level 4 - Deputy Directors and DPO
  {
    email: "dpo.ddma@district.gov.in",
    role: UserRole.DPO_DDMA,
    fullName: "Shri Phurba Tshering",
    designation: "Joint Director (DDMA)",
    department: "Disaster Management",
    section: "DDMA Section",
    officeLocation: "DDMA Office",
  },
  {
    email: "dd.rev@district.gov.in",
    role: UserRole.DD_REV,
    fullName: "Smt. Yangchen Dolma",
    designation: "Deputy Director (Revenue)",
    department: "Revenue",
    section: "Revenue Section",
    officeLocation: "Revenue Office",
  },
  {
    email: "dd.acq@district.gov.in",
    role: UserRole.DD_ACQ,
    fullName: "Shri Norbu Wangdi",
    designation: "Deputy Director (Acquisition)",
    department: "Land Acquisition",
    section: "Acquisition Section",
    officeLocation: "Land Acquisition Office",
  },

  // Level 5 - Under Secretaries and Officers
  {
    email: "us.adm@district.gov.in",
    role: UserRole.US_ADM,
    fullName: "Smt. Rinchen Doma",
    designation: "Under Secretary (Administration)",
    department: "Administration",
    section: "General Section",
    officeLocation: "Admin Office",
  },
  {
    email: "ao@district.gov.in",
    role: UserRole.AO,
    fullName: "Shri Bijay Subba",
    designation: "Accounts Officer",
    department: "Accounts",
    section: "Accounts Section",
    officeLocation: "Accounts Office",
  },
  {
    email: "to.ddma@district.gov.in",
    role: UserRole.TO_DDMA,
    fullName: "Shri Tashi Namgyal",
    designation: "Training Officer (DDMA)",
    department: "Disaster Management",
    section: "DDMA Section",
    officeLocation: "DDMA Training Center",
  },
  {
    email: "ad.it@district.gov.in",
    role: UserRole.AD_IT,
    fullName: "Shri Passang Sherpa",
    designation: "Assistant Director (IT)",
    department: "Information Technology",
    section: "IT Section",
    officeLocation: "IT Office",
  },
  {
    email: "us.election@district.gov.in",
    role: UserRole.US_ELECTION,
    fullName: "Smt. Lhamu Bhutia",
    designation: "Under Secretary (Election)",
    department: "Election",
    section: "Election Section",
    officeLocation: "Election Office",
  },

  // Level 6 - Office Superintendents and Revenue Inspectors
  {
    email: "os.coi.rc@district.gov.in",
    role: UserRole.OS_COI_RC,
    fullName: "Shri Mingma Tamang",
    designation: "Office Superintendent (COI & RC)",
    department: "Revenue",
    section: "COI & RC Section",
    officeLocation: "COI Office",
  },
  {
    email: "os.rc@district.gov.in",
    role: UserRole.OS_RC,
    fullName: "Smt. Dawa Lhamu",
    designation: "Office Superintendent (Registration)",
    department: "Registration",
    section: "Registration Section",
    officeLocation: "Registration Office",
  },
  {
    email: "ri.legal@district.gov.in",
    role: UserRole.RI_LEGAL,
    fullName: "Shri Tenzing Norbu",
    designation: "Revenue Inspector (Legal)",
    department: "Legal",
    section: "Peshkar Section",
    officeLocation: "Legal Cell",
  },

  // Level 7 - Dealing Hands (new role)
  {
    email: "dh1@district.gov.in",
    role: UserRole.DEALING_HAND,
    fullName: "Shri Pemba Sherpa",
    designation: "Dealing Hand",
    department: "General Section",
    section: "General Section",
    officeLocation: "General Section Office",
  },
  {
    email: "dh2@district.gov.in",
    role: UserRole.DEALING_HAND,
    fullName: "Smt. Choden Lepcha",
    designation: "Dealing Hand",
    department: "Revenue Section",
    section: "Revenue Section",
    officeLocation: "Revenue Section Office",
  },
  {
    email: "dh3@district.gov.in",
    role: UserRole.DEALING_HAND,
    fullName: "Shri Dorjee Bhutia",
    designation: "Dealing Hand",
    department: "Registration Section",
    section: "Registration Section",
    officeLocation: "Registration Office",
  },
  {
    email: "dh4@district.gov.in",
    role: UserRole.DEALING_HAND,
    fullName: "Smt. Nima Doma",
    designation: "Dealing Hand",
    department: "Accounts Section",
    section: "Accounts Section",
    officeLocation: "Accounts Office",
  },
];

// Frontdesk users with their officer assignments
const FRONTDESK_SEED_DATA = [
  {
    email: "frontdesk@district.gov.in",
    fullName: "Front Desk General",
    designation: "Front Desk Officer",
    department: "Front Desk",
    section: "Front Desk",
    officeLocation: "Reception Counter",
    assignedOfficerEmail: null, // General frontdesk - no specific assignment
  },
  {
    email: "fd.dc@district.gov.in",
    fullName: "FD - DC Office",
    designation: "Front Desk Officer (DC)",
    department: "DC Office",
    section: "Front Desk",
    officeLocation: "DC Office Reception",
    assignedOfficerEmail: "dc@district.gov.in",
  },
  {
    email: "fd.adc.gtk@district.gov.in",
    fullName: "FD - ADC Gangtok",
    designation: "Front Desk Officer (ADC Gtk)",
    department: "ADC Gangtok Office",
    section: "Front Desk",
    officeLocation: "ADC Gangtok Reception",
    assignedOfficerEmail: "adc.gtk@district.gov.in",
  },
  {
    email: "fd.sdm.gtk@district.gov.in",
    fullName: "FD - SDM Gangtok",
    designation: "Front Desk Officer (SDM Gtk)",
    department: "SDM Gangtok Office",
    section: "Front Desk",
    officeLocation: "SDM Gangtok Reception",
    assignedOfficerEmail: "sdm.gtk@district.gov.in",
  },
  {
    email: "fd.revenue@district.gov.in",
    fullName: "FD - Revenue Section",
    designation: "Front Desk Officer (Revenue)",
    department: "Revenue Section",
    section: "Front Desk",
    officeLocation: "Revenue Section Counter",
    assignedOfficerEmail: "dd.rev@district.gov.in",
  },
  {
    email: "fd.accounts@district.gov.in",
    fullName: "FD - Accounts Section",
    designation: "Front Desk Officer (Accounts)",
    department: "Accounts Section",
    section: "Front Desk",
    officeLocation: "Accounts Section Counter",
    assignedOfficerEmail: "ao@district.gov.in",
  },
];

async function seedOfficersAndFrontdesk() {
  console.log("🌱 Starting Officers and Frontdesk Seeding...\n");

  const passwordHash = await bcrypt.hash(COMMON_PASSWORD, 10);

  // First, ensure sections exist
  console.log("📁 Creating/Updating Sections...");
  const sections = [
    ...new Set([
      ...OFFICER_SEED_DATA.map((o) => o.section),
      ...FRONTDESK_SEED_DATA.map((f) => f.section),
    ]),
  ];

  const sectionMap = new Map();
  for (const sectionName of sections) {
    const section = await prisma.section.upsert({
      where: { name: sectionName },
      update: {},
      create: {
        name: sectionName,
        description: `${sectionName} - District Administration`,
        isActive: true,
      },
    });
    sectionMap.set(sectionName, section.id);
    console.log(`  ✅ Section: ${sectionName}`);
  }

  // Seed Officers
  console.log("\n👔 Creating/Updating Officers...");
  const officerMap = new Map(); // Store officer emails to user IDs

  for (const officer of OFFICER_SEED_DATA) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: officer.email },
        include: { officerProfile: true },
      });

      let user;
      if (existingUser) {
        // Update existing user
        user = await prisma.user.update({
          where: { email: officer.email },
          data: {
            role: officer.role,
            isActive: true,
            officerProfile: {
              upsert: {
                create: {
                  fullName: officer.fullName,
                  designation: officer.designation,
                  department: officer.department,
                  officeLocation: officer.officeLocation,
                  sectionId: sectionMap.get(officer.section),
                  isAvailable: true,
                },
                update: {
                  fullName: officer.fullName,
                  designation: officer.designation,
                  department: officer.department,
                  officeLocation: officer.officeLocation,
                  sectionId: sectionMap.get(officer.section),
                  isAvailable: true,
                },
              },
            },
          },
          include: { officerProfile: true },
        });
        console.log(
          `  ✅ Updated Officer: ${officer.fullName} (${officer.role})`
        );
      } else {
        // Create new user with officer profile
        user = await prisma.user.create({
          data: {
            email: officer.email,
            passwordHash: passwordHash,
            role: officer.role,
            isActive: true,
            officerProfile: {
              create: {
                fullName: officer.fullName,
                designation: officer.designation,
                department: officer.department,
                officeLocation: officer.officeLocation,
                sectionId: sectionMap.get(officer.section),
                isAvailable: true,
              },
            },
          },
          include: { officerProfile: true },
        });
        console.log(
          `  ✅ Created Officer: ${officer.fullName} (${officer.role})`
        );
      }
      officerMap.set(officer.email, user);
    } catch (error) {
      console.error(
        `  ❌ Error creating officer ${officer.email}:`,
        error.message
      );
    }
  }

  // Seed Frontdesk Users
  console.log("\n🖥️ Creating/Updating Frontdesk Users...");

  for (const frontdesk of FRONTDESK_SEED_DATA) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: frontdesk.email },
        include: { officerProfile: true },
      });

      let frontdeskUser;
      if (existingUser) {
        // Update existing user
        frontdeskUser = await prisma.user.update({
          where: { email: frontdesk.email },
          data: {
            role: UserRole.FRONT_DESK,
            isActive: true,
            officerProfile: {
              upsert: {
                create: {
                  fullName: frontdesk.fullName,
                  designation: frontdesk.designation,
                  department: frontdesk.department,
                  officeLocation: frontdesk.officeLocation,
                  sectionId: sectionMap.get(frontdesk.section),
                  isAvailable: true,
                },
                update: {
                  fullName: frontdesk.fullName,
                  designation: frontdesk.designation,
                  department: frontdesk.department,
                  officeLocation: frontdesk.officeLocation,
                  sectionId: sectionMap.get(frontdesk.section),
                  isAvailable: true,
                },
              },
            },
          },
          include: { officerProfile: true },
        });
        console.log(`  ✅ Updated Frontdesk: ${frontdesk.fullName}`);
      } else {
        // Create new frontdesk user
        frontdeskUser = await prisma.user.create({
          data: {
            email: frontdesk.email,
            passwordHash: passwordHash,
            role: UserRole.FRONT_DESK,
            isActive: true,
            officerProfile: {
              create: {
                fullName: frontdesk.fullName,
                designation: frontdesk.designation,
                department: frontdesk.department,
                officeLocation: frontdesk.officeLocation,
                sectionId: sectionMap.get(frontdesk.section),
                isAvailable: true,
              },
            },
          },
          include: { officerProfile: true },
        });
        console.log(`  ✅ Created Frontdesk: ${frontdesk.fullName}`);
      }

      // Assign officer to frontdesk if specified
      if (frontdesk.assignedOfficerEmail) {
        const assignedOfficer = officerMap.get(frontdesk.assignedOfficerEmail);
        if (assignedOfficer && assignedOfficer.officerProfile) {
          // Check if assignment already exists
          const existingAssignment = await prisma.frontdeskOfficer.findFirst({
            where: {
              frontdeskUserId: frontdeskUser.id,
              officerId: assignedOfficer.officerProfile.id,
            },
          });

          if (!existingAssignment) {
            await prisma.frontdeskOfficer.create({
              data: {
                frontdeskUserId: frontdeskUser.id,
                officerId: assignedOfficer.officerProfile.id,
              },
            });
            console.log(
              `    📎 Assigned to: ${assignedOfficer.officerProfile.fullName}`
            );
          } else {
            console.log(
              `    📎 Already assigned to: ${assignedOfficer.officerProfile.fullName}`
            );
          }
        }
      } else {
        console.log(
          `    📎 General frontdesk (no specific officer assignment)`
        );
      }
    } catch (error) {
      console.error(
        `  ❌ Error creating frontdesk ${frontdesk.email}:`,
        error.message
      );
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SEEDING SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n✅ Officers seeded: ${OFFICER_SEED_DATA.length}`);
  console.log(`✅ Frontdesk users seeded: ${FRONTDESK_SEED_DATA.length}`);
  console.log(`✅ Sections created/updated: ${sections.length}`);
  console.log(`\n🔐 Common password for all users: ${COMMON_PASSWORD}`);

  console.log("\n📧 Login Credentials:");
  console.log("─".repeat(60));
  console.log("\n👔 OFFICERS:");
  for (const officer of OFFICER_SEED_DATA) {
    console.log(
      `  ${officer.fullName.padEnd(25)} | ${officer.email} | ${officer.role}`
    );
  }

  console.log("\n🖥️ FRONTDESK:");
  for (const fd of FRONTDESK_SEED_DATA) {
    console.log(`  ${fd.fullName.padEnd(25)} | ${fd.email}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Seeding completed successfully!");
  console.log("=".repeat(60));
}

// Main execution
seedOfficersAndFrontdesk()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = {
  seedOfficersAndFrontdesk,
  OFFICER_SEED_DATA,
  FRONTDESK_SEED_DATA,
  COMMON_PASSWORD,
};
