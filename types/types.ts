// lib/types.ts
export enum VerificationTokenType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
  PHONE_VERIFICATION = "PHONE_VERIFICATION",
}

// Section types
export interface Section {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extended User types with officer levels
export interface UserWithLevel {
  id: string;
  email: string;
  role: string;
  level?: number;
  isActive: boolean;
  officerProfile?: {
    fullName: string;
    designation: string;
    department: string;
    sectionId?: string;
    section?: Section;
  };
}

// Officer hierarchy types
export interface OfficerHierarchy {
  level: number;
  officers: UserWithLevel[];
}

export type UserType = "Officer" | "Official" | "Admin";
