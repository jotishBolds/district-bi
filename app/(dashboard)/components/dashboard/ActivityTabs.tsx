"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/app/generated/prisma";
import { isOfficerRole, isOfficerOrOfficial } from "@/lib/officer-roles";
import {
  Activity,
  Bell,
  FileCheck,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  UserCheck,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  date: string;
  unread?: boolean;
  icon?: React.ReactNode;
}

interface ActivityData {
  activities: ActivityItem[];
  notifications: ActivityItem[];
}

interface ActivityTabsProps {
  userRole?: UserRole;
}

export default function ActivityTabs({ userRole }: ActivityTabsProps) {
  const [data, setData] = useState<ActivityData>({
    activities: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/activity");
        if (!response.ok) {
          throw new Error("Failed to fetch activity data");
        }
        const activityData = await response.json();
        setData(activityData);
      } catch (err) {
        console.error("Error fetching activity data:", err);
        setError("Failed to load activity data");
        setData({ activities: [], notifications: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [userRole]);

  const getIcon = (title: string) => {
    if (title.includes("Application") || title.includes("Document"))
      return <FileText className="h-4 w-4 text-blue-600" />;
    if (
      title.includes("Validation") ||
      title.includes("Completed") ||
      title.includes("Review")
    )
      return <FileCheck className="h-4 w-4 text-green-600" />;
    if (title.includes("Assignment") || title.includes("Registration"))
      return <UserCheck className="h-4 w-4 text-purple-600" />;
    if (title.includes("Update") || title.includes("Deadline"))
      return <Clock className="h-4 w-4 text-amber-600" />;
    if (title.includes("Alert") || title.includes("Security"))
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderActivityList = (items: ActivityItem[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start space-x-3 p-3 animate-pulse"
            >
              <div className="h-8 w-8 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8 text-red-600">
          <AlertTriangle className="h-6 w-6 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
              item.unread
                ? "bg-blue-50 border-blue-200"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex-shrink-0 mt-1">{getIcon(item.title)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4
                    className={`text-sm font-medium ${
                      item.unread ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {item.title}
                    {item.unread && (
                      <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {formatRelativeTime(item.date)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          Activity & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid  grid-cols-2 m-6 mb-0 w-auto">
            <TabsTrigger
              value="activity"
              className="flex items-center space-x-2"
            >
              <Activity className="h-4 w-4" />
              <span>Recent Activity</span>
              {data.activities.filter((a) => a.unread).length > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {data.activities.filter((a) => a.unread).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center space-x-2"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
              {data.notifications.filter((n) => n.unread).length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {data.notifications.filter((n) => n.unread).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="m-6 mt-4">
            {renderActivityList(data.activities, "No recent activity")}
          </TabsContent>

          <TabsContent value="notifications" className="m-6 mt-4">
            {renderActivityList(data.notifications, "No new notifications")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
