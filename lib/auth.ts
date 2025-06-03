import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { UserRole } from "../app/generated/prisma";
import { generateOTP } from "./utils";
import { sendOTPEmail } from "./mail";
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
          const userRole = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: { role: true },
          });

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              citizenProfile:
                userRole?.role === UserRole.CITIZEN
                  ? {
                      select: { fullName: true },
                    }
                  : false,
            },
          });

          if (!user || !user.isActive) {
            return null;
          }

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
            fullName:
              user.role === UserRole.CITIZEN
                ? user.citizenProfile?.fullName
                : undefined,
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

        // Generate and store OTP
        const otp = generateOTP();

        await prisma.verificationToken.create({
          data: {
            identifier: user.email,
            token: otp,
            expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            type: "EMAIL_VERIFICATION",
          },
        });

        // Send OTP email
        await sendOTPEmail(user.email, otp);

        // Return user with a flag indicating OTP is required
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          needsOtp: true,
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
        token.fullName = user.fullName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive;
        session.user.fullName = token.fullName;
        session.requiresOtp = token.requiresOtp;
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

//console.log otp

// import { AuthOptions } from "next-auth";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import CredentialsProvider from "next-auth/providers/credentials";
// import { compare } from "bcryptjs";

// import { UserRole } from "../app/generated/prisma";
// import { generateOTP } from "./utils";
// // Removed sendOTPEmail import since we're console logging

// const prisma = require("./prisma").default;

// export const authOptions: AuthOptions = {
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "email" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email) {
//           return null;
//         }

//         // Special case for OTP verification
//         if (credentials.password === "verified-by-otp") {
//           const userRole = await prisma.user.findUnique({
//             where: { email: credentials.email },
//             select: { role: true },
//           });

//           const user = await prisma.user.findUnique({
//             where: {
//               email: credentials.email,
//             },
//             include: {
//               citizenProfile:
//                 userRole?.role === UserRole.CITIZEN
//                   ? {
//                       select: { fullName: true },
//                     }
//                   : false,
//             },
//           });

//           if (!user || !user.isActive) {
//             return null;
//           }

//           // Update last login time
//           await prisma.user.update({
//             where: { id: user.id },
//             data: { lastLoginAt: new Date() },
//           });

//           return {
//             id: user.id,
//             email: user.email,
//             role: user.role,
//             isActive: user.isActive,
//             needsOtp: false,
//             fullName:
//               user.role === UserRole.CITIZEN
//                 ? user.citizenProfile?.fullName
//                 : undefined,
//           };
//         }

//         // Normal password login flow
//         if (!credentials?.password) {
//           return null;
//         }

//         const user = await prisma.user.findUnique({
//           where: {
//             email: credentials.email,
//           },
//         });

//         if (!user || !user.passwordHash) {
//           return null;
//         }

//         const isPasswordValid = await compare(
//           credentials.password,
//           user.passwordHash
//         );

//         if (!isPasswordValid) {
//           return null;
//         }

//         if (!user.isActive) {
//           throw new Error("Account is inactive");
//         }

//         // Generate and store OTP
//         const otp = generateOTP();

//         await prisma.verificationToken.create({
//           data: {
//             identifier: user.email,
//             token: otp,
//             expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
//             type: "EMAIL_VERIFICATION",
//           },
//         });

//         // Console log OTP instead of sending email
//         console.log("=".repeat(50));
//         console.log("🔐 LOGIN OTP GENERATED");
//         console.log("📧 EMAIL:", user.email);
//         console.log("🔐 OTP CODE:", otp);
//         console.log("⏰ EXPIRES IN: 10 minutes");
//         console.log("=".repeat(50));

//         // Return user with a flag indicating OTP is required
//         return {
//           id: user.id,
//           email: user.email,
//           role: user.role,
//           isActive: user.isActive,
//           needsOtp: true,
//         };
//       },
//     }),
//   ],
//   pages: {
//     signIn: "/login",
//     error: "/login",
//     verifyRequest: "/verify-otp",
//   },
//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.id = user.id;
//         token.email = user.email;
//         token.role = user.role;
//         token.isActive = user.isActive;
//         token.requiresOtp = user.needsOtp || false;
//         token.fullName = user.fullName;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       if (token) {
//         session.user.id = token.id;
//         session.user.email = token.email;
//         session.user.role = token.role as UserRole;
//         session.user.isActive = token.isActive;
//         session.user.fullName = token.fullName;
//         session.requiresOtp = token.requiresOtp;
//       }
//       return session;
//     },
//   },
//   session: {
//     strategy: "jwt",
//     maxAge: 30 * 24 * 60 * 60, // 30 days
//   },
//   secret: process.env.NEXTAUTH_SECRET,
//   debug: process.env.NODE_ENV === "development",
// };

// import { getServerSession } from "next-auth";

// export const getServerAuthSession = async () => {
//   return await getServerSession(authOptions);
// };
