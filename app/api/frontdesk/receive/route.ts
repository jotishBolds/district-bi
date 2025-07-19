// app/api/frontdesk/receive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/app/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json(
        { error: "Only frontdesk users can receive applications" },
        { status: 403 }
      );
    }

    const { applicationId, instructions } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Find active forwarding record where this user is the recipient
    const forwardingRecord = await prisma.frontdeskForwarding.findFirst({
      where: {
        applicationId,
        toFrontdeskId: session.user.id,
        isActive: true,
      },
      include: {
        application: {
          include: {
            currentHolder: {
              include: {
                officerProfile: true,
              },
            },
          },
        },
        fromFrontdesk: true,
        toFrontdesk: true,
      },
    });

    if (!forwardingRecord) {
      return NextResponse.json(
        { error: "No active forwarding found for this application" },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update application holder back to original officer
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          currentHolderId: forwardingRecord.fromOfficerId,
          updatedAt: new Date(),
        },
      });

      // Mark the forwarding as inactive (received back)
      await tx.frontdeskForwarding.update({
        where: { id: forwardingRecord.id },
        data: {
          isActive: false,
        },
      });

      // Create workflow entry
      await tx.applicationWorkflow.create({
        data: {
          applicationId,
          fromStatus: forwardingRecord.application.status,
          toStatus: forwardingRecord.application.status, // Status remains same
          changedById: session.user.id,
          comments: `Application received back by frontdesk`,
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId,
          action: "APPLICATION_RECEIVED_BY_FRONTDESK",
          performedById: session.user.id,
          oldValues: { currentHolderId: forwardingRecord.toOfficerId },
          newValues: { currentHolderId: forwardingRecord.fromOfficerId },
        },
      });

      // Create notification for original frontdesk
      await tx.notification.create({
        data: {
          userId: forwardingRecord.fromFrontdeskId,
          notificationType: "STATUS_CHANGED",
          applicationId,
          title: "Application Received Back",
          message: `Application ${
            forwardingRecord.application.rrNumber ||
            forwardingRecord.application.id
          } has been received back`,
          isRead: false,
        },
      });

      return updatedApplication;
    });

    return NextResponse.json({
      message: "Application received back successfully",
      application: result,
      receivedFrom: {
        frontdesk: forwardingRecord.toFrontdesk.email,
      },
    });
  } catch (error) {
    console.error("Error receiving application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
