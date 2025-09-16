"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import OtpVerificationEnhanced from "@/app/components/auth/OtpVerificationEnhanced";
import { OtpMethod } from "@/types/types";

function OtpVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const phone = searchParams.get("phone") || "";
  const verificationType = searchParams.get("type") || "login";
  const [userPhone, setUserPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      router.push("/login");
      return;
    }

    // Fetch user phone number if not provided in URL
    const fetchUserPhone = async () => {
      try {
        const response = await fetch(
          `/api/user/phone?email=${encodeURIComponent(email)}`
        );
        if (response.ok) {
          const data = await response.json();
          setUserPhone(data.phone);
        }
      } catch (error) {
        console.error("Failed to fetch user phone:", error);
      }
    };

    if (!phone) {
      fetchUserPhone();
    } else {
      setUserPhone(phone);
    }
  }, [email, phone, router]);

  const handleVerified = async (
    method: OtpMethod,
    userData?: Record<string, unknown>
  ) => {
    try {
      if (verificationType === "login") {
        // For login, we need to complete the authentication flow
        const result = await signIn("credentials", {
          email,
          password: "", // Password already verified
          redirect: false,
          callbackUrl: "/dashboard",
        });

        if (result?.error) {
          toast.error("Failed to complete login");
          return;
        }

        toast.success(
          `Login successful via ${
            method === OtpMethod.EMAIL ? "Email" : "SMS"
          }!`
        );
        router.push("/dashboard");
      } else {
        // For other verification types, redirect accordingly
        toast.success(
          `${
            method === OtpMethod.EMAIL ? "Email" : "SMS"
          } verification successful!`
        );

        if (verificationType === "password_reset") {
          router.push(
            `/reset-password?email=${encodeURIComponent(email)}&verified=true`
          );
        } else {
          router.push("/login?verified=true");
        }
      }
    } catch (error) {
      console.error("Verification completion error:", error);
      toast.error("Failed to complete verification");
    }
  };

  const handleResend = async (method: OtpMethod) => {
    try {
      if (method === OtpMethod.EMAIL) {
        const response = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            type:
              verificationType === "login" ? "LOGIN_OTP" : "EMAIL_VERIFICATION",
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to resend email OTP");
        }

        toast.success("Email OTP sent successfully!");
      } else if (method === OtpMethod.SMS) {
        const phoneToUse = phone || userPhone;
        if (!phoneToUse) {
          throw new Error("Phone number not available");
        }

        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneToUse }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to resend SMS OTP");
        }

        toast.success("SMS OTP sent successfully!");
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to resend ${method} OTP`
      );
      throw error;
    }
  };

  // Determine available methods based on contact information
  const availableMethods: OtpMethod[] = [];
  if (email) availableMethods.push(OtpMethod.EMAIL);
  if (phone || userPhone) availableMethods.push(OtpMethod.SMS);

  const defaultMethod = email ? OtpMethod.EMAIL : OtpMethod.SMS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg border-t-4 border-t-blue-700">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Security Verification
            </CardTitle>
            <CardDescription>Verify your identity to continue</CardDescription>
          </CardHeader>

          <CardContent className="px-0">
            <OtpVerificationEnhanced
              email={email || undefined}
              phone={phone || userPhone || undefined}
              type={
                verificationType as "login" | "verification" | "password_reset"
              }
              onVerified={handleVerified}
              onResend={handleResend}
              allowedMethods={availableMethods}
              defaultMethod={defaultMethod}
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Separator className="my-2" />

            <div className="text-center text-xs text-gray-500">
              <Link
                href="/login"
                className="text-blue-700 hover:text-blue-800 hover:underline font-medium"
              >
                ← Return to Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function OtpVerificationSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md animate-pulse">
        <div className="border rounded-lg p-8 shadow-lg">
          <div className="space-y-6">
            <div className="h-6 w-1/3 bg-gray-200 rounded mx-auto"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mx-auto"></div>
            <div className="space-y-4">
              <div className="flex justify-center space-x-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-12 h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="h-10 bg-blue-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<OtpVerificationSkeleton />}>
      <OtpVerificationContent />
    </Suspense>
  );
}
