// SAMADHAN Citizen Portal Layout
import type { Metadata, Viewport } from "next";
import SamadhanNavbar from "@/components/samadhan/SamadhanNavbar";
import SamadhanFooter from "@/components/samadhan/SamadhanFooter";
import SamadhanPWAHandler from "@/components/samadhan/SamadhanPWAHandler";
import SamadhanNavigationGuard from "@/components/samadhan/SamadhanNavigationGuard";
import SamadhanI18nWrapper from "@/components/samadhan/SamadhanI18nWrapper";
import Script from "next/script";

export const metadata: Metadata = {
  title: "SAMADHAN - Citizen Grievance Portal | DAC Gangtok",
  description:
    "Submit and track feedback and grievances for District Administrative Centre, Gangtok services.",
  keywords: [
    "samadhan",
    "grievance",
    "feedback",
    "citizen",
    "DAC",
    "Gangtok",
    "government",
  ],
  manifest: "/api/manifest",
  openGraph: {
    title: "SAMADHAN - Citizen Grievance Portal",
    description: "Submit and track feedback and grievances for DAC Gangtok",
    type: "website",
    locale: "en_IN",
    siteName: "SAMADHAN",
  },
  icons: {
    icon: [
      {
        url: "/favicon_io/favicon.ico",
        sizes: "any",
      },
      {
        url: "/favicon_io/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon_io/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/pwa/samadhan/samadhan-icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/pwa/samadhan/samadhan-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/favicon_io/favicon.ico",
    apple: [
      {
        url: "/favicon_io/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
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
    <SamadhanI18nWrapper>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col">
        {/* Navigation guard – redirects users back to /samadhan if they leave */}
        <SamadhanNavigationGuard />

        {/* SAMADHAN PWA Handler */}
        <SamadhanPWAHandler />

        {/* SAMADHAN Navbar */}
        <SamadhanNavbar />

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* SAMADHAN Footer */}
        <SamadhanFooter />

        {/* Dynamic manifest link based on domain */}
        <Script id="samadhan-pwa-meta" strategy="afterInteractive">
          {`
          // Update manifest link for SAMADHAN domain
          if (window.location.hostname.startsWith('samadhan.')) {
            const existingManifest = document.querySelector('link[rel="manifest"]');
            if (existingManifest) {
              existingManifest.href = '/api/manifest';
            }
          }
        `}
        </Script>
      </div>
    </SamadhanI18nWrapper>
  );
}
