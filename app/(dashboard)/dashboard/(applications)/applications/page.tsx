import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

import ApplicationsList from "./app-list";
import { getServerAuthSession } from "@/lib/auth";

export default async function ApplicationsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  return <ApplicationsList />;
}
