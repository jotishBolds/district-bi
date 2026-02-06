// SAMADHAN Module - Core Utilities and Helper Functions
import prisma from "./prisma";
import {
  SamadhanQueryType,
  SamadhanPriority,
  SamadhanTicketStatus,
  SamadhanSubmissionChannel,
} from "../app/generated/prisma";

// Default SLA configurations in hours (SUGGESTION kept for backward compatibility with DB enum)
export const DEFAULT_SLA_CONFIG: Record<
  string,
  Record<SamadhanPriority, number>
> = {
  FEEDBACK: {
    LOW: 72, // 3 days
    MEDIUM: 72, // 3 days
    HIGH: 72, // 3 days
  },
  GRIEVANCE: {
    LOW: 504, // 21 days
    MEDIUM: 336, // 14 days
    HIGH: 168, // 7 days
  },
};

/**
 * Generate unique reference ID for SAMADHAN ticket
 * Format: SAMADHAN-YYYY-MM-DD-XXXXX
 */
export async function generateSamadhanReferenceId(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const dateOnly = new Date(dateStr);

  // Get or create daily sequence
  const sequence = await prisma.samadhanDailySequence.upsert({
    where: { date: dateOnly },
    update: { lastSequence: { increment: 1 } },
    create: { date: dateOnly, lastSequence: 1 },
  });

  const sequenceNum = sequence.lastSequence.toString().padStart(5, "0");
  return `SAMADHAN-${dateStr}-${sequenceNum}`;
}

/**
 * Generate pseudonym for anonymous citizens
 * Creates unique, friendly names like "Brave Tiger 7824"
 */
export function generateCitizenPseudonym(): string {
  const adjectives = [
    "Brave",
    "Swift",
    "Kind",
    "Wise",
    "Noble",
    "Gentle",
    "Bold",
    "Calm",
    "Fair",
    "Keen",
    "Bright",
    "Strong",
    "Pure",
    "Humble",
    "True",
    "Grand",
    "Quick",
    "Sharp",
    "Warm",
    "Cool",
    "Proud",
    "Just",
    "Clear",
    "Deep",
  ];

  const nouns = [
    "Tiger",
    "Eagle",
    "Lotus",
    "River",
    "Mountain",
    "Star",
    "Phoenix",
    "Dragon",
    "Peacock",
    "Lion",
    "Falcon",
    "Oak",
    "Pine",
    "Moon",
    "Sun",
    "Cloud",
    "Hawk",
    "Bear",
    "Deer",
    "Crane",
    "Rose",
    "Jade",
    "Pearl",
    "Orchid",
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  return `${randomAdjective} ${randomNoun} ${randomNum}`;
}

/**
 * Calculate SLA deadline based on query type and priority
 */
export async function calculateSLADeadline(
  queryType: SamadhanQueryType,
  priority: SamadhanPriority,
): Promise<Date> {
  // Try to get custom SLA config from database
  const customConfig = await prisma.samadhanSLAConfig.findUnique({
    where: {
      queryType_priority: { queryType, priority },
    },
  });

  const slaHours =
    customConfig?.slaHours ?? DEFAULT_SLA_CONFIG[queryType][priority];
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}

/**
 * Find officer with lowest workload in a section
 */
export async function findAvailableOfficer(
  sectionId: string,
): Promise<string | null> {
  // Get all officers in the section
  const officers = await prisma.officerProfile.findMany({
    where: {
      sectionId,
      isAvailable: true,
      user: { isActive: true },
    },
    include: {
      user: {
        include: {
          samadhanTicketsAsOfficer: {
            where: {
              status: {
                notIn: ["CLOSED", "RESOLVED", "CLOSED_NO_RESPONSE"],
              },
            },
          },
        },
      },
    },
  });

  if (officers.length === 0) return null;

  // Find officer with minimum open tickets
  let minTickets = Infinity;
  let selectedOfficer: string | null = null;

  for (const officer of officers) {
    const openTickets = officer.user.samadhanTicketsAsOfficer.length;
    if (openTickets < minTickets) {
      minTickets = openTickets;
      selectedOfficer = officer.userId;
    }
  }

  return selectedOfficer;
}

/**
 * Get SLA status indicator (GREEN, YELLOW, RED)
 * Returns N/A for closed tickets or APPEALED tickets (SLA paused for appeals)
 */
export function getSLAStatus(
  slaDeadline: Date | null,
  status: SamadhanTicketStatus,
): "GREEN" | "YELLOW" | "RED" | "N/A" {
  // SLA is N/A for closed/resolved tickets
  if (
    !slaDeadline ||
    ["CLOSED", "RESOLVED", "CLOSED_NO_RESPONSE"].includes(status)
  ) {
    return "N/A";
  }

  // SLA is paused/N/A for APPEALED tickets (original officer shouldn't be penalized)
  if (status === "APPEALED") {
    return "N/A";
  }

  const now = new Date();
  const hoursRemaining =
    (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining < 0) return "RED";
  if (hoursRemaining < 48) return "YELLOW";
  return "GREEN";
}

/**
 * Mask phone number for anonymous display
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return "XXXXXXXXXX";
  return phone.substring(0, 2) + "XXXXXX" + phone.substring(phone.length - 2);
}

/**
 * Mask email for anonymous display
 */
export function maskEmail(email: string): string {
  if (!email) return "****@****.***";
  const [local, domain] = email.split("@");
  if (!domain) return "****@****.***";
  const maskedLocal = local.substring(0, 2) + "****";
  return `${maskedLocal}@${domain}`;
}

/**
 * Check if ticket can be edited by officer
 */
export function canOfficerEditTicket(
  status: SamadhanTicketStatus,
  isEscalated: boolean,
): boolean {
  if (isEscalated) return false;
  const editableStatuses: SamadhanTicketStatus[] = [
    "UNSEEN",
    "SEEN",
    "ACKNOWLEDGED",
    "IN_PROGRESS",
    "PENDING_INFORMATION",
  ];
  return editableStatuses.includes(status);
}

/**
 * Validate attachment file type and size
 */
export function validateAttachment(
  fileName: string,
  fileSize: number,
  mimeType: string,
): { valid: boolean; error?: string } {
  const allowedTypes = {
    "image/jpeg": 5 * 1024 * 1024, // 5MB
    "image/png": 5 * 1024 * 1024,
    "image/gif": 5 * 1024 * 1024,
    "application/pdf": 10 * 1024 * 1024, // 10MB
    "application/msword": 5 * 1024 * 1024,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      5 * 1024 * 1024,
    "application/vnd.ms-excel": 5 * 1024 * 1024,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      5 * 1024 * 1024,
    "video/mp4": 50 * 1024 * 1024, // 50MB
    "video/quicktime": 50 * 1024 * 1024,
  };

  const maxSize = allowedTypes[mimeType as keyof typeof allowedTypes];
  if (!maxSize) {
    return { valid: false, error: "File type not supported" };
  }

  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Get ticket statistics for dashboard
 */
export async function getTicketStatistics(
  officerId?: string,
  sectionId?: string,
) {
  const where: Record<string, string> = {};
  if (officerId) where.assignedOfficerId = officerId;
  if (sectionId) where.sectionId = sectionId;

  // Only count grievance tickets in officer statistics
  const grievanceWhere = { ...where, queryType: "GRIEVANCE" as const };

  const [total, unseen, inProgress, resolved, overdue] = await Promise.all([
    prisma.samadhanTicket.count({ where: grievanceWhere }),
    prisma.samadhanTicket.count({
      where: { ...grievanceWhere, status: "UNSEEN" },
    }),
    prisma.samadhanTicket.count({
      where: {
        ...grievanceWhere,
        status: {
          in: ["SEEN", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING_INFORMATION"],
        },
      },
    }),
    prisma.samadhanTicket.count({
      where: { ...grievanceWhere, status: { in: ["RESOLVED", "CLOSED"] } },
    }),
    prisma.samadhanTicket.count({
      where: {
        ...grievanceWhere,
        status: { notIn: ["CLOSED", "RESOLVED", "CLOSED_NO_RESPONSE"] },
        slaDeadline: { lt: new Date() },
      },
    }),
  ]);

  return { total, unseen, inProgress, resolved, overdue };
}

export type SamadhanTicketWithRelations = Awaited<
  ReturnType<typeof prisma.samadhanTicket.findUnique>
> & {
  section: { id: string; name: string };
  assignedOfficer?: { id: string; officerProfile: { fullName: string } };
  attachments: Array<{ id: string; fileName: string; fileType: string }>;
};
