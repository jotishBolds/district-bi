import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const isRead = searchParams.get("isRead"); // Can be "true", "false", or undefined
    const type = searchParams.get("type");

    const skip = (page - 1) * limit;

    const whereClause: Prisma.NotificationWhereInput = {
      userId: session.user.id,
    };

    // Handle read/unread filter
    if (isRead !== undefined && isRead !== null) {
      whereClause.isRead = isRead === "true";
    }

    // Handle type filter
    if (type) {
      whereClause.notificationType = type as Prisma.EnumNotificationTypeFilter;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: {
          application: {
            include: {
              serviceCategory: {
                select: {
                  name: true,
                },
              },
              citizen: {
                include: {
                  citizenProfile: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, userIds, notificationType, applicationId, title, message } =
      body;

    if (!notificationType || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let targetUserIds: string[] = [];

    if (userId) {
      targetUserIds = [userId];
    } else if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    } else {
      return NextResponse.json(
        { error: "Either userId or userIds must be provided" },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No valid users found" },
        { status: 400 }
      );
    }

    const notifications = await Promise.all(
      users.map((user) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            notificationType,
            applicationId: applicationId || null,
            title,
            message,
            isRead: false,
          },
        })
      )
    );

    return NextResponse.json({
      message: "Notifications created successfully",
      count: notifications.length,
    });
  } catch (error) {
    console.error("Error creating notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
