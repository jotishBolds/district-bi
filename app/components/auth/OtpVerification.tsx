// app/components/auth/OtpVerification.tsx

import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";

interface OtpVerificationProps {
  email: string;
  type: "login" | "verification";
  onVerified: () => void;
  onResend: () => void;
}

export default function OtpVerification({
  email,
  type,
  onVerified,
  onResend,
}: OtpVerificationProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  useEffect(() => {
    // Focus the first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Set up countdown for resend button
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value;

    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = value.charAt(0);
    setOtp(newOtp);

    // Auto-focus next input if current input is filled
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    // Navigate left on backspace if current field is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Navigate with arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
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
    const newOtp = pastedData.split("").slice(0, 6);
    setOtp(newOtp);

    // Focus last input
    inputRefs.current[5]?.focus();
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    onResend();
    setResendCountdown(60);

    // Start countdown again
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if OTP is complete
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter a complete 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: otpString,
          type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      // Call the onVerified callback
      onVerified();
    } catch (error: Error | unknown) {
      console.error("OTP verification error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to verify OTP";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {type === "login" ? "Login Verification" : "Email Verification"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code sent to
            <br />
            <span className="font-medium text-blue-600">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center space-x-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                maxLength={1}
                className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={otp[index] || ""}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={isLoading}
                required
                autoComplete="off"
              />
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || otp.join("").length !== 6}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <p className="text-gray-600">
            Didn&apos;t receive the code?{" "}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCountdown > 0}
              className={`font-medium ${
                resendCountdown > 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-500"
              }`}
            >
              {resendCountdown > 0
                ? `Resend in ${resendCountdown}s`
                : "Resend OTP"}
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
