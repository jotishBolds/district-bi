"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ShieldAlert, AlertCircle, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Form schema with validation
const loginFormSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid government email address")
    .min(1, "Email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function GovernmentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  const errorMessage = searchParams?.get("error");
  const expired = searchParams?.get("expired");

  useEffect(() => {
    if (errorMessage) {
      setLoginError(getFriendlyErrorMessage(decodeURIComponent(errorMessage)));
    }
    if (expired === "true") {
      setSessionExpired(true);
    }

    // Check for previous login attempts from localStorage
    const attempts = localStorage.getItem("loginAttempts");
    const lastAttemptTime = localStorage.getItem("lastAttemptTime");
    const lockUntil = localStorage.getItem("lockUntil");

    if (lockUntil && new Date(lockUntil) > new Date()) {
      setIsLocked(true);
      startLockTimer(new Date(lockUntil));
    } else if (attempts && lastAttemptTime) {
      // Reset attempts if it's been more than 15 minutes
      if (new Date().getTime() - parseInt(lastAttemptTime) > 15 * 60 * 1000) {
        localStorage.setItem("loginAttempts", "0");
        setAttemptCount(0);
      } else {
        setAttemptCount(parseInt(attempts));
      }
    }
  }, [errorMessage, expired]);

  // Function to start the lock timer
  const startLockTimer = (lockUntil: Date) => {
    const updateTimer = () => {
      const now = new Date();
      const timeRemaining = lockUntil.getTime() - now.getTime();

      if (timeRemaining <= 0) {
        setIsLocked(false);
        localStorage.removeItem("lockUntil");
        clearInterval(timer);
        return;
      }

      setLockTimeRemaining(Math.ceil(timeRemaining / 1000)); // in seconds
    };

    updateTimer(); // Initial update
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  };

  // Function to convert technical error messages to user-friendly ones
  const getFriendlyErrorMessage = (error: string): string => {
    const errorMap: Record<string, string> = {
      CredentialsSignin: "Invalid email or password. Please try again.",
      "Invalid email or password":
        "The email or password you entered is incorrect.",
      "User not found": "No account found with this email address.",
      "Account not active":
        "Your account is not active. Please contact support.",
      "Too many requests":
        "Too many login attempts. Please wait before trying again.",
      "Session expired": "Your session has expired. Please sign in again.",
      "Network error":
        "We're having trouble connecting to our servers. Please check your internet connection.",
      Default: "Something went wrong during login. Please try again later.",
    };

    return errorMap[error] || errorMap["Default"];
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (data: LoginFormValues) => {
    if (isLocked) return;

    setLoginError(null);
    setIsLoading(true);

    // Track login attempts
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    localStorage.setItem("loginAttempts", newAttemptCount.toString());
    localStorage.setItem("lastAttemptTime", new Date().getTime().toString());

    // Lock account after 5 attempts for 1 minute
    if (newAttemptCount >= 5) {
      const lockTime = new Date();
      lockTime.setMinutes(lockTime.getMinutes() + 1); // 1 minute lock
      localStorage.setItem("lockUntil", lockTime.toISOString());
      setIsLocked(true);
      startLockTimer(lockTime);
      toast.error(
        "Account temporarily locked due to multiple failed attempts. Please try again in 1 minute."
      );
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        const friendlyError = getFriendlyErrorMessage(result.error);
        setLoginError(friendlyError);
        toast.error(friendlyError);
        return;
      }

      // Reset attempts on successful login
      localStorage.setItem("loginAttempts", "0");

      toast.success("Authentication successful");
      router.push("/verify-otp?email=" + encodeURIComponent(data.email));
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("An unexpected error occurred. Please try again later.");
      toast.error("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Format seconds into MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-t-4 border-t-blue-700">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex justify-center mb-4">
              <ShieldAlert className="h-10 w-10 text-blue-700" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Secure Government Portal
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>

          {sessionExpired && (
            <Alert className="mx-6 mb-2 bg-amber-50 text-amber-800 border-amber-300 w-auto">
              <Info className="h-4 w-4" />
              <AlertTitle>Session Expired</AlertTitle>
              <AlertDescription>
                Your session has expired due to inactivity. Please sign in
                again.
              </AlertDescription>
            </Alert>
          )}

          {loginError && (
            <Alert className="mx-6 mb-2 bg-red-50 text-red-800 border-red-300 w-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Issue</AlertTitle>
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          {isLocked && (
            <Alert className="mx-6 mb-2 bg-red-50 text-red-800 border-red-300 w-auto">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Account Temporarily Locked</AlertTitle>
              <AlertDescription>
                For security, your account is locked for 1 minute due to
                multiple failed attempts.
                <div className="mt-2 font-medium">
                  Time remaining: {formatTime(lockTimeRemaining)}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <CardContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Government Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@agency.gov"
                          disabled={isLoading || isLocked}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading || isLocked}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormDescription className="text-xs text-gray-500">
                  This is a secure government system. Unauthorized access is
                  prohibited and may be subject to legal action.
                </FormDescription>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button
                  type="submit"
                  className="w-full bg-blue-700 hover:bg-blue-800"
                  disabled={isLoading || isLocked}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Secure Sign In"
                  )}
                </Button>

                <Separator className="my-2" />

                <div className="text-center text-sm">
                  Need an account?{" "}
                  <Link
                    href="/register"
                    className="text-blue-700 hover:text-blue-800 hover:underline font-medium"
                  >
                    Request Access
                  </Link>
                </div>

                <div className="text-center text-xs text-gray-500 mt-2">
                  By signing in, you agree to our{" "}
                  <Link href="/privacy-policy" className="underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms-of-service" className="underline">
                    Terms of Service
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md animate-pulse">
        <div className="border rounded-lg p-8 shadow-lg">
          <div className="space-y-6">
            <div className="h-6 w-1/3 bg-gray-200 rounded mx-auto"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mx-auto"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="h-10 bg-blue-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <GovernmentLoginForm />
    </Suspense>
  );
}
