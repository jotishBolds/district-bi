"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DispatchDashboard from "@/app/(dashboard)/components/dispatch/DispatchDashboard";

export default function DispatchDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (session?.user?.role !== "DISPATCH_HANDLER") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session?.user?.role !== "DISPATCH_HANDLER") {
    return null;
  }

  return <DispatchDashboard />;
}
