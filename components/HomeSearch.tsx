"use client";

import { useState } from "react";
import { Search, TrendingUp } from "lucide-react";

export default function HomeSearch() {
  const [searchQuery, setSearchQuery] = useState("");

  const popularSearches = [
    "Application 1",
    "Application 2",
    "Application 3",
    "Application 4",
  ];

  return (
    <div className="w-full bg-[#1170CD] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-full mx-auto">
        {/* Main Search Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-8">
          {/* Search Input */}
          <div className="flex-1 max-w-2xl">
            <div className="relative flex rounded-lg overflow-hidden shadow-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for government services, certificates, applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 sm:py-4 text-sm sm:text-base bg-card border-none focus:outline-none focus:ring-0 placeholder-muted-foreground text-foreground"
                />
              </div>
              <button className="bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 transition-colors duration-300 flex items-center gap-2">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>

          {/* Popular Searches - Hidden on mobile, visible on larger screens */}
          <div className="hidden lg:flex items-center text-white">
            <div className="flex items-center gap-2 mr-6">
              <TrendingUp className="w-5 h-5 text-amber-300" />
              <span className="font-semibold text-sm whitespace-nowrap">
                MOST SEARCHED
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {popularSearches.map((search, index) => (
                <div key={search} className="flex items-center gap-4">
                  <button
                    onClick={() => setSearchQuery(search)}
                    className="hover:text-amber-200 transition-colors duration-200 whitespace-nowrap"
                  >
                    {search}
                  </button>
                  {index < popularSearches.length - 1 && (
                    <div className="text-blue-300">|</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Popular Searches */}
        <div className="lg:hidden mt-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-300" />
            <span className="text-white font-semibold text-sm">
              Popular Searches
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search) => (
              <button
                key={search}
                onClick={() => setSearchQuery(search)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors duration-200 backdrop-blur-sm"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
