import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Get session token from cookies
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];
  const isPublicPath = publicPaths.includes(path);

  // Special handling for OTP verification
  if (path === "/verify-otp") {
    // Only allow access to verify-otp if coming from login or with email query param
    const email = request.nextUrl.searchParams.get("email");
    const referer = request.headers.get("referer") || "";

    if (!email && !referer.includes("/login")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  // Handle authenticated paths
  if (path.startsWith("/dashboard") || path.startsWith("/api/dashboard")) {
    // If user is not authenticated, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // If user has session but requires OTP verification, redirect to OTP page
    if (token.requiresOtpVerification) {
      return NextResponse.redirect(
        new URL(
          `/verify-otp?email=${encodeURIComponent(token.email || "")}`,
          request.url
        )
      );
    }

    // User is fully authenticated
    return NextResponse.next();
  }

  // Handle public paths when user is already authenticated
  if (isPublicPath && token) {
    // If user requires OTP verification, allow access to auth pages
    if (token.requiresOtpVerification) {
      return NextResponse.next();
    }
    // Only redirect fully authenticated users away from auth pages
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
