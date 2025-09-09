// app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for notification settings
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  applicationUpdates: z.boolean().default(true),
  systemAlerts: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

// Schema for privacy settings
const privacySettingsSchema = z.object({
  profileVisibility: z
    .enum(["public", "private", "department_only"])
    .default("department_only"),
  showContactInfo: z.boolean().default(false),
  allowDirectMessages: z.boolean().default(true),
});

// Schema for system preferences
const systemPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.enum(["en", "hi", "ne"]).default("en"),
  timezone: z.string().default("Asia/Kolkata"),
  dateFormat: z
    .enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"])
    .default("DD/MM/YYYY"),
  itemsPerPage: z.number().min(10).max(100).default(20),
});

// Combined settings schema
const settingsSchema = z.object({
  notifications: notificationSettingsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
  preferences: systemPreferencesSchema.optional(),
});

// Default settings for new users
const getDefaultSettings = () => ({
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    applicationUpdates: true,
    systemAlerts: true,
    marketingEmails: false,
  },
  privacy: {
    profileVisibility: "department_only" as const,
    showContactInfo: false,
    allowDirectMessages: true,
  },
  preferences: {
    theme: "system" as const,
    language: "en" as const,
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY" as const,
    itemsPerPage: 20,
  },
});

// GET - Fetch user settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user settings from database
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // If no settings exist, create default settings
    if (!userSettings) {
      const defaultSettings = getDefaultSettings();
      userSettings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          emailNotifications: defaultSettings.notifications.emailNotifications,
          smsNotifications: defaultSettings.notifications.smsNotifications,
          pushNotifications: defaultSettings.notifications.pushNotifications,
          profileVisibility: defaultSettings.privacy.profileVisibility,
          theme: defaultSettings.preferences.theme,
          language: defaultSettings.preferences.language,
          timezone: defaultSettings.preferences.timezone,
          dateFormat: defaultSettings.preferences.dateFormat,
          itemsPerPage: defaultSettings.preferences.itemsPerPage,
        },
      });
    }

    // Format response to match frontend expectations
    const settings = {
      notifications: {
        emailNotifications: userSettings.emailNotifications,
        smsNotifications: userSettings.smsNotifications,
        pushNotifications: userSettings.pushNotifications,
        applicationUpdates: true, // These can be extended to the model later
        systemAlerts: true,
        marketingEmails: false,
      },
      privacy: {
        profileVisibility: userSettings.profileVisibility,
        showContactInfo: false, // These can be extended to the model later
        allowDirectMessages: true,
      },
      preferences: {
        theme: userSettings.theme,
        language: userSettings.language,
        timezone: userSettings.timezone,
        dateFormat: userSettings.dateFormat,
        itemsPerPage: userSettings.itemsPerPage,
      },
    };

    return NextResponse.json({
      settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    // Prepare update data
    const updateData: Partial<{
      emailNotifications: boolean;
      smsNotifications: boolean;
      pushNotifications: boolean;
      profileVisibility: "public" | "private" | "department_only";
      theme: "light" | "dark" | "system";
      language: "en" | "hi" | "ne";
      timezone: string;
      dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
      itemsPerPage: number;
    }> = {};

    if (validatedData.notifications) {
      if (validatedData.notifications.emailNotifications !== undefined) {
        updateData.emailNotifications =
          validatedData.notifications.emailNotifications;
      }
      if (validatedData.notifications.smsNotifications !== undefined) {
        updateData.smsNotifications =
          validatedData.notifications.smsNotifications;
      }
      if (validatedData.notifications.pushNotifications !== undefined) {
        updateData.pushNotifications =
          validatedData.notifications.pushNotifications;
      }
    }

    if (validatedData.privacy) {
      if (validatedData.privacy.profileVisibility !== undefined) {
        updateData.profileVisibility = validatedData.privacy.profileVisibility;
      }
    }

    if (validatedData.preferences) {
      if (validatedData.preferences.theme !== undefined) {
        updateData.theme = validatedData.preferences.theme;
      }
      if (validatedData.preferences.language !== undefined) {
        updateData.language = validatedData.preferences.language;
      }
      if (validatedData.preferences.timezone !== undefined) {
        updateData.timezone = validatedData.preferences.timezone;
      }
      if (validatedData.preferences.dateFormat !== undefined) {
        updateData.dateFormat = validatedData.preferences.dateFormat;
      }
      if (validatedData.preferences.itemsPerPage !== undefined) {
        updateData.itemsPerPage = validatedData.preferences.itemsPerPage;
      }
    }

    // Update settings in database using upsert
    const defaultSettings = getDefaultSettings();
    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        emailNotifications:
          validatedData.notifications?.emailNotifications ??
          defaultSettings.notifications.emailNotifications,
        smsNotifications:
          validatedData.notifications?.smsNotifications ??
          defaultSettings.notifications.smsNotifications,
        pushNotifications:
          validatedData.notifications?.pushNotifications ??
          defaultSettings.notifications.pushNotifications,
        profileVisibility:
          validatedData.privacy?.profileVisibility ??
          defaultSettings.privacy.profileVisibility,
        theme:
          validatedData.preferences?.theme ?? defaultSettings.preferences.theme,
        language:
          validatedData.preferences?.language ??
          defaultSettings.preferences.language,
        timezone:
          validatedData.preferences?.timezone ??
          defaultSettings.preferences.timezone,
        dateFormat:
          validatedData.preferences?.dateFormat ??
          defaultSettings.preferences.dateFormat,
        itemsPerPage:
          validatedData.preferences?.itemsPerPage ??
          defaultSettings.preferences.itemsPerPage,
      },
    });

    // Format response to match frontend expectations
    const settings = {
      notifications: {
        emailNotifications: updatedSettings.emailNotifications,
        smsNotifications: updatedSettings.smsNotifications,
        pushNotifications: updatedSettings.pushNotifications,
        applicationUpdates: true,
        systemAlerts: true,
        marketingEmails: false,
      },
      privacy: {
        profileVisibility: updatedSettings.profileVisibility,
        showContactInfo: false,
        allowDirectMessages: true,
      },
      preferences: {
        theme: updatedSettings.theme,
        language: updatedSettings.language,
        timezone: updatedSettings.timezone,
        dateFormat: updatedSettings.dateFormat,
        itemsPerPage: updatedSettings.itemsPerPage,
      },
    };

    return NextResponse.json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

// DELETE - Reset settings to default
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reset to default settings by deleting and recreating
    await prisma.userSettings.deleteMany({
      where: { userId: session.user.id },
    });

    const defaultSettings = getDefaultSettings();
    const newSettings = await prisma.userSettings.create({
      data: {
        userId: session.user.id,
        emailNotifications: defaultSettings.notifications.emailNotifications,
        smsNotifications: defaultSettings.notifications.smsNotifications,
        pushNotifications: defaultSettings.notifications.pushNotifications,
        profileVisibility: defaultSettings.privacy.profileVisibility,
        theme: defaultSettings.preferences.theme,
        language: defaultSettings.preferences.language,
        timezone: defaultSettings.preferences.timezone,
        dateFormat: defaultSettings.preferences.dateFormat,
        itemsPerPage: defaultSettings.preferences.itemsPerPage,
      },
    });

    // Format response to match frontend expectations
    const settings = {
      notifications: {
        emailNotifications: newSettings.emailNotifications,
        smsNotifications: newSettings.smsNotifications,
        pushNotifications: newSettings.pushNotifications,
        applicationUpdates: true,
        systemAlerts: true,
        marketingEmails: false,
      },
      privacy: {
        profileVisibility: newSettings.profileVisibility,
        showContactInfo: false,
        allowDirectMessages: true,
      },
      preferences: {
        theme: newSettings.theme,
        language: newSettings.language,
        timezone: newSettings.timezone,
        dateFormat: newSettings.dateFormat,
        itemsPerPage: newSettings.itemsPerPage,
      },
    };

    return NextResponse.json({
      message: "Settings reset to default",
      settings,
    });
  } catch (error) {
    console.error("Error resetting settings:", error);
    return NextResponse.json(
      { error: "Failed to reset settings" },
      { status: 500 }
    );
  }
}
