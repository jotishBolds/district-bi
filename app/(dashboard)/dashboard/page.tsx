import { redirect } from "next/navigation";
import { CalendarDays, FileText, Bell } from "lucide-react";
import { UserRole } from "@/app/generated/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { isOfficerRole } from "@/lib/officer-roles";
import { getGreetingIST, formatIST } from "@/lib/timezone";

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

  // Use IST timezone for date display
  const today = formatIST(new Date(), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const renderGreeting = () => {
    // Use IST-based greeting
    const greeting = getGreetingIST();
    const userName = session.user?.fullName?.split(" ")[0] || "User";
    const userRole = session.user?.role;
    const designation = session.user?.designation;

    // Add respectful titles based on role
    let honorific = "";
    if (designation) {
      honorific = ` ${designation}`;
    } else if (userRole) {
      switch (userRole) {
        case UserRole.DC:
          honorific = " (District Collector)";
          break;
        case UserRole.ADC:
        case UserRole.ADC_GTK:
        case UserRole.ADC_HQ:
          honorific = " (Additional District Collector)";
          break;
        case UserRole.SDM:
        case UserRole.SDM_GTK:
        case UserRole.SDM_HQ:
          honorific = " (Sub-Divisional Magistrate)";
          break;
        case UserRole.ADMIN:
        case UserRole.SUPER_ADMIN:
          honorific = " (Administrator)";
          break;
        default:
          if (isOfficerRole(userRole)) {
            honorific = " (Officer)";
          }
          break;
      }
    }

    return `${greeting}, ${userName} - ${honorific}`;
  };

  const renderRoleSpecificText = () => {
    const userRole = session.user?.role;
    if (!userRole)
      return "Welcome to your dashboard. We are honored to have you here.";

    switch (userRole) {
      case UserRole.DC:
        return "Your esteemed leadership guides our district administration. Thank you for your service to the people.";
      case UserRole.ADC:
      case UserRole.ADC_GTK:
      case UserRole.ADC_HQ:
        return "Your valuable support in district administration is deeply appreciated. Thank you for your dedicated service.";
      case UserRole.SDM:
      case UserRole.SDM_GTK:
      case UserRole.SDM_HQ:
        return "Your important role in sub-divisional administration serves our community well. Thank you for your commitment.";
      case UserRole.FRONT_DESK:
        return "You are the vital first point of contact for our citizens. Your dedication in validating applications is highly valued.";
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return "Your expertise in system administration ensures smooth operations for all. Thank you for maintaining excellence.";
      default:
        if (isOfficerRole(userRole)) {
          return "Your professional dedication in reviewing applications contributes significantly to efficient governance. Thank you for your service.";
        }
        return "Welcome to your dashboard. We are honored to have you as part of our team.";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container   mx-auto max-w-full">
        {/* Header Section */}
        <div className="rounded-lg border shadow-sm p-6 mb-6 bg-gradient-to-r from-lime-50 via-emerald-50 to-cyan-50 dark:from-lime-950 dark:via-emerald-950 dark:to-cyan-950 border-emerald-100 dark:border-emerald-800">
          <PageHeader className="pb-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
              <div>
                <div className="flex items-center space-x-2 text-sm font-medium mb-2 text-emerald-700 dark:text-emerald-300">
                  <CalendarDays size={16} />
                  <span>{today}</span>
                </div>
                <PageHeaderHeading className="text-2xl md:text-3xl text-emerald-900 dark:text-emerald-100">
                  {renderGreeting()}
                </PageHeaderHeading>
                <PageHeaderDescription className="mt-2 text-emerald-800 dark:text-emerald-200">
                  {renderRoleSpecificText()}
                </PageHeaderDescription>
              </div>
            </div>
          </PageHeader>
        </div>

        {/* Status Cards Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
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
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} District Administrative Centre,
            Gangtok. All Rights Reserved. reserved
          </p>
        </footer>
      </div>
    </div>
  );
}
