"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Shield,
  AlertCircle,
  LogIn,
  UserPlus,
  User,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Search,
  Phone,
  Send,
  ScanLine,
  Lightbulb,
  ChevronRight,
  Eye,
  Lock,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

interface SamadhanSession {
  userId: string;
  phone: string;
  name: string;
  pseudonym: string;
}

export default function SamadhanHomePage() {
  const router = useRouter();
  const [session, setSession] = useState<SamadhanSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Tracking states
  const [trackingId, setTrackingId] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [ticketOwnerPhone, setTicketOwnerPhone] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isFetchingTicket, setIsFetchingTicket] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [ticketNotFound, setTicketNotFound] = useState(false);
  const [isGuestTicket, setIsGuestTicket] = useState(false);

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

  // Helper to mask phone number
  const maskPhoneNumber = (phone: string): string => {
    if (!phone || phone.length < 4) return phone;
    return `${phone.slice(0, 2)}${"*".repeat(phone.length - 4)}${phone.slice(
      -2
    )}`;
  };

  // Handle tracking - fetch ticket to check if it exists and get owner info
  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error("Please enter a tracking ID");
      return;
    }

    setIsFetchingTicket(true);
    setTicketNotFound(false);
    setIsGuestTicket(false);

    try {
      // First, check if ticket exists and get basic info
      const response = await fetch(
        `/api/samadhan/tickets?referenceId=${encodeURIComponent(
          trackingId.trim()
        )}`
      );
      const data = await response.json();

      if (!data.success) {
        setTicketNotFound(true);
        toast.error("Ticket not found", {
          description: "Please check the reference ID and try again.",
        });
        return;
      }

      // Check if this is a guest ticket (no citizenId means guest submission)
      if (!data.data.citizenId) {
        setIsGuestTicket(true);
        toast.info("Guest ticket detected", {
          description:
            "Guest submissions cannot be tracked. Use Query Status to request information about your submission.",
          action: {
            label: "Query Status",
            onClick: () => router.push("/samadhan/query-status"),
          },
          duration: 6000,
        });
        return;
      }

      // Ticket exists and has a registered citizen - proceed with OTP flow
      // Get the owner phone for OTP verification
      const ownerResponse = await fetch(
        `/api/samadhan/tickets/${trackingId.trim()}/owner-phone`
      );
      const ownerData = await ownerResponse.json();

      if (!ownerResponse.ok) {
        toast.error(ownerData.message || "Failed to fetch ticket owner info");
        return;
      }

      // Set the owner phone (masked for display) and show OTP modal
      setTicketOwnerPhone(ownerData.phone);
      setMaskedPhone(maskPhoneNumber(ownerData.phone));
      setShowOtpModal(true);

      // Auto-send OTP
      await sendOtpToOwner(ownerData.phone);
    } catch (error) {
      toast.error("Failed to fetch ticket information");
    } finally {
      setIsFetchingTicket(false);
    }
  };

  // Send OTP to ticket owner's phone
  const sendOtpToOwner = async (phone: string) => {
    setIsSendingOtp(true);
    try {
      const response = await fetch("/api/samadhan/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          action: "send-otp",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
        toast.success("OTP sent to registered phone");
      } else {
        toast.error(data.message || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP and redirect to ticket
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch("/api/samadhan/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: ticketOwnerPhone.replace(/\D/g, ""),
          otp,
          action: "verify-otp",
          verifyOnly: true,
          referenceId: trackingId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Verified! Redirecting to ticket...");
        setShowOtpModal(false);
        // Navigate to ticket with verified status
        router.push(`/samadhan/track/${trackingId}?verified=true`);
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Reset modal states
  const resetOtpModal = () => {
    setShowOtpModal(false);
    setOtpSent(false);
    setOtp("");
    setTicketOwnerPhone("");
    setMaskedPhone("");
  };

  // Handle enter key for tracking input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTrack();
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* HERO SECTION - Full Width Tracking */}
      <section className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="text-white space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Shield className="w-4 h-4" />
                <span>Secure & Transparent</span>
              </div>

              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                Track Your
                <span className="block text-green-200">Grievance Status</span>
              </h1>

              <p className="text-lg text-green-100 max-w-lg">
                Enter your reference ID to instantly check the status of your
                submitted query. Secure OTP verification ensures only you can
                access your ticket details.
              </p>

              {/* Features list */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Real-time Updates</span>
                </div>
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-sm">OTP Secured</span>
                </div>
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Full Transparency</span>
                </div>
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Status Alerts</span>
                </div>
              </div>
            </div>

            {/* Right side - Tracking Card */}
            <div className="lg:pl-8">
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  {/* Tracking Icon */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
                      <ScanLine className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Track Your Ticket
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Enter your reference ID below
                    </p>
                  </div>

                  {/* Search Input */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="trackingInput" className="sr-only">
                        Reference ID
                      </Label>
                      <div className="relative">
                        {trackingId && (
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                        )}
                        <Input
                          id="trackingInput"
                          placeholder="SAMADHAN-2025-XX-XX-XXXXX"
                          value={trackingId}
                          onChange={(e) => {
                            setTrackingId(e.target.value.toUpperCase());
                            setTicketNotFound(false);
                            setIsGuestTicket(false);
                          }}
                          onKeyPress={handleKeyPress}
                          className={`h-14 ${
                            trackingId ? "pl-12" : "pl-4"
                          } pr-14 text-center font-mono text-base border-2 rounded-full transition-all ${
                            ticketNotFound || isGuestTicket
                              ? "border-red-300 bg-red-50 focus:border-red-500"
                              : trackingId
                              ? "border-green-300 bg-green-50 focus:border-green-500"
                              : "border-gray-200 focus:border-green-500"
                          }`}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <button
                            type="button"
                            onClick={handleTrack}
                            disabled={isFetchingTicket || !trackingId.trim()}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                              ticketNotFound || isGuestTicket
                                ? "bg-red-500"
                                : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            }`}
                          >
                            {isFetchingTicket ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : ticketNotFound || isGuestTicket ? (
                              <AlertCircle className="w-5 h-5 text-white" />
                            ) : trackingId ? (
                              <ArrowRight className="w-5 h-5 text-white" />
                            ) : (
                              <Search className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error Messages */}
                    {ticketNotFound && (
                      <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg px-4 py-2">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Ticket not found. Please check the reference ID.
                      </p>
                    )}

                    {isGuestTicket && (
                      <div className="text-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <p className="text-sm text-amber-800 font-medium">
                          Guest Submission Detected
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Guest tickets cannot be tracked. Use Query Status to
                          inquire about your submission.
                        </p>
                        <Link href="/samadhan/query-status">
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                          >
                            Go to Query Status
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Help text */}
                    {!ticketNotFound && !isGuestTicket && (
                      <p className="text-xs text-gray-500 text-center">
                        Reference ID was provided when you submitted your query
                      </p>
                    )}
                  </div>

                  {/* Logged in user shortcut */}
                  {session && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <Link href="/samadhan/dashboard">
                        <Button
                          variant="outline"
                          className="w-full rounded-full border-2 border-green-200 hover:bg-green-50 gap-2"
                        >
                          <User className="w-4 h-4" />
                          View All My Tickets
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* SECOND SECTION - Portal Info & Actions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            {/* Logo */}
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <MessageSquare className="h-10 w-10 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              SAMADHAN
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Citizen Grievance & Feedback Portal
            </p>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Submit your grievances, feedback, and suggestions to the District
              Administrative Centre, Gangtok. We ensure timely resolution and
              transparent communication.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {isCheckingSession ? (
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            ) : session ? (
              <>
                <Link href="/samadhan/dashboard">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full gap-2 text-base shadow-lg"
                  >
                    <Shield className="h-5 w-5" />
                    My Dashboard
                  </Button>
                </Link>
                <Link href="/samadhan/submit">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-8 rounded-full border-2 border-green-300 hover:bg-green-50 hover:border-green-400 gap-2 text-base"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Submit New Query
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/samadhan/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full gap-2 text-base shadow-lg"
                  >
                    <LogIn className="h-5 w-5" />
                    Login / Register
                  </Button>
                </Link>
                <Button
                  size="lg"
                  onClick={() => setShowGuestModal(true)}
                  variant="outline"
                  className="w-full sm:w-auto h-14 px-8 rounded-full border-2 border-green-300 hover:bg-green-50 hover:border-green-400 gap-2 text-base"
                >
                  <Send className="h-5 w-5" />
                  Submit Query
                </Button>
              </>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  File Grievances
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <CardDescription className="text-gray-600">
                  Report issues with government services and get timely
                  resolution
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  Submit Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <CardDescription className="text-gray-600">
                  Share your experience and help us improve our services
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <Lightbulb className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  Share Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <CardDescription className="text-gray-600">
                  Propose ideas to enhance public services and administration
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION - Professional Redesign */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps to get your grievance addressed efficiently
            </p>
          </div>

          <div className="relative">
            {/* Progress line - desktop only */}
            <div className="hidden lg:block absolute top-24 left-[15%] right-[15%] h-1 bg-gradient-to-r from-green-200 via-green-400 to-green-200 rounded-full"></div>

            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Step 1 */}
              <div className="relative group">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 h-full">
                  {/* Step number */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-white z-10">
                    1
                  </div>

                  <div className="pt-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <FileText className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Submit Your Query
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Fill out our simple form with your grievance, feedback, or
                      suggestion. Attach supporting documents if needed.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Grievance
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Feedback
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Suggestion
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 h-full">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-white z-10">
                    2
                  </div>

                  <div className="pt-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <Eye className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Track Progress
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Use your reference ID to track real-time status. Receive
                      SMS updates as your query moves through the system.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        <Clock className="h-3 w-3 mr-1" /> Real-time Updates
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                        <Bell className="h-3 w-3 mr-1" /> SMS Alerts
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 h-full">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-white z-10">
                    3
                  </div>

                  <div className="pt-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Get Resolution
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Receive timely resolution with detailed updates. Accept
                      the resolution or file an appeal if not satisfied.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Accept
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                        <AlertCircle className="h-3 w-3 mr-1" /> Appeal
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link href="/samadhan/submit">
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full px-8 h-12 shadow-lg"
              >
                Submit Your Query Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Why Register?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Create an account to unlock full features
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Track Status</h4>
              <p className="text-sm text-gray-600">
                Track all your submitted queries in one dashboard
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Attachments</h4>
              <p className="text-sm text-gray-600">
                Upload and view supporting documents securely
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Bell className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Notifications
              </h4>
              <p className="text-sm text-gray-600">
                Get SMS alerts when your ticket status changes
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Respond</h4>
              <p className="text-sm text-gray-600">
                Respond to officer queries and provide additional info
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Choice Modal */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-7 w-7 text-white" />
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
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserPlus className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-green-800 text-sm">
                    Login / Register
                  </p>
                  <p className="text-xs text-gray-500 font-normal">
                    Track status, access attachments & get notifications
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-green-600" />
              </Button>
            </Link>

            {/* Guest Option */}
            <Link href="/samadhan/submit" className="block">
              <Button
                variant="outline"
                className="w-full h-auto py-4 px-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 justify-start gap-4"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-800 text-sm">
                    Continue as Guest
                  </p>
                  <p className="text-xs text-gray-500 font-normal">
                    Quick submit - use Query Status to check later
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Button>
            </Link>

            {/* Info note */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Guest users cannot directly track their
                queries. Register for full tracking capabilities.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={resetOtpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-center text-xl">
              Verify Ownership
            </DialogTitle>
            <DialogDescription className="text-center">
              Verify your phone number to access ticket: <br />
              <span className="font-mono font-semibold text-green-700">
                {trackingId}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isSendingOtp ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-3" />
                <p className="text-gray-600">
                  Sending OTP to registered phone...
                </p>
              </div>
            ) : otpSent ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">OTP Sent</span>
                  </div>
                  <p className="text-sm text-green-600">
                    Sent to: +91 {maskedPhone}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-center block">Enter 6-digit OTP</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || otp.length !== 6}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & View Ticket"
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => sendOtpToOwner(ticketOwnerPhone)}
                  disabled={isSendingOtp}
                  className="w-full text-sm"
                >
                  Resend OTP
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Preparing verification...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
