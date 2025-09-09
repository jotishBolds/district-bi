"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import MobileSidebar from "./MobileSidebar";

import UserNav from "../ui/UserNav";
import NotificationsComponent from "@/app/components/notification/notify";

export default function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-30">
      <div className="container mx-auto px-4 flex items-center justify-between h-[63px]">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5 text-foreground" />
              </Button>
            </SheetTrigger>
            <MobileSidebar />
          </Sheet>
        </div>

        <div className="flex items-center space-x-2">
          <NotificationsComponent />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
