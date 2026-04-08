"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Shield,
  AlertCircle,
  LogIn,
  User,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Search,
  Send,
  ScanLine,
  ChevronRight,
  Eye,
  Bell,
  Phone,
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
import { toast } from "sonner";
import { OTPVerificationModal } from "@/components/samadhan/OTPVerificationModal";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

interface SamadhanSession {
  userId: string;
  phone: string;
  name: string;
  pseudonym: string;
}

interface TicketCheckResult {
  exists: boolean;
  isGuestTicket: boolean;
  citizenPhone: string | null;
  isRegisteredPhone: boolean;
  queryType: "FEEDBACK" | "GRIEVANCE" | null;
}

export default function SamadhanHomePage() {
  const router = useRouter();
  const { t } = useSamadhanI18n();
  const [session, setSession] = useState<SamadhanSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Tracking states
  const [trackingId, setTrackingId] = useState("");
  const [ticketNotFound, setTicketNotFound] = useState(false);
  const [isCheckingTicket, setIsCheckingTicket] = useState(false);

  // OTP Verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingTicketPhone, setPendingTicketPhone] = useState<string | null>(
    null,
  );
  const [pendingTrackingId, setPendingTrackingId] = useState<string>("");

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

  // Check if ticket requires OTP verification
  const checkTicketForOtp = async (
    refId: string,
  ): Promise<TicketCheckResult | null> => {
    try {
      const response = await fetch(
        `/api/samadhan/tickets/check?referenceId=${encodeURIComponent(refId)}`,
      );
      const data = await response.json();

      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("Ticket check error:", error);
      return null;
    }
  };

  // Handle tracking - check if OTP is needed
  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error("Please enter a tracking ID");
      return;
    }

    const trimmedId = trackingId.trim();
    setIsCheckingTicket(true);
    setTicketNotFound(false);

    try {
      // First check if the ticket exists and get its info
      const ticketInfo = await checkTicketForOtp(trimmedId);

      if (!ticketInfo || !ticketInfo.exists) {
        setTicketNotFound(true);
        toast.error("Ticket not found. Please check the reference ID.");
        return;
      }

      // Feedback submissions cannot be tracked - only viewable in dashboard
      if (ticketInfo.queryType === "FEEDBACK") {
        toast.error(
          "Feedback submissions cannot be tracked. You can view them in your dashboard.",
        );
        return;
      }

      // Case 1: User is logged in - check if they own the ticket
      if (session) {
        // If logged in user's phone matches ticket phone, allow direct access
        if (ticketInfo.citizenPhone === session.phone) {
          router.push(`/samadhan/track/${trimmedId}?verified=true`);
          return;
        }
        // If ticket is a guest ticket (no registered phone), allow viewing
        if (ticketInfo.isGuestTicket && !ticketInfo.isRegisteredPhone) {
          router.push(`/samadhan/track/${trimmedId}`);
          return;
        }
        // Otherwise, require OTP verification for registered phone tickets
        if (ticketInfo.citizenPhone && ticketInfo.isRegisteredPhone) {
          setPendingTicketPhone(ticketInfo.citizenPhone);
          setPendingTrackingId(trimmedId);
          setShowOtpModal(true);
          return;
        }
        // Default: allow access for other cases
        router.push(`/samadhan/track/${trimmedId}`);
        return;
      }

      // Case 2: User is NOT logged in
      // If ticket has a registered phone number, require OTP
      if (ticketInfo.citizenPhone && ticketInfo.isRegisteredPhone) {
        setPendingTicketPhone(ticketInfo.citizenPhone);
        setPendingTrackingId(trimmedId);
        setShowOtpModal(true);
        return;
      }

      // Case 3: Guest ticket or no phone - allow direct access
      router.push(`/samadhan/track/${trimmedId}`);
    } catch (error) {
      toast.error("Failed to check ticket. Please try again.");
    } finally {
      setIsCheckingTicket(false);
    }
  };

  // Handle OTP verification success
  const handleOtpVerified = (phone: string, token?: string) => {
    // Navigate to tracking page with verification token
    router.push(`/samadhan/track/${pendingTrackingId}?verified=true`);
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
                <span>{t("common.secureTransparent")}</span>
              </div>

              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                {t("home.heroTitle1")}
                <span className="block text-green-200">
                  {t("home.heroTitle2")}
                </span>
              </h1>

              <p className="text-lg text-green-100 max-w-lg">
                {t("home.heroDescription")}
              </p>

              {/* Features list */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{t("home.realTimeUpdates")}</span>
                </div>
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{t("home.instantTracking")}</span>
                </div>
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{t("home.fullTransparency")}</span>
                </div>
                <div className="flex items-center gap-2 text-green-100">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{t("home.statusAlerts")}</span>
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
                      {t("home.trackYourTicket")}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {t("home.enterRefId")}
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
                          }}
                          onKeyPress={handleKeyPress}
                          className={`h-14 ${
                            trackingId ? "pl-12" : "pl-4"
                          } pr-14 text-center font-mono text-base border-2 rounded-full transition-all ${
                            ticketNotFound
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
                            disabled={!trackingId.trim() || isCheckingTicket}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                              ticketNotFound
                                ? "bg-red-500"
                                : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            }`}
                          >
                            {isCheckingTicket ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : ticketNotFound ? (
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
                        {t("home.ticketNotFound")}
                      </p>
                    )}

                    {/* Help text */}
                    {!ticketNotFound && (
                      <p className="text-xs text-gray-500 text-center">
                        {t("home.refIdHelp")}
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
                          {t("home.viewAllMyTickets")}
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
              {t("home.portalTitle")}
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              {t("home.portalSubtitle")}
            </p>
            <p className="text-gray-500 max-w-2xl mx-auto">
              {t("home.portalDescription")}
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
                    {t("common.myDashboard")}
                  </Button>
                </Link>
                <Link href="/samadhan/submit">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-8 rounded-full border-2 border-green-300 hover:bg-green-50 hover:border-green-400 gap-2 text-base"
                  >
                    <MessageSquare className="h-5 w-5" />
                    {t("common.submitNewQuery")}
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
                    {t("common.loginRegister")}
                  </Button>
                </Link>
                <Link href="/samadhan/submit">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-8 rounded-full border-2 border-green-300 hover:bg-green-50 hover:border-green-400 gap-2 text-base"
                  >
                    <Send className="h-5 w-5" />
                    {t("common.submitQuery")}
                  </Button>
                </Link>
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
                  {t("home.fileGrievances")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <CardDescription className="text-gray-600">
                  {t("home.fileGrievancesDesc")}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  {t("home.submitFeedback")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <CardDescription className="text-gray-600">
                  {t("home.submitFeedbackDesc")}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <Clock className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-lg text-gray-900">
                  {t("common.trackStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <CardDescription className="text-gray-600">
                  {t("home.trackStatusDesc")}
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
              {t("home.simpleProcess")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t("home.howItWorks")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("home.howItWorksDesc")}
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
                      {t("home.step1Title")}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {t("home.step1Desc")}
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Grievance
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Feedback
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
                      {t("home.step2Title")}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {t("home.step2Desc")}
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        <Clock className="h-3 w-3 mr-1" />{" "}
                        {t("home.realTimeUpdates")}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                        <Bell className="h-3 w-3 mr-1" /> {t("home.smsAlerts")}
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
                      {t("home.step3Title")}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {t("home.step3Desc")}
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" />{" "}
                        {t("home.accept")}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                        <AlertCircle className="h-3 w-3 mr-1" />{" "}
                        {t("home.appeal")}
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
                {t("home.submitYourQueryNow")}
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
              {t("home.whyRegister")}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t("home.whyRegisterDesc")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                {t("home.benefitTrackStatus")}
              </h4>
              <p className="text-sm text-gray-600">
                {t("home.benefitTrackStatusDesc")}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                {t("home.benefitAttachments")}
              </h4>
              <p className="text-sm text-gray-600">
                {t("home.benefitAttachmentsDesc")}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Bell className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                {t("home.benefitNotifications")}
              </h4>
              <p className="text-sm text-gray-600">
                {t("home.benefitNotificationsDesc")}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                {t("home.benefitRespond")}
              </h4>
              <p className="text-sm text-gray-600">
                {t("home.benefitRespondDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          setPendingTicketPhone(null);
          setPendingTrackingId("");
        }}
        onVerified={handleOtpVerified}
        phone={pendingTicketPhone || ""}
        title={t("otp.verifyIdentity")}
        description={t("otp.verifyIdentityDesc")}
        showPhoneInput={false}
        referenceId={pendingTrackingId}
        verifyOnly={true}
      />
    </div>
  );
}
