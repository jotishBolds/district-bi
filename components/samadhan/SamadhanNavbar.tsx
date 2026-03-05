"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LogIn,
  HelpCircle,
  User,
  LogOut,
  MessageSquare,
  LayoutDashboard,
  Home,
  FileSearch,
  Send,
  ChevronDown,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SamadhanSession {
  userId: string;
  phone: string;
  name: string;
  pseudonym: string;
}

export default function SamadhanNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<SamadhanSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check SAMADHAN session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/samadhan/auth?action=session");
        const data = await response.json();
        if (data.authenticated && data.session) {
          setSession(data.session);
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/samadhan/auth?action=logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setSession(null);
        window.location.replace("/samadhan");
      } else {
        console.error("Logout failed:", data.message);
        setSession(null);
        window.location.replace("/samadhan");
      }
    } catch (error) {
      console.error("Logout error:", error);
      setSession(null);
      window.location.replace("/samadhan");
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100"
          : "bg-white shadow-sm"
      }`}
    >
      {/* Top Bar - Government Info */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-700 text-white py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Government of Sikkim
            </span>
            <span className="text-green-200">|</span>
            <span>District Administrative Centre, Gangtok</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-200">Toll Free: 1800-XXX-XXXX</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Left: Logo and Title */}
          <Link
            href="/samadhan"
            className="flex items-center gap-3 min-w-0 group"
          >
            {/* Logo Container */}
            <div className="relative">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <MessageSquare className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              {/* Decorative ring */}
              <div className="absolute -inset-1 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity -z-10"></div>
            </div>

            {/* Title */}
            <div className="min-w-0">
              <h1 className="font-bold text-xl lg:text-2xl text-gray-900 leading-tight tracking-tight">
                SAMADHAN
              </h1>
              <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                Citizen Grievance Portal
              </p>
            </div>
          </Link>

          {/* Center: Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/samadhan">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-green-700 hover:bg-green-50 font-medium rounded-full px-4"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>

            <Link href="/samadhan/submit">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-green-700 hover:bg-green-50 font-medium rounded-full px-4"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Query
              </Button>
            </Link>

            <Link href="/samadhan/track">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-green-700 hover:bg-green-50 font-medium rounded-full px-4"
              >
                <FileSearch className="w-4 h-4 mr-2" />
                Track Ticket
              </Button>
            </Link>
          </div>

          {/* Right: Government Seal + User Section */}
          <div className="flex items-center gap-3">
            {/* Government Seal */}
            <div className="hidden md:flex items-center">
              <Image
                src="/assets/seal_of_sikkim.png"
                width={48}
                height={48}
                quality={95}
                alt="Seal of Sikkim"
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover border-2 border-green-100 shadow-sm"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-gray-200"></div>

            {/* User Section */}
            {isLoading ? (
              <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-green-50 rounded-full px-3 h-10"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                      {session.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden lg:inline text-gray-700 font-medium max-w-[100px] truncate">
                      {session.name}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl shadow-xl border-0"
                >
                  <div className="px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-t-xl">
                    <p className="text-sm font-semibold text-gray-900">
                      {session.name}
                    </p>
                    <p className="text-xs text-gray-500">{session.phone}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/samadhan/dashboard"
                      className="cursor-pointer flex items-center gap-2 py-2"
                    >
                      <LayoutDashboard className="w-4 h-4 text-green-600" />
                      <span>My Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/samadhan/profile"
                      className="cursor-pointer flex items-center gap-2 py-2"
                    >
                      <User className="w-4 h-4 text-green-600" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center gap-2 py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/samadhan/login">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-full px-5 shadow-md hover:shadow-lg transition-all"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 py-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
            <Link
              href="/samadhan"
              onClick={toggleMobileMenu}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </Link>

            <Link
              href="/samadhan/submit"
              onClick={toggleMobileMenu}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
            >
              <Send className="w-5 h-5" />
              <span className="font-medium">Submit Query</span>
            </Link>

            <Link
              href="/samadhan/track"
              onClick={toggleMobileMenu}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
            >
              <FileSearch className="w-5 h-5" />
              <span className="font-medium">Track Ticket</span>
            </Link>

            {session ? (
              <>
                <div className="border-t border-gray-100 my-2"></div>
                <Link
                  href="/samadhan/dashboard"
                  onClick={toggleMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-medium">My Dashboard</span>
                </Link>
                <Link
                  href="/samadhan/profile"
                  onClick={toggleMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </Link>
                <button
                  onClick={() => {
                    toggleMobileMenu();
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <div className="border-t border-gray-100 my-2"></div>
                <Link href="/samadhan/login" onClick={toggleMobileMenu}>
                  <Button className="w-full mx-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login / Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
