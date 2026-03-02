// SAMADHAN Ticket Submission API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  generateSamadhanReferenceId,
  generateCitizenPseudonym,
} from "@/lib/samadhan";
import { getSamadhanSession } from "@/lib/samadhan-auth";

// Validation schema for ticket submission
const ticketSchema = z.object({
  queryType: z.enum(["FEEDBACK", "GRIEVANCE"]),
  sectionId: z.string().min(1, "Section is required"),
  subject: z.string().optional(),
  serviceAvailed: z.string().optional(), // JSON array of service IDs (legacy)
  selectedServiceId: z.string().optional(), // Single service ID
  selectedCategories: z.string().optional(), // JSON array of category IDs
  description: z.string().min(10, "Description must be at least 10 characters"),
  visitedDC: z.boolean().optional(),
  visitDate: z.string().optional(), // ISO date string
  citizenName: z.string().optional(),
  citizenEmail: z.string().email().optional().or(z.literal("")),
  citizenPhone: z.string().optional(),
  isAnonymousToOfficer: z.boolean().optional(),
  submissionChannel: z
    .enum(["WEB_PORTAL", "WHATSAPP", "MOBILE_APP"])
    .optional(),
  whatsappNumber: z.string().optional(),
  isDraft: z.boolean().optional(), // Save as draft
  ticketId: z.string().optional(), // For updating existing draft
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ticketSchema.parse(body);

    // Check for SAMADHAN session (separate from NextAuth)
    const samadhanSession = await getSamadhanSession();
    const isAuthenticated = !!samadhanSession?.userId;

    // Determine citizen identity
    let citizenId: string | null = null;
    let citizenName = validatedData.citizenName || null;
    let citizenEmail = validatedData.citizenEmail || null;
    let citizenPhone = validatedData.citizenPhone || null;
    let isAnonymous = !isAuthenticated;
    let citizenPseudonym: string | null = null;
    let isExistingUser = false;

    if (isAuthenticated && samadhanSession) {
      citizenId = samadhanSession.userId;

      // Get citizen profile if exists
      const citizenProfile = await prisma.citizenProfile.findUnique({
        where: { userId: samadhanSession.userId },
      });

      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: samadhanSession.userId },
        select: { email: true },
      });

      // Always store real contact info in DB for DC/Admin access
      // Use form data first, then fall back to profile data
      citizenName =
        validatedData.citizenName || citizenProfile?.fullName || null;
      citizenPhone =
        validatedData.citizenPhone || citizenProfile?.phone || null;
      citizenEmail = validatedData.citizenEmail || user?.email || null;

      // For anonymous-to-officer submissions, generate a pseudonym
      if (validatedData.isAnonymousToOfficer) {
        citizenPseudonym =
          citizenProfile?.samadhanPseudonym || generateCitizenPseudonym();
      } else {
        citizenPseudonym = citizenProfile?.samadhanPseudonym || null;
      }
    } else {
      // Not authenticated - check if phone number belongs to an existing registered user
      citizenName = validatedData.citizenName || null;
      citizenPhone = validatedData.citizenPhone || null;
      citizenEmail = validatedData.citizenEmail || null;

      // If phone number is provided, check if user already exists
      if (citizenPhone) {
        const cleanPhone = citizenPhone.replace(/[\s\-\(\)]/g, "");
        const existingUser = await prisma.user.findFirst({
          where: {
            phone: cleanPhone,
            role: "CITIZEN",
          },
          include: {
            citizenProfile: true,
          },
        });

        if (existingUser) {
          // Link ticket to existing user
          citizenId = existingUser.id;
          isAnonymous = false;
          isExistingUser = true;
          citizenPseudonym =
            existingUser.citizenProfile?.samadhanPseudonym || null;

          // Use existing profile data if not provided in form
          citizenName =
            validatedData.citizenName ||
            existingUser.citizenProfile?.fullName ||
            null;
          citizenEmail =
            validatedData.citizenEmail || existingUser.email || null;
        }
      }

      // Generate pseudonym for anonymous submissions (whether toggle is on or not)
      if (validatedData.isAnonymousToOfficer && !citizenPseudonym) {
        citizenPseudonym = generateCitizenPseudonym();
      }
    }

    // Generate pseudonym for any anonymous-to-officer submission if not already set
    if (validatedData.isAnonymousToOfficer && !citizenPseudonym) {
      citizenPseudonym = generateCitizenPseudonym();
    }

    // Verify section exists
    const section = await prisma.section.findUnique({
      where: { id: validatedData.sectionId, isActive: true },
    });

    if (!section) {
      return NextResponse.json(
        { success: false, message: "Invalid section selected" },
        { status: 400 },
      );
    }

    // Convert selectedServiceId and selectedCategories to serviceAvailed format
    // Store both the service ID and category IDs for proper restoration
    let serviceAvailedData: string | undefined = validatedData.serviceAvailed;

    if (validatedData.selectedServiceId || validatedData.selectedCategories) {
      // Create a combined object that stores both service ID and category IDs
      const serviceData = {
        serviceId: validatedData.selectedServiceId || null,
        categoryIds: validatedData.selectedCategories
          ? JSON.parse(validatedData.selectedCategories)
          : [],
      };
      serviceAvailedData = JSON.stringify(serviceData);
    }

    // Check if updating existing draft
    if (validatedData.ticketId) {
      const existingTicket = await prisma.samadhanTicket.findFirst({
        where: {
          id: validatedData.ticketId,
          citizenId: citizenId,
          isDraft: true,
        },
      });

      if (!existingTicket) {
        return NextResponse.json(
          { success: false, message: "Draft ticket not found" },
          { status: 404 },
        );
      }

      // SLA deadline is NOT set at creation - it starts when an officer first views the ticket (UNSEEN→SEEN)

      // Update existing draft
      const updatedTicket = await prisma.samadhanTicket.update({
        where: { id: validatedData.ticketId },
        data: {
          queryType: validatedData.queryType,
          status: validatedData.isDraft ? "DRAFT" : "QUEUED",
          citizenName,
          citizenEmail,
          citizenPhone,
          citizenPseudonym,
          isAnonymousToOfficer: validatedData.isAnonymousToOfficer || false,
          sectionId: validatedData.sectionId,
          subject: validatedData.subject,
          serviceAvailed: serviceAvailedData,
          description: validatedData.description,
          visitedDC: validatedData.visitedDC,
          visitDate: validatedData.visitDate
            ? new Date(validatedData.visitDate)
            : null,
          isDraft: validatedData.isDraft || false,
          lastSavedAt: new Date(),
          queuedAt: validatedData.isDraft ? null : new Date(),
        },
        include: {
          section: { select: { name: true } },
        },
      });

      // Create status history if submitting
      if (!validatedData.isDraft) {
        await prisma.samadhanStatusHistory.create({
          data: {
            ticketId: updatedTicket.id,
            fromStatus: "DRAFT",
            toStatus: "QUEUED",
            isSystemGenerated: true,
            changeReason: "Ticket submitted from draft",
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: validatedData.isDraft
            ? "Draft saved successfully"
            : "Your query has been submitted successfully",
          data: {
            referenceId: updatedTicket.referenceId,
            ticketId: updatedTicket.id,
            status: updatedTicket.status,
            sectionName: updatedTicket.section.name,
            slaDeadline: updatedTicket.slaDeadline,
            isDraft: updatedTicket.isDraft,
          },
        },
        { status: 200 },
      );
    }

    // Generate unique reference ID
    const referenceId = await generateSamadhanReferenceId();

    // SLA deadline is NOT set at creation - it starts when an officer first views the ticket (UNSEEN→SEEN)

    // Create the ticket - goes to queue (QUEUED status) not direct assignment
    const ticket = await prisma.samadhanTicket.create({
      data: {
        referenceId,
        queryType: validatedData.queryType,
        status: validatedData.isDraft ? "DRAFT" : "QUEUED",
        citizenId,
        citizenName,
        citizenEmail,
        citizenPhone,
        citizenPseudonym,
        isAnonymous,
        isAnonymousToOfficer: validatedData.isAnonymousToOfficer || false,
        sectionId: validatedData.sectionId,
        subject: validatedData.subject,
        serviceAvailed: serviceAvailedData,
        description: validatedData.description,
        visitedDC: validatedData.visitedDC,
        visitDate: validatedData.visitDate
          ? new Date(validatedData.visitDate)
          : null,
        // No assignedOfficerId - ticket goes to queue first
        // slaDeadline is NOT set here - starts when officer views (UNSEEN→SEEN)
        submissionChannel: validatedData.submissionChannel || "WEB_PORTAL",
        whatsappNumber: validatedData.whatsappNumber,
        isDraft: validatedData.isDraft || false,
        lastSavedAt: new Date(),
        queuedAt: validatedData.isDraft ? null : new Date(),
      },
      include: {
        section: { select: { name: true } },
      },
    });

    // Create initial status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: ticket.id,
        toStatus: validatedData.isDraft ? "DRAFT" : "QUEUED",
        isSystemGenerated: true,
        changeReason: validatedData.isDraft
          ? "Draft created"
          : "Ticket submitted to queue",
      },
    });

    // TODO: Send notifications (SMS, Email) to citizen
    // Queue managers will be notified of new tickets

    return NextResponse.json(
      {
        success: true,
        message: validatedData.isDraft
          ? "Draft saved successfully"
          : "Your query has been submitted successfully and is awaiting review",
        data: {
          referenceId: ticket.referenceId,
          ticketId: ticket.id,
          status: ticket.status,
          sectionName: ticket.section.name,
          slaDeadline: ticket.slaDeadline,
          isDraft: ticket.isDraft,
          isExistingUser, // Let frontend know if linked to existing user
          citizenId: ticket.citizenId, // Include citizenId for debugging
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("SAMADHAN ticket submission error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit query. Please try again later.",
      },
      { status: 500 },
    );
  }
}

// Get tickets for citizen dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get("referenceId");

    // If referenceId is provided, allow lookup without auth
    if (referenceId) {
      const ticket = await prisma.samadhanTicket.findUnique({
        where: { referenceId },
        select: {
          id: true,
          referenceId: true,
          queryType: true,
          status: true,
          serviceAvailed: true,
          description: true,
          resolutionMessage: true,
          createdAt: true,
          slaDeadline: true,
          isAppeal: true,
          originalTicketId: true,
          citizenId: true, // Include for auth check
          citizenPhone: true, // Include masked version for verification
          section: { select: { id: true, name: true } },
          assignedOfficer: {
            select: {
              id: true,
              officerProfile: {
                select: { fullName: true, designation: true },
              },
            },
          },
          escalatedTo: {
            select: {
              id: true,
              officerProfile: {
                select: { fullName: true, designation: true },
              },
            },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              fileType: true,
              fileSize: true,
              createdAt: true,
            },
          },
          infoRequests: {
            select: {
              id: true,
              description: true,
              documentTypes: true,
              deadline: true,
              status: true,
              citizenResponse: true,
              respondedAt: true,
              createdAt: true,
              requestedBy: {
                select: {
                  officerProfile: {
                    select: { fullName: true, designation: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          statusHistory: {
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              changeReason: true,
              isSystemGenerated: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { success: false, message: "Ticket not found" },
          { status: 404 },
        );
      }

      // Resolve service IDs to names if serviceAvailed exists
      let serviceNames: string | null = null;
      if (ticket.serviceAvailed) {
        try {
          const serviceIds = JSON.parse(ticket.serviceAvailed);
          if (Array.isArray(serviceIds) && serviceIds.length > 0) {
            const services = await prisma.samadhanService.findMany({
              where: { id: { in: serviceIds } },
              select: { name: true },
            });
            serviceNames = services.map((s) => s.name).join(", ");
          }
        } catch {
          // If not valid JSON, use as-is
          serviceNames = ticket.serviceAvailed;
        }
      }

      // Return ticket details for public view
      // Fetch original ticket history if this is an appeal
      let originalTicketData = null;
      if (ticket.isAppeal && ticket.originalTicketId) {
        const originalTicket = await prisma.samadhanTicket.findUnique({
          where: { id: ticket.originalTicketId },
          include: {
            assignedOfficer: {
              select: {
                id: true,
                role: true,
                officerProfile: {
                  select: { fullName: true, designation: true },
                },
              },
            },
            statusHistory: {
              select: {
                id: true,
                fromStatus: true,
                toStatus: true,
                changeReason: true,
                isSystemGenerated: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });
        if (originalTicket) {
          originalTicketData = {
            referenceId: originalTicket.referenceId,
            status: originalTicket.status,
            assignedOfficer: originalTicket.assignedOfficer
              ? {
                  name:
                    originalTicket.assignedOfficer.officerProfile?.fullName ||
                    "Unknown",
                  designation:
                    originalTicket.assignedOfficer.officerProfile
                      ?.designation || originalTicket.assignedOfficer.role,
                }
              : null,
            statusHistory: originalTicket.statusHistory,
          };
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          id: ticket.id,
          referenceId: ticket.referenceId,
          queryType: ticket.queryType,
          status: ticket.status,
          section: ticket.section,
          serviceAvailed: serviceNames, // Use resolved service names instead of IDs
          description: ticket.description,
          resolutionMessage: ticket.resolutionMessage,
          createdAt: ticket.createdAt,
          slaDeadline: ticket.slaDeadline,
          isAppeal: ticket.isAppeal,
          originalTicketId: ticket.originalTicketId,
          originalTicket: originalTicketData,
          // Include citizenId and masked phone for access control
          citizenId: ticket.citizenId,
          citizenPhone: ticket.citizenPhone
            ? ticket.citizenPhone.substring(0, 4) +
              "****" +
              ticket.citizenPhone.slice(-2)
            : null,
          attachments: ticket.attachments.map((att) => ({
            ...att,
            viewUrl: `/api/samadhan/tickets/${ticket.id}/attachments/${att.id}`,
            downloadUrl: `/api/samadhan/tickets/${ticket.id}/attachments/${att.id}?action=download`,
          })),
          assignedOfficer: ticket.assignedOfficer
            ? {
                name: ticket.assignedOfficer.officerProfile?.fullName || "N/A",
                designation:
                  ticket.assignedOfficer.officerProfile?.designation || "N/A",
              }
            : null,
          escalatedTo: ticket.escalatedTo
            ? {
                name: ticket.escalatedTo.officerProfile?.fullName || "N/A",
                designation:
                  ticket.escalatedTo.officerProfile?.designation || "N/A",
              }
            : null,
          infoRequests: ticket.infoRequests.map((req) => ({
            id: req.id,
            description: req.description,
            documentTypes: req.documentTypes,
            deadline: req.deadline,
            status: req.status,
            citizenResponse: req.citizenResponse,
            respondedAt: req.respondedAt,
            createdAt: req.createdAt,
            requestedBy: req.requestedBy
              ? {
                  name: req.requestedBy.officerProfile?.fullName || "Officer",
                  designation:
                    req.requestedBy.officerProfile?.designation || "N/A",
                }
              : null,
          })),
          statusHistory: ticket.statusHistory,
        },
      });
    }

    // For authenticated users, return their tickets
    // Use SAMADHAN session instead of NextAuth
    const samadhanSession = await getSamadhanSession();

    if (!samadhanSession?.userId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const tickets = await prisma.samadhanTicket.findMany({
      where: { citizenId: samadhanSession.userId },
      include: {
        section: { select: { id: true, name: true } },
        attachments: { select: { id: true, fileName: true } },
        infoRequests: {
          where: { status: "PENDING" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: tickets.map((ticket) => ({
        referenceId: ticket.referenceId,
        queryType: ticket.queryType,
        status: ticket.status,
        section: ticket.section,
        subject: ticket.subject,
        description: ticket.description.substring(0, 200),
        createdAt: ticket.createdAt,
        slaDeadline: ticket.slaDeadline,
        hasAttachments: ticket.attachments.length > 0,
        hasPendingInfoRequest: ticket.infoRequests.length > 0,
        isDraft: ticket.isDraft,
      })),
    });
  } catch (error) {
    console.error("SAMADHAN ticket fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}
