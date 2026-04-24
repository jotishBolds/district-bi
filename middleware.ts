import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = request.nextUrl.pathname;
  const hostname = request.headers.get("host") || "";

  // =========================
  // DOMAIN DETECTION
  // =========================
  const isSamadhanDomain = hostname.startsWith("samadhan.");
  const isApplicationDomain = hostname.startsWith("myapplication.");

  // =========================
  // SAMADHAN DOMAIN LOGIC
  // =========================
  if (isSamadhanDomain) {
    // Allow static + next internals
    if (
      path.startsWith("/_next") ||
      path.startsWith("/favicon") ||
      path.startsWith("/assets") ||
      path.startsWith("/images")
    ) {
      return NextResponse.next();
    }

    // Allow only samadhan routes
    if (path.startsWith("/api/")) {
      if (path.startsWith("/api/samadhan") || path === "/api/manifest") {
        return NextResponse.next();
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Rewrite root → /samadhan (clean URL)
    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/samadhan";
      return NextResponse.rewrite(url);
    }

    // Allow samadhan pages
    if (path.startsWith("/samadhan")) {
      return NextResponse.next();
    }

    // Block everything else
    return NextResponse.redirect(new URL("/samadhan", request.url));
  }

  // =========================
  // APPLICATION DOMAIN LOGIC
  // =========================
  if (isApplicationDomain) {
    // Block samadhan routes here
    if (path.startsWith("/samadhan")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  // =========================
  // GLOBAL AUTH LOGIC
  // =========================

  // Registration toggle
  if (path === "/register" && process.env.ENABLE_REGISTRATION !== "true") {
    return NextResponse.redirect(
      new URL("/login?message=registration-disabled", request.url)
    );
  }

  // Public paths
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/samadhan",
  ];

  const isPublicPath =
    publicPaths.includes(path) || path.startsWith("/samadhan");

  // OTP protection
  if (path === "/verify-otp" || path === "/verify-otp-enhanced") {
    const email = request.nextUrl.searchParams.get("email");
    const referer = request.headers.get("referer") || "";

    if (!email && !referer.includes("/login")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  // Protected dashboard
  if (path.startsWith("/dashboard") || path.startsWith("/api/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (token.requiresOtpVerification) {
      return NextResponse.redirect(
        new URL(
          `/verify-otp?email=${encodeURIComponent(token.email || "")}`,
          request.url
        )
      );
    }

    if (token.role === "CITIZEN") {
      return NextResponse.redirect(
        new URL("/samadhan/dashboard", request.url)
      );
    }

    return NextResponse.next();
  }

  // Already logged in users
  if (isPublicPath && token) {
    if (token.requiresOtpVerification) {
      return NextResponse.next();
    }

    if (path.startsWith("/samadhan")) {
      return NextResponse.next();
    }

    if (token.role === "CITIZEN") {
      return NextResponse.redirect(
        new URL("/samadhan/dashboard", request.url)
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// =========================
// MATCHER
// =========================
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
