import { ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";
import MobileSidebar from "../components/dashboard/MobileSidebar";
import DesktopSidebar from "../components/dashboard/DesktopSidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import { getServerAuthSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sheet>
        <MobileSidebar />
      </Sheet>
      <DesktopSidebar userRole={session?.user?.role} />

      <div className="lg:pl-72">
        <DashboardHeader />

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
