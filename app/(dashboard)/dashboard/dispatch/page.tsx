"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { UserRole } from "@/app/generated/prisma";
import DispatchDashboard from "@/app/(dashboard)/components/dispatch/DispatchDashboard";

export default function DispatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session?.user) {
      router.push("/auth/login");
      return;
    }

    if (session.user.role !== UserRole.DISPATCH_HANDLER) {
      router.push("/dashboard");
      toast.error("You don't have permission to access this page.");
      return;
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Don't render anything if not authorized
  if (!session?.user || session.user.role !== UserRole.DISPATCH_HANDLER) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dispatch Management
        </h1>
        <p className="text-muted-foreground">
          Manage and dispatch closed applications to relevant departments.
        </p>
      </div>
      <DispatchDashboard />
    </div>
  );
}
