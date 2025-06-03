"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  MessageSquare,
  History,
  FileCheck,
  Hourglass,
  Clock4,
  ChevronRight,
} from "lucide-react";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ApplicationDetails {
  id: string;
  rrNumber?: string;
  status: string;
  createdAt: string;
  submittedAt?: string;
  validatedAt?: string;
  completedAt?: string;
  serviceCategory: {
    name: string;
    description: string;
    slaDays: number;
  };
  citizen: {
    citizenProfile: {
      fullName: string;
    };
  };
  currentHolder?: {
    officerProfile: {
      fullName: string;
      designation: string;
    };
  };
  workflow: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    comments: string;
    createdAt: string;
    changedBy: {
      citizenProfile?: {
        fullName: string;
      };
      officerProfile?: {
        fullName: string;
      };
    };
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    isVerified: boolean;
    uploadedBy: {
      citizenProfile?: {
        fullName: string;
      };
      officerProfile?: {
        fullName: string;
      };
    };
    verifiedBy?: {
      officerProfile: {
        fullName: string;
      };
    };
    createdAt: string;
  }>;
  validation?: {
    rrNumber: string;
    isDocumentsComplete: boolean;
    isEligibilityVerified: boolean;
    validationNotes: string;
    validatedBy: {
      officerProfile: {
        fullName: string;
      };
    };
    createdAt: string;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    performedBy: {
      citizenProfile?: {
        fullName: string;
      };
      officerProfile?: {
        fullName: string;
      };
    };
    createdAt: string;
  }>;
}

const PROCESS_STEPS = [
  {
    key: "DRAFT",
    label: "Draft",
    icon: FileText,
    description: "Application created but not submitted",
  },
  {
    key: "PENDING",
    label: "Pending Validation",
    icon: Clock4,
    description: "Awaiting document verification",
  },
  {
    key: "VALIDATED",
    label: "Validated",
    icon: FileCheck,
    description: "Documents verified and approved",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    icon: Hourglass,
    description: "Application under review",
  },
  {
    key: "APPROVED",
    label: "Approved",
    icon: CheckCircle2,
    description: "Application successfully approved",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "VALIDATED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "IN_PROGRESS":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "APPROVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ApplicationDetailsPage({ params }: PageProps) {
  const { id: applicationId } = React.use(params);
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/applications/${applicationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Application not found");
        }
        throw new Error("Failed to fetch application details");
      }

      const data = await response.json();
      setApplication(data);
    } catch (error) {
      console.error("Error fetching application details:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load application details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const currentIndex = PROCESS_STEPS.findIndex(
      (step) => step.key === currentStatus
    );
    const stepIndex = PROCESS_STEPS.findIndex((step) => step.key === stepKey);

    if (currentStatus === "REJECTED") {
      return stepIndex <
        PROCESS_STEPS.findIndex((step) => step.key === "VALIDATED")
        ? "completed"
        : "pending";
    }

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "pending";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Application not found"}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      {/* Header */}
      <PageHeader className="mb-8 mt-[-80px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-4">
          {/* Left side - Back button and application info */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mr-2 pl-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Applications
              </Button>
            </div>
            <PageHeaderHeading className="flex items-center gap-3 flex-wrap">
              {application.serviceCategory.name}
              <Badge
                variant="outline"
                className={`${getStatusColor(application.status)}`}
              >
                {application.status.replace("_", " ")}
              </Badge>
              {application.rrNumber && (
                <Badge variant="secondary" className="font-mono">
                  {application.rrNumber}
                </Badge>
              )}
            </PageHeaderHeading>
            <PageHeaderDescription>
              Application submitted on {formatDate(application.createdAt)}
            </PageHeaderDescription>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex flex-row items-center gap-2 mt-2 md:mt-0 justify-start md:justify-end">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Status Tracking Timeline */}
      <Card className="mb-8 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center text-lg">
            <History className="h-5 w-5 mr-2" />
            Application Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <TooltipProvider>
            <div className="relative">
              {/* Mobile view (stacked) */}
              <div className="md:hidden">
                <div className="space-y-8">
                  {PROCESS_STEPS.map((step, index) => {
                    const status = getStepStatus(step.key, application.status);
                    const StepIcon = step.icon;
                    const isCompleted = status === "completed";
                    const isCurrent = status === "current";

                    return (
                      <div
                        key={step.key}
                        className="flex items-start space-x-4"
                      >
                        <div className="relative">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                  isCompleted
                                    ? "bg-green-500 border-green-500 text-white shadow-md"
                                    : isCurrent
                                    ? "bg-blue-500 border-blue-500 text-white shadow-md"
                                    : "bg-gray-100 border-gray-300 text-gray-400"
                                }`}
                              >
                                <StepIcon className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{step.description}</p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Vertical connection line */}
                          {index < PROCESS_STEPS.length - 1 && (
                            <div
                              className={`absolute top-10 left-1/2 w-0.5 h-8 -translate-x-1/2 ${
                                isCompleted ? "bg-green-500" : "bg-gray-300"
                              }`}
                            />
                          )}
                        </div>

                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${
                              isCompleted || isCurrent
                                ? "text-gray-900"
                                : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </div>
                          {isCurrent && (
                            <div className="text-xs text-blue-600 mt-1">
                              Current
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Rejected Status for Mobile */}
                  {application.status === "REJECTED" && (
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-red-500 border-red-500 text-white shadow-md">
                        <XCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-700">
                          Rejected
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Application denied
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop view (horizontal) */}
              <div className="hidden md:block">
                <div className="flex justify-between items-center">
                  {PROCESS_STEPS.map((step, index) => {
                    const status = getStepStatus(step.key, application.status);
                    const StepIcon = step.icon;
                    const isCompleted = status === "completed";
                    const isCurrent = status === "current";

                    return (
                      <div
                        key={step.key}
                        className="flex flex-col items-center relative z-10"
                      >
                        {/* Step Circle */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isCompleted
                                  ? "bg-green-500 border-green-500 text-white shadow-md"
                                  : isCurrent
                                  ? "bg-blue-500 border-blue-500 text-white shadow-md"
                                  : "bg-gray-100 border-gray-300 text-gray-400"
                              }`}
                            >
                              <StepIcon className="h-5 w-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{step.description}</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Step Label */}
                        <div className="mt-3 text-center">
                          <div
                            className={`text-sm font-medium ${
                              isCompleted || isCurrent
                                ? "text-gray-900"
                                : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </div>
                          {isCurrent && (
                            <div className="text-xs text-blue-600 mt-1">
                              Current
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Connection Lines - Separate layer to ensure proper z-index */}
                <div
                  className="absolute top-8 left-0 right-0 flex justify-between items-center pointer-events-none"
                  style={{ width: "98%" }}
                >
                  {PROCESS_STEPS.map((step, index) => {
                    // Skip the last step as it doesn't need a connection line
                    if (index === PROCESS_STEPS.length - 1) return null;

                    const isCompleted =
                      getStepStatus(
                        PROCESS_STEPS[index + 1].key,
                        application.status
                      ) === "completed";

                    // Calculate the width based on the number of steps
                    const lineWidth = `calc(100% / ${
                      PROCESS_STEPS.length - 1
                    })`;

                    return (
                      <div
                        key={`line-${index}`}
                        className={`h-0.5 ${
                          isCompleted ? "bg-green-500" : "bg-gray-300"
                        }`}
                        style={{ width: lineWidth }}
                      />
                    );
                  })}
                </div>

                {/* Rejected Status */}
                {application.status === "REJECTED" && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 bg-red-500 border-red-500 text-white shadow-md">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div className="mt-3 text-center">
                        <div className="text-sm font-medium text-red-700">
                          Rejected
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Application denied
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
          <TabsTrigger value="overview" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center">
            <FileCheck className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Details */}
            <Card className="h-full">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Service Category
                  </h4>
                  <p className="text-gray-700 font-medium">
                    {application.serviceCategory.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {application.serviceCategory.description}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Applicant</h4>
                  <div className="flex items-center">
                    <div className="bg-slate-100 p-2 rounded-full mr-2">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <p className="text-gray-700 font-medium">
                      {application.citizen.citizenProfile.fullName}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Current Status
                  </h4>
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(application.status)} mr-2`}
                    >
                      {application.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {application.currentHolder && (
                    <div className="flex items-center mt-2">
                      <p className="text-sm text-gray-600">
                        Currently with:{" "}
                        <span className="font-medium">
                          {application.currentHolder.officerProfile.fullName}
                        </span>{" "}
                        <span className="text-gray-500">
                          (
                          {application.currentHolder.officerProfile.designation}
                          )
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline Details */}
            <Card className="h-full">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="h-5 w-5 mr-2" />
                  Timeline Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Submitted On
                  </h4>
                  <div className="flex items-center">
                    <div className="bg-slate-100 p-2 rounded-full mr-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                    </div>
                    <p className="text-gray-700 font-medium">
                      {formatDate(application.createdAt)}
                    </p>
                  </div>
                </div>

                <Separator />

                {application.validatedAt && (
                  <>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Validated On
                      </h4>
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full mr-2">
                          <FileCheck className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-gray-700 font-medium">
                          {formatDate(application.validatedAt)}
                        </p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {application.completedAt && (
                  <>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Completed On
                      </h4>
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-full mr-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-gray-700 font-medium">
                          {formatDate(application.completedAt)}
                        </p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Expected Timeline
                  </h4>
                  <div className="flex items-center">
                    <div className="bg-slate-100 p-2 rounded-full mr-2">
                      <Clock className="h-4 w-4 text-slate-600" />
                    </div>
                    <p className="text-gray-700 font-medium">
                      {application.serviceCategory.slaDays} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {application.documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {application.documents.map((doc) => (
                <Card key={doc.id} className="overflow-hidden">
                  <CardHeader
                    className={`py-3 px-4 ${
                      doc.isVerified
                        ? "bg-green-50 border-b border-green-100"
                        : "bg-yellow-50 border-b border-yellow-100"
                    }`}
                  >
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        {doc.documentType}
                      </div>
                      {doc.isVerified ? (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800 border-green-200"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-100 text-yellow-800 border-yellow-200"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <p
                        className="text-sm text-gray-700 font-medium truncate max-w-[70%]"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </p>
                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <Separator />
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Uploaded by</span>
                        <span className="font-medium text-gray-700">
                          {doc.uploadedBy.citizenProfile?.fullName ||
                            doc.uploadedBy.officerProfile?.fullName}
                        </span>
                      </div>
                      {doc.isVerified && doc.verifiedBy && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Verified by</span>
                          <span className="font-medium text-green-700">
                            {doc.verifiedBy.officerProfile.fullName}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Upload date</span>
                        <span className="font-medium text-gray-700">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No documents have been uploaded yet.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Workflow History Tab */}
        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center text-lg">
                <MessageSquare className="h-5 w-5 mr-2" />
                Workflow History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {application.workflow.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="p-4 sm:p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="flex-none">
                        {entry.toStatus === "APPROVED" ? (
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                        ) : entry.toStatus === "REJECTED" ? (
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100">
                            <XCircle className="h-5 w-5 text-red-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100">
                            <Clock className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        {index < application.workflow.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mx-auto mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {entry.fromStatus ? (
                                <span className="flex items-center">
                                  <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                                    {entry.fromStatus.replace("_", " ")}
                                  </span>
                                  <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                                  <span
                                    className={`inline-block px-2 py-1 text-xs rounded ${
                                      entry.toStatus === "APPROVED"
                                        ? "bg-green-100 text-green-800"
                                        : entry.toStatus === "REJECTED"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {entry.toStatus.replace("_", " ")}
                                  </span>
                                </span>
                              ) : (
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded ${
                                    entry.toStatus === "APPROVED"
                                      ? "bg-green-100 text-green-800"
                                      : entry.toStatus === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {entry.toStatus.replace("_", " ")}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-md border border-gray-100">
                              {entry.comments}
                            </p>
                          </div>
                          <time className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </time>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {entry.changedBy.citizenProfile?.fullName ||
                            entry.changedBy.officerProfile?.fullName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center text-lg">
                <History className="h-5 w-5 mr-2" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {application.auditLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="bg-slate-100 p-2 rounded-full">
                        <History className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {log.action.replace(/_/g, " ")}
                          </p>
                          <time className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </time>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {log.performedBy.citizenProfile?.fullName ||
                            log.performedBy.officerProfile?.fullName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
