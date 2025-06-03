import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/app/generated/prisma";
import {
  Activity,
  Bell,
  FileCheck,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  UserCheck,
} from "lucide-react";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  date: string;
  unread?: boolean;
  icon?: React.ReactNode;
}

interface ActivityTabsProps {
  userRole?: UserRole;
}

export default function ActivityTabs({ userRole }: ActivityTabsProps) {
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

  const getActivities = (): ActivityItem[] => {
    switch (userRole) {
      case UserRole.CITIZEN:
        return [
          {
            id: "1",
            title: "Application Submitted",
            description: "Your application RR-2025-0001 has been submitted",
            date: "2025-05-10",
            unread: false,
          },
          {
            id: "2",
            title: "Document Requested",
            description: "Additional document needed for RR-2025-0001",
            date: "2025-05-09",
            unread: true,
          },
        ];
      case UserRole.FRONT_DESK:
        return [
          {
            id: "1",
            title: "New Application",
            description: "New application received from John Doe",
            date: "2025-05-10",
            unread: false,
          },
          {
            id: "2",
            title: "Validation Completed",
            description: "Application RR-2025-0102 validated",
            date: "2025-05-10",
            unread: true,
          },
        ];
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
        return [
          {
            id: "1",
            title: "New Assignment",
            description: "Case RR-2025-0201 assigned to you",
            date: "2025-05-10",
            unread: false,
          },
          {
            id: "2",
            title: "Review Completed",
            description: "Case RR-2025-0202 review completed",
            date: "2025-05-09",
            unread: true,
          },
        ];
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return [
          {
            id: "1",
            title: "System Update",
            description: "New system update available",
            date: "2025-05-10",
            unread: false,
          },
          {
            id: "2",
            title: "User Registration",
            description: "New user registration requires approval",
            date: "2025-05-10",
            unread: true,
          },
        ];
      default:
        return [];
    }
  };

  const getNotifications = (): ActivityItem[] => {
    switch (userRole) {
      case UserRole.CITIZEN:
        return [
          {
            id: "1",
            title: "Status Update",
            description: "Your application status has changed to In Progress",
            date: "2025-05-10",
            unread: true,
          },
        ];
      case UserRole.FRONT_DESK:
        return [
          {
            id: "1",
            title: "High Priority",
            description: "Urgent application requires validation",
            date: "2025-05-10",
            unread: true,
          },
        ];
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
        return [
          {
            id: "1",
            title: "Deadline Approaching",
            description: "Case RR-2025-0201 deadline in 2 days",
            date: "2025-05-10",
            unread: true,
          },
        ];
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return [
          {
            id: "1",
            title: "Security Alert",
            description: "Unusual login attempt detected",
            date: "2025-05-10",
            unread: true,
          },
        ];
      default:
        return [];
    }
  };

  // Add icons to each activity/notification
  const activitiesWithIcons = getActivities().map((activity) => ({
    ...activity,
    icon: getIcon(activity.title),
  }));

  const notificationsWithIcons = getNotifications().map((notification) => ({
    ...notification,
    icon: getIcon(notification.title),
  }));

  return (
    <Card className="border border-gray-200 shadow-sm h-full">
      <CardHeader className="pb-0 border-b ">
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-blue-600 mr-2" />
          <CardTitle className="text-lg font-semibold text-gray-800">
            Activity Center
          </CardTitle>
        </div>
      </CardHeader>
      <Tabs defaultValue="activities" className="w-full -mt-6">
        <TabsList className="grid w-full grid-cols-2  rounded-none">
          <TabsTrigger
            value="activities"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center"
          >
            <Activity className="h-4 w-4 mr-2" />
            Activities
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>
        <TabsContent value="activities">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {activitiesWithIcons.length > 0 ? (
                activitiesWithIcons.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-start">
                      <div className="bg-blue-50 p-2 rounded-full mr-3 mt-1">
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium text-gray-900 ${
                              activity.unread ? "font-semibold" : ""
                            }`}
                          >
                            {activity.title}
                            {activity.unread && (
                              <span className="inline-block h-2 w-2 rounded-full bg-blue-600 ml-2"></span>
                            )}
                          </p>
                          <span className="text-xs text-gray-500">
                            {activity.date}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Activity className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No recent activities</p>
                </div>
              )}
            </div>
          </CardContent>
        </TabsContent>
        <TabsContent value="notifications">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {notificationsWithIcons.length > 0 ? (
                notificationsWithIcons.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-start">
                      <div className="bg-amber-50 p-2 rounded-full mr-3 mt-1">
                        {notification.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium text-gray-900 ${
                              notification.unread ? "font-semibold" : ""
                            }`}
                          >
                            {notification.title}
                            {notification.unread && (
                              <span className="inline-block h-2 w-2 rounded-full bg-blue-600 ml-2"></span>
                            )}
                          </p>
                          <span className="text-xs text-gray-500">
                            {notification.date}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No new notifications</p>
                </div>
              )}
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
