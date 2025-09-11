// app/api/applications/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getServerAuthSession } from "@/lib/auth";
// import prisma from "@/lib/prisma";
// import {
//   UserRole,
//   ApplicationStatus,
//   DocumentType,
// } from "@/app/generated/prisma";
// import { writeFile, mkdir } from "fs/promises";
// import { join } from "path";
// import { v4 as uuidv4 } from "uuid";

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerAuthSession();

//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const page = parseInt(searchParams.get("page") || "1");
//     const limit = parseInt(searchParams.get("limit") || "10");
//     const status = searchParams.get("status");

//     const skip = (page - 1) * limit; // Build where clause based on user role
//     const whereClause: {
//       citizenId?: string;
//       currentHolderId?: string;
//       status?: ApplicationStatus;
//     } = {};

//     if (session.user.role === UserRole.CITIZEN) {
//       whereClause.citizenId = session.user.id;
//     } else if (
//       [UserRole.DC, UserRole.ADC, UserRole.RO].includes(
//         session.user.role as
//           | typeof UserRole.DC
//           | typeof UserRole.ADC
//           | typeof UserRole.RO
//       )
//     ) {
//       whereClause.currentHolderId = session.user.id;
//     }

//     if (status) {
//       whereClause.status = status as ApplicationStatus;
//     }
//     const [applications, total] = await Promise.all([
//       prisma.application.findMany({
//         where: whereClause,
//         include: {
//           serviceCategory: true,
//           citizen: {
//             include: {
//               citizenProfile: true,
//             },
//           },
//           currentHolder: {
//             include: {
//               officerProfile: true,
//             },
//           },
//           documents: {
//             select: {
//               id: true,
//               documentType: true,
//               fileName: true,
//               isVerified: true,
//             },
//           },
//           officerAssignments: {
//             include: {
//               assignedTo: {
//                 include: {
//                   officerProfile: true,
//                 },
//               },
//             },
//             orderBy: {
//               createdAt: "desc",
//             },
//             take: 1,
//           },
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//         skip,
//         take: limit,
//       }),
//       prisma.application.count({ where: whereClause }),
//     ]);

//     return NextResponse.json({
//       applications,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching applications:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerAuthSession();

//     if (!session?.user || session.user.role !== UserRole.CITIZEN) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const formData = await request.formData();

//     // Extract form fields
//     const serviceCategoryId = formData.get("serviceCategoryId") as string;
//     const preferredOfficerId = formData.get("preferredOfficerId") as string;
//     const applicationDetails = formData.get("applicationDetails") as string;

//     // Validate required fields
//     if (!serviceCategoryId || !preferredOfficerId || !applicationDetails) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     // Verify service category exists
//     const serviceCategory = await prisma.serviceCategory.findFirst({
//       where: {
//         id: serviceCategoryId,
//         isActive: true,
//       },
//     });

//     if (!serviceCategory) {
//       return NextResponse.json(
//         { error: "Invalid service category" },
//         { status: 400 }
//       );
//     }

//     // Verify officer exists and is available
//     const officer = await prisma.user.findFirst({
//       where: {
//         id: preferredOfficerId,
//         role: {
//           in: [UserRole.DC, UserRole.ADC, UserRole.RO],
//         },
//         isActive: true,
//         officerProfile: {
//           isAvailable: true,
//         },
//       },
//     });

//     if (!officer) {
//       return NextResponse.json(
//         { error: "Invalid or unavailable officer" },
//         { status: 400 }
//       );
//     }

//     // Process uploaded documents
//     const uploadedDocuments: Array<{
//       file: File;
//       documentType: DocumentType;
//     }> = [];

//     // Extract documents from formData
//     let documentIndex = 0;
//     while (true) {
//       const file = formData.get(
//         `documents[${documentIndex}].file`
//       ) as File | null;
//       const documentType = formData.get(
//         `documents[${documentIndex}].documentType`
//       ) as string | null;

//       if (!file || !documentType) break;

//       // Verify the file is actually a File object
//       if (typeof file === "object" && file instanceof File) {
//         uploadedDocuments.push({
//           file,
//           documentType: documentType as DocumentType,
//         });
//       }

//       documentIndex++;
//     }

//     if (uploadedDocuments.length === 0) {
//       return NextResponse.json(
//         { error: "At least one document is required" },
//         { status: 400 }
//       );
//     }

//     // Create uploads directory if it doesn't exist
//     const uploadsDir = join(process.cwd(), "uploads", "applications");
//     await mkdir(uploadsDir, { recursive: true });

//     // Start database transaction
//     const result = await prisma.$transaction(async (tx) => {
//       // Create the application in DRAFT status
//       const application = await tx.application.create({
//         data: {
//           serviceCategoryId,
//           citizenId: session.user.id,
//           status: ApplicationStatus.DRAFT, // Explicitly set to DRAFT
//           submittedAt: new Date(),
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });

//       // Save documents
//       const documentPromises = uploadedDocuments.map(
//         async ({ file, documentType }) => {
//           const fileExtension = file.name.split(".").pop();
//           const fileName = `${uuidv4()}.${fileExtension}`;
//           const filePath = join(uploadsDir, fileName);

//           // Save file to disk
//           const bytes = await file.arrayBuffer();
//           const buffer = Buffer.from(bytes);
//           await writeFile(filePath, buffer);

//           // Save document record to database
//           return tx.document.create({
//             data: {
//               applicationId: application.id,
//               documentType,
//               fileName: file.name,
//               filePath: `uploads/applications/${fileName}`,
//               fileSize: file.size,
//               uploadedById: session.user.id,
//               isVerified: false,
//             },
//           });
//         }
//       );

//       await Promise.all(documentPromises);

//       // Create initial workflow entry
//       await tx.applicationWorkflow.create({
//         data: {
//           applicationId: application.id,
//           fromStatus: null,
//           toStatus: ApplicationStatus.DRAFT,
//           changedById: session.user.id,
//           comments: applicationDetails,
//         },
//       });

//       // Create officer assignment
//       await tx.officerAssignment.create({
//         data: {
//           applicationId: application.id,
//           assignedById: session.user.id,
//           assignedToId: preferredOfficerId,
//           priority: 2, // Medium priority
//           instructions: applicationDetails,
//         },
//       });

//       // Create audit log
//       await tx.applicationAuditLog.create({
//         data: {
//           applicationId: application.id,
//           action: "APPLICATION_CREATED",
//           performedById: session.user.id,
//           newValues: {
//             serviceCategoryId,
//             preferredOfficerId,
//             status: ApplicationStatus.DRAFT,
//           },
//           ipAddress:
//             request.headers.get("x-forwarded-for") ||
//             request.headers.get("x-real-ip") ||
//             "unknown",
//         },
//       });

//       // Create notification for citizen
//       await tx.notification.create({
//         data: {
//           userId: session.user.id,
//           notificationType: "APPLICATION_SUBMITTED",
//           applicationId: application.id,
//           title: "Application Created Successfully",
//           message: `Your application for ${serviceCategory.name} has been created and is now in draft status.`,
//           isRead: false,
//         },
//       });

//       // Create notification for assigned officer
//       await tx.notification.create({
//         data: {
//           userId: preferredOfficerId,
//           notificationType: "APPLICATION_SUBMITTED",
//           applicationId: application.id,
//           title: "New Application Assigned",
//           message: `A new application for ${serviceCategory.name} has been assigned to you.`,
//           isRead: false,
//         },
//       });

//       return application;
//     });

//     return NextResponse.json({
//       id: result.id,
//       message: "Application created successfully in DRAFT status",
//       status: ApplicationStatus.DRAFT,
//     });
//   } catch (error) {
//     console.error("Error creating application:", error);
//     return NextResponse.json(
//       { error: "Failed to create application" },
//       { status: 500 }
//     );
//   }
// }

// app/api/applications/blob/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  UserRole,
  ApplicationStatus,
  ApplicationSource,
  DocumentType,
  Prisma,
} from "@/app/generated/prisma";
import {
  isOfficerRole,
  isOfficerOrOfficial,
  getAllOfficerRoles,
} from "@/lib/officer-roles";
// import { put } from "@vercel/blob"; // Commented out for development
import { v4 as uuidv4 } from "uuid";
import { uploadFileToS3, validateFile } from "@/lib/s3-storage";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const serviceCategoryId = searchParams.get("serviceCategoryId") || "";
    const applicationSource = searchParams.get("applicationSource") || "";
    const assignedToMe = searchParams.get("assignedToMe") === "true";
    const includeForwardingHistory =
      searchParams.get("includeForwardingHistory") === "true";

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let whereClause: Prisma.ApplicationWhereInput = {};

    if (session.user.role === UserRole.FRONT_DESK) {
      // For FRONT_DESK users, show only applications assigned to officers they handle
      // First, get the officers this frontdesk user is assigned to
      const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
        where: {
          frontdeskUserId: session.user.id,
        },
        select: {
          officerId: true,
        },
      });

      const assignedOfficerIds = frontdeskAssignments
        .map((assignment) => assignment.officerId)
        .filter((id): id is string => id !== null); // Remove null values

      if (assignedOfficerIds.length > 0) {
        // Show applications assigned to officers they handle, or applications assigned by this frontdesk user
        whereClause = {
          AND: [
            {
              status: {
                in: [
                  ApplicationStatus.VALIDATED,
                  ApplicationStatus.OPEN,
                  ApplicationStatus.IN_PROGRESS,
                  ApplicationStatus.RESOLVED,
                  ApplicationStatus.CLOSED,
                  ApplicationStatus.REOPENED,
                ],
              },
            },
            {
              OR: [
                {
                  currentHolderId: {
                    in: assignedOfficerIds,
                  },
                },
                // Include applications with officer assignments to officers they handle
                {
                  officerAssignments: {
                    some: {
                      assignedToId: {
                        in: assignedOfficerIds,
                      },
                    },
                  },
                },
                // Include applications that this frontdesk user has assigned (assignmentsGiven)
                {
                  officerAssignments: {
                    some: {
                      assignedById: session.user.id,
                    },
                  },
                },
                // Include applications without current holder if they have general frontdesk access (null officerId)
                ...(frontdeskAssignments.some(
                  (assignment) => assignment.officerId === null
                )
                  ? [
                      {
                        currentHolderId: null,
                      },
                    ]
                  : []),
              ],
            },
          ],
        };
      } else {
        // If no specific officer assignments, show applications assigned by this frontdesk user or general access
        const hasGeneralAccess = frontdeskAssignments.some(
          (assignment) => assignment.officerId === null
        );

        whereClause = {
          AND: [
            {
              status: {
                in: [
                  ApplicationStatus.VALIDATED,
                  ApplicationStatus.OPEN,
                  ApplicationStatus.IN_PROGRESS,
                  ApplicationStatus.RESOLVED,
                  ApplicationStatus.CLOSED,
                  ApplicationStatus.REOPENED,
                ],
              },
            },
            {
              OR: [
                // Include applications that this frontdesk user has assigned
                {
                  officerAssignments: {
                    some: {
                      assignedById: session.user.id,
                    },
                  },
                },
                // Include applications without current holder if they have general frontdesk access
                ...(hasGeneralAccess
                  ? [
                      {
                        currentHolderId: null,
                      },
                    ]
                  : []),
              ],
            },
          ],
        };
      }
    } else if (isOfficerOrOfficial(session.user.role)) {
      // For officers and officials
      if (includeForwardingHistory) {
        // Include applications currently held by user OR applications that were forwarded by user
        whereClause = {
          OR: [
            {
              currentHolderId: session.user.id,
            },
            {
              officerForwardings: {
                some: {
                  fromOfficerId: session.user.id,
                },
              },
            },
          ],
        };
      } else if (assignedToMe) {
        // Only show applications currently assigned to this user
        whereClause.currentHolderId = session.user.id;
      }

      // Add status filter if provided
      if (status) {
        if (whereClause.OR) {
          // If we have OR conditions, wrap them in AND with status
          whereClause = {
            AND: [
              { OR: whereClause.OR },
              { status: status as ApplicationStatus },
            ],
          };
        } else {
          whereClause.status = status as ApplicationStatus;
        }
      }

      // Add search filter
      if (search) {
        const searchConditions = [
          { rrNumber: { contains: search, mode: "insensitive" as const } },
          { citizenName: { contains: search, mode: "insensitive" as const } },
          { subject: { contains: search, mode: "insensitive" as const } },
          {
            serviceCategory: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ];

        if (whereClause.AND && Array.isArray(whereClause.AND)) {
          whereClause.AND.push({ OR: searchConditions });
        } else if (whereClause.OR) {
          whereClause = {
            AND: [{ OR: whereClause.OR }, { OR: searchConditions }],
          };
        } else {
          if (Object.keys(whereClause).length > 0) {
            whereClause = {
              AND: [whereClause, { OR: searchConditions }],
            };
          } else {
            whereClause.OR = searchConditions;
          }
        }
      }

      // Add service category filter
      if (serviceCategoryId) {
        if (whereClause.AND && Array.isArray(whereClause.AND)) {
          whereClause.AND.push({ serviceCategoryId: serviceCategoryId });
        } else {
          if (Object.keys(whereClause).length > 0) {
            whereClause = {
              AND: [whereClause, { serviceCategoryId: serviceCategoryId }],
            };
          } else {
            whereClause.serviceCategoryId = serviceCategoryId;
          }
        }
      }

      // Add application source filter
      if (applicationSource) {
        const appSource =
          applicationSource === "PUBLIC" ? "PUBLIC" : "GOVERNMENT";
        if (whereClause.AND && Array.isArray(whereClause.AND)) {
          whereClause.AND.push({ applicationSource: appSource });
        } else {
          if (Object.keys(whereClause).length > 0) {
            whereClause = {
              AND: [whereClause, { applicationSource: appSource }],
            };
          } else {
            whereClause.applicationSource = appSource;
          }
        }
      }
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: whereClause,
        include: {
          serviceCategory: true,
          currentHolder: {
            include: {
              officerProfile: true,
            },
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              fileName: true,
              filePath: true,
              fileSize: true,
              isVerified: true,
              createdAt: true,
            },
          },
          officerAssignments: {
            include: {
              assignedTo: {
                include: {
                  officerProfile: true,
                },
              },
              assignedBy: {
                select: {
                  id: true,
                  role: true,
                  officerProfile: {
                    select: {
                      fullName: true,
                      designation: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5, // Get last 5 assignments to analyze forwarding pattern
          },
          frontdeskForwardings: {
            include: {
              fromFrontdesk: {
                select: {
                  id: true,
                  officerProfile: {
                    select: {
                      fullName: true,
                      designation: true,
                    },
                  },
                },
              },
              toFrontdesk: {
                select: {
                  id: true,
                  officerProfile: {
                    select: {
                      fullName: true,
                      designation: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10, // Get last 10 forwarding entries for history
          },
          officerForwardings: {
            include: {
              fromOfficer: {
                select: {
                  id: true,
                  officerProfile: {
                    select: {
                      fullName: true,
                      designation: true,
                    },
                  },
                },
              },
              toOfficer: {
                select: {
                  id: true,
                  officerProfile: {
                    select: {
                      fullName: true,
                      designation: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10, // Get officer forwarding history
          },
          workflow: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  role: true,
                  officerProfile: {
                    select: {
                      fullName: true,
                      designation: true,
                    },
                  },
                  citizenProfile: {
                    select: {
                      fullName: true,
                      phone: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10, // Get workflow history
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.application.count({ where: whereClause }),
    ]);

    // For frontdesk users, filter out applications that were last forwarded by officers
    let filteredApplications = applications;
    if (session.user.role === UserRole.FRONT_DESK) {
      filteredApplications = applications.filter((app) => {
        // If no assignments, include the application
        if (!app.officerAssignments || app.officerAssignments.length === 0) {
          return true;
        }

        // Get the most recent assignment
        const lastAssignment = app.officerAssignments[0];

        // If the last assignment was made by this frontdesk user, include it
        if (lastAssignment.assignedBy.id === session.user.id) {
          return true;
        }

        // If the last assignment was made by an officer or official, exclude it from validation tab
        if (isOfficerOrOfficial(lastAssignment.assignedBy.role as UserRole)) {
          return false;
        }

        // Include all other cases
        return true;
      });
    }

    return NextResponse.json({
      applications: filteredApplications,
      pagination: {
        page,
        limit,
        total: filteredApplications.length, // Adjust total for filtered results
        pages: Math.ceil(filteredApplications.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    // Only FRONT_DESK users can create applications for citizens
    if (!session?.user || session.user.role !== UserRole.FRONT_DESK) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Extract form fields
    const serviceCategoryId = formData.get("serviceCategoryId") as string;
    const departmentId = formData.get("departmentId") as string;
    const subject = formData.get("subject") as string;
    const preferredOfficerId = formData.get("preferredOfficerId") as string;
    const applicationDetails = formData.get("applicationDetails") as string;
    const applicationSource =
      (formData.get("applicationSource") as string) || "PUBLIC";

    // Citizen details (provided by frontdesk)
    const citizenName = formData.get("citizenName") as string;
    const citizenPhone = formData.get("citizenPhone") as string;
    const citizenEmail = formData.get("citizenEmail") as string;
    const citizenAddress = formData.get("citizenAddress") as string;
    const citizenGender = formData.get("citizenGender") as string;
    const citizenAlternateNumber = formData.get(
      "citizenAlternateNumber"
    ) as string;

    // Check if this frontdesk user is general (not assigned to any specific officer)
    const frontdeskAssignments = await prisma.frontdeskOfficer.findMany({
      where: {
        frontdeskUserId: session.user.id,
      },
    });

    const isGeneralFrontdesk =
      frontdeskAssignments.length === 0 ||
      frontdeskAssignments.every((assignment) => assignment.officerId === null);

    // Validate required fields based on frontdesk type
    if (
      !serviceCategoryId ||
      !subject ||
      !citizenName ||
      !citizenPhone ||
      !citizenAddress
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // For government applications, department is required
    if (applicationSource === "GOVERNMENT" && !departmentId) {
      return NextResponse.json(
        { error: "Department is required for government applications" },
        { status: 400 }
      );
    }

    // For specific frontdesk, application details are required
    if (!isGeneralFrontdesk && !applicationDetails) {
      return NextResponse.json(
        { error: "Application details are required for specific frontdesk" },
        { status: 400 }
      );
    }

    // For specific frontdesk, officer assignment is required
    if (!isGeneralFrontdesk && !preferredOfficerId) {
      return NextResponse.json(
        { error: "Officer assignment is required for specific frontdesk" },
        { status: 400 }
      );
    }

    // For general frontdesk, officer assignment should not be provided
    if (isGeneralFrontdesk && preferredOfficerId) {
      return NextResponse.json(
        { error: "General frontdesk cannot assign officers directly" },
        { status: 400 }
      );
    }

    // Verify service category exists
    const serviceCategory = await prisma.serviceCategory.findFirst({
      where: {
        id: serviceCategoryId,
        isActive: true,
      },
    });

    if (!serviceCategory) {
      return NextResponse.json(
        { error: "Invalid service category" },
        { status: 400 }
      );
    }

    // Verify department exists if provided
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return NextResponse.json(
          { error: "Invalid department" },
          { status: 400 }
        );
      }
    }

    // For specific frontdesk, verify officer exists and is available
    let officer = null;
    if (!isGeneralFrontdesk) {
      officer = await prisma.user.findFirst({
        where: {
          id: preferredOfficerId,
          role: {
            in: getAllOfficerRoles(),
          },
          isActive: true,
          officerProfile: {
            isAvailable: true,
          },
        },
      });

      if (!officer) {
        return NextResponse.json(
          { error: "Invalid or unavailable officer" },
          { status: 400 }
        );
      }
    }

    // Process uploaded documents
    const uploadedDocuments: Array<{
      file: File;
      documentType: DocumentType;
    }> = [];

    // Extract documents from formData
    let documentIndex = 0;
    while (true) {
      const file = formData.get(
        `documents[${documentIndex}].file`
      ) as File | null;
      const documentType = formData.get(
        `documents[${documentIndex}].documentType`
      ) as string | null;

      if (!file || !documentType) break;

      // Verify the file is actually a File object
      if (typeof file === "object" && file instanceof File) {
        uploadedDocuments.push({
          file,
          documentType: documentType as DocumentType,
        });
      }

      documentIndex++;
    }

    if (uploadedDocuments.length === 0) {
      return NextResponse.json(
        { error: "At least one document is required" },
        { status: 400 }
      );
    }

    // Validate file types and sizes using the validation function
    for (const { file } of uploadedDocuments) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate RR number in format: RR-YYMMDD-HHMM-XX
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const day = currentDate.getDate().toString().padStart(2, "0");
      const hour = currentDate.getHours().toString().padStart(2, "0");
      const minute = currentDate.getMinutes().toString().padStart(2, "0");

      // Get count of all applications created today for sequential numbering
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const applicationsToday = await tx.application.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const sequentialNumber = (applicationsToday + 1)
        .toString()
        .padStart(2, "0");
      const rrNumber = `RR-${year}${month}${day}-${hour}${minute}-${sequentialNumber}`;

      // Determine application status and assignment based on frontdesk type
      const applicationStatus = isGeneralFrontdesk
        ? ApplicationStatus.OPEN
        : ApplicationStatus.IN_PROGRESS;
      const currentHolderId = isGeneralFrontdesk ? null : preferredOfficerId;

      // Create the application
      const application = await tx.application.create({
        data: {
          serviceCategoryId,
          departmentId: departmentId || null,
          subject,
          citizenName,
          citizenPhone,
          citizenEmail,
          citizenAddress,
          citizenGender,
          citizenAlternateNumber,
          applicationSource: applicationSource as ApplicationSource, // Cast to enum value
          status: applicationStatus,
          currentHolderId,
          rrNumber,
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Upload documents and save records
      const documentPromises = uploadedDocuments.map(
        async ({ file, documentType }) => {
          try {
            // Generate unique document ID
            const documentId = uuidv4();

            // Upload to S3
            const uploadResult = await uploadFileToS3(
              file,
              application.id,
              documentId
            );

            // Save document record to database
            return tx.document.create({
              data: {
                id: documentId,
                applicationId: application.id,
                documentType,
                fileName: file.name,
                filePath: uploadResult.key, // Store S3 key
                fileSize: file.size,
                uploadedById: session.user.id,
                isVerified: false,
              },
            });
          } catch (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            throw new Error(`Failed to upload file: ${file.name}`);
          }
        }
      );

      await Promise.all(documentPromises);

      // Create initial workflow entry
      await tx.applicationWorkflow.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: applicationStatus,
          changedById: session.user.id,
          comments: isGeneralFrontdesk
            ? `Application created by general frontdesk and placed in queue for officer assignment${
                applicationDetails ? `: ${applicationDetails}` : ""
              }`
            : applicationDetails ||
              "Application created with officer assignment",
        },
      });

      // Create officer assignment only for specific frontdesk
      if (!isGeneralFrontdesk) {
        await tx.officerAssignment.create({
          data: {
            applicationId: application.id,
            assignedById: session.user.id,
            assignedToId: preferredOfficerId,
            priority: 1, // High priority (default for frontdesk applications)
            instructions:
              applicationDetails || "No specific instructions provided",
          },
        });

        // Create notification for assigned officer
        await tx.notification.create({
          data: {
            userId: preferredOfficerId,
            notificationType: "APPLICATION_SUBMITTED",
            applicationId: application.id,
            title: "New Application Assigned",
            message: `A new application for ${serviceCategory.name} (RR: ${rrNumber}) has been assigned to you and is now in progress.`,
            isRead: false,
          },
        });
      }

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId: application.id,
          action: isGeneralFrontdesk
            ? "APPLICATION_OPENED"
            : "APPLICATION_CREATED",
          performedById: session.user.id,
          newValues: {
            serviceCategoryId,
            preferredOfficerId: isGeneralFrontdesk ? null : preferredOfficerId,
            citizenName,
            citizenPhone,
            status: applicationStatus,
            rrNumber,
          },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
      });

      return application;
    });

    const statusMessage = isGeneralFrontdesk
      ? "Application created and placed in queue for officer assignment"
      : "Application created and assigned to officer in IN_PROGRESS status";

    return NextResponse.json({
      id: result.id,
      rrNumber: result.rrNumber,
      message: statusMessage,
      status: isGeneralFrontdesk
        ? ApplicationStatus.OPEN
        : ApplicationStatus.IN_PROGRESS,
    });
  } catch (error) {
    console.error("Error creating application:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("Failed to upload file")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
