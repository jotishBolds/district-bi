import type { Metadata } from "next";
import { Inter, Roboto, Open_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProviders from "./auth/provider";
import { ThemeProvider } from "../components/theme-provider";
import FloatingSupport from "../components/FloatingSupport";

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
  title: "Track my application - Gangtok District",
  description:
    "District-level government application tracking, management, and citizen services portal.",
  icons: {
    icon: [
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
    ],
    shortcut: "/favicon_io/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/favicon_io/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/favicon_io/android-chrome-512x512.png",
      },
    ],
  },
  manifest: "/favicon_io/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${roboto.variable} ${openSans.variable} antialiased`}
      >
        <AuthProviders>
          {children}
          <FloatingSupport />
          <Toaster position="bottom-center" richColors />
        </AuthProviders>
      </body>
    </html>
  );
}
