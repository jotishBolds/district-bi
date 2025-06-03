"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Settings,
  Trash2,
  Check,
  CheckCheck,
  Filter,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  notificationType: string;
  applicationId?: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  application?: {
    rrNumber?: string;
    serviceCategory: {
      name: string;
    };
    citizen: {
      citizenProfile: {
        fullName: string;
      };
    };
  };
}

interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "APPLICATION_SUBMITTED":
      return <FileText className="h-4 w-4 text-blue-600" />;
    case "STATUS_CHANGED":
      return <AlertCircle className="h-4 w-4 text-amber-600" />;
    case "DOCUMENT_REQUESTED":
      return <FileText className="h-4 w-4 text-purple-600" />;
    case "PAYMENT_REQUIRED":
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Bell className="h-4 w-4 text-gray-600" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "APPLICATION_SUBMITTED":
      return "border-l-blue-500 bg-blue-50/50";
    case "STATUS_CHANGED":
      return "border-l-amber-500 bg-amber-50/50";
    case "DOCUMENT_REQUESTED":
      return "border-l-purple-500 bg-purple-50/50";
    case "PAYMENT_REQUIRED":
      return "border-l-red-500 bg-red-50/50";
    default:
      return "border-l-gray-500 bg-gray-50/50";
  }
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );
    return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
};

export default function NotificationsComponent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "unread" | "read"
  >("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalNotifications, setTotalNotifications] = useState(0);

  const fetchNotifications = useCallback(
    async (
      page = 1,
      filter: "all" | "unread" | "read" = selectedFilter,
      type: string = selectedType
    ) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });

        if (filter === "unread") {
          params.append("isRead", "false");
        } else if (filter === "read") {
          params.append("isRead", "true");
        }

        if (type && type !== "all") {
          params.append("type", type);
        }

        const response = await fetch(`/api/notifications?${params}`);
        if (!response.ok) throw new Error("Failed to fetch notifications");

        const data: NotificationResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setTotalNotifications(data.pagination.total);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.pages);
        setError(null);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load notifications"
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedFilter, selectedType]
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setActionLoading(notificationId);
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) throw new Error("Failed to mark as read");

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setActionLoading("all");
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to mark all as read");

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!confirm("Are you sure you want to delete this notification?"))
        return;

      try {
        setActionLoading(notificationId);
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete notification");

        const deletedNotification = notifications.find(
          (n) => n.id === notificationId
        );
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error deleting notification:", error);
      } finally {
        setActionLoading(null);
      }
    },
    [notifications]
  );

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markAsRead(notification.id);
      }

      if (notification.applicationId) {
        router.push(
          `/dashboard/applications/submitted-app/${notification.applicationId}`
        );
      }
    },
    [markAsRead, router]
  );

  const handleFilterChange = useCallback(
    (filter: "all" | "unread" | "read") => {
      if (filter === selectedFilter) return;
      setSelectedFilter(filter);
      setCurrentPage(1);
      fetchNotifications(1, filter, selectedType);
    },
    [selectedFilter, selectedType, fetchNotifications]
  );

  const handleTypeFilter = useCallback(
    (type: string) => {
      if (type === selectedType) return;
      setSelectedType(type);
      setCurrentPage(1);
      fetchNotifications(1, selectedFilter, type);
    },
    [selectedType, selectedFilter, fetchNotifications]
  );

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);

  const NotificationDropdown = useCallback(
    () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-2 p-3 cursor-pointer",
                    !notification.isRead && "bg-blue-50/50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2 w-full">
                    <NotificationIcon type={notification.notificationType} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                    <span>{formatRelativeTime(notification.createdAt)}</span>
                    {notification.application?.rrNumber && (
                      <span className="font-mono">
                        #{notification.application.rrNumber}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
          {notifications.length > 5 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDialogOpen(true)}
                className="text-center justify-center"
              >
                View all {notifications.length} notifications
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [loading, notifications, unreadCount, handleNotificationClick]
  );

  const NotificationDialog = useCallback(
    () => (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>All Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={actionLoading === "all"}
                    className="text-xs"
                  >
                    {actionLoading === "all" ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCheck className="h-3 w-3 mr-1" />
                    )}
                    Mark all read
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="px-6">
            <Tabs
              value={selectedFilter}
              onValueChange={(value) =>
                handleFilterChange(value as "all" | "unread" | "read")
              }
              className="w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-auto grid-cols-3">
                  <TabsTrigger value="all">
                    All ({totalNotifications})
                  </TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread ({unreadCount})
                  </TabsTrigger>
                  <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      Filter by type
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleTypeFilter("all")}>
                      All Types
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTypeFilter("APPLICATION_SUBMITTED")}
                    >
                      Applications
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTypeFilter("STATUS_CHANGED")}
                    >
                      Status Changes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTypeFilter("DOCUMENT_REQUESTED")}
                    >
                      Documents
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTypeFilter("PAYMENT_REQUIRED")}
                    >
                      Payments
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <TabsContent value={selectedFilter} className="mt-0">
                <ScrollArea className="h-96">
                  <div className="space-y-2 pr-4">
                    {error ? (
                      <div className="text-center p-8 text-red-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{error}</p>
                        <Button
                          variant="outline"
                          onClick={() => fetchNotifications()}
                          className="mt-2"
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : loading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center p-8 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No notifications to display</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <Card
                          key={notification.id}
                          className={cn(
                            "border-l-4 cursor-pointer transition-all hover:shadow-md",
                            getNotificationColor(notification.notificationType),
                            !notification.isRead && "ring-1 ring-blue-200"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="mt-0.5">
                                  <NotificationIcon
                                    type={notification.notificationType}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-sm line-clamp-1">
                                      {notification.title}
                                    </h4>
                                    {!notification.isRead && (
                                      <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatRelativeTime(
                                        notification.createdAt
                                      )}
                                    </span>
                                    {notification.application && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <FileText className="h-3 w-3" />
                                          {
                                            notification.application
                                              .serviceCategory.name
                                          }
                                        </span>
                                        {notification.application.rrNumber && (
                                          <>
                                            <span>•</span>
                                            <span className="font-mono">
                                              #
                                              {
                                                notification.application
                                                  .rrNumber
                                              }
                                            </span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    disabled={actionLoading === notification.id}
                                  >
                                    {actionLoading === notification.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  disabled={actionLoading === notification.id}
                                >
                                  {actionLoading === notification.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() =>
                        fetchNotifications(
                          currentPage - 1,
                          selectedFilter,
                          selectedType
                        )
                      }
                      disabled={currentPage === 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        fetchNotifications(
                          currentPage + 1,
                          selectedFilter,
                          selectedType
                        )
                      }
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    ),
    [
      isDialogOpen,
      unreadCount,
      actionLoading,
      selectedFilter,
      selectedType,
      error,
      loading,
      notifications,
      currentPage,
      totalPages,
      totalNotifications,
      handleFilterChange,
      handleTypeFilter,
      fetchNotifications,
      markAllAsRead,
      handleNotificationClick,
      markAsRead,
      deleteNotification,
    ]
  );

  return (
    <>
      <NotificationDropdown />
      <NotificationDialog />
    </>
  );
}
