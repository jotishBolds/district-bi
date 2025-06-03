"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Mail, Info } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid government email address")
    .min(1, "Email is required"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function GovernmentForgotPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          type: "PASSWORD_RESET",
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to send password reset email"
        );
      }

      // Log for security audit purposes (in a real app)
      console.info(
        `Password reset requested for ${
          data.email
        } at ${new Date().toISOString()}`
      );

      toast.success("Recovery email sent successfully");
      router.push(
        `/verify-otp?email=${encodeURIComponent(
          data.email
        )}&type=PASSWORD_RESET`
      );
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        toast.error(error.message);
      } else {
        setErrorMessage("Failed to send password reset email");
        toast.error("Failed to send password reset email");
      }
      console.error("Password reset error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-t-4 border-t-blue-700">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex justify-center mb-4">
              <ShieldAlert className="h-10 w-10 text-blue-700" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Account Recovery
            </CardTitle>
            <CardDescription className="text-center">
              Enter your registered government email to receive a password reset
              code
            </CardDescription>
          </CardHeader>

          {errorMessage && (
            <Alert className="mx-6 mb-2 bg-red-50 text-red-800 border-red-300 w-auto">
              <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
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
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                          <Input
                            placeholder="name@agency.gov"
                            className="pl-10"
                            disabled={isLoading}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    A secure one-time password will be sent to your registered
                    email address
                  </AlertDescription>
                </Alert>
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
                      Processing...
                    </>
                  ) : (
                    "Send Recovery Code"
                  )}
                </Button>

                <Separator className="my-2" />

                <div className="text-center text-sm">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="text-blue-700 hover:text-blue-800 hover:underline font-medium"
                  >
                    Return to Secure Sign In
                  </Link>
                </div>

                <div className="text-center text-xs text-gray-500 mt-2">
                  For security assistance, contact the IT Help Desk at{" "}
                  <span className="font-medium">support@agency.gov</span>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
