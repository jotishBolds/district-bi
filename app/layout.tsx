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
