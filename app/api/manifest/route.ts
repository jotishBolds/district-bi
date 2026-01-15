import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const isSamadhanDomain = hostname.startsWith("samadhan.");

  // Determine which manifest to serve based on domain
  const manifestFileName = isSamadhanDomain
    ? "samadhan-manifest.json"
    : "manifest.json";

  try {
    const manifestPath = path.join(process.cwd(), "public", manifestFileName);
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error reading manifest:", error);
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }
}
