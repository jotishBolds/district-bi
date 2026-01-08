"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Upload,
  X,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface Section {
  id: string;
  name: string;
  description: string | null;
}

type QueryType = "FEEDBACK" | "GRIEVANCE" | "SUGGESTION";

const queryTypeConfig = {
  FEEDBACK: {
    icon: MessageSquare,
    color: "green",
    title: "Submit Feedback",
    description: "Share your experience or appreciation about our services",
  },
  GRIEVANCE: {
    icon: AlertCircle,
    color: "red",
    title: "File Grievance",
    description: "Report a complaint or issue you faced",
  },
  SUGGESTION: {
    icon: Lightbulb,
    color: "amber",
    title: "Share Suggestion",
    description: "Propose ideas for improving our services",
  },
};

export default function SubmitQueryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <SubmitQueryContent />
    </Suspense>
  );
}

function SubmitQueryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [successData, setSuccessData] = useState<{
    referenceId: string;
    slaDeadline: string;
  } | null>(null);

  // Form state
  const [queryType, setQueryType] = useState<QueryType>(
    (searchParams.get("type") as QueryType) || "FEEDBACK"
  );
  const [sectionId, setSectionId] = useState("");
  const [serviceAvailed, setServiceAvailed] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [citizenName, setCitizenName] = useState(session?.user?.fullName || "");
  const [citizenEmail, setCitizenEmail] = useState(session?.user?.email || "");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [isAnonymousToOfficer, setIsAnonymousToOfficer] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (session?.user) {
      setCitizenName(session.user.fullName || "");
      setCitizenEmail(session.user.email || "");
    }
  }, [session]);

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/samadhan/sections");
      const data = await response.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const validFiles = newFiles.filter((file) => {
      // Validate file type and size
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "video/mp4",
        "video/quicktime",
      ];
      const maxSize = file.type.startsWith("video/")
        ? 50 * 1024 * 1024
        : 10 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: File type not supported`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sectionId) {
      toast.error("Please select a section");
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast.error(
        "Please provide a detailed description (at least 10 characters)"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Always send contact info to be stored in DB
      // The isAnonymousToOfficer flag controls what officers can see
      const submissionData = {
        queryType,
        priority: queryType === "GRIEVANCE" ? priority : undefined,
        sectionId,
        serviceAvailed,
        description,
        // Always send contact info - API will store it privately when anonymous
        citizenName: citizenName || undefined,
        citizenEmail: citizenEmail || undefined,
        citizenPhone: citizenPhone || undefined,
        isAnonymousToOfficer,
      };

      // Submit ticket
      const response = await fetch("/api/samadhan/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to submit");
      }

      // Upload attachments if any
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          await fetch(
            `/api/samadhan/tickets/${data.data.ticketId}/attachments`,
            {
              method: "POST",
              body: formData,
            }
          );
        }
      }

      setSuccessData({
        referenceId: data.data.referenceId,
        slaDeadline: data.data.slaDeadline,
      });

      toast.success("Query submitted successfully!");
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      toast.error(err.message || "Failed to submit query");
    } finally {
      setIsSubmitting(false);
    }
  };

  const config = queryTypeConfig[queryType];
  const IconComponent = config.icon;

  // Success screen
  if (successData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <CardHeader>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-700">
                Query Submitted!
              </CardTitle>
              <CardDescription>
                Your {queryType.toLowerCase()} has been received and assigned.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Reference ID</p>
                <p className="text-lg font-mono font-bold text-gray-900">
                  {successData.referenceId}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Please save this reference ID to track your query status.
              </p>
              <div className="flex flex-col gap-2">
                <Link href={`/samadhan/track/${successData.referenceId}`}>
                  <Button className="w-full">Track Status</Button>
                </Link>
                <Link href="/samadhan">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <Link
          href="/samadhan"
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Query Type Selector */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(["FEEDBACK", "GRIEVANCE", "SUGGESTION"] as QueryType[]).map(
            (type) => {
              const typeConfig = queryTypeConfig[type];
              const TypeIcon = typeConfig.icon;
              const isSelected = queryType === type;

              return (
                <button
                  key={type}
                  onClick={() => setQueryType(type)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? `border-${typeConfig.color}-500 bg-${typeConfig.color}-50`
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <TypeIcon
                    className={`h-6 w-6 mx-auto mb-2 ${
                      isSelected
                        ? `text-${typeConfig.color}-600`
                        : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      isSelected
                        ? `text-${typeConfig.color}-700`
                        : "text-gray-600"
                    }`}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </p>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 bg-${config.color}-100 rounded-lg flex items-center justify-center`}
            >
              <IconComponent className={`h-5 w-5 text-${config.color}-600`} />
            </div>
            <div>
              <CardTitle>{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Contact Information (Optional)
                </h3>
              </div>

              {/* Anonymous Toggle - Always show for all users */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  isAnonymousToOfficer
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {isAnonymousToOfficer ? (
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <EyeOff className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {isAnonymousToOfficer
                        ? "Anonymous Submission"
                        : "Share My Contact Details"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAnonymousToOfficer
                        ? "Officers will only see a pseudonym (e.g., Brave Tiger 1234)"
                        : "Officers will see your name, phone & email for direct contact"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isAnonymousToOfficer}
                  onCheckedChange={(checked) => {
                    setIsAnonymousToOfficer(checked);
                  }}
                />
              </div>

              {/* Anonymous mode notice - what officers will see */}
              {isAnonymousToOfficer && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        🔒 Privacy Protected
                      </p>
                      <p className="text-sm text-green-700">
                        Your identity will be hidden from officers. They&apos;ll
                        only see a pseudonym like{" "}
                        <span className="font-mono bg-green-100 px-1.5 py-0.5 rounded">
                          &quot;Brave Tiger 1234&quot;
                        </span>
                        .
                        {session
                          ? " Your real info is stored securely and only visible to DC/Admin for verification."
                          : " You can still provide contact info below if you want to receive updates."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Non-anonymous mode notice */}
              {!isAnonymousToOfficer && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800 mb-1">
                        📞 Direct Contact Enabled
                      </p>
                      <p className="text-sm text-blue-700">
                        Officers will be able to see your contact details and
                        reach out directly for faster resolution. Fill in the
                        information below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information Fields */}
              <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    {isAnonymousToOfficer
                      ? "Your Details (Private - for updates only)"
                      : "Your Details (Visible to Officers)"}
                  </p>
                  {isAnonymousToOfficer && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
                      Hidden from officers
                    </span>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm text-gray-600">
                      Your Name
                    </Label>
                    <Input
                      id="name"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm text-gray-600">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm text-gray-600">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={citizenEmail}
                    onChange={(e) => setCitizenEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                  />
                </div>

                {isAnonymousToOfficer &&
                  (citizenName || citizenPhone || citizenEmail) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                      <EyeOff className="h-3 w-3" />
                      This information will be stored privately and NOT shown to
                      officers
                    </p>
                  )}
              </div>
            </div>

            {/* Section Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                Query Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="section">Section Visited *</Label>
                  <Select value={sectionId} onValueChange={setSectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="service">Service Availed</Label>
                  <Input
                    id="service"
                    value={serviceAvailed}
                    onChange={(e) => setServiceAvailed(e.target.value)}
                    placeholder="e.g., Birth Certificate, Land Records"
                  />
                </div>
              </div>

              {/* Priority (for Grievance only) */}
              {queryType === "GRIEVANCE" && (
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) =>
                      setPriority(v as "LOW" | "MEDIUM" | "HIGH")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">
                        Low - Non-urgent issue
                      </SelectItem>
                      <SelectItem value="MEDIUM">
                        Medium - Normal priority
                      </SelectItem>
                      <SelectItem value="HIGH">High - Urgent matter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Describe your ${queryType.toLowerCase()} in detail...`}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/10 minimum characters
                </p>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                Attachments (Optional)
              </h3>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,.pdf,.doc,.docx,.mp4,.mov"
                />
                <label htmlFor="file-upload">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>Select Files</span>
                  </Button>
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  Images (5MB), PDF (10MB), Videos (50MB)
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <Upload className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit{" "}
                  {queryType.charAt(0) + queryType.slice(1).toLowerCase()}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
