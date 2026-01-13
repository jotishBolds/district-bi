// lib/officer-roles.ts
import { UserRole } from "@/app/generated/prisma";

export interface OfficerRoleMapping {
  role: UserRole;
  level: number;
  fullName: string;
  shortDesignation: string;
  defaultSection: string;
  userType: "Officer" | "Official" | "Admin";
  isLegacy?: boolean; // For backward compatibility
}

export const OFFICER_ROLE_MAPPINGS: Record<UserRole, OfficerRoleMapping> = {
  // Level 0 - Highest Priority
  [UserRole.DC]: {
    role: UserRole.DC,
    level: 0,
    fullName: "District Collector",
    shortDesignation: "DC",
    defaultSection: "Office of the District Collector",
    userType: "Officer",
  },

  // Level 1
  [UserRole.ADC_GTK]: {
    role: UserRole.ADC_GTK,
    level: 1,
    fullName: "Additional District Collector (Gangtok)",
    shortDesignation: "ADC(Gtk)",
    defaultSection: "Office of the Additional District Collector (Gangtok)",
    userType: "Officer",
  },
  [UserRole.ADC_HQ]: {
    role: UserRole.ADC_HQ,
    level: 1,
    fullName: "Additional District Collector (HQ)",
    shortDesignation: "ADC (HQ)",
    defaultSection: "Office of the Additional District Collector (HQ)",
    userType: "Officer",
  },

  // Level 2
  [UserRole.SDM_GTK]: {
    role: UserRole.SDM_GTK,
    level: 2,
    fullName: "Subdivisional Magistrate (Gangtok)",
    shortDesignation: "SDM (Gtk)",
    defaultSection: "Office of the Subdivisional Magistrate (Gangtok)",
    userType: "Officer",
  },
  [UserRole.SDM_HQ]: {
    role: UserRole.SDM_HQ,
    level: 2,
    fullName: "Subdivisional Magistrate (HQ)",
    shortDesignation: "SDM (HQ)",
    defaultSection: "Office of the Subdivisional Magistrate (HQ)",
    userType: "Officer",
  },

  // Level 3
  [UserRole.AC]: {
    role: UserRole.AC,
    level: 3,
    fullName: "Assistant Collector",
    shortDesignation: "AC",
    defaultSection: "Office of the Assistant Collector",
    userType: "Officer",
  },

  // Level 4
  [UserRole.DPO_DDMA]: {
    role: UserRole.DPO_DDMA,
    level: 4,
    fullName: "Joint Director",
    shortDesignation: "DPO(DDMA)",
    defaultSection: "DDMA Section",
    userType: "Officer",
  },
  [UserRole.DD_REV]: {
    role: UserRole.DD_REV,
    level: 4,
    fullName: "Deputy Director (Revenue)",
    shortDesignation: "DD(Rev)",
    defaultSection: "Revenue Section",
    userType: "Officer",
  },
  [UserRole.DD_ACQ]: {
    role: UserRole.DD_ACQ,
    level: 4,
    fullName: "Deputy Director (Acquisition)",
    shortDesignation: "DD(Acq)",
    defaultSection: "Acquisition Section",
    userType: "Officer",
  },

  // Level 5
  [UserRole.US_ADM]: {
    role: UserRole.US_ADM,
    level: 5,
    fullName: "Under Secretary (Administration)",
    shortDesignation: "US(Adm)",
    defaultSection: "General Section",
    userType: "Officer",
  },
  [UserRole.AO]: {
    role: UserRole.AO,
    level: 5,
    fullName: "Accounts Officer",
    shortDesignation: "AO",
    defaultSection: "Accounts Section",
    userType: "Officer",
  },
  [UserRole.TO_DDMA]: {
    role: UserRole.TO_DDMA,
    level: 5,
    fullName: "Training Officer",
    shortDesignation: "TO (DDMA)",
    defaultSection: "DDMA Section",
    userType: "Officer",
  },
  [UserRole.AD_IT]: {
    role: UserRole.AD_IT,
    level: 5,
    fullName: "Assistant Director (IT)",
    shortDesignation: "AD(IT)",
    defaultSection: "IT Section",
    userType: "Officer",
  },
  [UserRole.US_ELECTION]: {
    role: UserRole.US_ELECTION,
    level: 5,
    fullName: "Under Secretary (Election)",
    shortDesignation: "US (Election)",
    defaultSection: "Election Section",
    userType: "Officer",
  },

  // Level 6 - Lowest Priority
  [UserRole.OS_COI_RC]: {
    role: UserRole.OS_COI_RC,
    level: 6,
    fullName: "Office Superintendent",
    shortDesignation: "OS(COI & RC)",
    defaultSection: "COI & RC Section",
    userType: "Officer",
  },
  [UserRole.OS_RC]: {
    role: UserRole.OS_RC,
    level: 6,
    fullName: "Office Superintendent",
    shortDesignation: "OS (RC)",
    defaultSection: "Registration Section",
    userType: "Officer",
  },
  [UserRole.RI_LEGAL]: {
    role: UserRole.RI_LEGAL,
    level: 6,
    fullName: "Revenue Inspector",
    shortDesignation: "RI (Legal)",
    defaultSection: "Peshkar Section",
    userType: "Officer",
  },

  // Legacy roles for backward compatibility
  [UserRole.ADC]: {
    role: UserRole.ADC,
    level: 1,
    fullName: "Additional District Collector",
    shortDesignation: "ADC",
    defaultSection: "Office of the Additional District Collector",
    userType: "Officer",
    isLegacy: true,
  },
  [UserRole.SDM]: {
    role: UserRole.SDM,
    level: 2,
    fullName: "Subdivisional Magistrate",
    shortDesignation: "SDM",
    defaultSection: "Office of the Subdivisional Magistrate",
    userType: "Officer",
    isLegacy: true,
  },
  [UserRole.RO]: {
    role: UserRole.RO,
    level: 4,
    fullName: "Revenue Officer",
    shortDesignation: "RO",
    defaultSection: "Revenue Section",
    userType: "Officer",
    isLegacy: true,
  },
  [UserRole.DYDIR]: {
    role: UserRole.DYDIR,
    level: 4,
    fullName: "Deputy Director",
    shortDesignation: "DYDIR",
    defaultSection: "General Section",
    userType: "Officer",
    isLegacy: true,
  },

  // Level 7 - Dealing Hands (Under Level 7, same dashboard as officers)
  [UserRole.DEALING_HAND]: {
    role: UserRole.DEALING_HAND,
    level: 7,
    fullName: "Dealing Hand",
    shortDesignation: "DH",
    defaultSection: "General Section",
    userType: "Officer", // Same as other officers - can receive and forward applications
  },

  // Administrative roles
  [UserRole.FRONT_DESK]: {
    role: UserRole.FRONT_DESK,
    level: 8, // Lower than officers for hierarchy
    fullName: "Front Desk Officer",
    shortDesignation: "FD",
    defaultSection: "Front Desk",
    userType: "Official",
  },
  // DISPATCH_HANDLER is hidden/deprecated - kept for backward compatibility
  [UserRole.DISPATCH_HANDLER]: {
    role: UserRole.DISPATCH_HANDLER,
    level: 8, // Same as frontdesk level for support roles
    fullName: "Dispatch Handler",
    shortDesignation: "DH",
    defaultSection: "Dispatch Section",
    userType: "Official",
    isLegacy: true, // Mark as legacy to hide from UI
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    level: -1, // Special level for admin
    fullName: "Administrator",
    shortDesignation: "ADMIN",
    defaultSection: "Administration",
    userType: "Admin",
  },
  [UserRole.SUPER_ADMIN]: {
    role: UserRole.SUPER_ADMIN,
    level: -2, // Highest privilege
    fullName: "Super Administrator",
    shortDesignation: "SUPER_ADMIN",
    defaultSection: "System Administration",
    userType: "Admin",
  },
};

export const DEFAULT_SECTIONS = [
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
  {
    name: "Dispatch Section",
    description: "Application dispatch and final delivery",
  },
  { name: "Administration", description: "System administration" },
  {
    name: "System Administration",
    description: "Super administrator functions",
  },
];

// Helper functions
export function getRoleMapping(role: UserRole): OfficerRoleMapping | null {
  return OFFICER_ROLE_MAPPINGS[role] || null;
}

export function getOfficerRoles(): UserRole[] {
  return Object.values(UserRole).filter((role) => {
    const mapping = OFFICER_ROLE_MAPPINGS[role];
    return mapping?.userType === "Officer";
  });
}

export function getAllRoles(): UserRole[] {
  return Object.values(UserRole);
}

export function getRolesByLevel(): Record<number, UserRole[]> {
  const rolesByLevel: Record<number, UserRole[]> = {};

  Object.values(UserRole).forEach((role) => {
    const mapping = OFFICER_ROLE_MAPPINGS[role];
    const level = mapping.level;

    if (!rolesByLevel[level]) {
      rolesByLevel[level] = [];
    }
    rolesByLevel[level].push(role);
  });

  return rolesByLevel;
}

/**
 * Get roles grouped by level, excluding legacy roles
 * This is useful for UI dropdowns where we don't want to show deprecated roles
 */
export function getNonLegacyRolesByLevel(): Record<number, UserRole[]> {
  const rolesByLevel: Record<number, UserRole[]> = {};

  Object.values(UserRole).forEach((role) => {
    const mapping = OFFICER_ROLE_MAPPINGS[role];
    // Skip legacy roles
    if (mapping?.isLegacy) return;

    const level = mapping.level;

    if (!rolesByLevel[level]) {
      rolesByLevel[level] = [];
    }
    rolesByLevel[level].push(role);
  });

  return rolesByLevel;
}

export function isOfficerRole(role: UserRole): boolean {
  const mapping = OFFICER_ROLE_MAPPINGS[role];
  return mapping?.userType === "Officer";
}

export function isOfficialRole(role: UserRole): boolean {
  const mapping = OFFICER_ROLE_MAPPINGS[role];
  return mapping?.userType === "Official";
}

export function isOfficerOrOfficial(role: UserRole): boolean {
  const mapping = OFFICER_ROLE_MAPPINGS[role];
  return mapping?.userType === "Officer" || mapping?.userType === "Official";
}

export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function getLevelPriority(role: UserRole): number {
  const mapping = OFFICER_ROLE_MAPPINGS[role];
  return mapping?.level ?? 0;
}

export function canAssignTo(fromRole: UserRole, toRole: UserRole): boolean {
  const fromLevel = getLevelPriority(fromRole);
  const toLevel = getLevelPriority(toRole);

  // Admins can assign to anyone
  if (isAdminRole(fromRole)) return true;

  // Officers can only assign to same or lower level
  return fromLevel <= toLevel;
}

/**
 * Get all officer roles as an array for use in Prisma queries
 * Excludes administrative and front desk roles
 */
export function getAllOfficerRoles(): UserRole[] {
  return Object.values(UserRole).filter((role) => {
    const mapping = OFFICER_ROLE_MAPPINGS[role];
    return mapping?.userType === "Officer" || mapping?.userType === "Official";
  });
}

/**
 * Get only actual officer roles for forwarding (excludes front desk and admin roles)
 */
export function getForwardableOfficerRoles(): UserRole[] {
  return Object.values(UserRole).filter((role) => {
    const mapping = OFFICER_ROLE_MAPPINGS[role];
    // Only include Officer type, exclude Official (front desk) and Admin
    return mapping?.userType === "Officer";
  });
}
