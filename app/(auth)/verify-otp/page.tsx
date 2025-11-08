"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Loader2, ShieldCheck, AlertCircle, Mail, Phone } from "lucide-react";
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
  const { data: session, status } = useSession();
  const identifier = searchParams.get("identifier");
  const verificationType = searchParams.get("type") || "LOGIN_OTP";
  const [isLoading, setIsLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isEmail, setIsEmail] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Helper functions to mask sensitive information
  const maskEmail = (email: string): string => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) return email;
    return `${localPart.slice(0, 2)}${"*".repeat(
      localPart.length - 4
    )}${localPart.slice(-2)}@${domain}`;
  };

  const maskPhone = (phone: string): string => {
    if (!phone) return "";
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length <= 4) return phone;
    return `${cleanPhone.slice(0, 2)}${"*".repeat(
      cleanPhone.length - 4
    )}${cleanPhone.slice(-2)}`;
  };

  useEffect(() => {
    if (!identifier) {
      router.push("/login");
      return;
    }

    // Determine if identifier is email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmail(emailRegex.test(identifier));

    // Fetch user details (both email and phone)
    const fetchUserData = async () => {
      try {
        const response = await fetch(
          `/api/user/details?identifier=${encodeURIComponent(identifier)}`
        );
        if (response.ok) {
          const data = await response.json();
          setUserPhone(data.phone || "");
          setUserEmail(data.email || "");
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserData();

    // Focus on first input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Start countdown timer
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [identifier, router]);

  // Removed session watcher to prevent redirect loops

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
      console.log("Sending OTP verification request:", {
        identifier,
        otp: otpValue,
        type: verificationType,
      }); // Debug log

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          otp: otpValue,
          type: verificationType,
        }),
      });

      const data = await response.json();
      console.log("Verify OTP Response:", data); // Debug log

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // OTP verification successful
      if (
        verificationType === "EMAIL_VERIFICATION" ||
        verificationType === "login" ||
        verificationType === "LOGIN_OTP"
      ) {
        // For login verification, create a session using NextAuth
        if (data.clearOtpFlag) {
          console.log("Attempting NextAuth signIn..."); // Debug log

          const signInResult = await signIn("credentials", {
            identifier,
            password: "verified-by-otp",
            redirect: false,
            callbackUrl: "/dashboard",
          });

          console.log("SignIn Result:", signInResult); // Debug log

          if (signInResult?.error) {
            console.error("SignIn Error:", signInResult.error); // Debug log
            throw new Error(signInResult.error || "Session creation failed");
          }

          if (signInResult?.ok) {
            console.log("✅ SignIn successful, redirecting immediately...");
            toast.success("Login successful! Redirecting to dashboard...");

            // Force immediate redirect to dashboard
            await router.push("/dashboard");
            return;
          } else {
            throw new Error("Session creation failed - unknown error");
          }
        } else {
          throw new Error("OTP verification incomplete");
        }
      } else if (verificationType === "PASSWORD_RESET") {
        toast.success("Verification successful!");

        // For password reset, redirect with the resetToken
        router.push(
          `/reset-password?email=${encodeURIComponent(
            identifier || ""
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
          identifier,
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
              <ShieldCheck className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Security Verification
            </CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent a verification code to:
              <div className="mt-2 space-y-1">
                {userEmail && (
                  <div className="font-medium text-blue-600 flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    {maskEmail(userEmail)}
                  </div>
                )}
                {userPhone && (
                  <div className="font-medium text-blue-600 flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />
                    {maskPhone(userPhone)}
                  </div>
                )}
                {!userEmail && !userPhone && (
                  <div className="font-medium text-blue-600 flex items-center justify-center gap-2">
                    {isEmail ? (
                      <>
                        <Mail className="w-4 h-4" />
                        {maskEmail(identifier || "")}
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        {maskPhone(identifier || "")}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {userEmail && userPhone
                  ? "Enter the same 6-digit code from either email or SMS"
                  : userEmail
                  ? "Enter the 6-digit code sent to your email"
                  : "Enter the 6-digit code sent to your phone"}
              </div>
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
                  Please enter the verification code sent to your email or phone
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
