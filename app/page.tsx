"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TrackApplicationPage from "./track/page";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  FileText,
  MessageSquare,
  Search,
  ArrowRight,
  Loader2,
  Shield,
  AlertCircle,
  Phone,
  LogIn,
  UserPlus,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SamadhanSession {
  userId: string;
  phone: string;
  name: string;
  pseudonym: string;
}

// SAMADHAN Tracking Component
function SamadhanTrackingSection() {
  const [session, setSession] = useState<SamadhanSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [referenceId, setReferenceId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const router = useRouter();

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
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!referenceId.trim()) {
      toast.error("Please enter a reference ID");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/samadhan/tickets?referenceId=${encodeURIComponent(
          referenceId.trim()
        )}`
      );
      const data = await response.json();

      if (data.success) {
        router.push(`/samadhan/track/${referenceId.trim()}`);
      } else {
        toast.error("Ticket not found. Please check the reference ID.");
      }
    } catch (error) {
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            SAMADHAN
          </h1>
          <p className="text-gray-600 text-lg">
            Track your feedback & grievance status
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-green-100">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Enter Reference ID
              </label>
              <div className="relative">
                <Input
                  placeholder="SAMADHAN-2025-XX-XX-XXXXX"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="h-16 sm:h-14 pl-6 pr-16 text-center font-mono text-base sm:text-lg border-2 rounded-full border-green-200 focus:border-green-500 focus:ring-green-500 bg-white shadow-sm w-full"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <button
                    type="submit"
                    disabled={isSearching || !referenceId.trim()}
                    className="w-11 h-11 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Search className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Reference ID was provided when you submitted your query
              </p>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-gray-400 font-medium">
                or
              </span>
            </div>
          </div>

          {/* Session / Login Section */}
          {isCheckingSession ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            </div>
          ) : session ? (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
                <p className="text-sm text-green-700">
                  Logged in as{" "}
                  <span className="font-semibold">{session.name}</span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/samadhan/dashboard" className="block">
                  <Button className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full gap-2">
                    <Shield className="h-4 w-4" />
                    My Dashboard
                  </Button>
                </Link>
                <Link href="/samadhan/submit" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-full border-2 border-green-200 hover:bg-green-50 hover:border-green-400 gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    New Query
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/samadhan/login" className="block">
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-full border-2 border-green-200 hover:bg-green-50 hover:border-green-400 gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Login / Register
                </Button>
              </Link>
              <Button
                onClick={() => setShowGuestModal(true)}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Submit New Query
              </Button>
            </div>
          )}

          {/* Guest Choice Modal */}
          <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <DialogTitle className="text-center text-xl">
                  Submit New Query
                </DialogTitle>
                <DialogDescription className="text-center">
                  Choose how you want to submit your query
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                {/* Login/Register Option */}
                <Link href="/samadhan/login" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 px-4 rounded-xl border-2 border-green-200 hover:bg-green-50 hover:border-green-400 justify-start gap-4"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserPlus className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-green-800">
                        Login / Register
                      </p>
                      <p className="text-xs text-gray-500 font-normal">
                        Access drafts, attachments & full tracking
                      </p>
                    </div>
                  </Button>
                </Link>

                {/* Guest Option */}
                <Link href="/samadhan/submit" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 px-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 justify-start gap-4"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">
                        Continue as Guest
                      </p>
                      <p className="text-xs text-gray-500 font-normal">
                        Quick submit - limited features
                      </p>
                    </div>
                  </Button>
                </Link>

                {/* Info note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Guest users cannot save drafts or
                    access uploaded attachments later. Register to unlock all
                    features.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-green-100 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-5 w-5 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 text-sm">
              File Grievances
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Report issues with services
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-green-100 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 text-sm">
              Submit Feedback
            </h4>
            <p className="text-xs text-gray-500 mt-1">Share your experience</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-green-100 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 text-sm">Track Status</h4>
            <p className="text-xs text-gray-500 mt-1">
              Real-time resolution updates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toggle Switch Component
function TrackingToggle({
  activeTab,
  setActiveTab,
}: {
  activeTab: "applications" | "samadhan";
  setActiveTab: (tab: "applications" | "samadhan") => void;
}) {
  return (
    <div className="flex justify-center py-4 px-4">
      <div className="relative bg-gray-100 rounded-full p-1 flex gap-1 shadow-inner">
        {/* Animated Background */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-full"
          initial={false}
          animate={{
            x: activeTab === "applications" ? 0 : "100%",
            backgroundColor:
              activeTab === "applications" ? "#1170cd" : "#16a34a",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ width: "calc(50% - 4px)" }}
        />

        <button
          onClick={() => setActiveTab("applications")}
          className={`relative z-10 flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === "applications"
              ? "text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">My Applications</span>
          <span className="sm:hidden">Applications</span>
        </button>

        <button
          onClick={() => setActiveTab("samadhan")}
          className={`relative z-10 flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === "samadhan"
              ? "text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>SAMADHAN</span>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"applications" | "samadhan">(
    "applications"
  );
  const [direction, setDirection] = useState(0);

  const handleTabChange = (newTab: "applications" | "samadhan") => {
    setDirection(newTab === "samadhan" ? 1 : -1);
    setActiveTab(newTab);
  };

  // Handle swipe gestures
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 100;
    const velocity = 500;

    if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      // Swiped left - go to SAMADHAN
      if (activeTab === "applications") {
        handleTabChange("samadhan");
      }
    } else if (info.offset.x > threshold || info.velocity.x > velocity) {
      // Swiped right - go to Applications
      if (activeTab === "samadhan") {
        handleTabChange("applications");
      }
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Toggle */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <TrackingToggle
            activeTab={activeTab}
            setActiveTab={handleTabChange}
          />
        </div>
      </div>

      {/* Main Content with Swipe Animation */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full"
            style={{ touchAction: "pan-y" }}
          >
            {activeTab === "applications" ? (
              <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-[calc(100vh-130px)]">
                <TrackApplicationPage />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 min-h-[calc(100vh-130px)]">
                <SamadhanTrackingSection />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
