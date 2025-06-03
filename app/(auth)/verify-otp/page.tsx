"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

function OtpVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const verificationType = searchParams.get("type") || "EMAIL_VERIFICATION";
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.push("/login");
      return;
    }

    // Focus on first input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Start countdown timer
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [email, router]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(0);
    }

    // Only allow numeric input
    if (value && !/^[0-9]$/.test(value)) {
      return;
    }

    setVerificationError(null);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input if current input is filled
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace to clear current field and focus previous
    if (e.key === "Backspace" && index > 0 && !otp[index]) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();

    // Check if pasted content is 6 digits
    if (!/^\d{6}$/.test(pastedData)) {
      toast.error("Please paste a 6-digit OTP");
      return;
    }

    // Fill all inputs with pasted OTP
    const newOtp = pastedData.split("");
    setOtp(newOtp);

    // Focus last input
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setVerificationError(null);

    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setVerificationError("Please enter a valid 6-digit OTP");
      toast.error("Please enter a valid 6-digit OTP");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: otpValue,
          type: verificationType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // OTP verification successful
      if (verificationType === "EMAIL_VERIFICATION") {
        // If this was a registration verification, redirect to login
        if (searchParams.get("fromRegister") === "true") {
          toast.success("Email verified successfully. Please log in.");
          router.push("/login");
          return;
        }

        // For login verification, create a session
        const signInResult = await signIn("credentials", {
          email,
          password: "verified-by-otp",
          redirect: false,
          callbackUrl: "/dashboard",
        });

        if (signInResult?.error) {
          throw new Error(signInResult.error || "Session creation failed");
        }

        toast.success("Authentication successful!");
        router.push("/dashboard");
      } else if (verificationType === "PASSWORD_RESET") {
        toast.success("Verification successful!");

        // For password reset, redirect with the resetToken
        router.push(
          `/reset-password?email=${encodeURIComponent(
            email
          )}&token=${encodeURIComponent(data.resetToken)}`
        );
      }
    } catch (error) {
      let errorMessage = "Verification failed. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setVerificationError(errorMessage);
      toast.error(errorMessage);
      console.error("OTP verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;

    setResendLoading(true);
    setVerificationError(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          type: verificationType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }

      toast.success("New verification code sent successfully");
      setTimer(60); // Reset timer
    } catch (error) {
      let errorMessage = "Failed to resend verification code";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setVerificationError(errorMessage);
      toast.error(errorMessage);
      console.error("Resend OTP error:", error);
    } finally {
      setResendLoading(false);
    }
  };

  // Helper to format the timer
  const formatTime = (seconds: number): string => {
    return `${seconds}s`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-t-4 border-t-blue-700">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex justify-center mb-4">
              <ShieldCheck className="h-10 w-10 text-blue-700" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Security Verification
            </CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent a verification code to{" "}
              <span className="font-medium">{email}</span>
            </CardDescription>
          </CardHeader>

          {verificationError && (
            <Alert className="mx-6 mb-2 bg-red-50 text-red-800 border-red-300 w-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Issue</AlertTitle>
              <AlertDescription>{verificationError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="text-sm font-medium mb-1">
                  Enter 6-digit code
                </div>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      className="w-12 h-12 text-center text-lg"
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      disabled={isLoading}
                      aria-label={`digit ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Please enter the verification code sent to your email address
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full bg-blue-700 hover:bg-blue-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <div className="text-center text-sm">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  className={`font-medium ${
                    timer > 0 || resendLoading
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-blue-700 hover:text-blue-800 hover:underline"
                  }`}
                  onClick={handleResendOtp}
                  disabled={timer > 0 || resendLoading}
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="inline mr-1 h-3 w-3 animate-spin" />
                      Resending...
                    </>
                  ) : timer > 0 ? (
                    `Resend in ${formatTime(timer)}`
                  ) : (
                    "Resend Code"
                  )}
                </button>
              </div>

              <Separator className="my-2" />

              <div className="text-center text-xs text-gray-500">
                <Link
                  href="/login"
                  className="text-blue-700 hover:text-blue-800 hover:underline font-medium"
                >
                  Return to Login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function OtpVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <OtpVerificationContent />
    </Suspense>
  );
}
