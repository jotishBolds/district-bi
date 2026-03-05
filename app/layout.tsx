import type { Metadata } from "next";
import { Inter, Roboto, Open_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import AuthProviders from "./auth/provider";
import { ThemeProvider } from "../components/theme-provider";
import FloatingSupport from "../components/FloatingSupport";
import PWAHandler from "../components/PWAHandler";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

const SAMADHAN_DOMAINS = ["samadhan.dacgangtok.in", "district-bi.vercel.app"];

async function getIsSamadhanDomain(): Promise<boolean> {
  try {
    const hdrs = await headers();
    const host = (hdrs.get("host") || "").split(":")[0];
    return SAMADHAN_DOMAINS.includes(host);
  } catch {
    return false;
  }
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Application - District Administrative Centre",
  description:
    "District Administrative Centre, Gangtok - Government application tracking, management, and citizen services portal.",
  keywords: [
    "government",
    "district",
    "gangtok",
    "administrative",
    "services",
    "citizen",
  ],
  authors: [{ name: "District Administrative Centre" }],
  creator: "District Administrative Centre, Gangtok",
  publisher: "District Administrative Centre, Gangtok",
  metadataBase: new URL("https://your-domain.com"), // Replace with your actual domain
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://your-domain.com", // Replace with your actual domain
    title: "My Application - District Administrative Centre",
    description:
      "District Administrative Centre, Gangtok - Government services portal.",
    siteName: "My Application",
    images: [
      {
        url: "/pwa/android/android-launchericon-512-512.png",
        width: 512,
        height: 512,
        alt: "My Application Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Application - District Administrative Centre",
    description:
      "District Administrative Centre, Gangtok - Government services portal.",
    images: ["/pwa/android/android-launchericon-512-512.png"],
  },
  icons: {
    icon: [
      {
        url: "/pwa/android/android-launchericon-48-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/pwa/android/android-launchericon-96-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/pwa/android/android-launchericon-192-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/pwa/android/android-launchericon-96-96.png",
    apple: [
      {
        url: "/pwa/android/android-launchericon-192-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/pwa/android/android-launchericon-192-192.png",
      },
    ],
  },
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#3b82f6",
  colorScheme: "light",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Application",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isSamadhan = await getIsSamadhanDomain();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="My Application" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="My Application" />

        {/* PWA Icons for iOS */}
        <link
          rel="apple-touch-icon"
          href="/pwa/android/android-launchericon-192-192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/pwa/android/android-launchericon-192-192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/pwa/android/android-launchericon-192-192.png"
        />

        {/* Splash screens for iOS */}
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body
        className={`${inter.variable} ${roboto.variable} ${openSans.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProviders>
            <PWAHandler isSamadhan={isSamadhan}>
              {children}
              <FloatingSupport />
              <PWAInstallPrompt />
              <ServiceWorkerRegistration />
              <Toaster position="bottom-center" richColors />
            </PWAHandler>
          </AuthProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
