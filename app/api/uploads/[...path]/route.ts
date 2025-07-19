import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getServerAuthSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerAuthSession();

    // Require authentication to access files
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await params;

    if (!path || path.length === 0) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Construct the file path
    const filePath = join(process.cwd(), "uploads", ...path);

    console.log("Serving file from:", filePath);

    try {
      const fileBuffer = await readFile(filePath);

      // Get file extension to set proper content type
      const extension = path[path.length - 1].split(".").pop()?.toLowerCase();

      let contentType = "application/octet-stream";
      switch (extension) {
        case "pdf":
          contentType = "application/pdf";
          break;
        case "jpg":
        case "jpeg":
          contentType = "image/jpeg";
          break;
        case "png":
          contentType = "image/png";
          break;
        case "gif":
          contentType = "image/gif";
          break;
        case "webp":
          contentType = "image/webp";
          break;
      }

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
          "Content-Disposition": `inline; filename="${path[path.length - 1]}"`,
        },
      });
    } catch (fileError) {
      console.error("File not found:", filePath, fileError);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
