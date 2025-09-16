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

// SMS OTP types
export interface SmsOtpRecord {
  id: string;
  phone: string;
  otp: string;
  status: SmsOtpStatus;
  providerResponse?: string;
  type: SmsOtpType;
  attempts: number;
  isUsed: boolean;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum SmsOtpStatus {
  SENT = "SENT",
  FAILED = "FAILED",
  USED = "USED",
}

export enum SmsOtpType {
  VERIFICATION = "VERIFICATION",
  LOGIN = "LOGIN",
  PASSWORD_RESET = "PASSWORD_RESET",
}

// SMS API request/response types
export interface SendSmsRequest {
  phone: string;
  type?: SmsOtpType;
}

export interface SendSmsResponse {
  success: boolean;
  message: string;
  phone?: string;
  expiresIn?: number;
  otpId?: string;
  error?: string;
  details?: string;
}

export interface VerifySmsRequest {
  phone: string;
  otp: string;
}

export interface VerifySmsResponse {
  success: boolean;
  message: string;
  verified?: boolean;
  user?: {
    id: string;
    email: string;
    phone?: string;
    role: string;
    isActive: boolean;
    level?: number;
    fullName?: string;
    designation?: string;
  };
  error?: string;
  details?: string;
}

// ThunderSMS provider types
export interface ThunderSMSResponse {
  success: boolean;
  code: string;
  desc: string;
  raw: Record<string, unknown> | null;
}

export interface SendSmsOptions {
  templateId?: string;
  custRef?: string;
  msgType?: "PM" | "UC";
}

// OTP verification method types
export enum OtpMethod {
  EMAIL = "EMAIL",
  SMS = "SMS",
  BOTH = "BOTH",
}

export interface OtpVerificationProps {
  email?: string;
  phone?: string;
  type: string;
  method: OtpMethod;
  onVerified: () => void;
  onResend: () => void;
}
