"use client";

import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronDown,
  LogOut,
  User,
  Settings,
  HelpCircle,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { UserRole } from "@/app/generated/prisma";

export default function UserNav() {
  const { data: session } = useSession();
  console.log("UserNav session", session);

  const getInitials = (name?: string | null): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleColor = (role?: UserRole | null) => {
    switch (role) {
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return "bg-red-100 text-red-800";
      case UserRole.DC:
      case UserRole.ADC:
        return "bg-purple-100 text-purple-800";
      case UserRole.RO:
        return "bg-amber-100 text-amber-800";
      case UserRole.SDM:
        return "bg-cyan-100 text-cyan-800";
      case UserRole.DYDIR:
        return "bg-teal-100 text-teal-800";
      case UserRole.FRONT_DESK:
        return "bg-green-100 text-green-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getRoleName = (role?: UserRole | null) => {
    if (!role) return "User";
    return role.replace("_", " ");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 hover:bg-slate-100"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className={getRoleColor(session?.user?.role)}>
              {getInitials(session?.user?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium leading-tight">
              {session?.user?.fullName?.split(" ")[0] || "User"}
            </span>
            <span className="text-xs text-gray-500 leading-tight">
              {getRoleName(session?.user?.role)}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-1 hidden md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {session?.user?.fullName || "User"}
            </p>
            <div className="flex items-center">
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
              <div
                className={`ml-2 px-1.5 py-0.5 rounded-sm text-xs ${getRoleColor(
                  session?.user?.role
                )}`}
              >
                {getRoleName(session?.user?.role)}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/help" className="flex items-center cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Link>
        </DropdownMenuItem>
        {(session?.user?.role === UserRole.ADMIN ||
          session?.user?.role === UserRole.SUPER_ADMIN) && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login?expired=true" })}
          className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
