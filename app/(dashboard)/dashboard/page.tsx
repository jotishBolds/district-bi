import { redirect } from "next/navigation";
import { CalendarDays, FileText, Bell } from "lucide-react";
import { UserRole } from "@/app/generated/prisma";
import { getServerAuthSession } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import StatusCards from "../components/dashboard/StatusCards";
import RecentApplications from "../components/dashboard/RecentApplications";
import ActivityTabs from "../components/dashboard/ActivityTabs";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/ui/page-header";
import ButtonLink from "@/components/button/button-link";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const renderGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const renderRoleSpecificText = () => {
    switch (session.user?.role) {
      case UserRole.CITIZEN:
        return "Track and manage your applications";
      case UserRole.FRONT_DESK:
        return "Manage application validations and submissions";
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
        return "Review and process assigned cases";
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return "System administration and oversight";
      default:
        return "Manage your dashboard";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="container   mx-auto max-w-full">
        {/* Header Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <PageHeader className="pb-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
              <div>
                <div className="flex items-center space-x-2 text-blue-600 text-sm font-medium mb-2">
                  <CalendarDays size={16} />
                  <span>{today}</span>
                </div>
                <PageHeaderHeading className="text-2xl md:text-3xl">
                  {renderGreeting()},{" "}
                  {session.user?.fullName?.split(" ")[0] || "User"}
                </PageHeaderHeading>
                <PageHeaderDescription className="mt-2">
                  {renderRoleSpecificText()}
                </PageHeaderDescription>
              </div>

              {session.user?.role === UserRole.CITIZEN && (
                <div className="mt-4 md:mt-0">
                  <ButtonLink
                    path="/dashboard/applications/create"
                    label="New Application"
                  />
                </div>
              )}
            </div>
          </PageHeader>
        </div>

        {/* Status Cards Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Status Overview
          </h2>
          <StatusCards userRole={session.user?.role} />
        </div>

        <Separator className="my-6" />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Applications - Takes up 2/3 of the space */}
          <div className="lg:col-span-2">
            <RecentApplications userRole={session.user?.role} />
          </div>

          {/* Activity Feed - Takes up 1/3 of the space */}
          <div className="lg:col-span-1">
            <ActivityTabs userRole={session.user?.role} />
          </div>
        </div>

        {/* Footer Section */}
        <footer className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Government Services Portal | All rights
            reserved
          </p>
        </footer>
      </div>
    </div>
  );
}
