"use client";

import React, { useState, useRef, useEffect } from "react";
import { Languages } from "lucide-react";
import {
  useSamadhanI18n,
  LOCALE_LABELS,
  type SamadhanLocale,
} from "@/lib/samadhan-i18n";

const locales: SamadhanLocale[] = ["en", "hi", "ne"];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useSamadhanI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-full border border-gray-200 bg-white hover:bg-green-50 hover:border-green-300 text-gray-700 transition-all duration-200 shadow-sm"
        aria-label="Change language"
        title="Change language"
      >
        <Languages className="w-4 h-4 text-green-600" />
        <span className="hidden sm:inline text-xs font-semibold">
          {LOCALE_LABELS[locale].flag}
        </span>
        <span className="sm:hidden text-xs font-semibold">
          {LOCALE_LABELS[locale].flag}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {locale === "hi" ? "भाषा" : locale === "ne" ? "भाषा" : "Language"}
            </p>
          </div>
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                locale === loc
                  ? "bg-green-50 text-green-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold shrink-0">
                {LOCALE_LABELS[loc].flag}
              </span>
              <span className="flex flex-col items-start">
                <span className="leading-tight">
                  {LOCALE_LABELS[loc].nativeLabel}
                </span>
                {loc !== "en" && (
                  <span className="text-[10px] text-gray-400 leading-tight">
                    {LOCALE_LABELS[loc].label}
                  </span>
                )}
              </span>
              {locale === loc && (
                <span className="ml-auto w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
