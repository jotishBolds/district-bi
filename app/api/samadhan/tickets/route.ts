// SAMADHAN Ticket Submission API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  generateSamadhanReferenceId,
  generateCitizenPseudonym,
  calculateSLADeadline,
  findAvailableOfficer,
} from "@/lib/samadhan";
import { getSamadhanSession } from "@/lib/samadhan-auth";

// Validation schema for ticket submission
const ticketSchema = z.object({
  queryType: z.enum(["FEEDBACK", "GRIEVANCE", "SUGGESTION"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  sectionId: z.string().min(1, "Section is required"),
  serviceAvailed: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  citizenName: z.string().optional(),
  citizenEmail: z.string().email().optional().or(z.literal("")),
  citizenPhone: z.string().optional(),
  isAnonymousToOfficer: z.boolean().optional(),
  submissionChannel: z
    .enum(["WEB_PORTAL", "WHATSAPP", "MOBILE_APP"])
    .optional(),
  whatsappNumber: z.string().optional(),
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
    const isAnonymous = !isAuthenticated;
    let citizenPseudonym: string | null = null;

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
      // Not authenticated - store the provided contact info
      // The form data is already set above from validatedData
      citizenName = validatedData.citizenName || null;
      citizenPhone = validatedData.citizenPhone || null;
      citizenEmail = validatedData.citizenEmail || null;

      // Generate pseudonym for anonymous submissions (whether toggle is on or not)
      if (validatedData.isAnonymousToOfficer) {
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
        { status: 400 }
      );
    }

    // Generate unique reference ID
    const referenceId = await generateSamadhanReferenceId();

    // Set priority - default to MEDIUM for feedback/suggestions, respect user choice for grievances
    const priority =
      validatedData.queryType === "GRIEVANCE"
        ? validatedData.priority || "MEDIUM"
        : "MEDIUM";

    // Find available officer in the section
    const assignedOfficerId = await findAvailableOfficer(
      validatedData.sectionId
    );

    // Calculate SLA deadline
    const slaDeadline = await calculateSLADeadline(
      validatedData.queryType,
      priority as "LOW" | "MEDIUM" | "HIGH"
    );

    // Create the ticket
    const ticket = await prisma.samadhanTicket.create({
      data: {
        referenceId,
        queryType: validatedData.queryType,
        priority: priority as "LOW" | "MEDIUM" | "HIGH",
        status: "UNSEEN",
        citizenId,
        citizenName,
        citizenEmail,
        citizenPhone,
        citizenPseudonym,
        isAnonymous,
        isAnonymousToOfficer: validatedData.isAnonymousToOfficer || false,
        sectionId: validatedData.sectionId,
        serviceAvailed: validatedData.serviceAvailed,
        description: validatedData.description,
        assignedOfficerId,
        slaDeadline,
        submissionChannel: validatedData.submissionChannel || "WEB_PORTAL",
        whatsappNumber: validatedData.whatsappNumber,
      },
      include: {
        section: { select: { name: true } },
        assignedOfficer: {
          select: {
            officerProfile: { select: { fullName: true } },
          },
        },
      },
    });

    // Create initial status history
    await prisma.samadhanStatusHistory.create({
      data: {
        ticketId: ticket.id,
        toStatus: "UNSEEN",
        isSystemGenerated: true,
        changeReason: "Ticket submitted",
      },
    });

    // TODO: Send notifications (SMS, Email) to citizen and officer
    // This would integrate with the existing notification system

    return NextResponse.json(
      {
        success: true,
        message: "Your query has been submitted successfully",
        data: {
          referenceId: ticket.referenceId,
          ticketId: ticket.id,
          status: ticket.status,
          sectionName: ticket.section.name,
          assignedOfficer:
            ticket.assignedOfficer?.officerProfile?.fullName ||
            "Pending assignment",
          slaDeadline: ticket.slaDeadline,
        },
      },
      { status: 201 }
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
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit query. Please try again later.",
      },
      { status: 500 }
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
        include: {
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
          { status: 404 }
        );
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
          priority: ticket.priority,
          status: ticket.status,
          section: ticket.section,
          serviceAvailed: ticket.serviceAvailed,
          description: ticket.description,
          resolutionMessage: ticket.resolutionMessage,
          createdAt: ticket.createdAt,
          slaDeadline: ticket.slaDeadline,
          isAppeal: ticket.isAppeal,
          originalTicketId: ticket.originalTicketId,
          originalTicket: originalTicketData,
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
        { status: 401 }
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
        priority: ticket.priority,
        status: ticket.status,
        section: ticket.section,
        description: ticket.description.substring(0, 200),
        createdAt: ticket.createdAt,
        slaDeadline: ticket.slaDeadline,
        hasAttachments: ticket.attachments.length > 0,
        hasPendingInfoRequest: ticket.infoRequests.length > 0,
      })),
    });
  } catch (error) {
    console.error("SAMADHAN ticket fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
