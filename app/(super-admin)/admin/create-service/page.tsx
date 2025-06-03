"use client";

import dynamic from "next/dynamic";

// Dynamically import the create-service-category component with SSR disabled
// This ensures the component only renders on the client side
const CreateServiceCategory = dynamic(
  () => import("./components/create-service-category"),
  { ssr: false }
);

export default function Page() {
  return <CreateServiceCategory />;
}
