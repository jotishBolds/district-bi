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
  Eye,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { OTPVerificationModal } from "@/components/samadhan/OTPVerificationModal";
import {
  useSamadhanI18n,
  LOCALE_LABELS,
  type SamadhanLocale,
} from "@/lib/samadhan-i18n";

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
  const { t, locale, setLocale } = useSamadhanI18n();
  const [session, setSession] = useState<SamadhanSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [heroTab, setHeroTab] = useState<"submit" | "track">("submit");
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right",
  );

  const [trackingId, setTrackingId] = useState("");
  const [ticketNotFound, setTicketNotFound] = useState(false);
  const [isCheckingTicket, setIsCheckingTicket] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingTicketPhone, setPendingTicketPhone] = useState<string | null>(
    null,
  );
  const [pendingTrackingId, setPendingTrackingId] = useState<string>("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/samadhan/auth?action=session");
        const data = await response.json();
        if (data.authenticated && data.session) setSession(data.session);
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleTabChange = (tab: "submit" | "track") => {
    if (tab === heroTab || isAnimating) return;
    setSlideDirection(tab === "track" ? "left" : "right");
    setIsAnimating(true);
    setTimeout(() => {
      setHeroTab(tab);
      setIsAnimating(false);
    }, 200);
  };

  const checkTicketForOtp = async (
    refId: string,
  ): Promise<TicketCheckResult | null> => {
    try {
      const response = await fetch(
        `/api/samadhan/tickets/check?referenceId=${encodeURIComponent(refId)}`,
      );
      const data = await response.json();
      if (data.success) return data.data;
      return null;
    } catch {
      return null;
    }
  };

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error("Please enter a tracking ID");
      return;
    }
    const trimmedId = trackingId.trim();
    setIsCheckingTicket(true);
    setTicketNotFound(false);
    try {
      const ticketInfo = await checkTicketForOtp(trimmedId);
      if (!ticketInfo || !ticketInfo.exists) {
        setTicketNotFound(true);
        toast.error("Ticket not found. Please check the reference ID.");
        return;
      }
      if (ticketInfo.queryType === "FEEDBACK") {
        toast.error("Feedback submissions cannot be tracked.");
        return;
      }
      if (session) {
        if (ticketInfo.citizenPhone === session.phone) {
          router.push(`/samadhan/track/${trimmedId}?verified=true`);
          return;
        }
        if (ticketInfo.isGuestTicket && !ticketInfo.isRegisteredPhone) {
          router.push(`/samadhan/track/${trimmedId}`);
          return;
        }
        if (ticketInfo.citizenPhone && ticketInfo.isRegisteredPhone) {
          setPendingTicketPhone(ticketInfo.citizenPhone);
          setPendingTrackingId(trimmedId);
          setShowOtpModal(true);
          return;
        }
        router.push(`/samadhan/track/${trimmedId}`);
        return;
      }
      if (ticketInfo.citizenPhone && ticketInfo.isRegisteredPhone) {
        setPendingTicketPhone(ticketInfo.citizenPhone);
        setPendingTrackingId(trimmedId);
        setShowOtpModal(true);
        return;
      }
      router.push(`/samadhan/track/${trimmedId}`);
    } catch {
      toast.error("Failed to check ticket. Please try again.");
    } finally {
      setIsCheckingTicket(false);
    }
  };

  const handleOtpVerified = () => {
    router.push(`/samadhan/track/${pendingTrackingId}?verified=true`);
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        .tab-enter-right { animation: slideInRight 0.2s cubic-bezier(0.4,0,0.2,1) forwards; }
        .tab-enter-left  { animation: slideInLeft  0.2s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left – hero text */}
            <div className="text-white space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Shield className="w-4 h-4" />
                <span>{t("common.secureTransparent")}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                {t("home.heroTitle1")}
                <span className="block text-green-200">
                  {t("home.heroTitle2")}
                </span>
              </h1>
              <p className="text-base sm:text-lg text-green-100 max-w-lg mx-auto lg:mx-0">
                {t("home.heroDescription")}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { Icon: Clock, label: t("home.realTimeUpdates") },
                  { Icon: Search, label: t("home.instantTracking") },
                  { Icon: Eye, label: t("home.fullTransparency") },
                  { Icon: Bell, label: t("home.statusAlerts") },
                ].map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-green-100 justify-center lg:justify-start"
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – card */}
            <div className="lg:pl-4">
              {/*
                KEY FIX 1: bg-white shadow-2xl explicitly set (not bg-white/95 which needs backdrop)
                KEY FIX 2: The inner tab body uses a fixed min-h so card never resizes on switch
              */}
              <Card className="bg-white border-0 shadow-2xl rounded-2xl overflow-hidden p-0">
                {/* Tab switcher */}
                <div className="px-4 pt-4 pb-0">
                  <div className="flex items-center bg-green-50 rounded-xl p-1 gap-1">
                    {(["submit", "track"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                          heroTab === tab
                            ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-200"
                            : "text-green-700 hover:bg-green-100/70"
                        }`}
                      >
                        {tab === "submit" ? (
                          <Send className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ScanLine className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          {tab === "submit"
                            ? t("common.submitQuery")
                            : t("common.trackTicket")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/*
                  KEY FIX: Fixed height container — card body never grows/shrinks on tab switch.
                  Both tab panels are rendered in the DOM simultaneously; only one is visible.
                  overflow-hidden clips the hidden panel. No layout shift at all.
                */}
                <div
                  className="relative overflow-hidden"
                  style={{ height: "212px" }}
                >
                  {/* Submit tab */}
                  <div
                    className={`absolute inset-0 px-4 sm:px-5 py-4 flex flex-col gap-3 transition-all duration-200 ${
                      heroTab === "submit"
                        ? "opacity-100 translate-x-0 pointer-events-auto"
                        : "opacity-0 -translate-x-5 pointer-events-none"
                    }`}
                  >
                    {/* Heading row */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <Send className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {t("home.submitQueryTitle")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("home.submitQueryDesc")}
                        </p>
                      </div>
                    </div>

                    {/* Type cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link href="/samadhan/submit?type=GRIEVANCE&step=1">
                        <div className="border-[1.5px] border-gray-100 hover:border-red-300 rounded-xl p-3.5 text-center transition-all hover:bg-red-50/50 group cursor-pointer h-full">
                          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                            <AlertCircle className="w-[18px] h-[18px] text-red-600" />
                          </div>
                          <p className="text-[13px] font-semibold text-gray-900">
                            {t("common.grievance")}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {t("home.reportIssue")}
                          </p>
                        </div>
                      </Link>
                      <Link href="/samadhan/submit?type=FEEDBACK&step=1">
                        <div className="border-[1.5px] border-gray-100 hover:border-blue-300 rounded-xl p-3.5 text-center transition-all hover:bg-blue-50/50 group cursor-pointer h-full">
                          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-[18px] h-[18px] text-blue-600" />
                          </div>
                          <p className="text-[13px] font-semibold text-gray-900">
                            {t("common.feedback")}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {t("home.shareFeedback")}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Footer CTA */}
                    {session ? (
                      <Link href="/samadhan/dashboard">
                        <Button
                          variant="outline"
                          className="w-full h-9 rounded-full border-[1.5px] border-green-200 hover:bg-green-50 gap-2 text-[13px]"
                        >
                          <User className="w-3.5 h-3.5" />
                          {t("home.viewAllMyTickets")}
                        </Button>
                      </Link>
                    ) : (
                      <p className="text-center text-[11.5px] text-gray-500">
                        <Link
                          href="/samadhan/login"
                          className="text-green-600 font-semibold hover:underline"
                        >
                          {t("common.loginRegister")}
                        </Link>{" "}
                        {t("home.forFullFeatures")}
                      </p>
                    )}
                  </div>

                  {/* Track tab */}
                  <div
                    className={`absolute inset-0 px-4 sm:px-5 py-4 flex flex-col gap-3 transition-all duration-200 ${
                      heroTab === "track"
                        ? "opacity-100 translate-x-0 pointer-events-auto"
                        : "opacity-0 translate-x-5 pointer-events-none"
                    }`}
                  >
                    {/* Heading row */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <ScanLine className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {t("home.trackYourTicket")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("home.enterRefId")}
                        </p>
                      </div>
                    </div>

                    {/* Input */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          placeholder="SAMADHAN-2025-XX-XX-XXXXX"
                          value={trackingId}
                          onChange={(e) => {
                            setTrackingId(e.target.value.toUpperCase());
                            setTicketNotFound(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleTrack();
                          }}
                          className={`h-11 pl-4 pr-12 font-mono text-[12.5px] text-center border-[1.5px] rounded-full transition-all ${
                            ticketNotFound
                              ? "border-red-300 bg-red-50 focus-visible:ring-red-400"
                              : trackingId
                                ? "border-green-300 bg-green-50 focus-visible:ring-green-400"
                                : "border-gray-200"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleTrack}
                          disabled={!trackingId.trim() || isCheckingTicket}
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
                            ticketNotFound
                              ? "bg-red-500"
                              : "bg-gradient-to-r from-green-500 to-emerald-600"
                          }`}
                        >
                          {isCheckingTicket ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : ticketNotFound ? (
                            <AlertCircle className="w-4 h-4 text-white" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>

                      {ticketNotFound ? (
                        <p className="text-[11.5px] text-red-600 text-center bg-red-50 rounded-lg px-3 py-1.5">
                          <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                          {t("home.ticketNotFound")}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 text-center">
                          {t("home.refIdHelp")}
                        </p>
                      )}
                    </div>

                    {/* Footer CTA */}
                    {session ? (
                      <Link href="/samadhan/dashboard">
                        <Button
                          variant="outline"
                          className="w-full h-9 rounded-full border-[1.5px] border-green-200 hover:bg-green-50 gap-2 text-[13px]"
                        >
                          <User className="w-3.5 h-3.5" />
                          {t("home.viewAllMyTickets")}
                        </Button>
                      </Link>
                    ) : (
                      <p className="text-center text-[11.5px] text-gray-500">
                        <Link
                          href="/samadhan/login"
                          className="text-green-600 font-semibold hover:underline"
                        >
                          {t("common.loginRegister")}
                        </Link>{" "}
                        {t("home.forFullFeatures")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Language switcher */}
                <div className="flex justify-center gap-5 pb-3.5 px-4 border-t border-gray-100 pt-3">
                  {(["en", "hi", "ne"] as SamadhanLocale[]).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocale(loc)}
                      className={`text-[11.5px] font-medium pb-0.5 transition-all duration-200 ${
                        locale === loc
                          ? "text-green-700 border-b-2 border-green-600"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {LOCALE_LABELS[loc].nativeLabel}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTAL INFO ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
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
                    className="w-full sm:w-auto h-14 px-8 rounded-full border-2 border-green-300 hover:bg-green-50 gap-2 text-base"
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
                    className="w-full sm:w-auto h-14 px-8 rounded-full border-2 border-green-300 hover:bg-green-50 gap-2 text-base"
                  >
                    <Send className="h-5 w-5" />
                    {t("common.submitQuery")}
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                Icon: AlertCircle,
                title: t("home.fileGrievances"),
                desc: t("home.fileGrievancesDesc"),
                card: "from-green-50 to-emerald-50",
                icon: "from-green-500 to-emerald-600",
              },
              {
                Icon: MessageSquare,
                title: t("home.submitFeedback"),
                desc: t("home.submitFeedbackDesc"),
                card: "from-blue-50 to-indigo-50",
                icon: "from-blue-500 to-indigo-600",
              },
              {
                Icon: Clock,
                title: t("common.trackStatus"),
                desc: t("home.trackStatusDesc"),
                card: "from-amber-50 to-orange-50",
                icon: "from-amber-500 to-orange-600",
              },
            ].map(({ Icon, title, desc, card, icon }) => (
              <Card
                key={title}
                className={`border-0 shadow-lg bg-gradient-to-br ${card} hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group`}
              >
                <CardHeader className="text-center pb-2 pt-8">
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${icon} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-lg text-gray-900">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-8">
                  <CardDescription className="text-gray-600">
                    {desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
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
            <div className="hidden lg:block absolute top-24 left-[15%] right-[15%] h-1 bg-gradient-to-r from-green-200 via-green-400 to-green-200 rounded-full" />
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: 1,
                  Icon: FileText,
                  iconBg: "from-green-100 to-emerald-100",
                  iconColor: "text-green-600",
                  title: t("home.step1Title"),
                  desc: t("home.step1Desc"),
                  badges: [
                    {
                      bg: "bg-green-50",
                      text: "text-green-700",
                      label: "Grievance",
                      BadgeIcon: CheckCircle,
                    },
                    {
                      bg: "bg-blue-50",
                      text: "text-blue-700",
                      label: "Feedback",
                      BadgeIcon: CheckCircle,
                    },
                  ],
                },
                {
                  step: 2,
                  Icon: Eye,
                  iconBg: "from-blue-100 to-indigo-100",
                  iconColor: "text-blue-600",
                  title: t("home.step2Title"),
                  desc: t("home.step2Desc"),
                  badges: [
                    {
                      bg: "bg-blue-50",
                      text: "text-blue-700",
                      label: t("home.realTimeUpdates"),
                      BadgeIcon: Clock,
                    },
                    {
                      bg: "bg-purple-50",
                      text: "text-purple-700",
                      label: t("home.smsAlerts"),
                      BadgeIcon: Bell,
                    },
                  ],
                },
                {
                  step: 3,
                  Icon: CheckCircle,
                  iconBg: "from-emerald-100 to-green-100",
                  iconColor: "text-emerald-600",
                  title: t("home.step3Title"),
                  desc: t("home.step3Desc"),
                  badges: [
                    {
                      bg: "bg-green-50",
                      text: "text-green-700",
                      label: t("home.accept"),
                      BadgeIcon: CheckCircle,
                    },
                    {
                      bg: "bg-orange-50",
                      text: "text-orange-700",
                      label: t("home.appeal"),
                      BadgeIcon: AlertCircle,
                    },
                  ],
                },
              ].map(
                ({ step, Icon, iconBg, iconColor, title, desc, badges }) => (
                  <div key={step} className="relative group">
                    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 h-full">
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-white z-10">
                        {step}
                      </div>
                      <div className="pt-6 text-center">
                        <div
                          className={`w-16 h-16 bg-gradient-to-br ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}
                        >
                          <Icon className={`h-8 w-8 ${iconColor}`} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">{desc}</p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          {badges.map(({ bg, text, label, BadgeIcon }) => (
                            <span
                              key={label}
                              className={`inline-flex items-center px-3 py-1 ${bg} ${text} text-xs font-medium rounded-full`}
                            >
                              <BadgeIcon className="h-3 w-3 mr-1" />
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

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

      {/* ── BENEFITS ── */}
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
            {[
              {
                Icon: Search,
                bg: "from-green-50 to-emerald-50",
                iconBg: "bg-green-100",
                iconColor: "text-green-600",
                title: t("home.benefitTrackStatus"),
                desc: t("home.benefitTrackStatusDesc"),
              },
              {
                Icon: FileText,
                bg: "from-blue-50 to-indigo-50",
                iconBg: "bg-blue-100",
                iconColor: "text-blue-600",
                title: t("home.benefitAttachments"),
                desc: t("home.benefitAttachmentsDesc"),
              },
              {
                Icon: Bell,
                bg: "from-amber-50 to-orange-50",
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                title: t("home.benefitNotifications"),
                desc: t("home.benefitNotificationsDesc"),
              },
              {
                Icon: MessageSquare,
                bg: "from-purple-50 to-pink-50",
                iconBg: "bg-purple-100",
                iconColor: "text-purple-600",
                title: t("home.benefitRespond"),
                desc: t("home.benefitRespondDesc"),
              },
            ].map(({ Icon, bg, iconBg, iconColor, title, desc }) => (
              <div
                key={title}
                className={`bg-gradient-to-br ${bg} rounded-2xl p-6 text-center hover:shadow-lg transition-shadow`}
              >
                <div
                  className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mx-auto mb-4`}
                >
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OTP Modal */}
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
