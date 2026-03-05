import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ========== SAMADHAN DOMAIN DETECTION ==========
const SAMADHAN_DOMAINS = ["district-bi.vercel.app", "samadhan.dacgangtok.in"];

function isSamadhanHost(hostname: string): boolean {
  // Strip port for local dev (e.g. localhost:3000)
  const host = hostname.split(":")[0];
  return SAMADHAN_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

// Paths that must never be rewritten (static assets, internals)
function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/pwa") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/samadhan-manifest.json") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot|map)$/i.test(
      pathname,
    )
  );
}

export async function middleware(request: NextRequest) {
  // Get session token from cookies
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = request.nextUrl.pathname;
  const hostname = request.headers.get("host") || "";

  // ========== DOMAIN-BASED ROUTING FOR SAMADHAN ==========
  // district-bi.vercel.app  → rewrite all requests to /samadhan/*
  // samadhan.dacgangtok.in  → rewrite all requests to /samadhan/*
  // myapplication.dacgangtok.in → main application (no rewrite)
  // =========================================================

  if (isSamadhanHost(hostname)) {
    // Let static assets through without rewriting
    if (isStaticAsset(path)) {
      return NextResponse.next();
    }

    // API routes for SAMADHAN: /api/samadhan/* and /api/manifest pass through
    if (path.startsWith("/api/samadhan") || path === "/api/manifest") {
      return NextResponse.next();
    }

    // If path already starts with /samadhan, serve it directly (no double-prefix)
    if (path.startsWith("/samadhan")) {
      return NextResponse.next();
    }

    // Rewrite everything else to /samadhan prefix
    // e.g. /         → /samadhan
    //      /login    → /samadhan/login
    //      /dashboard → /samadhan/dashboard
    const samadhanPath = path === "/" ? "/samadhan" : `/samadhan${path}`;
    const url = request.nextUrl.clone();
    url.pathname = samadhanPath;
    return NextResponse.rewrite(url);
  }

  // myapplication.dacgangtok.in domain handling
  const isApplicationDomain = hostname.startsWith("myapplication.");

  if (isApplicationDomain) {
    // Application domain - allow only /track paths and related APIs
    const allowedPaths = [
      "/",
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
      new URL("/login?message=registration-disabled", request.url),
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
          request.url,
        ),
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
