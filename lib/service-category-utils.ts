// lib/service-category-utils.ts
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";
import { OFFICER_ROLE_MAPPINGS } from "@/lib/officer-roles";

// Cache for uncategorised category ID
let uncategorisedCategoryId: string | null = null;

async function getUncategorisedCategoryId(): Promise<string> {
  if (uncategorisedCategoryId) {
    return uncategorisedCategoryId;
  }

  try {
    const category = await prisma.serviceCategory.findFirst({
      where: {
        name: {
          equals: "Uncategorised",
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (category) {
      uncategorisedCategoryId = category.id;
      return category.id;
    }

    // If not found, create it
    const newCategory = await prisma.serviceCategory.create({
      data: {
        name: "Uncategorised",
        description:
          "Default category for applications without specific categorization",
        isActive: true,
      },
      select: { id: true },
    });

    uncategorisedCategoryId = newCategory.id;
    return newCategory.id;
  } catch (error) {
    console.error("Error getting uncategorised category:", error);
    throw new Error("Failed to get uncategorised category");
  }
}

export async function getUncategorisedServiceCategoryId(): Promise<string> {
  const uncategorised = await prisma.serviceCategory.findFirst({
    where: { name: "Uncategorised" },
  });

  if (!uncategorised) {
    // Create if it doesn't exist
    const created = await prisma.serviceCategory.create({
      data: {
        name: "Uncategorised",
        description:
          "Default category for applications without specific categorization",
        isActive: true,
      },
    });
    return created.id;
  }

  return uncategorised.id;
}

export async function canUserManageServiceCategories(
  userRole?: UserRole
): Promise<boolean> {
  if (!userRole) return false;

  // Allow admin and super admin
  if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Allow all officer roles using the officer roles mapping
  const officerRoles = Object.keys(OFFICER_ROLE_MAPPINGS).filter((role) => {
    const mapping = OFFICER_ROLE_MAPPINGS[role as UserRole];
    return mapping.userType === "Officer";
  }) as UserRole[];

  // Also allow frontdesk to manage service categories
  const allowedRoles = [...officerRoles, UserRole.FRONT_DESK];

  return allowedRoles.includes(userRole);
}

export async function canUserSelectServiceCategory(
  userRole?: UserRole,
  userId?: string
): Promise<boolean> {
  if (!userRole || !userId) return false;

  // Check if user can manage service categories (all officers)
  if (await canUserManageServiceCategories(userRole)) return true;

  // For frontdesk users, check if they have officer assignments
  if (userRole === UserRole.FRONT_DESK) {
    const assignments = await prisma.frontdeskOfficer.findMany({
      where: { frontdeskUserId: userId },
    });

    // If they have specific officer assignments, they can select categories
    return (
      assignments.length > 0 && assignments.some((a) => a.officerId !== null)
    );
  }

  return false;
}

export async function recordServiceCategoryChange(
  applicationId: string,
  previousCategoryId: string | null,
  newCategoryId: string,
  changedById: string,
  reason?: string
) {
  // First verify that the user exists in the database
  const userExists = await prisma.user.findUnique({
    where: { id: changedById },
    select: { id: true },
  });

  if (!userExists) {
    throw new Error(`User with ID ${changedById} not found`);
  }

  return await prisma.serviceCategoryChange.create({
    data: {
      applicationId,
      previousCategoryId,
      newCategoryId,
      changedById,
      reason,
    },
    include: {
      previousCategory: true,
      newCategory: true,
      changedBy: {
        include: {
          officerProfile: true,
        },
      },
    },
  });
}

export async function getServiceCategoryHistory(applicationId: string) {
  return await prisma.serviceCategoryChange.findMany({
    where: { applicationId },
    include: {
      previousCategory: true,
      newCategory: true,
      changedBy: {
        include: {
          officerProfile: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export { getUncategorisedCategoryId };
