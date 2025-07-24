"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  ListChecks,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserRole } from "@/app/generated/prisma";
import {
  isOfficerRole,
  isOfficerOrOfficial,
  getRoleMapping,
} from "@/lib/officer-roles";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DesktopSidebarProps {
  userRole?: UserRole;
}

export default function DesktopSidebar({ userRole }: DesktopSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isGeneralFrontdesk, setIsGeneralFrontdesk] = useState<boolean | null>(
    null
  );

  // Fetch frontdesk assignments to determine if user is general frontdesk
  useEffect(() => {
    const fetchFrontdeskType = async () => {
      if (userRole !== "FRONT_DESK") return;

      try {
        const response = await fetch("/api/frontdesk/assignments");
        if (!response.ok) return;

        const data = await response.json();
        if (data && Array.isArray(data.assignments)) {
          // Determine if this is a general frontdesk user
          const hasSpecificAssignments = data.assignments.some(
            (assignment: { officerId: string | null }) =>
              assignment.officerId !== null
          );
          setIsGeneralFrontdesk(!hasSpecificAssignments);
        } else {
          setIsGeneralFrontdesk(true); // Default to general if no assignments
        }
      } catch (error) {
        console.error("Error fetching frontdesk type:", error);
        setIsGeneralFrontdesk(true); // Default to general on error
      }
    };

    fetchFrontdeskType();
  }, [userRole]);

  const officerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Assigned Applications",
      href: "/dashboard/officers-verify",
      icon: ClipboardList,
    },

    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const frontDeskLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Create Application",
      href: "/dashboard/create-application",
      icon: FileText,
    },
    // Conditional link based on frontdesk type
    ...(isGeneralFrontdesk === true
      ? [
          {
            name: "Queue Overview",
            href: "/dashboard/general-queue-view",
            icon: ListChecks,
          },
        ]
      : isGeneralFrontdesk === false
      ? [
          {
            name: "Manage applications",
            href: "/dashboard/frontdesk-dashboard",
            icon: ClipboardList,
          },
          {
            name: "Queue Management",
            href: "/dashboard/queue",
            icon: ListChecks,
          },
        ]
      : [
          // Loading state - show basic links
          {
            name: "Validate Applications",
            href: "/dashboard/validate-applications",
            icon: ClipboardList,
          },
        ]),
    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Applications", href: "/dashboard/applications", icon: FileText },
    { name: "User Management", href: "/admin/user-management", icon: Users },
    {
      name: "Frontdesk Management",
      href: "/admin/frontdesk-management",
      icon: Shield,
    },
    { name: "System Settings", href: "/admin/settings", icon: Settings },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const dcLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Application Progress",
      href: "/dashboard/application-progress",
      icon: BarChart3,
    },
    {
      name: "Assigned Applications",
      href: "/dashboard/officers-verify",
      icon: ClipboardList,
    },

    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const getLinks = () => {
    switch (userRole) {
      case UserRole.FRONT_DESK:
        return frontDeskLinks;
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return adminLinks;
      case UserRole.DC:
        return dcLinks;
      default:
        // Check if it's an officer or official role using the officer-roles utility
        if (userRole && isOfficerOrOfficial(userRole)) {
          return officerLinks;
        }
        // Default fallback
        return frontDeskLinks;
    }
  };

  const getRoleBadge = () => {
    if (!userRole) return { text: "User", color: "bg-gray-100 text-gray-800" };

    switch (userRole) {
      case UserRole.FRONT_DESK:
        return { text: "Front Desk", color: "bg-green-100 text-green-800" };
      case UserRole.ADMIN:
        return { text: "Admin", color: "bg-red-100 text-red-800" };
      case UserRole.SUPER_ADMIN:
        return { text: "Super Admin", color: "bg-gray-800 text-white" };
      default:
        // Check if it's an officer or official role and get the mapping
        if (isOfficerOrOfficial(userRole)) {
          const roleMapping = getRoleMapping(userRole);
          const displayText = roleMapping?.shortDesignation || userRole;
          const level = roleMapping?.level ?? 0;

          // Color based on officer level (higher level = more important = different color)
          let color = "bg-blue-100 text-blue-800"; // Default officer color
          if (level === 0)
            color = "bg-purple-100 text-purple-800"; // Highest level (DC)
          else if (level <= 2)
            color = "bg-indigo-100 text-indigo-800"; // High level
          else if (level <= 4) color = "bg-cyan-100 text-cyan-800"; // Mid level
          else color = "bg-amber-100 text-amber-800"; // Lower level

          return { text: displayText, color };
        }
        return { text: userRole, color: "bg-gray-100 text-gray-800" };
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
