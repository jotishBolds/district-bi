"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Bell,
  Users,
  Settings,
  Shield,
  Landmark,
  Gavel,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserRole } from "@/app/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DesktopSidebarProps {
  userRole?: UserRole;
}

export default function DesktopSidebar({ userRole }: DesktopSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const citizenLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Applications",
      href: "/dashboard/applications/submitted-app",
      icon: FileText,
    },

    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const officerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },

    {
      name: "Assigned Cases",
      href: "/dashboard/officers-verify",
      icon: ClipboardList,
    },

    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const frontDeskLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Validate Applications",
      href: "/dashboard/validate-applications",
      icon: FileText,
    },

    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Applications", href: "/dashboard/applications", icon: FileText },
    { name: "User Management", href: "/admin/user-management", icon: Users },
    { name: "System Settings", href: "/admin/settings", icon: Settings },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const getLinks = () => {
    switch (userRole) {
      case UserRole.CITIZEN:
        return citizenLinks;
      case UserRole.FRONT_DESK:
        return frontDeskLinks;
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
      case UserRole.SDM:
      case UserRole.DYDIR:
        return officerLinks;
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return adminLinks;
      default:
        return citizenLinks;
    }
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case UserRole.CITIZEN:
        return { text: "Citizen", color: "bg-blue-100 text-blue-800" };
      case UserRole.FRONT_DESK:
        return { text: "Front Desk", color: "bg-green-100 text-green-800" };
      case UserRole.DC:
        return { text: "DC", color: "bg-purple-100 text-purple-800" };
      case UserRole.ADC:
        return { text: "ADC", color: "bg-indigo-100 text-indigo-800" };
      case UserRole.RO:
        return { text: "RO", color: "bg-amber-100 text-amber-800" };
      case UserRole.SDM:
        return { text: "SDM", color: "bg-cyan-100 text-cyan-800" };
      case UserRole.DYDIR:
        return { text: "DYDIR", color: "bg-teal-100 text-teal-800" };
      case UserRole.ADMIN:
        return { text: "Admin", color: "bg-red-100 text-red-800" };
      case UserRole.SUPER_ADMIN:
        return { text: "Super Admin", color: "bg-gray-800 text-white" };
      default:
        return { text: "User", color: "bg-gray-100 text-gray-800" };
    }
  };

  const getInitials = (name?: string | null): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:w-72 lg:bg-white lg:border-r lg:border-gray-200">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <div className="h-8 w-8 bg-blue-700 rounded-md flex items-center justify-center text-white font-bold">
          GP
        </div>
        <span className="ml-2 font-semibold text-lg">District Portal</span>
      </div>

      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={getRoleBadge().color}>
              {getInitials(session?.user?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {session?.user?.fullName || "User"}
            </p>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                getRoleBadge().color
              )}
            >
              {getRoleBadge().text}
            </span>
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <div className="mb-2 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
          Main Navigation
        </div>
        <nav>
          <ul className="space-y-1">
            {getLinks().map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    pathname === link.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <link.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{link.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Separator className="my-4" />

        <div className="mb-2 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
          Account
        </div>
        <nav>
          <ul className="space-y-1">
            <li>
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  pathname === "/profile"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Users className="h-4 w-4" />
                Profile
              </Link>
            </li>
            <li>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  pathname === "/settings"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
