// SAMADHAN Citizen Profile API
// Uses SAMADHAN session (separate from NextAuth)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCitizenPseudonym } from "@/lib/samadhan";
import {
  getSamadhanSession,
  createSamadhanSession,
  setSamadhanSessionCookie,
} from "@/lib/samadhan-auth";

// GET - Fetch citizen profile
export async function GET() {
  try {
    // Use SAMADHAN session instead of NextAuth
    const samadhanSession = await getSamadhanSession();

    if (!samadhanSession?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: samadhanSession.userId },
      include: {
        citizenProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Get or create pseudonym
    let pseudonym = user.citizenProfile?.samadhanPseudonym;

    if (!pseudonym && user.citizenProfile) {
      // Generate pseudonym for existing users
      pseudonym = generateCitizenPseudonym();
      await prisma.citizenProfile.update({
        where: { userId: user.id },
        data: { samadhanPseudonym: pseudonym },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        fullName: user.citizenProfile?.fullName || "",
        phone: user.phone || "",
        email: user.email || "",
        address: user.citizenProfile?.address || "",
        pseudonym: pseudonym || "Anonymous Citizen",
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

// PUT - Update citizen profile
export async function PUT(request: NextRequest) {
  try {
    // Use SAMADHAN session instead of NextAuth
    const samadhanSession = await getSamadhanSession();

    if (!samadhanSession?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { fullName, address } = body;

    // Validate input
    if (fullName && typeof fullName !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid full name" },
        { status: 400 },
      );
    }

    // Check if citizen profile exists
    const existingProfile = await prisma.citizenProfile.findUnique({
      where: { userId: samadhanSession.userId },
    });

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const pseudonym = generateCitizenPseudonym();
      await prisma.citizenProfile.create({
        data: {
          userId: samadhanSession.userId,
          fullName: fullName || "",
          phone: samadhanSession.phone || "",
          address: address || "",
          samadhanPseudonym: pseudonym,
        },
      });
    } else {
      // Update existing profile
      await prisma.citizenProfile.update({
        where: { userId: samadhanSession.userId },
        data: {
          ...(fullName !== undefined && { fullName }),
          ...(address !== undefined && { address }),
        },
      });
    }

    // Get updated profile data to refresh session
    const updatedProfile = await prisma.citizenProfile.findUnique({
      where: { userId: samadhanSession.userId },
    });

    // Create new session token with updated name
    const newSessionToken = await createSamadhanSession({
      id: samadhanSession.userId,
      phone: samadhanSession.phone,
      name: updatedProfile?.fullName || samadhanSession.name,
      pseudonym: updatedProfile?.samadhanPseudonym || samadhanSession.pseudonym,
    });

    // Set new session cookie
    await setSamadhanSessionCookie(newSessionToken);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        name: updatedProfile?.fullName || "",
        pseudonym: updatedProfile?.samadhanPseudonym || "Anonymous Citizen",
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update profile" },
      { status: 500 },
    );
  }
}
