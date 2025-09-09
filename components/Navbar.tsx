"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Menu, X, LogIn } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="bg-background shadow-sm border-b border-border">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 sm:h-20">
          {/* Left: Logo and Title */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex-shrink-0">
              <Image
                src="/assets/seal_of_sikkim.png"
                width={40}
                height={40}
                alt="Seal of Sikkim"
                className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12"
              />
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <h1 className="font-bold text-sm sm:text-base lg:text-lg text-[#1170CD] leading-tight truncate">
                District Administrative Centre, Gangtok
              </h1>
              <p className="font-light text-[#658cf9] text-xs sm:text-sm lg:text-base hidden sm:block">
                Government of Sikkim
              </p>
            </div>
          </div>

          {/* Desktop: Three Images and Login/UserNav */}
          <div className="hidden sm:flex items-center space-x-4 flex-shrink-0">
            {/* Three rounded images */}
            <div className="flex items-center space-x-2">
              <Image
                src="/assets/skm-header.png"
                width={100}
                height={100}
                quality={100}
                alt="Image 1"
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
              />
              <Image
                src="/assets/skm-gov.png"
                width={100}
                height={100}
                alt="Image 2"
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
              />
              <Image
                src="/assets/skm-gov-hcm.png"
                width={100}
                height={100}
                alt="Image 3"
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
              />
            </div>

            {/* Show Dashboard and Logout if logged in, else show Login button */}
            {status === "authenticated" && session?.user ? (
              <div className="flex items-center space-x-2 ml-2">
                <Button
                  asChild
                  variant="ghost"
                  size="default"
                  className="text-[#1170CD] font-medium"
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="border-[#1170CD] text-[#1170CD] hover:bg-[#1170CD] hover:text-white font-medium"
                  onClick={() =>
                    signOut({ callbackUrl: "/login?expired=true" })
                  }
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                asChild
                variant="outline"
                size="default"
                className="group relative border-2 border-[#1170CD] bg-card text-[#1170CD] hover:bg-[#1170CD] hover:text-white font-medium px-6 py-2.5 sm:px-7 sm:py-3 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-[#1170CD]/20 hover:border-[#0d5aa7] focus:ring-2 focus:ring-[#1170CD]/30 focus:ring-offset-2 rounded-lg"
              >
                <Link href="/login" className="flex items-center space-x-2.5">
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-105" />
                  <span className="text-sm sm:text-base font-medium tracking-wide">
                    Portal Login
                  </span>
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile: Toggle Button */}
          <div className="sm:hidden flex items-center">
            <Button
              onClick={toggleMobileMenu}
              variant="ghost"
              size="sm"
              className="p-2 text-[#1170CD] hover:bg-muted/50"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div
          className={`sm:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen
              ? "max-h-40 opacity-100 border-t border-gray-200"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="py-4 px-2 bg-muted/30">
            <div className="flex flex-col items-center space-y-4">
              {/* Three rounded images in mobile */}
              <div className="flex items-center space-x-3">
                <Image
                  src="/assets/skm-header.png"
                  width={100}
                  height={100}
                  quality={100}
                  alt="Image 1"
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                />
                <Image
                  src="/assets/skm-gov.png"
                  width={100}
                  height={100}
                  alt="Image 2"
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                />
                <Image
                  src="/assets/skm-gov-hcm.png"
                  width={100}
                  height={100}
                  alt="Image 3"
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                />
              </div>

              {/* Mobile: Show Dashboard and Logout if logged in, else show Login button */}
              {status === "authenticated" && session?.user ? (
                <div className="w-full flex flex-col items-center space-y-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="default"
                    className="text-[#1170CD] font-medium w-full max-w-xs"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/dashboard" className="w-full text-center">
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className="border-[#1170CD] text-[#1170CD] hover:bg-[#1170CD] hover:text-white font-medium w-full max-w-xs"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut({ callbackUrl: "/login?expired=true" });
                    }}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="group relative border-2 border-[#1170CD] bg-card text-[#1170CD] hover:bg-[#1170CD] hover:text-white font-medium px-6 py-2.5 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-[#1170CD]/20 hover:border-[#0d5aa7] focus:ring-2 focus:ring-[#1170CD]/30 focus:ring-offset-2 rounded-lg w-full max-w-xs"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link
                    href="/login"
                    className="flex items-center justify-center space-x-2.5"
                  >
                    <LogIn className="w-4 h-4 transition-transform duration-300 group-hover:scale-105" />
                    <span className="text-sm font-medium tracking-wide">
                      Portal Login
                    </span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
