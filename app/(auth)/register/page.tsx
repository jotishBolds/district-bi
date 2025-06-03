"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, ShieldAlert, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Form validation schema
const registerFormSchema = z
  .object({
    email: z
      .string()
      .email("Please enter a valid  email address")
      .min(1, "Email is required"),

    fullName: z
      .string()
      .min(3, "Full name must be at least 3 characters")
      .max(100, "Full name cannot exceed 100 characters"),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .max(15, "Phone number cannot exceed 15 digits")
      .regex(/^\+?[0-9\s\-()]+$/, "Please enter a valid phone number"),
    address: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .max(200, "Address cannot exceed 200 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function GovernmentRegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: RegisterFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Registration failed");
      }

      toast.success("Registration submitted successfully");
      router.push(
        `/verify-otp?email=${encodeURIComponent(
          data.email
        )}&type=EMAIL_VERIFICATION&fromRegister=true`
      );
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        toast.error(error.message);
      } else {
        setErrorMessage("Registration failed");
        toast.error("Registration failed");
      }
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="w-full max-w-xl">
        <Card className="shadow-lg border-t-4 border-t-blue-700">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex justify-center mb-4">
              <UserPlus className="h-10 w-10 text-blue-700" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Request Government Access
            </CardTitle>
            <CardDescription className="text-center">
              Complete this form to request access to government services
            </CardDescription>
          </CardHeader>

          {errorMessage && (
            <Alert className="mx-6 mb-2 bg-red-50 text-red-800 border-red-300 w-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <CardContent className="space-y-4 pt-4">
                <Alert className="bg-amber-50 text-amber-800 border-amber-300">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    This system is for authorized government personnel only.
                    Unauthorized access attempts may be subject to legal action.
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Government Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="name@agency.gov"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Must be a valid .gov email address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Legal Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="First Middle Last"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Must be a valid full name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Government Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 (555) 555-5555"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Official Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Department and physical location"
                          rows={3}
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="my-2" />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••••••"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Minimum 12 characters with uppercase, lowercase, number,
                        and special character
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••••••"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      Submitting Request...
                    </>
                  ) : (
                    "Submit Access Request"
                  )}
                </Button>

                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-blue-700 hover:text-blue-800 hover:underline font-medium"
                  >
                    Sign in
                  </Link>
                </div>

                <div className="text-center text-xs text-gray-500 mt-2">
                  By requesting access, you agree to abide by all applicable
                  government
                  <br />
                  <Link href="/security-policy" className="underline">
                    security policies
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms-of-use" className="underline">
                    terms of use
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
