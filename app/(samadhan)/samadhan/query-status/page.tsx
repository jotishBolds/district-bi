"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Loader2,
  HelpCircle,
  Phone,
  Mail,
  User,
  MessageSquare,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function QueryStatusPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!queryDescription.trim()) {
      toast.error("Please describe your original query");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/samadhan/query-status-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          queryDescription: queryDescription.trim(),
          submissionDate: submissionDate || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccessModal(true);
        // Reset form
        setName("");
        setPhone("");
        setEmail("");
        setQueryDescription("");
        setSubmissionDate("");
      } else {
        toast.error(data.message || "Failed to submit request");
      }
    } catch (error) {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/samadhan"
          className="inline-flex items-center text-sm text-gray-600 hover:text-green-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8 bg-gradient-to-b from-blue-50 to-white">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <HelpCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Request Status Update
            </CardTitle>
            <CardDescription className="text-gray-600">
              For guest users who submitted a query without registering
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8">
            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Our team will review your request and
                contact you via phone/SMS with your query status. Please provide
                accurate contact details.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  Your Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 border-2 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Phone className="w-4 h-4 text-gray-500" />
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 border-2 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500">
                  This should be the same number used during submission
                </p>
              </div>

              {/* Email (Optional) */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email Address (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-2 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Approximate Submission Date */}
              <div className="space-y-2">
                <Label
                  htmlFor="submissionDate"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Approximate Submission Date (Optional)
                </Label>
                <Input
                  id="submissionDate"
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="h-12 border-2 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Query Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="queryDescription"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  Describe Your Original Query{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="queryDescription"
                  placeholder="Please describe what your original query was about so we can locate it in our system..."
                  value={queryDescription}
                  onChange={(e) => setQueryDescription(e.target.value)}
                  className="min-h-[120px] border-2 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full gap-2 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Want full tracking features?
              </p>
              <Link href="/samadhan/login">
                <Button
                  variant="outline"
                  className="rounded-full border-2 border-green-200 hover:bg-green-50 hover:border-green-400"
                >
                  Register for an Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-center">
              Request Submitted!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-2">
                <span className="block">
                  Your status update request has been submitted successfully.
                </span>
                <span className="block text-sm text-gray-500">
                  Our team will review your request and contact you via
                  phone/SMS within 2-3 business days.
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-4">
            <Link href="/samadhan">
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                Back to Home
              </Button>
            </Link>
            <Link href="/samadhan/login">
              <Button variant="outline" className="w-full">
                Register for Full Access
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
