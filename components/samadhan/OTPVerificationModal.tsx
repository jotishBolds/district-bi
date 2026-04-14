"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Phone,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phone: string, token?: string) => void;
  phone?: string; // Pre-filled phone number
  title?: string;
  description?: string;
  showPhoneInput?: boolean; // Whether to show phone input field
  referenceId?: string; // For tracking verification
  verifyOnly?: boolean; // Just verify, don't create session
}

export function OTPVerificationModal({
  isOpen,
  onClose,
  onVerified,
  phone: initialPhone = "",
  title = "Verify Your Phone",
  description = "We'll send a one-time password to verify your identity",
  showPhoneInput = false,
  referenceId,
  verifyOnly = true,
}: OTPVerificationModalProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">(
    showPhoneInput ? "phone" : "otp",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);
  const { t } = useSamadhanI18n();

  // Send OTP function wrapped in useCallback
  const sendOtp = useCallback(
    async (phoneNumber: string) => {
      if (!phoneNumber || phoneNumber.length < 10) {
        setError(t("otp.invalidPhone"));
        return;
      }

      setIsSendingOtp(true);
      setError("");

      try {
        const response = await fetch("/api/samadhan/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneNumber,
            action: "send-otp",
            verifyOnly,
            referenceId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setOtpSent(true);
          setStep("otp");
          setResendTimer(60); // 60 seconds cooldown
          toast.success(t("otp.otpSent"));
        } else {
          setError(data.message || t("otp.failedSendOtp"));
          toast.error(data.message || t("otp.failedSendOtp"));
        }
      } catch (err) {
        setError(t("otp.failedSendOtpRetry"));
        toast.error(t("otp.failedSendOtp"));
      } finally {
        setIsSendingOtp(false);
      }
    },
    [verifyOnly, referenceId, t],
  );

  // Auto-send OTP when modal opens with pre-filled phone
  useEffect(() => {
    if (isOpen && initialPhone && !showPhoneInput && !otpSent) {
      setPhone(initialPhone);
      sendOtp(initialPhone);
    }
  }, [isOpen, initialPhone, showPhoneInput, otpSent, sendOtp]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOtp("");
      setStep(showPhoneInput ? "phone" : "otp");
      setError("");
      setOtpSent(false);
      setResendTimer(0);
    }
  }, [isOpen, showPhoneInput]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Focus OTP input when step changes to OTP
  useEffect(() => {
    if (step === "otp" && otpSent) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [step, otpSent]);

  // Handler wrapper for manual OTP sending (for phone input step and resend)
  const handleSendOtp = (phoneNumber?: string) => {
    const targetPhone = phoneNumber || phone;
    sendOtp(targetPhone);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError(t("otp.invalidOtp"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/samadhan/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp,
          action: "verify-otp",
          verifyOnly,
          referenceId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const token = `${referenceId || "submit"}:${phone}:${Date.now()}:verified`;
        toast.success(t("otp.phoneVerified"));
        onVerified(phone, token);
        onClose();
      } else {
        setError(data.message || t("otp.invalidOtpServer"));
        toast.error(data.message || t("otp.invalidOtpServer"));
      }
    } catch (err) {
      setError(t("otp.verificationFailed"));
      toast.error(t("otp.verificationFailedShort"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    setOtp("");
    handleSendOtp();
  };

  const maskPhone = (phoneStr: string): string => {
    if (!phoneStr || phoneStr.length < 6) return phoneStr;
    const clean = phoneStr.replace(/\D/g, "");
    return `${clean.slice(0, 2)}${"*".repeat(clean.length - 4)}${clean.slice(-2)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-xl text-center">
            {title || t("otp.verifyYourPhone")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description || t("otp.defaultDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Phone Input Step */}
          {step === "phone" && showPhoneInput && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("otp.phoneNumberLabel")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder={t("otp.enterPhonePlaceholder")}
                    className="pl-10 h-12 text-base"
                    maxLength={15}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={() => handleSendOtp()}
                disabled={isSendingOtp || phone.length < 10}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("otp.sendingOtp")}
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    {t("otp.sendOtp")}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* OTP Input Step */}
          {step === "otp" && otpSent && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">
                  {t("otp.enterCodeSentTo")}
                </p>
                <p className="font-semibold text-green-700 bg-green-50 inline-block px-3 py-1 rounded-full text-sm">
                  {maskPhone(phone)}
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setError("");
                  }}
                  ref={otpInputRef}
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="w-11 h-12 text-lg font-semibold border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-green-500"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("otp.verifying")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("otp.verifyOtp")}
                  </>
                )}
              </Button>

              {/* Resend OTP */}
              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500">
                    {t("otp.resendOtpIn", { seconds: String(resendTimer) })}
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center gap-1 mx-auto"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("otp.resendOtp")}
                  </button>
                )}
              </div>

              {/* Change phone number */}
              {showPhoneInput && (
                <button
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setOtpSent(false);
                    setError("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 w-full text-center"
                >
                  {t("otp.changePhone")}
                </button>
              )}
            </div>
          )}

          {/* Loading state for auto-send */}
          {step === "otp" && !otpSent && !showPhoneInput && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-4" />
              <p className="text-sm text-gray-600">
                {t("otp.sendingOtpTo", { phone: maskPhone(phone) })}
              </p>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs text-green-700 text-center flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            {t("otp.securityNote")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
