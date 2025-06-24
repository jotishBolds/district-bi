"use client";

import React from "react";

const AnimatedIndianFlagBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100" />

      {/* Main flag wave animation */}
      <div className="absolute inset-0 opacity-20">
        {/* Saffron/Orange section */}
        <div className="absolute top-0 left-0 w-full h-1/3 overflow-hidden">
          <div className="flag-wave h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400"></div>
        </div>

        {/* White section with Ashoka Chakra area */}
        <div className="absolute top-1/3 left-0 w-full h-1/3 overflow-hidden">
          <div className="flag-wave h-full bg-gradient-to-r from-white via-blue-50 to-white">
            {/* Subtle chakra representation */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 opacity-30">
              <div className="chakra-spin w-full h-full border-2 border-blue-600 rounded-full relative">
                {/* Chakra spokes */}
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-0.5 h-6 bg-blue-600 top-1/2 left-1/2 origin-bottom"
                    style={{
                      transform: `translate(-50%, -100%) rotate(${i * 15}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Green section */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 overflow-hidden">
          <div className="flag-wave h-full bg-gradient-to-r from-green-600 via-green-500 to-green-600"></div>
        </div>
      </div>

      {/* Secondary wave layers for depth */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-1/3 overflow-hidden">
          <div className="flag-wave-2 h-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500"></div>
        </div>
        <div className="absolute top-1/3 left-0 w-full h-1/3 overflow-hidden">
          <div className="flag-wave-2 h-full bg-gradient-to-r from-blue-100 via-white to-blue-100"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/3 overflow-hidden">
          <div className="flag-wave-2 h-full bg-gradient-to-r from-green-700 via-green-600 to-green-700"></div>
        </div>
      </div>

      {/* Subtle overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/30" />

      {/* CSS for flag wave animations */}
      <style jsx>{`
        .flag-wave {
          background-size: 200% 100%;
          animation: wave 4s ease-in-out infinite;
          clip-path: polygon(
            0% 0%,
            100% 0%,
            100% 85%,
            95% 90%,
            90% 95%,
            85% 90%,
            80% 95%,
            75% 85%,
            70% 95%,
            65% 90%,
            60% 95%,
            55% 85%,
            50% 95%,
            45% 90%,
            40% 95%,
            35% 85%,
            30% 95%,
            25% 90%,
            20% 85%,
            15% 90%,
            10% 85%,
            5% 90%,
            0% 85%
          );
        }

        .flag-wave-2 {
          background-size: 200% 100%;
          animation: wave-reverse 5s ease-in-out infinite;
          clip-path: polygon(
            0% 15%,
            5% 10%,
            10% 15%,
            15% 10%,
            20% 15%,
            25% 10%,
            30% 5%,
            35% 15%,
            40% 5%,
            45% 10%,
            50% 5%,
            55% 15%,
            60% 5%,
            65% 10%,
            70% 5%,
            75% 15%,
            80% 5%,
            85% 10%,
            90% 5%,
            95% 10%,
            100% 15%,
            100% 100%,
            0% 100%
          );
        }

        @keyframes wave {
          0%,
          100% {
            background-position: 0% 50%;
            clip-path: polygon(
              0% 0%,
              100% 0%,
              100% 85%,
              95% 90%,
              90% 95%,
              85% 90%,
              80% 95%,
              75% 85%,
              70% 95%,
              65% 90%,
              60% 95%,
              55% 85%,
              50% 95%,
              45% 90%,
              40% 95%,
              35% 85%,
              30% 95%,
              25% 90%,
              20% 85%,
              15% 90%,
              10% 85%,
              5% 90%,
              0% 85%
            );
          }
          25% {
            background-position: 25% 50%;
            clip-path: polygon(
              0% 0%,
              100% 0%,
              100% 90%,
              95% 85%,
              90% 90%,
              85% 95%,
              80% 90%,
              75% 95%,
              70% 85%,
              65% 95%,
              60% 90%,
              55% 95%,
              50% 85%,
              45% 95%,
              40% 90%,
              35% 95%,
              30% 85%,
              25% 95%,
              20% 90%,
              15% 85%,
              10% 90%,
              5% 85%,
              0% 90%
            );
          }
          50% {
            background-position: 50% 50%;
            clip-path: polygon(
              0% 0%,
              100% 0%,
              100% 95%,
              95% 90%,
              90% 85%,
              85% 90%,
              80% 85%,
              75% 90%,
              70% 95%,
              65% 85%,
              60% 95%,
              55% 90%,
              50% 95%,
              45% 85%,
              40% 95%,
              35% 90%,
              30% 95%,
              25% 85%,
              20% 95%,
              15% 90%,
              10% 95%,
              5% 90%,
              0% 95%
            );
          }
          75% {
            background-position: 75% 50%;
            clip-path: polygon(
              0% 0%,
              100% 0%,
              100% 90%,
              95% 95%,
              90% 90%,
              85% 95%,
              80% 90%,
              75% 95%,
              70% 90%,
              65% 95%,
              60% 85%,
              55% 95%,
              50% 90%,
              45% 95%,
              40% 85%,
              35% 95%,
              30% 90%,
              25% 95%,
              20% 85%,
              15% 95%,
              10% 90%,
              5% 95%,
              0% 90%
            );
          }
        }

        @keyframes wave-reverse {
          0%,
          100% {
            background-position: 100% 50%;
          }
          50% {
            background-position: 0% 50%;
          }
        }

        .chakra-spin {
          animation: spin 20s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .flag-wave,
          .flag-wave-2 {
            animation-duration: 3s;
          }

          .chakra-spin {
            width: 3rem;
            height: 3rem;
            animation-duration: 15s;
          }
        }

        @media (max-width: 480px) {
          .chakra-spin {
            width: 2.5rem;
            height: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedIndianFlagBackground;
