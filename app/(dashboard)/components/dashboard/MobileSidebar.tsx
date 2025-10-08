"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Home,
  FileText,
  Bell,
  Users,
  Settings,
  LogOut,
  User,
  Shield,
  Landmark,
  Gavel,
  ClipboardList,
  HelpCircle,
  BarChart3,
  ListChecks,
  Building2,
  ArrowDownToLine,
  Layers,
  Search,
} from "lucide-react";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";
import { UserRole } from "@/app/generated/prisma";
import { isOfficerRole, isOfficerOrOfficial } from "@/lib/officer-roles";
interface MobileSidebarProps {
  userRole?: UserRole;
}

import { LucideIcon } from "lucide-react";

interface SidebarLink {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}
export default function MobileSidebar({ userRole }: MobileSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
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

  const citizenLinks: SidebarLink[] = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Applications",
      href: "/dashboard/applications/submitted-app",
      icon: FileText,
    },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
    { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
  ];

  const officerLinks: SidebarLink[] = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Assigned Applications",
      href: "/dashboard/officers-verify",
      icon: ClipboardList,
    },
    {
      name: "Pull Applications",
      href: "/dashboard/pull-requests",
      icon: ArrowDownToLine,
    },
    { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
  ];

  const frontDeskLinks: SidebarLink[] = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    ...(isGeneralFrontdesk === true
      ? [
          {
            name: "Queue Overview",
            href: "/dashboard/frontdesk-dashboard",
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
          {
            name: "Track Applications",
            href: "/dashboard/tracking",
            icon: Search,
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
    { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
  ];

  const dcLinks: SidebarLink[] = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Application Status Report",
      href: "/dashboard/application-progress",
      icon: BarChart3,
    },
    {
      name: "Assigned Applications",
      href: "/dashboard/officers-verify",
      icon: ClipboardList,
    },
    {
      name: "Pull Applications",
      href: "/dashboard/pull-requests",
      icon: ArrowDownToLine,
    },
    { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
  ];

  const adminLinks: SidebarLink[] = [
    { name: "Dashboard", href: "/admin", icon: Home },

    { name: "User Management", href: "/admin/user-management", icon: Users },
    {
      name: "Service Categories",
      href: "/admin/service-categories",
      icon: ClipboardList,
    },
    {
      name: "Department Management",
      href: "/admin/departments",
      icon: Building2,
    },
    {
      name: "Section Management",
      href: "/admin/sections",
      icon: Layers,
    },
    {
      name: "Frontdesk Management",
      href: "/admin/frontdesk-management",
      icon: Shield,
    },
    { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
  ];
  const dispatchLinks: SidebarLink[] = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Dispatch Management",
      href: "/dashboard/dispatch",
      icon: ClipboardList,
    },
    { name: "Applications", href: "/dashboard/applications", icon: FileText },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
    { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
  ];

  const getLinks = () => {
    const userRole = session?.user?.role;
    if (!userRole) return citizenLinks;

    if (userRole === UserRole.DC) {
      return dcLinks;
    }

    if (userRole === UserRole.DISPATCH_HANDLER) {
      return dispatchLinks;
    }

    if (userRole === UserRole.FRONT_DESK) {
      return frontDeskLinks;
    }

    if (userRole && isOfficerOrOfficial(userRole)) {
      return officerLinks;
    }

    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return adminLinks;
    }

    return citizenLinks;
  };
  const getRoleColor = () => {
    const userRole = session?.user?.role;
    if (!userRole) return "bg-blue-600";

    if (userRole === UserRole.FRONT_DESK) return "bg-green-600";
    if (userRole === UserRole.DISPATCH_HANDLER) return "bg-yellow-600";
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN)
      return "bg-red-600";

    // For officer and official roles, use a mapping based on level/type
    if (isOfficerOrOfficial(userRole)) {
      switch (userRole) {
        case UserRole.DC:
        case UserRole.ADC:
        case UserRole.ADC_GTK:
        case UserRole.ADC_HQ:
          return "bg-purple-600";
        case UserRole.SDM:
        case UserRole.SDM_GTK:
        case UserRole.SDM_HQ:
          return "bg-cyan-600";
        case UserRole.AC:
        case UserRole.DPO_DDMA:
        case UserRole.DD_REV:
        case UserRole.DD_ACQ:
          return "bg-indigo-600";
        case UserRole.US_ADM:
        case UserRole.AO:
        case UserRole.TO_DDMA:
        case UserRole.AD_IT:
        case UserRole.US_ELECTION:
          return "bg-emerald-600";
        case UserRole.OS_COI_RC:
        case UserRole.OS_RC:
        case UserRole.RI_LEGAL:
          return "bg-orange-600";
        case UserRole.RO:
          return "bg-amber-600";
        case UserRole.DYDIR:
          return "bg-teal-600";
        default:
          return "bg-slate-600";
      }
    }

    return "bg-blue-600";
  };

  const getRoleName = () => {
    if (!session?.user?.role) return "User";
    return session.user.role.replace("_", " ");
  };

  return (
    <SheetContent side="left" className="w-72 p-0 max-w-full">
      <div className="h-full flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center">
              <img
                src="/assets/seal_of_sikkim.png"
                alt="Government of Sikkim Logo"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-tight">
                DAC, Gangtok
              </SheetTitle>
              <SheetDescription className="text-xs">
                Government of Sikkim • {getRoleName()}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-2">
          {/* Home Button */}
          <div className="px-3 py-2">
            <SheetClose asChild>
              <Button
                variant={pathname === "/" ? "secondary" : "ghost"}
                className={`w-full justify-start ${
                  pathname === "/"
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : ""
                }`}
                asChild
              >
                <Link href="/">
                  <Home className="h-4 w-4 mr-3" />
                  Home
                </Link>
              </Button>
            </SheetClose>
          </div>

          <div className="px-3 py-2">
            <div className="mb-2 px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase">
              Main Navigation
            </div>
            <div className="space-y-1">
              {getLinks().map((link) => (
                <SheetClose key={link.name} asChild>
                  <Button
                    variant={pathname === link.href ? "secondary" : "ghost"}
                    className={`w-full justify-start ${
                      pathname === link.href
                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : ""
                    }`}
                    asChild
                  >
                    <Link href={link.href}>
                      <link.icon className="h-4 w-4 mr-3" />
                      {link.name}
                      {link.badge && (
                        <Badge variant="destructive" className="ml-auto">
                          {link.badge}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                </SheetClose>
              ))}
            </div>
          </div>

          <Separator className="my-2" />

          <div className="px-3 py-2">
            <div className="mb-2 px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase">
              Account
            </div>
            <div className="space-y-1">
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/dashboard/profile">
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                </Button>
              </SheetClose>
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => signOut({ callbackUrl: "/login?expired=true" })}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}
