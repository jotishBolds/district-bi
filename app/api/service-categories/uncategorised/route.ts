// app/api/service-categories/uncategorised/route.ts
import { NextResponse } from "next/server";
import { getUncategorisedCategoryId } from "@/lib/service-category-utils";

export async function GET() {
  try {
    const categoryId = await getUncategorisedCategoryId();
    return NextResponse.json({ id: categoryId });
  } catch (error) {
    console.error("Error getting uncategorised category:", error);
    return NextResponse.json(
      { error: "Failed to get uncategorised category" },
      { status: 500 }
    );
  }
}
