import { UserRole } from "@/app/generated/prisma";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    needsOtp: boolean;
    requiresOtpVerification?: boolean;
    level?: number | null;
    fullName?: string;
    designation?: string;
  }

  interface Session {
    user: User & {
      id: string;
      email: string;
      role: UserRole;
      isActive: boolean;
      level?: number | null;
      fullName?: string;
      designation?: string;
    };
    requiresOtp: boolean;
    requiresOtpVerification?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    requiresOtp: boolean;
    requiresOtpVerification?: boolean;
    level?: number | null;
    fullName?: string;
    designation?: string;
  }
}
