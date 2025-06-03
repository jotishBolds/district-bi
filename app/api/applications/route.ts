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
  DocumentType,
} from "@/app/generated/prisma";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

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

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const whereClause: {
      citizenId?: string;
      currentHolderId?: string;
      status?: ApplicationStatus;
    } = {};

    if (session.user.role === UserRole.CITIZEN) {
      whereClause.citizenId = session.user.id;
    } else if (
      [UserRole.DC, UserRole.ADC, UserRole.RO].includes(
        session.user.role as
          | typeof UserRole.DC
          | typeof UserRole.ADC
          | typeof UserRole.RO
      )
    ) {
      whereClause.currentHolderId = session.user.id;
    }

    if (status) {
      whereClause.status = status as ApplicationStatus;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: whereClause,
        include: {
          serviceCategory: true,
          citizen: {
            include: {
              citizenProfile: true,
            },
          },
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
              isVerified: true,
            },
          },
          officerAssignments: {
            include: {
              assignedTo: {
                include: {
                  officerProfile: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
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

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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

    if (!session?.user || session.user.role !== UserRole.CITIZEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Extract form fields
    const serviceCategoryId = formData.get("serviceCategoryId") as string;
    const preferredOfficerId = formData.get("preferredOfficerId") as string;
    const applicationDetails = formData.get("applicationDetails") as string;

    // Validate required fields
    if (!serviceCategoryId || !preferredOfficerId || !applicationDetails) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Verify officer exists and is available
    const officer = await prisma.user.findFirst({
      where: {
        id: preferredOfficerId,
        role: {
          in: [UserRole.DC, UserRole.ADC, UserRole.RO],
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

    // Validate file types and sizes
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    for (const { file } of uploadedDocuments) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: `File type ${file.type} is not allowed. Only JPEG, PNG, WebP, and PDF files are permitted.`,
          },
          { status: 400 }
        );
      }

      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 5MB.` },
          { status: 400 }
        );
      }
    }

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the application in DRAFT status
      const application = await tx.application.create({
        data: {
          serviceCategoryId,
          citizenId: session.user.id,
          status: ApplicationStatus.DRAFT,
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Upload documents to Vercel Blob and save records
      const documentPromises = uploadedDocuments.map(
        async ({ file, documentType }) => {
          try {
            // Generate unique filename
            const fileExtension = file.name.split(".").pop();
            const uniqueFileName = `${
              application.id
            }/${uuidv4()}.${fileExtension}`;

            // Upload to Vercel Blob
            const blob = await put(`applications/${uniqueFileName}`, file, {
              access: "public",
              addRandomSuffix: false,
            });

            // Save document record to database
            return tx.document.create({
              data: {
                applicationId: application.id,
                documentType,
                fileName: file.name,
                filePath: blob.url, // Store the blob URL
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
          toStatus: ApplicationStatus.DRAFT,
          changedById: session.user.id,
          comments: applicationDetails,
        },
      });

      // Create officer assignment
      await tx.officerAssignment.create({
        data: {
          applicationId: application.id,
          assignedById: session.user.id,
          assignedToId: preferredOfficerId,
          priority: 2, // Medium priority
          instructions: applicationDetails,
        },
      });

      // Create audit log
      await tx.applicationAuditLog.create({
        data: {
          applicationId: application.id,
          action: "APPLICATION_CREATED",
          performedById: session.user.id,
          newValues: {
            serviceCategoryId,
            preferredOfficerId,
            status: ApplicationStatus.DRAFT,
          },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
      });

      // Create notification for citizen
      await tx.notification.create({
        data: {
          userId: session.user.id,
          notificationType: "APPLICATION_SUBMITTED",
          applicationId: application.id,
          title: "Application Created Successfully",
          message: `Your application for ${serviceCategory.name} has been created and is now in draft status.`,
          isRead: false,
        },
      });

      // Create notification for assigned officer
      await tx.notification.create({
        data: {
          userId: preferredOfficerId,
          notificationType: "APPLICATION_SUBMITTED",
          applicationId: application.id,
          title: "New Application Assigned",
          message: `A new application for ${serviceCategory.name} has been assigned to you.`,
          isRead: false,
        },
      });

      return application;
    });

    return NextResponse.json({
      id: result.id,
      message: "Application created successfully in DRAFT status",
      status: ApplicationStatus.DRAFT,
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
