"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TrackApplicationPage from "./track/page";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Main Content - Track Application only */}
      <div className="flex-1 overflow-hidden">
        <div className="w-full">
          <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-[calc(100vh-130px)]">
            <TrackApplicationPage />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
