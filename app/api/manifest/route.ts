import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SAMADHAN_PRODUCTION_DOMAINS = [
  "samadhan.dacgangtok.in",
  "district-bi.vercel.app",
];

export async function GET(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0]; // strip port for local dev

  // Explicit app=samadhan query param lets the samadhan layout request this on
  // any domain (including localhost in development).
  const appParam = request.nextUrl.searchParams.get("app");
  const requestedForSamadhan = appParam === "samadhan";

  // samadhan.dacgangtok.in / district-bi.vercel.app → production samadhan domain
  // samadhan.* sub-domain pattern → also samadhan
  const isSamadhanDomain =
    SAMADHAN_PRODUCTION_DOMAINS.includes(host) || host.startsWith("samadhan.");

  const serveSamadhanManifest = isSamadhanDomain || requestedForSamadhan;

  if (!serveSamadhanManifest) {
    // Main application manifest
    try {
      const manifestPath = path.join(process.cwd(), "public", "manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      return NextResponse.json(manifest, {
        headers: {
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Manifest not found" },
        { status: 404 },
      );
    }
  }

  // ---- Samadhan manifest ----
  try {
    const manifestPath = path.join(
      process.cwd(),
      "public",
      "samadhan-manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // On production samadhan domain the middleware rewrites "/" → "/samadhan"
    // internally, but the *browser* URL stays at "/".  PWA scope/start_url must
    // therefore be "/" on production, while local dev uses "/samadhan".
    if (SAMADHAN_PRODUCTION_DOMAINS.includes(host)) {
      manifest.start_url = "/";
      manifest.scope = "/";
      manifest.id = "samadhan-citizen-portal";
    }
    // else (local dev): keep "/samadhan" scope from the JSON file

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading samadhan manifest:", error);
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }
}
