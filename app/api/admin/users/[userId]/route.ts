// app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@/app/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as bcrypt from "bcryptjs";
import { z } from "zod";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Schema for updating users
const updateUserSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  level: z.number().int().min(-2).max(7).optional(),
  fullName: z.string().min(2, { message: "Full name is required" }).optional(),
  isActive: z.boolean().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  officeLocation: z.string().optional(),
  sectionId: z.string().optional(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters if provided",
    }),
});

// Helper function to check officer role
function isOfficerRole(role: UserRole): boolean {
  return [
    UserRole.FRONT_DESK,
    UserRole.DC,
    UserRole.ADC,
    UserRole.ADC_GTK,
    UserRole.ADC_HQ,
    UserRole.SDM,
    UserRole.SDM_GTK,
    UserRole.SDM_HQ,
    UserRole.AC,
    UserRole.DPO_DDMA,
    UserRole.DD_REV,
    UserRole.DD_ACQ,
    UserRole.US_ADM,
    UserRole.AO,
    UserRole.TO_DDMA,
    UserRole.AD_IT,
    UserRole.US_ELECTION,
    UserRole.OS_COI_RC,
    UserRole.OS_RC,
    UserRole.RI_LEGAL,
    UserRole.RO,
    UserRole.DYDIR,
  ].includes(
    role as
      | typeof UserRole.FRONT_DESK
      | typeof UserRole.DC
      | typeof UserRole.ADC
      | typeof UserRole.ADC_GTK
      | typeof UserRole.ADC_HQ
      | typeof UserRole.SDM
      | typeof UserRole.SDM_GTK
      | typeof UserRole.SDM_HQ
      | typeof UserRole.AC
      | typeof UserRole.DPO_DDMA
      | typeof UserRole.DD_REV
      | typeof UserRole.DD_ACQ
      | typeof UserRole.US_ADM
      | typeof UserRole.AO
      | typeof UserRole.TO_DDMA
      | typeof UserRole.AD_IT
      | typeof UserRole.US_ELECTION
      | typeof UserRole.OS_COI_RC
      | typeof UserRole.OS_RC
      | typeof UserRole.RI_LEGAL
      | typeof UserRole.RO
      | typeof UserRole.DYDIR
  );
}

// GET a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData: {
      email?: string;
      phone?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
    } = {
      ...(validatedData.email && { email: validatedData.email }),
      ...(validatedData.phone && { phone: validatedData.phone }),
      ...(validatedData.role && { role: validatedData.role }),
      ...(validatedData.isActive !== undefined && {
        isActive: validatedData.isActive,
      }),
    };

    if (validatedData.password) {
      userData.passwordHash = await bcrypt.hash(validatedData.password, 10);
    }

    const role = validatedData.role || existingUser.role;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: userData,
      });

      if (isOfficerRole(role)) {
        if (existingUser.officerProfile) {
          await tx.officerProfile.update({
            where: { userId: userId },
            data: {
              ...(validatedData.fullName && {
                fullName: validatedData.fullName,
              }),
              ...(validatedData.designation && {
                designation: validatedData.designation,
              }),
              ...(validatedData.department && {
                department: validatedData.department,
              }),
              ...(validatedData.officeLocation && {
                officeLocation: validatedData.officeLocation,
              }),
            },
          });
        } else {
          await tx.officerProfile.create({
            data: {
              userId: userId,
              fullName:
                validatedData.fullName ||
                existingUser.citizenProfile?.fullName ||
                "Unknown",
              designation: validatedData.designation || "Officer",
              department: validatedData.department || "General",
              officeLocation: validatedData.officeLocation || null,
            },
          });

          if (existingUser.citizenProfile) {
            await tx.citizenProfile.delete({
              where: { userId: userId },
            });
          }
        }
      } else {
        if (existingUser.citizenProfile) {
          await tx.citizenProfile.update({
            where: { userId: userId },
            data: {
              ...(validatedData.fullName && {
                fullName: validatedData.fullName,
              }),
              ...(validatedData.phone && { phone: validatedData.phone }),
            },
          });
        } else {
          await tx.citizenProfile.create({
            data: {
              userId: userId,
              fullName:
                validatedData.fullName ||
                existingUser.officerProfile?.fullName ||
                "Unknown",
              phone: validatedData.phone || existingUser.phone || "",
              address: "",
            },
          });

          if (existingUser.officerProfile) {
            await tx.officerProfile.delete({
              where: { userId: userId },
            });
          }
        }
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
      },
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser!;
    return NextResponse.json({
      message: "User updated successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        officerProfile: true,
        citizenProfile: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (session.user.id === userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check for any dependencies that would prevent deletion
    const [
      currentHolderApplications,
      dispatchedApplications,
      changedByWorkflows,
      validatedApplications,
      categoryChanges,
      assignedToAssignments,
      assignedByAssignments,
      uploadedDocuments,
      verifiedDocuments,
      documentRequests,
      auditLogs,
      notifications,
      frontdeskAssignments,
    ] = await Promise.all([
      prisma.application.count({ where: { currentHolderId: userId } }),
      prisma.application.count({ where: { dispatchedById: userId } }),
      prisma.applicationWorkflow.count({ where: { changedById: userId } }),
      prisma.applicationValidation.count({ where: { validatedById: userId } }),
      prisma.serviceCategoryChange.count({ where: { changedById: userId } }),
      prisma.officerAssignment.count({ where: { assignedToId: userId } }),
      prisma.officerAssignment.count({ where: { assignedById: userId } }),
      prisma.document.count({ where: { uploadedById: userId } }),
      prisma.document.count({ where: { verifiedById: userId } }),
      prisma.documentRequest.count({ where: { requestedById: userId } }),
      prisma.applicationAuditLog.count({ where: { performedById: userId } }),
      prisma.notification.count({ where: { userId } }),
      prisma.frontdeskOfficer.count({ where: { frontdeskUserId: userId } }),
    ]);

    const totalDependencies =
      currentHolderApplications +
      dispatchedApplications +
      changedByWorkflows +
      validatedApplications +
      categoryChanges +
      assignedToAssignments +
      assignedByAssignments +
      uploadedDocuments +
      verifiedDocuments +
      documentRequests +
      auditLogs +
      notifications +
      frontdeskAssignments;

    if (totalDependencies > 0) {
      const details = [];
      if (currentHolderApplications > 0)
        details.push(
          `${currentHolderApplications} applications currently held`
        );
      if (dispatchedApplications > 0)
        details.push(`${dispatchedApplications} dispatched applications`);
      if (changedByWorkflows > 0)
        details.push(`${changedByWorkflows} workflow changes`);
      if (validatedApplications > 0)
        details.push(`${validatedApplications} validated applications`);
      if (categoryChanges > 0)
        details.push(`${categoryChanges} category changes`);
      if (assignedToAssignments > 0)
        details.push(`${assignedToAssignments} assignments received`);
      if (assignedByAssignments > 0)
        details.push(`${assignedByAssignments} assignments made`);
      if (uploadedDocuments > 0)
        details.push(`${uploadedDocuments} uploaded documents`);
      if (verifiedDocuments > 0)
        details.push(`${verifiedDocuments} verified documents`);
      if (documentRequests > 0)
        details.push(`${documentRequests} document requests`);
      if (auditLogs > 0) details.push(`${auditLogs} audit logs`);
      if (notifications > 0) details.push(`${notifications} notifications`);
      if (frontdeskAssignments > 0)
        details.push(`${frontdeskAssignments} frontdesk assignments`);

      return NextResponse.json(
        {
          error: "Cannot delete user with existing data",
          details: details.slice(0, 3), // Show first 3 dependencies
          totalDependencies,
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        error:
          "Failed to delete user. The user may have associated data that prevents deletion.",
      },
      { status: 500 }
    );
  }
}
