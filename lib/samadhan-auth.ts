// SAMADHAN Citizen Authentication - Separate from Officer NextAuth
// Uses cookie-based session to avoid conflicts with officer authentication

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import prisma from "@/lib/prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SAMADHAN_JWT_SECRET || process.env.NEXTAUTH_SECRET || "samadhan-secret-key"
);

const SAMADHAN_SESSION_NAME = "samadhan-session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SamadhanSession {
  userId: string;
  phone: string;
  name: string;
  pseudonym: string;
  role: "CITIZEN";
  exp: number;
  iat: number;
}

/**
 * Create a SAMADHAN session token
 */
export async function createSamadhanSession(user: {
  id: string;
  phone: string;
  name: string;
  pseudonym: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const token = await new SignJWT({
    userId: user.id,
    phone: user.phone,
    name: user.name,
    pseudonym: user.pseudonym,
    role: "CITIZEN" as const,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION)
    .sign(SECRET_KEY);

  return token;
}

/**
 * Verify and decode a SAMADHAN session token
 */
export async function verifySamadhanToken(token: string): Promise<SamadhanSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SamadhanSession;
  } catch {
    return null;
  }
}

/**
 * Get the current SAMADHAN session from cookies
 * For use in Server Components and Route Handlers
 */
export async function getSamadhanSession(): Promise<SamadhanSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SAMADHAN_SESSION_NAME);
    
    if (!sessionCookie?.value) {
      return null;
    }

    const session = await verifySamadhanToken(sessionCookie.value);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.exp && session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, isActive: true, role: true },
    });

    if (!user || !user.isActive || user.role !== "CITIZEN") {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Set the SAMADHAN session cookie
 * For use in Route Handlers
 */
export async function setSamadhanSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(SAMADHAN_SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

/**
 * Clear the SAMADHAN session cookie
 * For use in Route Handlers
 */
export async function clearSamadhanSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SAMADHAN_SESSION_NAME);
}

/**
 * Get SAMADHAN user with profile
 */
export async function getSamadhanUser(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId, role: "CITIZEN" },
    include: {
      citizenProfile: true,
    },
  });
}

/**
 * Check if user has an active SAMADHAN session
 */
export async function hasSamadhanSession(): Promise<boolean> {
  const session = await getSamadhanSession();
  return session !== null;
}
