"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Phone,
  Loader2,
  ArrowRight,
  Shield,
  MessageSquare,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

export default function SamadhanLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for existing SAMADHAN session (separate from NextAuth)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/samadhan/auth?action=session");
        const data = await response.json();

        if (data.authenticated) {
          router.push("/samadhan/dashboard");
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/samadhan/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("OTP sent to your phone");
        setStep("otp");

        // Show OTP in development mode (single toast only)
        if (data.debug?.otp) {
          console.log("Development OTP:", data.debug.otp);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter the complete OTP");
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

      const response = await fetch("/api/samadhan/auth?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, otp }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Login successful!");
        window.location.href = "/samadhan/dashboard";
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp("");
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSendOTP(fakeEvent);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-green-700 hover:text-green-800 mb-6 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-green-100">
          {/* Header */}
          <div className="text-center px-6 pt-8 pb-6 bg-gradient-to-b from-green-50 to-white">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <MessageSquare className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {step === "phone" ? "Login to SAMADHAN" : "Verify OTP"}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === "phone"
                ? "Enter your phone number to continue"
                : `Enter the 6-digit code sent to ${phone}`}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            {step === "phone" ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-14 pl-14 pr-4 text-lg border-2 rounded-full border-green-200 focus:border-green-500 focus:ring-green-500 bg-white shadow-sm"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || phone.replace(/\D/g, "").length < 10}
                  className="w-full h-14 rounded-full text-base font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  We&apos;ll send a verification code to this number
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm text-green-700">
                    OTP sent to <span className="font-semibold">{phone}</span>
                  </p>
                </div>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    className="gap-2"
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="w-11 h-12 text-lg border-2 border-green-200 rounded-xl focus:border-green-500 focus:ring-green-500"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full h-14 rounded-full text-base font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Verify & Continue
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-4 text-sm">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-green-600 hover:text-green-700 font-medium hover:underline"
                  >
                    Resend OTP
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                    }}
                    className="text-gray-500 hover:text-gray-700 font-medium hover:underline"
                  >
                    Change Number
                  </button>
                </div>
              </form>
            )}

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

            {/* Guest Option */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Don&apos;t want to register?
              </p>
              <Link href="/samadhan/submit">
                <Button
                  variant="outline"
                  className="rounded-full border-2 border-green-200 hover:bg-green-50 hover:border-green-400 px-6"
                >
                  Continue as Guest
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
