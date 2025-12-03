// app/components/auth/OtpVerificationSimple.tsx

import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Phone, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { OtpMethod } from "@/types/types";

interface OtpVerificationSimpleProps {
  email?: string;
  phone?: string;
  type: "login" | "verification" | "password_reset";
  onVerified: (method: OtpMethod, userData?: Record<string, unknown>) => void;
  onResend: (method: OtpMethod) => void;
}

export default function OtpVerificationSimple({
  email,
  phone,
  type,
  onVerified,
  onResend,
}: OtpVerificationSimpleProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  // Helper functions to mask sensitive information
  const maskEmail = (email: string): string => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) return email;
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    const maskedLocal = `${localPart[0]}${"*".repeat(
      Math.min(localPart.length - 2, 4)
    )}${localPart.slice(-1)}`;
    return `${maskedLocal}@${domain}`;
  };

  const maskPhone = (phone: string): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      return `+91 ${cleaned.slice(0, 2)}****${cleaned.slice(-4)}`;
    }
    return phone;
  };

  useEffect(() => {
    // Focus the first input on mount
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 100);

    // Set up countdown for resend button
    if (resendCountdown > 0) {
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [resendCountdown]);

  const handleInputChange = (index: number, value: string) => {
    // Take only the last character to handle multiple character input
    const newValue = value.slice(-1);

    // Only allow numeric input
    if (newValue && !/^[0-9]$/.test(newValue)) {
      return;
    }

    setError(null);
    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    // Auto-focus next input if current input is filled
    if (newValue && index < 5) {
      setTimeout(() => {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
        }
      }, 10);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (otp[index]) {
        // Clear current field
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous field and clear it
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        setTimeout(() => {
          const prevInput = inputRefs.current[index - 1];
          if (prevInput) {
            prevInput.focus();
          }
        }, 10);
      }
    }
    // Handle arrow keys
    else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      setTimeout(() => {
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) {
          prevInput.focus();
        }
      }, 10);
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      setTimeout(() => {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
        }
      }, 10);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text/plain")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);

      // Focus last input after paste
      setTimeout(() => {
        const lastInput = inputRefs.current[5];
        if (lastInput) {
          lastInput.focus();
        }
      }, 10);

      toast.success("OTP pasted successfully!");
    } else if (pastedData.length > 0) {
      toast.error("Please paste a valid 6-digit OTP");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter a complete 6-digit OTP");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          otp: otpValue,
          type:
            type === "login"
              ? "LOGIN_OTP"
              : type === "password_reset"
              ? "PASSWORD_RESET"
              : type.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      console.log("OTP Verification Response:", data);
      toast.success("Verification successful!");
      onVerified(OtpMethod.EMAIL, data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Verification failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;

    try {
      await onResend(OtpMethod.EMAIL);
      setResendCountdown(60);
      toast.success("New verification code sent successfully!");
    } catch (error) {
      toast.error("Failed to resend verification code");
    }
  };

  // Format timer
  const formatTime = (seconds: number): string => {
    return `${seconds}s`;
  };

  return (
    <>
      <Toaster position="top-center" />

      {/* Display where OTP was sent */}
      <div className="text-center mb-6">
        <div className="text-sm text-gray-600 mb-3">
          We&apos;ve sent a verification code to:
        </div>
        <div className="space-y-1">
          {email && (
            <div className="font-medium text-blue-600 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              {maskEmail(email)}
            </div>
          )}
          {phone && (
            <div className="font-medium text-blue-600 flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              {maskPhone(phone)}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {email && phone
            ? "Enter the same 6-digit code from either email or SMS"
            : email
            ? "Enter the 6-digit code sent to your email"
            : "Enter the 6-digit code sent to your phone"}
        </div>
      </div>

      {error && (
        <Alert className="mb-4 bg-red-50 text-red-800 border-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium mb-1 text-center">
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
                  className="w-12 h-12 text-center text-lg font-semibold border-2 focus:border-blue-500 focus:ring-blue-500"
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
              Please enter the verification code sent to your email
              {phone ? " or phone" : ""}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 h-12 text-lg font-medium"
            disabled={isLoading || otp.join("").length !== 6}
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

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCountdown > 0}
              className={`text-sm font-medium ${
                resendCountdown > 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-500 hover:underline"
              }`}
            >
              <RefreshCw className="inline h-3 w-3 mr-1" />
              {resendCountdown > 0
                ? `Resend code in ${formatTime(resendCountdown)}`
                : "Resend verification code"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
