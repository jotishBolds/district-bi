import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to the main service categories management page
  redirect("/admin/service-categories");
}
