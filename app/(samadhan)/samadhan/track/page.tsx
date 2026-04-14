"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Loader2,
  Shield,
  User,
  MessageSquare,
  FileText,
  Phone,
  AlertCircle,
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

export default function TrackPage() {
  const [referenceId, setReferenceId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [ticketNotFound, setTicketNotFound] = useState(false);
  const [session, setSession] = useState<SamadhanSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();
  const { t } = useSamadhanI18n();

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!referenceId.trim()) {
      toast.error(t("track.pleaseEnterRefId"));
      return;
    }

    const trimmedId = referenceId.trim();
    setIsSearching(true);
    setTicketNotFound(false);

    try {
      // First check if the ticket exists and get its info
      const ticketInfo = await checkTicketForOtp(trimmedId);

      if (!ticketInfo || !ticketInfo.exists) {
        setTicketNotFound(true);
        toast.error(t("track.ticketNotFound"));
        return;
      }

      // Feedback submissions cannot be tracked - only viewable in dashboard
      if (ticketInfo.queryType === "FEEDBACK") {
        toast.error(t("home.feedbackCannotBeTracked"));
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
      toast.error(t("track.failedSearch"));
    } finally {
      setIsSearching(false);
    }
  };

  // Handle OTP verification success
  const handleOtpVerified = (phone: string, token?: string) => {
    // Navigate to tracking page with verification token
    router.push(`/samadhan/track/${pendingTrackingId}?verified=true`);
  };

  // Loading state
  if (isCheckingSession) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/samadhan"
          className="inline-flex items-center text-sm text-gray-600 hover:text-green-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.backToHome")}
        </Link>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden p-0">
          <CardHeader className="text-center pb-2 pt-8 bg-gradient-to-b from-green-50 to-white">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Search className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {t("track.trackYourQuery")}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {t("track.enterRefIdDesc")}
            </CardDescription>
            {/* Session info if logged in */}
            {session && (
              <div className="mt-4 bg-green-50 rounded-xl p-3 border border-green-100">
                <p className="text-sm text-green-700">
                  {t("track.loggedInAs")}{" "}
                  <span className="font-semibold">{session.name}</span>
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent className="px-6 pb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <div className="relative">
                  <Input
                    placeholder="SAMADHAN-2025-XX-XX-XXXXX"
                    value={referenceId}
                    onChange={(e) => {
                      setReferenceId(e.target.value.toUpperCase());
                      setTicketNotFound(false);
                    }}
                    className={`h-14 pl-6 pr-14 text-center font-mono text-base border-2 rounded-full shadow-sm transition-all ${
                      ticketNotFound
                        ? "border-red-300 bg-red-50 focus:border-red-500"
                        : "border-green-200 focus:border-green-500 bg-white"
                    }`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      type="submit"
                      disabled={isSearching || !referenceId.trim()}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        ticketNotFound
                          ? "bg-red-500"
                          : "bg-gradient-to-r from-green-500 to-emerald-600"
                      }`}
                    >
                      {isSearching ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : ticketNotFound ? (
                        <AlertCircle className="w-5 h-5 text-white" />
                      ) : (
                        <Search className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>
                {ticketNotFound ? (
                  <p className="text-xs text-red-600 mt-2 text-center bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {t("track.ticketNotFound")}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {t("track.refIdHelp")}
                  </p>
                )}
              </div>
            </form>

            {/* How it works */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3 text-center">
                {t("track.howTrackingWorks")}
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <FileText className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t("track.step1")}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t("track.step2")}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <MessageSquare className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t("track.step3")}</span>
                </div>
              </div>
            </div>

            {/* Dashboard link if logged in */}
            {session && (
              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  {t("track.viewAllQueries")}
                </p>
                <Link href="/samadhan/dashboard">
                  <Button
                    variant="outline"
                    className="rounded-full border-2 border-green-200 hover:bg-green-50 hover:border-green-400 gap-2"
                  >
                    <User className="w-4 h-4" />
                    {t("track.goToDashboard")}
                  </Button>
                </Link>
              </div>
            )}

            {/* Login prompt if not logged in */}
            {!session && (
              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  {t("track.wantSeeAllQueries")}
                </p>
                <Link href="/samadhan/login">
                  <Button
                    variant="outline"
                    className="rounded-full border-2 border-green-200 hover:bg-green-50 hover:border-green-400 gap-2"
                  >
                    <User className="w-4 h-4" />
                    {t("common.loginRegister")}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
