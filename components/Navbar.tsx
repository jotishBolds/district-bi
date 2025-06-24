"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import {
  Menu,
  X,
  MessageSquare,
  Settings,
  Bell,
  Users,
  Download,
} from "lucide-react";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      href: "/services",
      label: "SERVICES",
      icon: <MessageSquare className="w-6 h-6" />,
      description: "Apply for certificates and services",
    },
    {
      href: "/dashboard",
      label: "DASHBOARD",
      icon: <Settings className="w-6 h-6" />,
      description: "Manage your applications",
    },
    {
      href: "/notifications",
      label: "NOTIFICATIONS",
      icon: <Bell className="w-6 h-6" />,
      description: "View updates and alerts",
    },
    {
      href: "/about",
      label: "ABOUT US",
      icon: <Users className="w-6 h-6" />,
      description: "Learn about our services",
    },
    {
      href: "/login",
      label: "LOGIN",
      icon: <Download className="w-6 h-6" />,
      description: "Access your account",
      isPrimary: true,
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="bg-white shadow-lg">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="relative flex flex-col lg:flex-row justify-between items-center w-full">
          {/* Header Section */}
          <div className="flex items-center justify-between w-full lg:w-auto py-4 lg:py-6">
            {/* Logo and Title */}
            <div className="flex items-center lg:mr-auto">
              <div className="flex-shrink-0">
                <Image
                  src="/assets/seal_of_sikkim.png"
                  width={80}
                  height={71}
                  alt="Seal of Sikkim"
                  className="w-16 h-14 sm:w-20 sm:h-[71px] lg:w-[100px] lg:h-[89px]"
                />
              </div>
              <div className="ml-3 lg:ml-5">
                <h1 className="font-extrabold text-lg sm:text-2xl lg:text-[35px] text-[#1170CD] leading-tight">
                  District Administration Centre , Gangtok
                </h1>
                <p className="font-light text-[#658cf9] text-sm sm:text-lg lg:text-[22px] mt-1">
                  Government of Sikkim
                </p>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-[#1170CD] hover:bg-gray-100 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8 py-6 ml-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center space-y-2 transition-all duration-300 hover:scale-105"
              >
                <div
                  className={`p-3 rounded-full border-4 transition-all duration-300 ${
                    item.isPrimary
                      ? "bg-[#1170CD] border-blue-400 group-hover:bg-blue-700 group-hover:border-blue-500"
                      : "bg-gray-400 border-gray-300 group-hover:bg-[#1170CD] group-hover:border-blue-400"
                  }`}
                >
                  <div className="text-white">{item.icon}</div>
                </div>
                <span
                  className={`text-sm font-medium transition-colors duration-300 ${
                    item.isPrimary
                      ? "text-[#1170CD] group-hover:text-blue-700"
                      : "text-gray-500 group-hover:text-[#1170CD]"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Mobile Navigation Menu */}
          <div
            className={`lg:hidden w-full transition-all duration-300 ease-in-out ${
              isMobileMenuOpen
                ? "max-h-96 opacity-100"
                : "max-h-0 opacity-0 overflow-hidden"
            }`}
          >
            <div className="pb-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="grid grid-cols-2 gap-3 p-4">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="group flex flex-col items-center justify-center p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                  >
                    <div
                      className={`flex items-center justify-center p-3 rounded-full mb-2 transition-all duration-300 ${
                        item.isPrimary
                          ? "bg-[#1170CD] group-hover:bg-blue-700"
                          : "bg-gray-400 group-hover:bg-[#1170CD]"
                      }`}
                    >
                      <div className="text-white flex items-center justify-center">
                        {React.cloneElement(item.icon, {
                          className: "w-5 h-5",
                        })}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold text-center transition-colors duration-300 ${
                        item.isPrimary
                          ? "text-[#1170CD] group-hover:text-blue-700"
                          : "text-gray-600 group-hover:text-[#1170CD]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
