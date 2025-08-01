"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Phone,
  FileText,
  ArrowLeft,
  Search,
  Shield,
  User,
  Calendar,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Check,
  Grid3X3,
  List,
  ScanLine,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getRoleMapping } from "@/lib/officer-roles";
import { UserRole } from "@/app/generated/prisma";

interface ApplicationData {
  id: string;
  rrNumber: string | null;
  subject: string | null;
  status: string;
  citizenName: string;
  citizenPhone: string;
  serviceCategoryName: string;
  departmentName: string;
  submittedAt: string | null;
  validatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  currentHolder: string | null;
  currentHolderRole?: string;
  currentHolderLevel?: number;
  currentHolderDesignation?: string;
  workflow: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    changedByRole?: string;
    changedByLevel?: number;
    changedByDesignation?: string;
    comments: string | null;
  }>;
  validation: {
    rrNumber: string;
    validatedBy: string;
    validationNotes: string | null;
  } | null;
}

interface ValidationErrors {
  identifier?: string;
  otp?: string;
}

export default function TrackApplicationPage() {
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "otp" | "result" | "applications">(
    "input"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [otpSentTo, setOtpSentTo] = useState("");
  const [maskedContact, setMaskedContact] = useState("");
  const [applicationData, setApplicationData] =
    useState<ApplicationData | null>(null);
  const [applicationsData, setApplicationsData] = useState<ApplicationData[]>(
    []
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [inputType, setInputType] = useState<
    "RR_NUMBER" | "PHONE_NUMBER" | null
  >(null);

  // Helper function to get officer display information
  const getOfficerDisplayInfo = (entry: {
    changedBy: string;
    changedByRole?: string;
    changedByDesignation?: string;
    changedByLevel?: number;
  }) => {
    if (!entry.changedByRole) {
      return {
        name: entry.changedBy,
        designation: null,
        level: null,
        levelDisplay: null,
      };
    }

    const roleMapping = getRoleMapping(entry.changedByRole as UserRole);

    return {
      name: entry.changedBy,
      designation: entry.changedByDesignation || roleMapping?.shortDesignation,
      level: entry.changedByLevel ?? roleMapping?.level,
      levelDisplay:
        entry.changedByLevel !== null && entry.changedByLevel !== undefined
          ? `Level ${entry.changedByLevel}`
          : roleMapping?.level !== undefined
          ? `Level ${roleMapping.level}`
          : null,
    };
  };

  // Smart input detection function
  const detectInputType = (
    value: string
  ): "RR_NUMBER" | "PHONE_NUMBER" | null => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    // Check if it's an RR number format
    const rrPattern = /^RR-\d{4}-\d{4}$/i;
    if (rrPattern.test(trimmedValue)) {
      return "RR_NUMBER";
    }

    // Check if it starts with RR- but incomplete
    if (trimmedValue.toLowerCase().startsWith("rr-")) {
      return "RR_NUMBER";
    }

    // Check if it's a phone number (digits with optional + and spaces/dashes)
    const phonePattern = /^[+]?[\d\s\-\(\)]+$/;
    if (phonePattern.test(trimmedValue)) {
      return "PHONE_NUMBER";
    }

    // Default to phone number for pure digits
    if (/^\d+$/.test(trimmedValue)) {
      return "PHONE_NUMBER";
    }

    return null;
  };

  // Validation functions
  const validateRRNumber = (rrNumber: string): string | null => {
    if (!rrNumber.trim()) {
      return "RR number is required";
    }
    // RR number format: RR-YYYY-NNNN (e.g., RR-2025-6834)
    const rrPattern = /^RR-\d{4}-\d{4}$/i;
    if (!rrPattern.test(rrNumber.trim())) {
      return "RR number must be in format: RR-YYYY-NNNN (e.g., RR-2025-XXXX)";
    }
    return null;
  };

  const validatePhoneNumber = (phone: string): string | null => {
    if (!phone.trim()) {
      return "Phone number is required";
    }
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, "");

    // Check if it's a valid length (10 digits for most countries)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return "Phone number must be between 10-15 digits";
    }

    // Basic pattern check for common formats
    const phonePattern = /^[+]?[1-9][\d]{9,14}$/;
    if (!phonePattern.test(cleanPhone)) {
      return "Please enter a valid phone number";
    }

    return null;
  };

  const validateOTP = (otpValue: string): string | null => {
    if (!otpValue.trim()) {
      return "OTP is required";
    }
    if (!/^\d{6}$/.test(otpValue.trim())) {
      return "OTP must be exactly 6 digits";
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (step === "input") {
      const detectedType = detectInputType(identifier);
      if (!detectedType) {
        errors.identifier =
          "Please enter a valid RR number (RR-YYYY-NNNN) or phone number";
      } else if (detectedType === "RR_NUMBER") {
        const rrError = validateRRNumber(identifier);
        if (rrError) errors.identifier = rrError;
      } else {
        const phoneError = validatePhoneNumber(identifier);
        if (phoneError) errors.identifier = phoneError;
      }
    } else if (step === "otp") {
      const otpError = validateOTP(otp);
      if (otpError) errors.otp = otpError;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (value: string) => {
    setIdentifier(value);
    // Detect input type and update state
    const detectedType = detectInputType(value);
    setInputType(detectedType);
    // Clear validation error when user starts typing
    if (validationErrors.identifier) {
      setValidationErrors((prev) => ({ ...prev, identifier: undefined }));
    }
    setError("");
  };

  const handleOTPChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setOtp(numericValue);
    // Clear validation error when user starts typing
    if (validationErrors.otp) {
      setValidationErrors((prev) => ({ ...prev, otp: undefined }));
    }
    setError("");
  };

  const handleRequestOTP = async () => {
    if (!validateForm()) {
      return;
    }

    const detectedType = detectInputType(identifier);
    if (!detectedType) {
      setError("Invalid input format");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: detectedType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }
      setOtpSentTo(data.sentTo);
      setMaskedContact(data.maskedContact);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/track", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP");
      }

      // Check if we have multiple applications (phone number tracking)
      if (data.isMultipleApplications && data.applications) {
        setApplicationsData(data.applications);
        setStep("applications");
      } else if (data.application) {
        setApplicationData(data.application);
        setStep("result");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep("input");
    setIdentifier("");
    setOtp("");
    setError("");
    setValidationErrors({});
    setApplicationData(null);
    setApplicationsData([]);
    setSelectedApplicationId(null);
    setOtpSentTo("");
    setMaskedContact("");
    setInputType(null);
  };

  const handleSelectApplication = async (applicationId: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/track/${applicationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch application details");
      }

      setApplicationData(data.application);
      setSelectedApplicationId(applicationId);
      setStep("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToApplicationsList = () => {
    setStep("applications");
    setApplicationData(null);
    setSelectedApplicationId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        color: "default" | "secondary" | "destructive" | "outline";
        icon: typeof FileText;
        bgColor: string;
        textColor: string;
      }
    > = {
      DRAFT: {
        color: "secondary",
        icon: FileText,
        bgColor: "bg-slate-100",
        textColor: "text-slate-700",
      },
      PENDING: {
        color: "outline",
        icon: Clock,
        bgColor: "bg-amber-100",
        textColor: "text-amber-700",
      },
      VALIDATED: {
        color: "secondary",
        icon: CheckCircle,
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
      },
      OPEN: {
        color: "outline",
        icon: Clock,
        bgColor: "bg-purple-100",
        textColor: "text-purple-700",
      },
      IN_PROGRESS: {
        color: "secondary",
        icon: Clock,
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
      },
      RESOLVED: {
        color: "default",
        icon: CheckCircle,
        bgColor: "bg-green-100",
        textColor: "text-green-700",
      },
      CLOSED: {
        color: "destructive",
        icon: XCircle,
        bgColor: "bg-red-100",
        textColor: "text-red-700",
      },
      REOPENED: {
        color: "secondary",
        icon: RotateCcw,
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
      },
    };

    const config = statusConfig[status] || {
      color: "secondary" as const,
      icon: AlertCircle,
      bgColor: "bg-gray-100",
      textColor: "text-gray-700",
    };
    const Icon = config.icon;

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}
      >
        <Icon size={14} />
        {status.replace(/_/g, " ")}
      </div>
    );
  };

  const getProgressValue = (status: string) => {
    // Progress mapping based on ApplicationStatus in schema.prisma
    // DRAFT: 10, PENDING: 25, VALIDATED: 40, OPEN: 50, IN_PROGRESS: 60, RESOLVED: 90, CLOSED: 100, REOPENED: 60
    const progressMap: Record<string, number> = {
      DRAFT: 10,
      PENDING: 25,
      VALIDATED: 40,
      OPEN: 50,
      IN_PROGRESS: 60,
      RESOLVED: 90,
      CLOSED: 100,
      REOPENED: 60,
    };
    return progressMap[status] || 0;
  };

  // Applications list view for phone number tracking
  if (step === "applications" && applicationsData.length > 0) {
    return (
      <div className="min-h-screen bg-slate-50 relative">
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-slate-700 font-medium">
                  Loading application details...
                </span>
              </div>
            </div>
            Track Application
          </div>
        )}
        <div className="container mx-auto px-4 py-6 lg:py-12 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleStartOver}
              className="mb-4 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Track Another Application
            </Button>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                  Your Applications
                </h1>
                <p className="text-slate-600 text-lg">
                  Found {applicationsData.length} application
                  {applicationsData.length > 1 ? "s" : ""} for phone number{" "}
                  {identifier}
                </p>
              </div>
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 justify-center lg:justify-end">
                <span className="text-sm text-slate-600 font-medium">
                  View:
                </span>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      viewMode === "grid"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4 mr-1.5" />
                    Grid
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      viewMode === "list"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <List className="w-4 h-4 mr-1.5" />
                    List
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Applications Grid/List View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {applicationsData.map((app) => (
                <Card
                  key={app.id}
                  className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => handleSelectApplication(app.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {app.serviceCategoryName}
                        </CardTitle>
                        <p className="text-emerald-600 font-medium mb-2 text-sm">
                          Department: {app.departmentName}
                        </p>
                        {app.subject && (
                          <p className="text-blue-600 font-medium mb-2 text-sm">
                            {app.subject}
                          </p>
                        )}
                        <CardDescription className="text-slate-600 text-sm">
                          RR Number: {app.rrNumber || "Pending Assignment"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium text-slate-900">
                          {getProgressValue(app.status)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${getProgressValue(app.status)}%`,
                            backgroundColor: "#1170cd",
                          }}
                        />
                      </div>
                    </div>

                    {/* Key Information */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-slate-600 mb-1">
                          <Calendar className="w-3 h-3" />
                          Submitted
                        </div>
                        <p className="font-medium text-slate-900">
                          {app.submittedAt
                            ? new Date(app.submittedAt).toLocaleDateString()
                            : new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {app.currentHolder && (
                        <div>
                          <div className="flex items-center gap-1 text-slate-600 mb-1">
                            <Shield className="w-3 h-3" />
                            Handler
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900 truncate">
                              {app.currentHolder}
                            </p>
                            {app.currentHolderDesignation && (
                              <p className="text-xs text-slate-500 truncate">
                                {app.currentHolderDesignation}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Click to view */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                        <Search className="w-4 h-4 mr-1" />
                        Click to view details
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {applicationsData.map((app) => (
                <Card
                  key={app.id}
                  className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => handleSelectApplication(app.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {app.serviceCategoryName}
                            </h3>
                            <p className="text-emerald-600 font-medium text-sm mt-1">
                              Department: {app.departmentName}
                            </p>
                            {app.subject && (
                              <p className="text-blue-600 font-medium text-sm mt-1 truncate">
                                {app.subject}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(app.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600 font-medium">
                              RR Number:
                            </span>
                            <p className="text-slate-900 mt-1">
                              {app.rrNumber || "Pending Assignment"}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                              <Calendar className="w-3 h-3" />
                              Submitted
                            </div>
                            <p className="text-slate-900 mt-1">
                              {app.submittedAt
                                ? new Date(app.submittedAt).toLocaleDateString()
                                : new Date(app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {app.currentHolder && (
                            <div>
                              <div className="flex items-center gap-1 text-slate-600 font-medium">
                                <Shield className="w-3 h-3" />
                                Handler
                              </div>
                              <div className="mt-1 space-y-1">
                                <p className="text-slate-900 truncate">
                                  {app.currentHolder}
                                </p>
                                {app.currentHolderDesignation && (
                                  <p className="text-xs text-slate-500 truncate">
                                    {app.currentHolderDesignation}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-600 font-medium">
                              Progress:
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${getProgressValue(app.status)}%`,
                                    backgroundColor: "#1170cd",
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-900">
                                {getProgressValue(app.status)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Area */}
                      <div className="flex-shrink-0 flex items-center justify-center lg:justify-end">
                        <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                          <Search className="w-4 h-4 mr-1" />
                          View Details
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Help Card */}
          <div className="mt-8">
            <Card
              className="border-0 shadow-lg text-white"
              style={{ backgroundColor: "#fe9a00" }}
            >
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-orange-100 mb-4">
                  Contact our support team for assistance with your
                  applications.
                </p>
                <Button variant="secondary" size="sm">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === "result" && applicationData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-6 lg:py-12 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={
                applicationsData.length > 0
                  ? handleBackToApplicationsList
                  : handleStartOver
              }
              className="mb-4 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {applicationsData.length > 0
                ? "Back to Applications"
                : "Track Another Application"}
            </Button>
            <div className="text-center lg:text-left">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                Application Status
              </h1>
              <p className="text-slate-600 text-lg font-bold">
                {applicationData.serviceCategoryName}
              </p>
              <p className="text-emerald-600 text-base font-medium mt-1">
                Department: {applicationData.departmentName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Overview Card */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl text-slate-900">
                        Application Overview
                      </CardTitle>
                      {applicationData.subject && (
                        <div className="w-auto">
                          <p className="text-blue-600 font-medium text-xl mt-1">
                            {applicationData.subject}
                          </p>
                        </div>
                      )}
                      <CardDescription className="text-slate-600 mt-2">
                        RR Number:{" "}
                        {applicationData.rrNumber || "Pending Assignment"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(applicationData.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-medium text-slate-900">
                        {getProgressValue(applicationData.status)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${getProgressValue(applicationData.status)}%`,
                          backgroundColor: "#1170cd",
                        }}
                      />
                    </div>
                  </div>

                  {/* Key Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <User className="w-4 h-4" />
                        Applicant Name
                      </div>
                      <p className="font-semibold text-slate-900">
                        {applicationData.citizenName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Phone className="w-4 h-4" />
                        Contact Number
                      </div>
                      <p className="font-semibold text-slate-900">
                        {applicationData.citizenPhone}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Calendar className="w-4 h-4" />
                        Submitted On
                      </div>
                      <p className="font-semibold text-slate-900">
                        {applicationData.submittedAt
                          ? new Date(
                              applicationData.submittedAt
                            ).toLocaleDateString()
                          : new Date(
                              applicationData.createdAt
                            ).toLocaleDateString()}
                      </p>
                    </div>
                    {applicationData.currentHolder && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Shield className="w-4 h-4" />
                          Current Handler
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">
                            {applicationData.currentHolder}
                          </p>
                          {applicationData.currentHolderDesignation && (
                            <p className="text-sm text-slate-600">
                              {applicationData.currentHolderDesignation}
                            </p>
                          )}
                          {applicationData.currentHolderLevel !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Level {applicationData.currentHolderLevel}
                              </span>
                              <div
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor:
                                    applicationData.currentHolderLevel <= 2
                                      ? "#fee2e2"
                                      : applicationData.currentHolderLevel <= 4
                                      ? "#fef3c7"
                                      : "#e0f2fe",
                                  color:
                                    applicationData.currentHolderLevel <= 2
                                      ? "#dc2626"
                                      : applicationData.currentHolderLevel <= 4
                                      ? "#d97706"
                                      : "#0284c7",
                                }}
                              >
                                {applicationData.currentHolderLevel <= 2
                                  ? "Senior Officer"
                                  : applicationData.currentHolderLevel <= 4
                                  ? "Mid-Level Officer"
                                  : "Officer"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Card */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                    <Clock className="w-5 h-5" />
                    Application Timeline
                  </CardTitle>
                  <CardDescription>
                    Track the progress of your application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {applicationData.workflow.map((entry, index) => {
                      const officerInfo = getOfficerDisplayInfo(entry);
                      return (
                        <div key={index} className="relative">
                          {index !== applicationData.workflow.length - 1 && (
                            <div className="absolute left-4 top-8 w-0.5 h-16 bg-slate-200" />
                          )}
                          <div className="flex gap-4">
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                              style={{ backgroundColor: "#1170cd" }}
                            >
                              <CheckCircle size={16} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                {getStatusBadge(entry.status)}
                                <span className="text-sm text-slate-500">
                                  {new Date(entry.changedAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="space-y-1 mb-2">
                                <p className="text-sm text-slate-600">
                                  <span className="font-medium">
                                    Updated by:
                                  </span>{" "}
                                  {officerInfo.name}
                                </p>
                                {officerInfo.designation && (
                                  <p className="text-sm text-slate-500">
                                    <span className="font-medium">
                                      Designation:
                                    </span>{" "}
                                    {officerInfo.designation}
                                  </p>
                                )}
                                {officerInfo.levelDisplay && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">
                                      {officerInfo.levelDisplay}
                                    </span>
                                    <div
                                      className="px-2 py-1 rounded-full text-xs font-medium"
                                      style={{
                                        backgroundColor:
                                          officerInfo.level !== null &&
                                          officerInfo.level !== undefined &&
                                          officerInfo.level <= 2
                                            ? "#fee2e2"
                                            : officerInfo.level !== null &&
                                              officerInfo.level !== undefined &&
                                              officerInfo.level <= 4
                                            ? "#fef3c7"
                                            : "#e0f2fe",
                                        color:
                                          officerInfo.level !== null &&
                                          officerInfo.level !== undefined &&
                                          officerInfo.level <= 2
                                            ? "#dc2626"
                                            : officerInfo.level !== null &&
                                              officerInfo.level !== undefined &&
                                              officerInfo.level <= 4
                                            ? "#d97706"
                                            : "#0284c7",
                                      }}
                                    >
                                      {officerInfo.level !== null &&
                                      officerInfo.level !== undefined &&
                                      officerInfo.level <= 2
                                        ? "Senior Officer"
                                        : officerInfo.level !== null &&
                                          officerInfo.level !== undefined &&
                                          officerInfo.level <= 4
                                        ? "Mid-Level Officer"
                                        : "Officer"}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {entry.comments && (
                                <div className="bg-slate-50 rounded-lg p-3 mt-2">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-slate-700">
                                      {entry.comments}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {applicationsData.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={handleBackToApplicationsList}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Applications
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={handleStartOver}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Track Another Application
                  </Button>
                </CardContent>
              </Card>

              {/* Validation Details */}
              {applicationData.validation && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">
                      Validation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">
                        Validated By
                      </Label>
                      <p className="text-slate-900 font-medium">
                        {applicationData.validation.validatedBy}
                      </p>
                    </div>
                    {applicationData.validation.validationNotes && (
                      <div>
                        <Label className="text-sm font-medium text-slate-600">
                          Validation Notes
                        </Label>
                        <div className="bg-slate-50 rounded-lg p-3 mt-1">
                          <p className="text-sm text-slate-700">
                            {applicationData.validation.validationNotes}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Help Card */}
              <Card
                className="border-0 shadow-lg text-white"
                style={{ backgroundColor: "#fe9a00" }}
              >
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Need Help?</h3>
                  <p className="text-sm text-orange-100 mb-4">
                    Contact our support team for assistance with your
                    application.
                  </p>
                  <Button variant="secondary" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>,
    action: () => void
  ) => {
    if (event.key === "Enter") {
      action();
    }
  };

  return (
    <div className="min-h-[83vh]  flex items-center justify-center ">
      <div className="w-full max-w-6xl">
        <Card className="border-0 shadow-none bg-white rounded-3xl mb-8">
          <CardContent className="p-4 sm:p-10">
            {step === "input" && (
              <div className="space-y-6 -mb-4 -mt-8">
                {/* Title Section - Add this new section */}
                <div className="text-center space-y-4 mb-8">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <ScanLine className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-light text-slate-900">
                      Track Application
                    </h1>
                    <p className="text-slate-600 text-lg font-normal">
                      Check the status of your application in real-time
                    </p>
                  </div>
                </div>
                {/* Google-like Smart Input Field */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label
                      htmlFor="smartInput"
                      className="text-slate-500 font-sans text-md text-center block"
                    >
                      Enter your RR number or phone number to track your
                      application
                    </Label>
                    <div className="relative">
                      {/* Left icon indicator */}
                      {inputType && (
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center">
                          {inputType === "RR_NUMBER" ? (
                            <FileText className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Phone className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      )}

                      <Input
                        id="smartInput"
                        placeholder="Search RR number or phone number..."
                        value={identifier}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, handleRequestOTP)}
                        className={`h-14 sm:h-16 font-sans ${
                          inputType ? "pl-12" : "pl-6"
                        } pr-14 text-base sm:text-lg border-2 rounded-full transition-all duration-300 hover:shadow-sm focus:shadow-sm ${
                          validationErrors.identifier
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                            : inputType
                            ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-blue-50"
                            : "border-slate-300 focus:border-slate-500 focus:ring-slate-500 bg-white hover:bg-slate-50"
                        }`}
                        style={{
                          borderColor: validationErrors.identifier
                            ? undefined
                            : inputType
                            ? "#1170cd"
                            : undefined,
                        }}
                      />

                      {/* Right search icon circle - Interactive Button */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <button
                          type="button"
                          onClick={handleRequestOTP}
                          disabled={
                            loading ||
                            !!validationErrors.identifier ||
                            !inputType
                          }
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            identifier &&
                            !validationErrors.identifier &&
                            inputType
                              ? "bg-green-500 shadow-lg hover:bg-green-600"
                              : validationErrors.identifier
                              ? "bg-red-500 shadow-lg"
                              : "shadow-lg hover:shadow-xl"
                          }`}
                          style={{
                            backgroundColor:
                              !validationErrors.identifier &&
                              identifier &&
                              inputType
                                ? "#10b981"
                                : validationErrors.identifier
                                ? "#ef4444"
                                : "#1170cd",
                          }}
                        >
                          {loading ? (
                            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                          ) : identifier &&
                            !validationErrors.identifier &&
                            inputType ? (
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white rotate-180" />
                          ) : validationErrors.identifier ? (
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          ) : (
                            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Input Type Indicator - Google style */}
                    {inputType && !validationErrors.identifier && (
                      <div className="flex items-center justify-center">
                        <div
                          className={`inline-flex font-sans items-center gap-2 px-4 py-2 rounded-full text-white font-medium text-sm shadow-lg ${
                            inputType === "RR_NUMBER"
                              ? "bg-blue-600"
                              : "bg-green-600"
                          }`}
                        >
                          {inputType === "RR_NUMBER" ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                          {inputType === "RR_NUMBER"
                            ? "RR Number "
                            : "Phone Number "}
                        </div>
                      </div>
                    )}

                    {validationErrors.identifier && (
                      <div className="text-center">
                        <p className="text-sm text-red-600 flex items-center justify-center gap-2 bg-red-50 rounded-full px-4 py-2">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.identifier}
                        </p>
                      </div>
                    )}

                    {/* Help Text - More subtle */}
                    {!inputType && !validationErrors.identifier && (
                      <div className="bg-slate-50 rounded-2xl font-sans p-4 space-y-3 border border-slate-200">
                        <p className="text-xs text-slate-600 font-medium text-center">
                          Supported formats:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
                          <div className="flex items-center justify-center gap-2 bg-white rounded-xl p-3 border border-slate-100">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span>
                              <strong>RR Number:</strong> RR-202X-XXXX
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-2 bg-white rounded-xl p-3 border border-slate-100">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span>
                              <strong>Phone:</strong> 99XX22XX44
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-center mt-6 font-sans">
                    <p className="text-sm text-slate-500">
                      Secure application tracking powered by OTP verification
                    </p>
                  </div>
                </div>

                {error && (
                  <Alert
                    variant="destructive"
                    className="border-red-200 bg-red-50 rounded-2xl"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-6 -mb-4 font-sans">
                <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-200">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg"
                    style={{ backgroundColor: "blue" }}
                  >
                    <Shield className="w-6 h-6 text-white fill-blue-600" />
                  </div>
                  <p className="text-base text-blue-700 font-medium">
                    OTP sent to your {otpSentTo}
                  </p>
                  <p className="text-sm text-blue-600 mt-2 font-mono bg-white px-3 py-1 rounded-full inline-block">
                    {maskedContact}
                  </p>
                </div>

                <div className="space-y-4">
                  <Label
                    htmlFor="otp"
                    className="text-slate-700 font-medium text-center block"
                  >
                    Enter 6-digit OTP
                  </Label>
                  <div className="relative">
                    <Input
                      id="otp"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => handleOTPChange(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, handleVerifyOTP)}
                      maxLength={6}
                      className={`h-14 sm:h-16 pl-6 pr-14 text-center text-xl font-mono border-2 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl focus:shadow-xl ${
                        validationErrors.otp
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                          : otp.length === 6
                          ? "border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50"
                          : "border-slate-300 focus:border-slate-500 focus:ring-slate-500 bg-white"
                      }`}
                      style={{
                        borderColor: validationErrors.otp
                          ? undefined
                          : otp.length === 6
                          ? "#10b981"
                          : "#1170cd",
                      }}
                    />

                    {/* Right verify button circle */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <button
                        type="button"
                        onClick={handleVerifyOTP}
                        disabled={
                          loading || !!validationErrors.otp || otp.length !== 6
                        }
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                          otp.length === 6 && !validationErrors.otp
                            ? "bg-green-500 hover:bg-green-600"
                            : validationErrors.otp
                            ? "bg-red-500"
                            : ""
                        }`}
                        style={{
                          backgroundColor:
                            otp.length === 6 && !validationErrors.otp
                              ? "#10b981"
                              : validationErrors.otp
                              ? "#ef4444"
                              : "#1170cd",
                        }}
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                        ) : otp.length === 6 && !validationErrors.otp ? (
                          <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        ) : validationErrors.otp ? (
                          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        ) : (
                          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white rotate-180" />
                        )}
                      </button>
                    </div>
                  </div>

                  {validationErrors.otp && (
                    <div className="text-center">
                      <p className="text-sm text-red-600 flex items-center justify-center gap-2 bg-red-50 rounded-full px-4 py-2">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.otp}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 text-center">
                    Enter the 6-digit code sent to your device
                  </p>
                </div>

                {error && (
                  <Alert
                    variant="destructive"
                    className="border-red-200 bg-red-50 rounded-2xl"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={handleStartOver}
                    className="text-slate-500 hover:text-slate-700 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
