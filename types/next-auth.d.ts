import { UserRole } from "@/app/generated/prisma";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    needsOtp: boolean;
    fullName?: string;
  }

  interface Session {
    user: User & {
      id: string;
      email: string;
      role: UserRole;
      isActive: boolean;
      fullName?: string;
    };
    requiresOtp: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    requiresOtp: boolean;
    fullName?: string;
  }
}
