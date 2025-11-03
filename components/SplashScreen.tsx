"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onFinishAction: () => void;
  minDuration?: number;
}

export default function SplashScreen({
  onFinishAction,
  minDuration = 2000,
}: SplashScreenProps) {
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
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-60" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 md:w-32 md:h-32 relative">
            <Image
              src="/assets/skm-logo.png"
              alt="My Application Logo"
              width={128}
              height={128}
              className="w-full h-full object-contain transform transition-transform duration-1000 hover:scale-105"
              priority
              quality={95}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyDnyoHiyj5HPJNvJiUAkmFcpZgKBqNbDmBqNSmBvE3gBpUNmBvNQxEwY6jZKxGgBAKDzoooopmfwrTwTLPLrWLrLvb3TbxpLPPeq2SFE8tnxZYNRtTaxCtV7xG4+7TDFIwzz6Lsj1/xHKZA4CQOp8bj8wXPdm/g9wNOo8TYnhFwR6xFw/hfCYFYJqzYQiP0="
            />
            {/* Animated ring */}
            {/* <div className="absolute inset-0 w-full h-full rounded-full border-4 border-blue-200 animate-spin opacity-60" style={{ animationDuration: '3s' }} /> */}
          </div>
          {/* Pulsing effect */}
          <div className="absolute inset-0 w-24 h-24 md:w-32 md:h-32 rounded-full bg-blue-400 opacity-20 animate-ping" />
        </div>

        {/* App Name */}
        <div
          className="text-center mb-8 px-4 animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            My Application
          </h1>
          <p className="text-sm md:text-base text-gray-600 max-w-xs leading-relaxed">
            District Administrative Centre, Gangtok.
          </p>
        </div>

        {/* Loading Spinner */}
        <div
          className="flex flex-col items-center animate-fade-in-up"
          style={{ animationDelay: "1s" }}
        >
          {/* Circle Spinner */}
          <div className="relative mb-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>

          {/* Loading Text */}
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium">Loading...</p>
          </div>
        </div>

        {/* Animated Dots */}
        <div
          className="flex space-x-1 mt-6 animate-fade-in-up"
          style={{ animationDelay: "1.5s" }}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-2 h-2 bg-blue-500 rounded-full"
              style={{
                animation: `bounce 1.4s ease-in-out ${
                  index * 0.16
                }s infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes bounce {
          0% {
            transform: translateY(0px);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0px);
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
