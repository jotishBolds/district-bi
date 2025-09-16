import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { UserRole } from "../app/generated/prisma";
import { generateOTP } from "./utils";
// Removed sendOTPEmail import since we're console logging

const prisma = require("./prisma").default;

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // Special case for OTP verification
        if (credentials.password === "verified-by-otp") {
          console.log(
            "🔐 Processing OTP verification signin for:",
            credentials.email
          );

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              officerProfile: {
                select: { fullName: true, designation: true },
              },
              citizenProfile: {
                select: { fullName: true },
              },
            },
          });

          if (!user || !user.isActive) {
            console.log("❌ User not found or inactive:", {
              found: !!user,
              isActive: user?.isActive,
            });
            return null;
          }

          console.log("✅ User found and active, creating session");

          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            needsOtp: false,
            requiresOtpVerification: false, // Clear the OTP verification flag
            level: user.level,
            fullName:
              user.officerProfile?.fullName || user.citizenProfile?.fullName,
            designation: user.officerProfile?.designation,
          };
        }

        // Normal password login flow
        if (!credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            officerProfile: {
              select: { fullName: true, designation: true },
            },
            citizenProfile: {
              select: { fullName: true },
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        if (!user.isActive) {
          throw new Error("Account is inactive");
        }

        // Generate and store OTP with user credentials for later verification
        const otp = generateOTP();

        // Store OTP verification token with pre-auth data
        await prisma.verificationToken.create({
          data: {
            identifier: user.email,
            token: otp,
            expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            type: "LOGIN_OTP",
            // Store user ID securely for session creation after OTP verification
            metadata: JSON.stringify({
              userId: user.id,
              preAuthValidated: true,
              timestamp: Date.now(),
              phone: user.phone, // Include phone for enhanced verification
            }),
          },
        });

        // Always log to console and send OTP email
        console.log("=".repeat(50));
        console.log("🔐 LOGIN OTP GENERATED");
        console.log("📧 EMAIL:", user.email);
        console.log("� PHONE:", user.phone || "Not provided");
        console.log("�🔐 OTP CODE:", otp);
        console.log("⏰ EXPIRES IN: 10 minutes");
        console.log("=".repeat(50));

        // Send OTP email using the sendLoginOTPEmail function
        try {
          const { sendLoginOTPEmail } = await import("@/lib/mail");
          await sendLoginOTPEmail(user.email, otp);
          console.log("✅ LOGIN OTP EMAIL SENT SUCCESSFULLY");
        } catch (emailError) {
          console.error("❌ Failed to send login OTP email:", emailError);
          // Don't fail the authentication if email sending fails
        }

        // Also send SMS OTP if user has a phone number
        if (user.phone) {
          try {
            const { sendSms, generateOTPMessage } = await import(
              "@/lib/thundersms.server"
            );
            const message = generateOTPMessage(otp, 10);

            // Store SMS OTP record
            await prisma.smsOtp.create({
              data: {
                phone: user.phone,
                otp,
                status: "SENT", // Will be updated based on actual send result
                type: "LOGIN_OTP",
                expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                attempts: 1,
              },
            });

            const smsResult = await sendSms(user.phone, message, {
              templateId: process.env.THUNDERSMS_TEMPLATE_ID,
              custRef: `login_${Date.now()}`,
            });

            if (smsResult.success) {
              console.log("✅ LOGIN OTP SMS SENT SUCCESSFULLY");
              // Update SMS OTP status to SENT
              await prisma.smsOtp.updateMany({
                where: { phone: user.phone, otp, type: "LOGIN_OTP" },
                data: {
                  status: "SENT",
                  providerResponse: JSON.stringify(smsResult.raw),
                },
              });
            } else {
              console.error("❌ Failed to send login OTP SMS:", smsResult.desc);
              // Update SMS OTP status to FAILED
              await prisma.smsOtp.updateMany({
                where: { phone: user.phone, otp, type: "LOGIN_OTP" },
                data: {
                  status: "FAILED",
                  providerResponse: JSON.stringify(smsResult.raw),
                },
              });
            }
          } catch (smsError) {
            console.error("❌ Failed to send login OTP SMS:", smsError);
            // Update SMS OTP status to FAILED if it was created
            try {
              await prisma.smsOtp.updateMany({
                where: { phone: user.phone, otp, type: "LOGIN_OTP" },
                data: { status: "FAILED" },
              });
            } catch (updateError) {
              console.error("❌ Failed to update SMS OTP status:", updateError);
            }
          }
        }

        // Return user with OTP required flag
        // This creates a temporary session that requires OTP verification
        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          needsOtp: true,
          requiresOtpVerification: true, // Special flag for middleware
          level: user.level,
          fullName:
            user.officerProfile?.fullName || user.citizenProfile?.fullName,
          designation: user.officerProfile?.designation,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-otp",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.isActive = user.isActive;
        token.requiresOtp = user.needsOtp || false;
        token.requiresOtpVerification =
          (user as { requiresOtpVerification?: boolean })
            .requiresOtpVerification || false;
        token.level = user.level;
        token.fullName = user.fullName;
        // Avoid 'any' by using a type guard
        if (typeof user === "object" && "designation" in user) {
          token.designation = (user as { designation?: string }).designation;
        } else {
          token.designation = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive;
        session.user.level = token.level;
        session.user.fullName = token.fullName;
        session.user.designation = token.designation;
        session.requiresOtp = token.requiresOtp;
        session.requiresOtpVerification = token.requiresOtpVerification;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

import { getServerSession } from "next-auth";

export const getServerAuthSession = async () => {
  return await getServerSession(authOptions);
};
