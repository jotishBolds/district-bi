import { ReactNode } from "react";
import MobileSidebar from "../components/dashboard/MobileSidebar";
import DesktopSidebar from "../components/dashboard/DesktopSidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import { getServerAuthSession } from "@/lib/auth";
import DashboardMainWrapper from "./DashboardMainWrapper";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar userRole={session?.user?.role} />

      <div className="lg:pl-72">
        <DashboardHeader />
        <DashboardMainWrapper>{children}</DashboardMainWrapper>
      </div>
    </div>
  );
}
