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
  const host = hostname.split(":")[0];

  // ===============================
  // STATIC / INTERNAL BYPASS
  // ===============================
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/images") ||
    path.startsWith("/assets") ||
    path.match(/\.(.*)$/)
  ) {
    return NextResponse.next();
  }

  // ===============================
  // DOMAIN → BASE PATH REWRITE
  // ===============================
  if (host.startsWith("samadhan.")) {
    const url = request.nextUrl.clone();

    if (!path.startsWith("/samadhan")) {
      url.pathname = path === "/" ? "/samadhan" : `/samadhan${path}`;
      return NextResponse.rewrite(url);
    }
  }

  if (host.startsWith("myapplication.")) {
    const url = request.nextUrl.clone();

    if (!path.startsWith("/track")) {
      url.pathname = path === "/" ? "/track" : `/track${path}`;
      return NextResponse.rewrite(url);
    }
  }

  // ===============================
  // REGISTRATION CONTROL
  // ===============================
  if (path === "/register" && process.env.ENABLE_REGISTRATION !== "true") {
    return NextResponse.redirect(
      new URL("/login?message=registration-disabled", request.url)
    );
  }

  // ===============================
  // PUBLIC PATHS
  // ===============================
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/samadhan",
  ];

  const isPublicPath =
    publicPaths.includes(path) || path.startsWith("/samadhan");

  // ===============================
  // OTP PROTECTION
  // ===============================
  if (path === "/verify-otp" || path === "/verify-otp-enhanced") {
    const email = request.nextUrl.searchParams.get("email");
    const referer = request.headers.get("referer") || "";

    if (!email && !referer.includes("/login")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  // ===============================
  // AUTH PROTECTED ROUTES
  // ===============================
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

  // ===============================
  // AUTH USER ON PUBLIC PAGES
  // ===============================
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

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
