"use client";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function DashboardMainWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isApplicationProgress =
    pathname.includes("application-progress") ||
    pathname.includes("officers-verify");

  if (isApplicationProgress) {
    return (
      <main>
        <div>{children}</div>
      </main>
    );
  }
  return (
    <main className="py-10">
      <div className="px-4 sm:px-6 ">{children}</div>
    </main>
  );
}
