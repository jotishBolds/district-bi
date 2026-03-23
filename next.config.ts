import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable PWA features
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.vercel.app",
        "district-bi.vercel.app",
        "samadhan.dacgangtok.in",
        "myapplication.dacgangtok.in",
      ],
    },
  },
  // Configure headers for PWA and Security
  async headers() {
    return [
      // Security headers for all routes
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // FIX: removed microphone=() which was blocking all mic access globally.
            // microphone=* allows the current origin (self) to use the microphone.
            // camera and geolocation remain blocked as they are not needed.
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      // Service Worker headers
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      // Manifest headers
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // API security headers
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
    ];
  },
  // Configure image optimization for PWA icons
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [],
    remotePatterns: [],
  },
  // Enable standalone output for Docker deployment
  output: "standalone",
  // Optimize for production
  poweredByHeader: false,
};

export default nextConfig;
