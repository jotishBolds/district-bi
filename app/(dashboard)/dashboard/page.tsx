import { redirect } from "next/navigation";
import { CalendarDays, FileText, Bell } from "lucide-react";
import { UserRole } from "@/app/generated/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { isOfficerRole } from "@/lib/officer-roles";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import StatusCards from "../components/dashboard/StatusCards";
import RecentApplications from "../components/dashboard/RecentApplications";
import ActivityTabs from "../components/dashboard/ActivityTabs";
import FrontdeskDashboard from "../components/dashboard/FrontdeskDashboard";
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
    const userRole = session.user?.role;
    if (!userRole) return "Manage your dashboard";

    switch (userRole) {
      case UserRole.FRONT_DESK:
        return "Manage application validations and submissions";
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return "System administration and oversight";
      default:
        // Check if it's an officer role
        if (isOfficerRole(userRole)) {
          return "Review and process assigned applications";
        }
        return "Manage your dashboard";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="container   mx-auto max-w-full">
        {/* Header Section */}
        <div className="rounded-lg border shadow-sm p-6 mb-6 bg-gradient-to-r from-lime-50 via-emerald-50 to-cyan-50 border-emerald-100">
          <PageHeader className="pb-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
              <div>
                <div className="flex items-center space-x-2 text-sm font-medium mb-2 text-emerald-700">
                  <CalendarDays size={16} />
                  <span>{today}</span>
                </div>
                <PageHeaderHeading className="text-2xl md:text-3xl text-emerald-900">
                  {renderGreeting()},{" "}
                  {(session && session.user?.fullName?.split(" ")[0]) || "User"}
                </PageHeaderHeading>
                <PageHeaderDescription className="mt-2 text-emerald-800">
                  {renderRoleSpecificText()}
                </PageHeaderDescription>
              </div>
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

        {/* Frontdesk-specific dashboard */}
        {session.user?.role === UserRole.FRONT_DESK && (
          <div className="mb-6">
            <FrontdeskDashboard />
          </div>
        )}

        {/* Main Content Grid - Show for non-frontdesk or as additional content */}
        {session.user?.role !== UserRole.FRONT_DESK && (
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
        )}

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
