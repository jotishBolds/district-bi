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
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email && !credentials?.identifier) {
          return null;
        }

        const identifier = credentials.email || credentials.identifier;

        // Special case for OTP verification
        if (credentials.password === "verified-by-otp") {
          console.log("🔐 Processing OTP verification signin for:", identifier);

          // Determine if identifier is email or phone
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

          let user;
          if (isEmail) {
            user = await prisma.user.findUnique({
              where: { email: identifier },
              include: {
                officerProfile: {
                  select: { fullName: true, designation: true },
                },
                citizenProfile: {
                  select: { fullName: true },
                },
              },
            });
          } else {
            // Clean phone number for consistent format
            const cleanPhone = identifier.replace(/[\s\-\(\)]/g, "");
            user = await prisma.user.findUnique({
              where: { phone: cleanPhone },
              include: {
                officerProfile: {
                  select: { fullName: true, designation: true },
                },
                citizenProfile: {
                  select: { fullName: true },
                },
              },
            });
          }

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

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        const isPhone = /^[+]?[\d\s\-\(\)]{10,15}$/.test(identifier);

        let user;

        if (isEmail) {
          user = await prisma.user.findUnique({
            where: {
              email: identifier,
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
        } else if (isPhone) {
          // Clean phone number for consistent format
          const cleanPhone = identifier.replace(/[\s\-\(\)]/g, "");
          user = await prisma.user.findUnique({
            where: {
              phone: cleanPhone,
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
        } else {
          return null;
        }

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
            identifier: isEmail ? user.email : user.phone || user.email, // Use phone for phone login, email as fallback
            token: otp,
            expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            type: "LOGIN_OTP",
            // Store user ID securely for session creation after OTP verification
            metadata: JSON.stringify({
              userId: user.id,
              preAuthValidated: true,
              timestamp: Date.now(),
              phone: user.phone, // Include phone for enhanced verification
              email: user.email, // Include email for enhanced verification
              loginMethod: isEmail ? "email" : "phone",
            }),
          },
        });

        // Mask email for secure logging
        const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
        const maskedPhone = user.phone ? `****${user.phone.slice(-4)}` : "N/A";

        // Log OTP event without sensitive data
        console.log(
          `[AUTH] Login OTP sent to: ${maskedEmail} / ${maskedPhone}`
        );

        // Send OTP email using the sendLoginOTPEmail function
        try {
          const { sendLoginOTPEmail } = await import("@/lib/mail");
          await sendLoginOTPEmail(user.email, otp);
          console.log("[AUTH] Login OTP email delivered");
        } catch (emailError) {
          console.error("[AUTH] Failed to send login OTP email");
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
              console.log("[AUTH] Login OTP SMS delivered");
              // Update SMS OTP status to SENT
              await prisma.smsOtp.updateMany({
                where: { phone: user.phone, otp, type: "LOGIN_OTP" },
                data: {
                  status: "SENT",
                  providerResponse: JSON.stringify(smsResult.raw),
                },
              });
            } else {
              console.error("[AUTH] Failed to send login OTP SMS");
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
            console.error("[AUTH] SMS OTP delivery error");
            // Update SMS OTP status to FAILED if it was created
            try {
              await prisma.smsOtp.updateMany({
                where: { phone: user.phone, otp, type: "LOGIN_OTP" },
                data: { status: "FAILED" },
              });
            } catch (updateError) {
              console.error("[AUTH] Failed to update SMS OTP status");
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

      // Clear OTP verification requirement after successful OTP verification
      if (
        token.requiresOtpVerification &&
        user?.requiresOtpVerification === false
      ) {
        token.requiresOtpVerification = false;
        token.requiresOtp = false;
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
    // Security: Reduced session duration for government application
    // 24 hours for regular sessions (can be extended with "remember me" feature)
    maxAge: 24 * 60 * 60, // 24 hours (reduced from 30 days)
    // Update session on activity
    updateAge: 60 * 60, // Update session every hour
  },
  // Use secure cookies in production
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Disable debug in production
  debug: false,
};

import { getServerSession } from "next-auth";

export const getServerAuthSession = async () => {
  return await getServerSession(authOptions);
};
