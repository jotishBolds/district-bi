// app/components/auth/OtpVerificationEnhanced.tsx

import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Smartphone,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { OtpMethod, VerifySmsResponse, SendSmsResponse } from "@/types/types";

interface OtpVerificationEnhancedProps {
  email?: string;
  phone?: string;
  type: "login" | "verification" | "password_reset";
  onVerified: (method: OtpMethod, userData?: Record<string, unknown>) => void;
  onResend: (method: OtpMethod) => void;
  allowedMethods?: OtpMethod[];
  defaultMethod?: OtpMethod;
  hideHeader?: boolean;
}

export default function OtpVerificationEnhanced({
  email,
  phone,
  type,
  onVerified,
  onResend,
  allowedMethods = [OtpMethod.EMAIL, OtpMethod.SMS],
  defaultMethod = OtpMethod.EMAIL,
  hideHeader = false,
}: OtpVerificationEnhancedProps) {
  const [activeMethod, setActiveMethod] = useState<OtpMethod>(defaultMethod);
  const [emailOtp, setEmailOtp] = useState<string[]>(Array(6).fill(""));
  const [smsOtp, setSmsOtp] = useState<string[]>(Array(6).fill(""));
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [emailResendCountdown, setEmailResendCountdown] = useState(60);
  const [smsResendCountdown, setSmsResendCountdown] = useState(60);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  const emailInputRefs = useRef<(HTMLInputElement | null)[]>(
    Array(6).fill(null)
  );
  const smsInputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Filter allowed methods based on available contact info
  const availableMethods = allowedMethods.filter((method) => {
    if (method === OtpMethod.EMAIL) return !!email;
    if (method === OtpMethod.SMS) return !!phone;
    return false;
  });

  useEffect(() => {
    // Set default method to first available method
    if (
      !availableMethods.includes(activeMethod) &&
      availableMethods.length > 0
    ) {
      setActiveMethod(availableMethods[0]);
    }
  }, [availableMethods, activeMethod]);

  useEffect(() => {
    // Focus the first input when method changes
    const focusFirstInput = () => {
      if (activeMethod === OtpMethod.EMAIL && emailInputRefs.current[0]) {
        emailInputRefs.current[0].focus();
      } else if (activeMethod === OtpMethod.SMS && smsInputRefs.current[0]) {
        smsInputRefs.current[0].focus();
      }
    };

    const timer = setTimeout(focusFirstInput, 100);
    return () => clearTimeout(timer);
  }, [activeMethod]);

  useEffect(() => {
    // Set up countdown for email resend button
    if (emailResendCountdown > 0) {
      const interval = setInterval(() => {
        setEmailResendCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [emailResendCountdown]);

  useEffect(() => {
    // Set up countdown for SMS resend button
    if (smsResendCountdown > 0) {
      const interval = setInterval(() => {
        setSmsResendCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [smsResendCountdown]);

  const handleOtpChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    method: OtpMethod
  ) => {
    const value = e.target.value;

    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const inputRefs =
      method === OtpMethod.EMAIL ? emailInputRefs : smsInputRefs;
    const setOtp = method === OtpMethod.EMAIL ? setEmailOtp : setSmsOtp;
    const currentOtp = method === OtpMethod.EMAIL ? emailOtp : smsOtp;
    const setError = method === OtpMethod.EMAIL ? setEmailError : setSmsError;

    setError(null);
    const newOtp = [...currentOtp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    method: OtpMethod
  ) => {
    const inputRefs =
      method === OtpMethod.EMAIL ? emailInputRefs : smsInputRefs;
    const setOtp = method === OtpMethod.EMAIL ? setEmailOtp : setSmsOtp;
    const currentOtp = method === OtpMethod.EMAIL ? emailOtp : smsOtp;

    if (e.key === "Backspace" && index > 0 && !currentOtp[index]) {
      const newOtp = [...currentOtp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    method: OtpMethod
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();

    if (!/^\d{6}$/.test(pastedData)) {
      toast.error("Please paste a 6-digit OTP");
      return;
    }

    const setOtp = method === OtpMethod.EMAIL ? setEmailOtp : setSmsOtp;
    const newOtp = pastedData.split("");
    setOtp(newOtp);

    // Focus the last input
    const inputRefs =
      method === OtpMethod.EMAIL ? emailInputRefs : smsInputRefs;
    inputRefs.current[5]?.focus();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpString = emailOtp.join("");
    if (otpString.length !== 6) {
      setEmailError("Please enter a complete 6-digit OTP");
      return;
    }

    setIsEmailLoading(true);
    setEmailError(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otpString,
          type:
            type === "login"
              ? "EMAIL_VERIFICATION"
              : type === "password_reset"
              ? "PASSWORD_RESET"
              : type.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Email OTP verification failed");
      }

      toast.success("Email verification successful!");
      console.log("OTP Verification Response:", data); // Debug log
      onVerified(OtpMethod.EMAIL, data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Email verification failed";
      setEmailError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpString = smsOtp.join("");
    if (otpString.length !== 6) {
      setSmsError("Please enter a complete 6-digit OTP");
      return;
    }

    setIsSmsLoading(true);
    setSmsError(null);

    try {
      const response = await fetch("/api/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp: otpString,
        }),
      });

      const data: VerifySmsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "SMS OTP verification failed");
      }

      toast.success("SMS verification successful!");
      onVerified(OtpMethod.SMS, data.user);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "SMS verification failed";
      setSmsError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleEmailResend = async () => {
    if (emailResendCountdown > 0) return;

    try {
      await onResend(OtpMethod.EMAIL);
      setEmailResendCountdown(60);
      toast.success("Email OTP sent successfully!");
    } catch (error) {
      toast.error("Failed to resend email OTP");
    }
  };

  const handleSmsResend = async () => {
    if (smsResendCountdown > 0) return;

    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data: SendSmsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send SMS");
      }

      setSmsResendCountdown(60);
      toast.success("SMS OTP sent successfully!");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resend SMS OTP"
      );
    }
  };

  if (availableMethods.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No verification methods available. Please ensure you have an email
              or phone number registered.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (hideHeader) {
    // Simple layout without card wrapper for embedded use
    return (
      <>
        <Toaster position="top-center" />
        <div className="space-y-4">
          {availableMethods[0] === OtpMethod.EMAIL ? (
            <EmailOtpForm />
          ) : (
            <SmsOtpForm />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">
            Verify Your Identity
          </CardTitle>
          <CardDescription>
            Choose your preferred verification method
          </CardDescription>
        </CardHeader>

        <CardContent>
          {availableMethods.length === 1 ? (
            // Single method - no tabs needed
            <div className="space-y-4">
              {availableMethods[0] === OtpMethod.EMAIL ? (
                <EmailOtpForm />
              ) : (
                <SmsOtpForm />
              )}
            </div>
          ) : (
            // Multiple methods - show tabs
            <Tabs
              value={activeMethod}
              onValueChange={(value) => setActiveMethod(value as OtpMethod)}
            >
              <TabsList className="grid w-full grid-cols-2">
                {availableMethods.includes(OtpMethod.EMAIL) && (
                  <TabsTrigger
                    value={OtpMethod.EMAIL}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                )}
                {availableMethods.includes(OtpMethod.SMS) && (
                  <TabsTrigger
                    value={OtpMethod.SMS}
                    className="flex items-center gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    SMS
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="mt-4">
                {availableMethods.includes(OtpMethod.EMAIL) && (
                  <TabsContent value={OtpMethod.EMAIL}>
                    <EmailOtpForm />
                  </TabsContent>
                )}
                {availableMethods.includes(OtpMethod.SMS) && (
                  <TabsContent value={OtpMethod.SMS}>
                    <SmsOtpForm />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </>
  );

  function EmailOtpForm() {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Enter the 6-digit code sent to
            <br />
            <span className="font-medium text-blue-600">{email}</span>
          </p>
        </div>

        {emailError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {emailError}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleEmailSubmit}>
          <div className="flex justify-center space-x-2 mb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Input
                key={index}
                ref={(el) => {
                  emailInputRefs.current[index] = el;
                }}
                type="text"
                maxLength={1}
                className="w-12 h-12 text-center text-lg"
                value={emailOtp[index] || ""}
                onChange={(e) => handleOtpChange(e, index, OtpMethod.EMAIL)}
                onKeyDown={(e) => handleKeyDown(e, index, OtpMethod.EMAIL)}
                onPaste={
                  index === 0
                    ? (e) => handlePaste(e, OtpMethod.EMAIL)
                    : undefined
                }
                disabled={isEmailLoading}
                aria-label={`Email OTP digit ${index + 1}`}
              />
            ))}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isEmailLoading || emailOtp.join("").length !== 6}
          >
            {isEmailLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email OTP"
            )}
          </Button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleEmailResend}
              disabled={emailResendCountdown > 0}
              className={`text-sm ${
                emailResendCountdown > 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-500"
              }`}
            >
              <RefreshCw className="inline h-3 w-3 mr-1" />
              {emailResendCountdown > 0
                ? `Resend in ${emailResendCountdown}s`
                : "Resend Email OTP"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function SmsOtpForm() {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Enter the 6-digit code sent to
            <br />
            <span className="font-medium text-blue-600">+91 {phone}</span>
          </p>
        </div>

        {smsError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {smsError}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSmsSubmit}>
          <div className="flex justify-center space-x-2 mb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Input
                key={index}
                ref={(el) => {
                  smsInputRefs.current[index] = el;
                }}
                type="text"
                maxLength={1}
                className="w-12 h-12 text-center text-lg"
                value={smsOtp[index] || ""}
                onChange={(e) => handleOtpChange(e, index, OtpMethod.SMS)}
                onKeyDown={(e) => handleKeyDown(e, index, OtpMethod.SMS)}
                onPaste={
                  index === 0 ? (e) => handlePaste(e, OtpMethod.SMS) : undefined
                }
                disabled={isSmsLoading}
                aria-label={`SMS OTP digit ${index + 1}`}
              />
            ))}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSmsLoading || smsOtp.join("").length !== 6}
          >
            {isSmsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify SMS OTP"
            )}
          </Button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleSmsResend}
              disabled={smsResendCountdown > 0}
              className={`text-sm ${
                smsResendCountdown > 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-500"
              }`}
            >
              <RefreshCw className="inline h-3 w-3 mr-1" />
              {smsResendCountdown > 0
                ? `Resend in ${smsResendCountdown}s`
                : "Resend SMS OTP"}
            </button>
          </div>
        </form>
      </div>
    );
  }
}
