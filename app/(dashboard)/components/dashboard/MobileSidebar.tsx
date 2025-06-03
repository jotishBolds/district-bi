"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
import { UserRole } from "@/app/generated/prisma";
import Link from "next/link";

export default function MobileSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const citizenLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    {
      name: "Applications",
      href: "/dashboard/applications/submitted-app",
      icon: FileText,
    },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const officerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Applications", href: "/applications", icon: FileText },
    {
      name: "Assigned Cases",
      href: "/officer/assignments",
      icon: ClipboardList,
    },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Applications", href: "/applications", icon: FileText },
    { name: "User Management", href: "/admin/users", icon: Users },
    { name: "System Settings", href: "/admin/settings", icon: Settings },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: 3 },
    { name: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  const getLinks = () => {
    switch (session?.user?.role) {
      case UserRole.CITIZEN:
        return citizenLinks;
      case UserRole.FRONT_DESK:
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
        return officerLinks;
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return adminLinks;
      default:
        return citizenLinks;
    }
  };

  const getRoleColor = () => {
    switch (session?.user?.role) {
      case UserRole.CITIZEN:
        return "bg-blue-600";
      case UserRole.FRONT_DESK:
        return "bg-green-600";
      case UserRole.DC:
      case UserRole.ADC:
        return "bg-purple-600";
      case UserRole.RO:
        return "bg-amber-600";
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return "bg-red-600";
      default:
        return "bg-blue-600";
    }
  };

  const getRoleName = () => {
    if (!session?.user?.role) return "User";
    return session.user.role.replace("_", " ");
  };

  return (
    <SheetContent side="left" className="w-72 p-0 max-w-full">
      <div className="h-full flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center">
            <div
              className={`h-10 w-10 ${getRoleColor()} rounded-md flex items-center justify-center text-white font-bold mr-3`}
            >
              GP
            </div>
            <div>
              <SheetTitle className="text-lg">District Portal</SheetTitle>
              <SheetDescription className="text-sm">
                {getRoleName()} Dashboard
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-2">
          <div className="px-3 py-2">
            <div className="mb-2 px-4 py-1.5 text-xs font-medium text-gray-500 uppercase">
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
            <div className="mb-2 px-4 py-1.5 text-xs font-medium text-gray-500 uppercase">
              Account
            </div>
            <div className="space-y-1">
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
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
