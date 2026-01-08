/**
 * Shared Validation Schemas
 * Centralized Zod schemas for API input validation
 */

import { z } from "zod";

// ============================================
// Common Field Validators
// ============================================

/**
 * UUID validator
 */
export const uuidSchema = z
  .string()
  .uuid("Invalid ID format")
  .describe("UUID identifier");

/**
 * Email validator
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email too long")
  .transform((v) => v.toLowerCase().trim());

/**
 * Phone number validator (Indian format)
 */
export const phoneSchema = z
  .string()
  .regex(/^[+]?[0-9]{10,13}$/, "Invalid phone number")
  .transform((v) => v.replace(/[\s\-\(\)]/g, ""));

/**
 * Indian phone number (10 digits)
 */
export const indianPhoneSchema = z
  .string()
  .regex(/^[6-9][0-9]{9}$/, "Invalid Indian phone number")
  .length(10, "Phone number must be 10 digits");

/**
 * Password validator with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character"
  );

/**
 * OTP validator (6 digits)
 */
export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^[0-9]+$/, "OTP must contain only numbers");

/**
 * Safe text input (prevents XSS)
 */
export const safeTextSchema = z
  .string()
  .max(1000, "Text too long")
  .transform((v) => v.trim())
  .refine((v) => !/<script|javascript:|data:/i.test(v), {
    message: "Invalid characters in input",
  });

/**
 * Long text input for descriptions
 */
export const longTextSchema = z
  .string()
  .max(10000, "Text too long")
  .transform((v) => v.trim());

/**
 * Aadhaar number validator
 */
export const aadhaarSchema = z
  .string()
  .regex(/^[2-9][0-9]{11}$/, "Invalid Aadhaar number")
  .length(12, "Aadhaar must be 12 digits")
  .optional();

// ============================================
// Pagination Schema
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================
// Authentication Schemas
// ============================================

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  fullName: z
    .string()
    .min(2, "Name too short")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s.'-]+$/, "Invalid characters in name"),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  otp: otpSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
});

// ============================================
// Application Schemas
// ============================================

export const applicationIdSchema = z.object({
  applicationId: uuidSchema,
});

export const createApplicationSchema = z.object({
  serviceCategoryId: uuidSchema,
  citizenName: z.string().min(2).max(100),
  citizenPhone: phoneSchema,
  citizenEmail: emailSchema.optional(),
  citizenAddress: z.string().min(5).max(500),
  citizenGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  citizenAlternateNumber: phoneSchema.optional(),
  subject: z.string().min(5).max(500),
});

export const updateApplicationStatusSchema = z.object({
  applicationId: uuidSchema,
  status: z.enum([
    "DRAFT",
    "PENDING",
    "VALIDATED",
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
  ]),
  comments: safeTextSchema.optional(),
});

// ============================================
// Frontdesk Schemas
// ============================================

export const forwardApplicationSchema = z.object({
  applicationId: uuidSchema,
  toOfficerId: uuidSchema,
  instructions: safeTextSchema.optional(),
  priority: z.number().int().min(1).max(5).default(1),
});

export const assignOfficerSchema = z.object({
  applicationId: uuidSchema,
  assignedToId: uuidSchema,
  expectedCompletionDate: z.string().datetime().optional(),
  instructions: safeTextSchema.optional(),
});

// ============================================
// SAMADHAN Schemas
// ============================================

export const createTicketSchema = z.object({
  queryType: z.enum(["FEEDBACK", "GRIEVANCE", "SUGGESTION"]),
  sectionId: uuidSchema,
  description: longTextSchema.refine((v) => v.length >= 20, {
    message: "Description must be at least 20 characters",
  }),
  serviceAvailed: safeTextSchema.optional(),
  isAnonymous: z.boolean().default(false),
  citizenName: safeTextSchema.optional(),
  citizenEmail: emailSchema.optional(),
  citizenPhone: phoneSchema.optional(),
});

export const updateTicketSchema = z.object({
  ticketId: uuidSchema,
  status: z
    .enum([
      "UNSEEN",
      "SEEN",
      "ACKNOWLEDGED",
      "IN_PROGRESS",
      "PENDING_INFORMATION",
      "AWAITING_ESCALATION",
      "ESCALATED",
      "RESOLVED",
      "CLOSED",
      "CLOSED_NO_RESPONSE",
    ])
    .optional(),
  resolutionMessage: longTextSchema.optional(),
  assignedOfficerId: uuidSchema.optional(),
});

export const infoRequestSchema = z.object({
  ticketId: uuidSchema,
  description: longTextSchema,
  documentTypes: z.array(safeTextSchema).optional(),
  deadline: z.string().datetime(),
});

// ============================================
// Track Schemas
// ============================================

export const trackRequestSchema = z
  .object({
    identifier: z.string().min(1, "Application ID or RR number required"),
    phone: indianPhoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.phone || data.email, {
    message: "Either phone or email is required for verification",
    path: ["phone"],
  });

export const verifyTrackOtpSchema = z.object({
  identifier: z.string().min(1),
  otp: otpSchema,
  sessionToken: z.string().min(1),
});

// ============================================
// Admin Schemas
// ============================================

export const createUserSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  role: z.enum([
    "CITIZEN",
    "FRONT_DESK",
    "DC",
    "ADC",
    "RO",
    "SDM",
    "DYDIR",
    "ADMIN",
    "SUPER_ADMIN",
    "ADC_GTK",
    "ADC_HQ",
    "SDM_GTK",
    "SDM_HQ",
    "AC",
    "DPO_DDMA",
    "DD_REV",
    "DD_ACQ",
    "US_ADM",
    "AO",
    "TO_DDMA",
    "AD_IT",
    "US_ELECTION",
    "OS_COI_RC",
    "OS_RC",
    "RI_LEGAL",
    "DISPATCH_HANDLER",
  ]),
  fullName: z.string().min(2).max(100),
  designation: z.string().optional(),
  department: z.string().optional(),
  sectionId: uuidSchema.optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  userId: uuidSchema,
  isActive: z.boolean().optional(),
});

// ============================================
// Settings Schemas
// ============================================

export const updateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  applicationUpdates: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  profileVisibility: z
    .enum(["public", "private", "department_only"])
    .optional(),
  showContactInfo: z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["en", "hi", "ne"]).optional(),
  timezone: z.string().optional(),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
  itemsPerPage: z.number().int().min(10).max(100).optional(),
});

// ============================================
// File Upload Schema
// ============================================

export const fileUploadSchema = z.object({
  applicationId: uuidSchema,
  documentType: z.enum([
    "ID_PROOF",
    "ADDRESS_PROOF",
    "APPLICATION_FORM",
    "SUPPORTING_DOCUMENT",
    "PAYMENT_RECEIPT",
  ]),
});

// ============================================
// Helper Types
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TrackRequestInput = z.infer<typeof trackRequestSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
