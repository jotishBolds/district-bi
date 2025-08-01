const { PrismaClient } = require("../app/generated/prisma");
const { UserRole, ApplicationStatus } = require("../app/generated/prisma");

const prisma = new PrismaClient();

// Sample citizen data
const SAMPLE_CITIZENS = [
  {
    name: "Ramesh Kumar Sharma",
    phone: "9876543210",
    email: "ramesh.sharma@email.com",
    address: "MG Road, Gangtok, Sikkim",
    gender: "Male",
    aadhaar: "123456789012",
  },
  {
    name: "Sunita Devi",
    phone: "9876543211",
    email: "sunita.devi@email.com",
    address: "Ranipool, East Sikkim",
    gender: "Female",
    aadhaar: "123456789013",
  },
  {
    name: "Tenzin Norbu",
    phone: "9876543212",
    email: "tenzin.norbu@email.com",
    address: "Namchi, South Sikkim",
    gender: "Male",
    aadhaar: "123456789014",
  },
  {
    name: "Karma Bhutia",
    phone: "9876543213",
    email: "karma.bhutia@email.com",
    address: "Gyalshing, West Sikkim",
    gender: "Male",
    aadhaar: "123456789015",
  },
  {
    name: "Pema Lhamu",
    phone: "9876543214",
    email: "pema.lhamu@email.com",
    address: "Mangan, North Sikkim",
    gender: "Female",
    aadhaar: "123456789016",
  },
  {
    name: "Bijay Subba",
    phone: "9876543215",
    email: "bijay.subba@email.com",
    address: "Jorethang, South Sikkim",
    gender: "Male",
    aadhaar: "123456789017",
  },
  {
    name: "Doma Sherpa",
    phone: "9876543216",
    email: "doma.sherpa@email.com",
    address: "Yuksom, West Sikkim",
    gender: "Female",
    aadhaar: "123456789018",
  },
  {
    name: "Phurba Tshering",
    phone: "9876543217",
    email: "phurba.tshering@email.com",
    address: "Chungthang, North Sikkim",
    gender: "Male",
    aadhaar: "123456789019",
  },
  {
    name: "Yangchen Dolma",
    phone: "9876543218",
    email: "yangchen.dolma@email.com",
    address: "Singtam, East Sikkim",
    gender: "Female",
    aadhaar: "123456789020",
  },
  {
    name: "Sonam Wangdi",
    phone: "9876543219",
    email: "sonam.wangdi@email.com",
    address: "Pelling, West Sikkim",
    gender: "Male",
    aadhaar: "123456789021",
  },
  {
    name: "Laxmi Pradhan",
    phone: "9876543220",
    email: "laxmi.pradhan@email.com",
    address: "Rangpo, East Sikkim",
    gender: "Female",
    aadhaar: "123456789022",
  },
  {
    name: "Dorje Lepcha",
    phone: "9876543221",
    email: "dorje.lepcha@email.com",
    address: "Lachung, North Sikkim",
    gender: "Male",
    aadhaar: "123456789023",
  },
  {
    name: "Mingma Sherpa",
    phone: "9876543222",
    email: "mingma.sherpa@email.com",
    address: "Ravangla, South Sikkim",
    gender: "Male",
    aadhaar: "123456789024",
  },
  {
    name: "Choden Bhutia",
    phone: "9876543223",
    email: "choden.bhutia@email.com",
    address: "Gangtok, East Sikkim",
    gender: "Female",
    aadhaar: "123456789025",
  },
  {
    name: "Pemba Tamang",
    phone: "9876543224",
    email: "pemba.tamang@email.com",
    address: "Melli, South Sikkim",
    gender: "Male",
    aadhaar: "123456789026",
  },
  {
    name: "Dolma Lama",
    phone: "9876543225",
    email: "dolma.lama@email.com",
    address: "Dzongri, West Sikkim",
    gender: "Female",
    aadhaar: "123456789027",
  },
  {
    name: "Lobsang Tenzin",
    phone: "9876543226",
    email: "lobsang.tenzin@email.com",
    address: "Yumthang, North Sikkim",
    gender: "Male",
    aadhaar: "123456789028",
  },
  {
    name: "Nima Sherpa",
    phone: "9876543227",
    email: "nima.sherpa@email.com",
    address: "Pakyong, East Sikkim",
    gender: "Male",
    aadhaar: "123456789029",
  },
  {
    name: "Tsering Lhamo",
    phone: "9876543228",
    email: "tsering.lhamo@email.com",
    address: "Legship, West Sikkim",
    gender: "Female",
    aadhaar: "123456789030",
  },
  {
    name: "Passang Norbu",
    phone: "9876543229",
    email: "passang.norbu@email.com",
    address: "Lachen, North Sikkim",
    gender: "Male",
    aadhaar: "123456789031",
  },
];

// Sample subjects for different service categories
const SUBJECTS = {
  "Revenue Certificate": [
    "Request for Income Certificate",
    "Application for Caste Certificate",
    "Domicile Certificate Application",
    "Request for NOC Certificate",
    "Land Ownership Certificate",
    "Rural Area Certificate Request",
    "Agricultural Land Certificate",
    "Residential Certificate Application",
  ],
  "Land Registration": [
    "Property Registration Application",
    "Land Transfer Certificate",
    "Mutation Entry Request",
    "Land Survey Certificate",
    "Property Title Verification",
    "Land Conversion Certificate",
    "Agricultural to Residential Conversion",
    "Property Ownership Transfer",
  ],
  "License Application": [
    "Trade License Application",
    "Professional License Request",
    "Commercial License Application",
    "Service License Registration",
    "Business Permit Application",
    "Professional Service License",
    "Commercial Activity License",
    "Trade Registration Certificate",
  ],
};

// Application statuses with weights for random distribution
const STATUS_DISTRIBUTION = [
  { status: ApplicationStatus.OPEN, weight: 15 },
  { status: ApplicationStatus.IN_PROGRESS, weight: 20 },
  { status: ApplicationStatus.RESOLVED, weight: 18 },
  { status: ApplicationStatus.CLOSED, weight: 12 },
  { status: ApplicationStatus.REOPENED, weight: 10 },
  { status: ApplicationStatus.VALIDATED, weight: 25 }, // Some applications might still be in queue
];

// Weighted random selection
function getRandomStatus() {
  const totalWeight = STATUS_DISTRIBUTION.reduce(
    (sum, item) => sum + item.weight,
    0
  );
  let random = Math.random() * totalWeight;

  for (const item of STATUS_DISTRIBUTION) {
    random -= item.weight;
    if (random <= 0) {
      return item.status;
    }
  }
  return ApplicationStatus.OPEN;
}

// Generate unique RR number in format RR-YYYY-NNNN
function generateRRNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `RR-${year}-${random}`;
}

// Generate random date within last 3 months
function getRandomDate(daysBack = 90) {
  const now = new Date();
  const pastDate = new Date(
    now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000
  );
  return pastDate;
}

// Sample workflow comments
const WORKFLOW_COMMENTS = [
  "Application received and under review",
  "Documents verified successfully",
  "Additional documents required",
  "Field verification completed",
  "Application approved and processed",
  "Certificate issued",
  "Application forwarded to concerned officer",
  "Technical evaluation completed",
  "Legal verification done",
  "Final approval granted",
  "Application reopened for correction",
  "Missing documents submitted",
  "Query resolved",
  "Site inspection completed",
];

async function main() {
  console.log("🌱 Seeding applications...");

  try {
    // Get existing data
    const serviceCategories = await prisma.serviceCategory.findMany();
    const officers = await prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.DC,
            UserRole.ADC_GTK,
            UserRole.ADC_HQ,
            UserRole.ADC,
            UserRole.SDM_GTK,
            UserRole.SDM_HQ,
            UserRole.SDM,
            UserRole.AC,
            UserRole.DPO_DDMA,
            UserRole.DD_REV,
            UserRole.DD_ACQ,
            UserRole.US_ADM,
            UserRole.AO,
            UserRole.TO_DDMA,
            UserRole.AD_IT,
            UserRole.US_ELECTION,
            UserRole.OS_COI_RC,
            UserRole.OS_RC,
            UserRole.RI_LEGAL,
          ],
        },
      },
      include: {
        officerProfile: true,
      },
    });

    const frontdeskUsers = await prisma.user.findMany({
      where: { role: UserRole.FRONT_DESK },
    });

    if (serviceCategories.length === 0) {
      console.log(
        "❌ No service categories found. Please run the main seed first."
      );
      return;
    }

    if (officers.length === 0) {
      console.log("❌ No officers found. Please run the main seed first.");
      return;
    }

    if (frontdeskUsers.length === 0) {
      console.log(
        "❌ No frontdesk users found. Please run the main seed first."
      );
      return;
    }

    console.log(`📋 Found ${serviceCategories.length} service categories`);
    console.log(`👥 Found ${officers.length} officers`);
    console.log(`🏢 Found ${frontdeskUsers.length} frontdesk users`);

    // Generate applications for each status
    const statusCounts = {};
    const totalApplications = Math.floor(Math.random() * 50) + 80; // 80-130 applications

    console.log(`🎯 Creating ${totalApplications} applications...`);

    for (let i = 0; i < totalApplications; i++) {
      const citizen =
        SAMPLE_CITIZENS[Math.floor(Math.random() * SAMPLE_CITIZENS.length)];
      const serviceCategory =
        serviceCategories[Math.floor(Math.random() * serviceCategories.length)];
      const status = getRandomStatus();
      const officer = officers[Math.floor(Math.random() * officers.length)];
      const frontdesk =
        frontdeskUsers[Math.floor(Math.random() * frontdeskUsers.length)];

      // Count status distribution
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const submittedAt = getRandomDate(90);
      const validatedAt =
        status !== ApplicationStatus.DRAFT
          ? new Date(
              submittedAt.getTime() + Math.random() * 24 * 60 * 60 * 1000
            )
          : null;

      let completedAt = null;
      if (
        [ApplicationStatus.RESOLVED, ApplicationStatus.CLOSED].includes(status)
      ) {
        completedAt = new Date(
          validatedAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
        );
      }

      // Select appropriate subject
      const categorySubjects =
        SUBJECTS[serviceCategory.name] || SUBJECTS["Revenue Certificate"];
      const subject =
        categorySubjects[Math.floor(Math.random() * categorySubjects.length)];

      try {
        // Create application
        const application = await prisma.application.create({
          data: {
            rrNumber:
              status !== ApplicationStatus.DRAFT ? generateRRNumber() : null,
            serviceCategoryId: serviceCategory.id,
            subject,
            citizenName: citizen.name,
            citizenPhone: citizen.phone,
            citizenEmail: citizen.email,
            citizenAddress: citizen.address,
            citizenGender: citizen.gender,
            citizenAadhaar: citizen.aadhaar,
            status,
            currentHolderId: [
              ApplicationStatus.IN_PROGRESS,
              ApplicationStatus.REOPENED,
            ].includes(status)
              ? officer.id
              : null,
            submittedAt,
            validatedAt,
            completedAt,
            createdAt: submittedAt,
            updatedAt: completedAt || validatedAt || submittedAt,
          },
        });

        // Create workflow entries
        const workflowEntries = [];

        // Always start with PENDING status
        workflowEntries.push({
          applicationId: application.id,
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.PENDING,
          changedById: frontdesk.id,
          comments: "Application submitted by citizen",
          createdAt: submittedAt,
        });

        if (status !== ApplicationStatus.PENDING) {
          // Add VALIDATED status
          workflowEntries.push({
            applicationId: application.id,
            fromStatus: ApplicationStatus.PENDING,
            toStatus: ApplicationStatus.VALIDATED,
            changedById: frontdesk.id,
            comments: `RR Number ${application.rrNumber} assigned`,
            createdAt: validatedAt,
          });
        }

        if (
          [
            ApplicationStatus.OPEN,
            ApplicationStatus.IN_PROGRESS,
            ApplicationStatus.RESOLVED,
            ApplicationStatus.CLOSED,
            ApplicationStatus.REOPENED,
          ].includes(status)
        ) {
          // Add OPEN status
          workflowEntries.push({
            applicationId: application.id,
            fromStatus: ApplicationStatus.VALIDATED,
            toStatus: ApplicationStatus.OPEN,
            changedById: frontdesk.id,
            comments: "Application in queue for officer assignment",
            createdAt: new Date(
              validatedAt.getTime() + Math.random() * 2 * 60 * 60 * 1000
            ),
          });
        }

        if (
          [
            ApplicationStatus.IN_PROGRESS,
            ApplicationStatus.RESOLVED,
            ApplicationStatus.CLOSED,
            ApplicationStatus.REOPENED,
          ].includes(status)
        ) {
          // Add IN_PROGRESS status
          const inProgressTime = new Date(
            validatedAt.getTime() + Math.random() * 24 * 60 * 60 * 1000
          );
          workflowEntries.push({
            applicationId: application.id,
            fromStatus: ApplicationStatus.OPEN,
            toStatus: ApplicationStatus.IN_PROGRESS,
            changedById: officer.id,
            comments:
              WORKFLOW_COMMENTS[
                Math.floor(Math.random() * WORKFLOW_COMMENTS.length)
              ],
            createdAt: inProgressTime,
          });

          // Create officer assignment
          await prisma.officerAssignment.create({
            data: {
              applicationId: application.id,
              assignedById: frontdesk.id,
              assignedToId: officer.id,
              priority: Math.floor(Math.random() * 3) + 1, // 1-3
              instructions: `Please process ${subject.toLowerCase()}`,
              createdAt: inProgressTime,
            },
          });
        }

        if (
          [ApplicationStatus.RESOLVED, ApplicationStatus.CLOSED].includes(
            status
          )
        ) {
          // Add final status
          workflowEntries.push({
            applicationId: application.id,
            fromStatus: ApplicationStatus.IN_PROGRESS,
            toStatus: status,
            changedById: officer.id,
            comments:
              status === ApplicationStatus.RESOLVED
                ? "Application processed successfully"
                : "Application closed as per requirements",
            createdAt: completedAt,
          });
        }

        if (status === ApplicationStatus.REOPENED) {
          // Add RESOLVED first
          const resolvedTime = new Date(
            validatedAt.getTime() + Math.random() * 20 * 24 * 60 * 60 * 1000
          );
          workflowEntries.push({
            applicationId: application.id,
            fromStatus: ApplicationStatus.IN_PROGRESS,
            toStatus: ApplicationStatus.RESOLVED,
            changedById: officer.id,
            comments: "Application initially resolved",
            createdAt: resolvedTime,
          });

          // Then add REOPENED
          workflowEntries.push({
            applicationId: application.id,
            fromStatus: ApplicationStatus.RESOLVED,
            toStatus: ApplicationStatus.REOPENED,
            changedById: officer.id,
            comments: "Application reopened for additional processing",
            createdAt: new Date(
              resolvedTime.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000
            ),
          });
        }

        // Create all workflow entries
        await prisma.applicationWorkflow.createMany({
          data: workflowEntries,
        });

        // Create validation record if validated
        if (application.rrNumber) {
          await prisma.applicationValidation.create({
            data: {
              applicationId: application.id,
              validatedById: frontdesk.id,
              rrNumber: application.rrNumber,
              isDocumentsComplete: true,
              isEligibilityVerified: true,
              validationNotes:
                "All documents verified and application validated",
              createdAt: validatedAt,
            },
          });
        }

        if (i % 10 === 0) {
          console.log(`✅ Created ${i + 1}/${totalApplications} applications`);
        }
      } catch (error) {
        console.error(`❌ Error creating application ${i + 1}:`, error.message);
      }
    }

    console.log("\n📊 Application Status Distribution:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log("\n🎉 Application seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding applications:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
