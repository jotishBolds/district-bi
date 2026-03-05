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
  const hostname = request.headers.get("host") || "";

  // ========== DOMAIN-BASED ROUTING FOR SAMADHAN ==========
  // samadhan.dacgangtok.in -> SAMADHAN citizen portal only
  // myapplication.dacgangtok.in -> Application tracking portal only
  const isSamadhanDomain = hostname.startsWith("samadhan.");
  const isApplicationDomain = hostname.startsWith("myapplication.");

  if (isSamadhanDomain) {
    // SAMADHAN domain - allow only /samadhan paths and related APIs
    const allowedPaths = ["/samadhan", "/api/samadhan"];
    const isAllowed =
      allowedPaths.some((p) => path.startsWith(p)) ||
      path === "/" ||
      path.startsWith("/_next") ||
      path.startsWith("/favicon");

    if (!isAllowed) {
      // Redirect to SAMADHAN home
      return NextResponse.redirect(new URL("/samadhan", request.url));
    }

    // If at root, redirect to SAMADHAN
    if (path === "/") {
      return NextResponse.redirect(new URL("/samadhan", request.url));
    }

    return NextResponse.next();
  }

  if (isApplicationDomain) {
    // Application domain - allow only /track paths and related APIs
    const allowedPaths = [
      "/track",
      "/api/track",
      "/api/tracking",
      "/api/applications",
    ];
    const isAllowed =
      allowedPaths.some((p) => path.startsWith(p)) ||
      path === "/" ||
      path.startsWith("/_next") ||
      path.startsWith("/favicon");

    if (!isAllowed) {
      // Redirect to track page
      return NextResponse.redirect(new URL("/track", request.url));
    }

    // If at root, redirect to track page
    if (path === "/") {
      return NextResponse.redirect(new URL("/track", request.url));
    }

    return NextResponse.next();
  }

  // ========== END DOMAIN-BASED ROUTING ==========

  // Check if registration is disabled
  if (path === "/register" && process.env.ENABLE_REGISTRATION !== "true") {
    return NextResponse.redirect(
      new URL("/login?message=registration-disabled", request.url)
    );
  }

  // Public paths that don't require authentication
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/samadhan", // SAMADHAN citizen portal is public
  ];
  const isPublicPath =
    publicPaths.includes(path) || path.startsWith("/samadhan");

  // Special handling for OTP verification paths
  if (path === "/verify-otp" || path === "/verify-otp-enhanced") {
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

    // CITIZEN role users cannot access main dashboard - redirect to SAMADHAN
    if (token.role === "CITIZEN") {
      return NextResponse.redirect(new URL("/samadhan/dashboard", request.url));
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

    // SAMADHAN paths - don't redirect authenticated users to main dashboard
    // SAMADHAN has its own citizen dashboard at /samadhan/dashboard
    if (path.startsWith("/samadhan")) {
      return NextResponse.next();
    }

    // CITIZEN role users should go to SAMADHAN dashboard, not main dashboard
    if (token.role === "CITIZEN") {
      return NextResponse.redirect(new URL("/samadhan/dashboard", request.url));
    }

    // Only redirect fully authenticated users away from auth pages (non-SAMADHAN)
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API auth
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
