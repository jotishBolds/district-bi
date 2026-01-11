// SAMADHAN Citizen Portal Layout
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "SAMADHAN - Citizen Grievance Portal | DAC Gangtok",
  description:
    "Submit and track feedback, grievances, and suggestions for District Administrative Centre, Gangtok services.",
  keywords: [
    "samadhan",
    "grievance",
    "feedback",
    "citizen",
    "DAC",
    "Gangtok",
    "government",
  ],
  openGraph: {
    title: "SAMADHAN - Citizen Grievance Portal",
    description:
      "Submit and track feedback, grievances, and suggestions for DAC Gangtok",
    type: "website",
    locale: "en_IN",
    siteName: "SAMADHAN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

export default function SamadhanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {children}
    </div>
  );
}
