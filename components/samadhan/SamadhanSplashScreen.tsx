"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SamadhanSplashScreenProps {
  onFinishAction: () => void;
  minDuration?: number;
}

export default function SamadhanSplashScreen({
  onFinishAction,
  minDuration = 2000,
}: SamadhanSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinishAction, 300); // Wait for fade out animation
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinishAction]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-white flex flex-col items-center justify-center transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Background gradient - Blue/Orange for government */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 opacity-80" />

      {/* Tricolor accent at top */}
      <div className="absolute top-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Government Emblem and Sikkim Seal */}
        <div className="flex items-center justify-center gap-4 md:gap-6 mb-6">
          {/* Government Emblem */}

          {/* Seal of Sikkim */}
          <div className="relative">
            <div className="w-16 h-16 md:w-24 md:h-24 relative">
              <Image
                src="/assets/seal_of_sikkim.png"
                alt="Seal of Sikkim"
                width={96}
                height={96}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            {/* Pulsing effect */}
            <div className="absolute inset-0 w-16 h-16 md:w-24 md:h-24 rounded-full bg-blue-400 opacity-15 animate-ping" />
          </div>
        </div>

        {/* App Name */}
        <div
          className="text-center mb-6 px-4 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            SAMADHAN
          </h1>
          <p className="text-sm md:text-base text-gray-600 max-w-xs leading-relaxed">
            Citizen Grievance Redressal Portal
          </p>
          <p className="text-xs text-gray-500 mt-1">
            District Administrative Centre, Gangtok
          </p>
        </div>

        {/* Tagline */}
        <div
          className="text-center mb-8 animate-fade-in-up"
          style={{ animationDelay: "0.6s" }}
        >
          <p className="text-sm text-blue-600 font-medium italic">
            &quot;Your Voice Matters&quot;
          </p>
        </div>

        {/* Loading Spinner */}
        <div
          className="flex flex-col items-center animate-fade-in-up"
          style={{ animationDelay: "0.9s" }}
        >
          {/* Circle Spinner */}
          <div className="relative mb-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>

          {/* Loading Text */}
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium">Loading...</p>
          </div>
        </div>

        {/* Animated Dots */}
        <div
          className="flex space-x-1 mt-4 animate-fade-in-up"
          style={{ animationDelay: "1.2s" }}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-2 h-2 bg-blue-500 rounded-full"
              style={{
                animation: `bounce 1.4s ease-in-out ${index * 0.16}s infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer branding */}
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-gray-400">Government of Sikkim</p>
      </div>

      {/* Tricolor accent at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white border-t border-gray-200" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <style jsx>{`
        @keyframes bounce {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-8px);
          }
        }
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
