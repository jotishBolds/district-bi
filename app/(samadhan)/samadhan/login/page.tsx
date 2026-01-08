"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Loader2, ArrowRight } from "lucide-react";
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
        // Session cookie is set by the API - no need for NextAuth
        toast.success("Login successful!");
        // Use window.location for clean navigation
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
    // Call with null as we prevent default in handleSendOTP
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSendOTP(fakeEvent);
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Link
          href="/samadhan"
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>
              {step === "phone" ? "Login / Register" : "Verify OTP"}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "Enter your phone number to receive a verification code"
                : `Enter the 6-digit code sent to ${phone}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "phone" ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your 10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-center text-lg tracking-wider"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-sm text-blue-600 hover:underline"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                  <br />
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                    }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Change phone number
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-600 mb-2">
                Don&apos;t want to register?
              </p>
              <Link href="/samadhan/submit">
                <Button variant="outline" size="sm">
                  Continue as Guest
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
