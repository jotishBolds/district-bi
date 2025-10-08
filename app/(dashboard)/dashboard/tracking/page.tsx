"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatIST, formatRelativeTimeIST } from "@/lib/timezone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  FileText,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  X,
  Users,
  ArrowRight,
  History,
  Briefcase,
  FileCheck,
  Send,
  UserCheck,
  Building,
  Tag,
  TrendingUp,
  BarChart3,
  Activity,
  Timer,
  Target,
  Zap,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCcw,
  Grid3x3,
  List,
  Download,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  createdAt: string;
}

interface WorkflowEntry {
  fromStatus: string | null;
  toStatus: string;
  comments?: string;
  createdAt: string;
  changedBy: {
    id: string;
    role: string;
    email: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
}

interface OfficerAssignment {
  assignedTo: {
    id: string;
    role: string;
    officerProfile: {
      fullName: string;
      designation: string;
    };
  };
  assignedBy?: {
    id: string;
    role: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
  priority: number;
  instructions?: string;
  createdAt?: string;
}

interface Application {
  id: string;
  rrNumber: string;
  status: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail?: string;
  citizenAddress: string;
  subject?: string;
  serviceCategory: {
    id: string;
    name: string;
    color?: string;
  };
  currentHolder: {
    id: string;
    role: string;
    officerProfile: {
      fullName: string;
      designation: string;
    };
  } | null;
  department?: {
    id: string;
    name: string;
  };
  submittedAt: string;
  validatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  workflow: WorkflowEntry[];
  officerAssignments: OfficerAssignment[];
  documents: Document[];
  _count: {
    workflow: number;
    officerAssignments: number;
    documents: number;
  };
}

interface TrackingData {
  applications: Application[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  userRole: string;
}

const statusConfig = {
  DRAFT: {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: FileText,
    progress: 5,
    label: "Draft",
    description: "Application is being prepared",
  },
  PENDING: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    progress: 15,
    label: "Pending",
    description: "Awaiting initial review",
  },
  VALIDATED: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: FileCheck,
    progress: 30,
    label: "Validated",
    description: "Application validated",
  },
  OPEN: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: PlayCircle,
    progress: 45,
    label: "Open",
    description: "Ready for processing",
  },
  IN_PROGRESS: {
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Activity,
    progress: 70,
    label: "In Progress",
    description: "Currently being processed",
  },
  RESOLVED: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    progress: 100,
    label: "Resolved",
    description: "Processing completed",
  },
  CLOSED: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: StopCircle,
    progress: 100,
    label: "Closed",
    description: "Application finalized",
  },
  REOPENED: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: RotateCcw,
    progress: 60,
    label: "Reopened",
    description: "Requires additional processing",
  },
};

const priorityConfig = {
  1: {
    color: "bg-red-100 text-red-800 border-red-200",
    label: "High",
    icon: Zap,
  },
  2: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "Medium",
    icon: Target,
  },
  3: {
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Low",
    icon: Timer,
  },
};

// Utility functions
const getStatusBadge = (status: string) => {
  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
  const IconComponent = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium flex items-center gap-1 text-xs",
        config.color
      )}
    >
      <IconComponent className="w-3 h-3" />
      <span className="hidden sm:inline">{config.label}</span>
    </Badge>
  );
};

const getPriorityBadge = (priority: number) => {
  const config =
    priorityConfig[priority as keyof typeof priorityConfig] ||
    priorityConfig[3];
  const IconComponent = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs flex items-center gap-1", config.color)}
    >
      <IconComponent className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

const getWorkflowProgressPercentage = (status: string) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  return config ? config.progress : 0;
};

const getProgressBarColor = (status: string) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return "bg-gray-500";

  // Extract color from status config (e.g., "bg-red-100 text-red-800 border-red-200" -> "bg-red-500")
  const colorMatch = config.color.match(/bg-(\w+)-100/);
  if (colorMatch) {
    const colorName = colorMatch[1];
    return `bg-${colorName}-500`;
  }

  return "bg-gray-500";
};

// Application Card Component (Grid View)
function ApplicationCard({
  app,
  onViewDetails,
}: {
  app: Application;
  onViewDetails: () => void;
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base md:text-lg font-bold text-gray-900 truncate">
                {app.rrNumber || "Pending"}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {getStatusBadge(app.status)}
                <span className="text-xs text-gray-500 truncate">
                  {formatRelativeTimeIST(app.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700 flex-shrink-0"
          >
            <Eye className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Details</span>
          </Button>
        </div>

        <CardDescription className="space-y-1.5 text-xs md:text-sm">
          <div className="flex items-center gap-2 text-gray-700 truncate">
            <User className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span className="font-medium truncate">{app.citizenName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 truncate">
            <Tag className="w-3 h-3 text-purple-500 flex-shrink-0" />
            <span className="truncate">{app.serviceCategory.name}</span>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">Progress</span>
            <span className="text-xs font-bold text-gray-900">
              {getWorkflowProgressPercentage(app.status)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-700",
                "bg-gradient-to-r",
                app.status === "CLOSED"
                  ? "from-red-400 to-red-500"
                  : getWorkflowProgressPercentage(app.status) < 30
                  ? "from-red-400 to-red-500"
                  : getWorkflowProgressPercentage(app.status) < 70
                  ? "from-yellow-400 to-orange-500"
                  : "from-green-400 to-green-500"
              )}
              style={{
                width: `${getWorkflowProgressPercentage(app.status)}%`,
              }}
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-sm md:text-base font-bold text-blue-700">
              {app._count.workflow}
            </div>
            <div className="text-xs text-blue-600">Updates</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-sm md:text-base font-bold text-green-700">
              {app._count.officerAssignments}
            </div>
            <div className="text-xs text-green-600">Assigned</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-sm md:text-base font-bold text-purple-700">
              {app._count.documents}
            </div>
            <div className="text-xs text-purple-600">Docs</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <div className="text-sm md:text-base font-bold text-orange-700">
              {Math.ceil(
                (new Date().getTime() - new Date(app.createdAt).getTime()) /
                  (1000 * 3600 * 24)
              )}
            </div>
            <div className="text-xs text-orange-600">Days</div>
          </div>
        </div>

        {/* Current Holder */}
        {app.currentHolder && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <UserCheck className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-blue-900 truncate">
                {app.currentHolder.officerProfile.fullName}
              </div>
              <div className="text-xs text-blue-700 truncate">
                {app.currentHolder.officerProfile.designation}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Application Table Row Component (Table View)
function ApplicationTableRow({
  app,
  onViewDetails,
}: {
  app: Application;
  onViewDetails: () => void;
}) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-3 py-3 md:px-4 md:py-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded">
            <FileText className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-xs md:text-sm truncate">
              {app.rrNumber || "Pending"}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {formatRelativeTimeIST(app.createdAt)}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 md:px-4 md:py-4">
        <div className="min-w-0">
          <div className="font-medium text-gray-900 text-xs md:text-sm truncate">
            {app.citizenName}
          </div>
          <div className="text-xs text-gray-600 truncate hidden sm:block">
            {app.citizenPhone}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 md:px-4 md:py-4 hidden lg:table-cell">
        <div className="text-xs md:text-sm text-gray-700 truncate">
          {app.serviceCategory.name}
        </div>
      </td>
      <td className="px-3 py-3 md:px-4 md:py-4">
        {getStatusBadge(app.status)}
      </td>
      <td className="px-3 py-3 md:px-4 md:py-4 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                getProgressBarColor(app.status)
              )}
              style={{
                width: `${getWorkflowProgressPercentage(app.status)}%`,
              }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {getWorkflowProgressPercentage(app.status)}%
          </span>
        </div>
      </td>
      <td className="px-3 py-3 md:px-4 md:py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
        >
          <Eye className="w-3 h-3 md:mr-1" />
          <span className="hidden md:inline">View</span>
        </Button>
      </td>
    </tr>
  );
}

// Application Details Modal Component
function ApplicationDetailsModal({
  app,
  open,
  onOpenChange,
}: {
  app: Application;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl lg:max-w-7xl h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="border-b border-gray-200 p-4 md:p-6 flex-shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2 md:p-3 bg-blue-100 rounded-xl flex-shrink-0">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg md:text-2xl font-bold text-gray-900 break-words">
                {app.rrNumber || "Pending Assignment"}
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm text-gray-600 mt-1">
                Created {formatRelativeTimeIST(app.createdAt)}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(app.status)}
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {Math.ceil(
                (new Date().getTime() - new Date(app.createdAt).getTime()) /
                  (1000 * 3600 * 24)
              )}{" "}
              days active
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-4 md:space-y-6">
            {/* Progress Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  Progress
                </h3>
                <div className="flex items-center gap-2">
                  {getStatusBadge(app.status)}
                  <span className="text-lg md:text-2xl font-bold text-blue-700">
                    {getWorkflowProgressPercentage(app.status)}%
                  </span>
                </div>
              </div>
              <div className="relative">
                <div className="w-full bg-white rounded-full h-3 md:h-4 shadow-inner border border-blue-200">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 md:h-4 rounded-full transition-all duration-700"
                    style={{
                      width: `${getWorkflowProgressPercentage(app.status)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-2 font-medium">
                  <span className="hidden sm:inline">Submitted</span>
                  <span className="sm:hidden">Start</span>
                  <span className="hidden md:inline">Review</span>
                  <span className="hidden md:inline">Processing</span>
                  <span className="sm:hidden">End</span>
                  <span className="hidden sm:inline">Completed</span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-3 md:p-4 text-center">
                  <History className="w-4 h-4 md:w-5 md:h-5 text-blue-700 mx-auto mb-1 md:mb-2" />
                  <div className="text-lg md:text-2xl font-bold text-blue-800">
                    {app._count.workflow}
                  </div>
                  <div className="text-xs md:text-sm text-blue-700 font-medium">
                    Updates
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-3 md:p-4 text-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-green-700 mx-auto mb-1 md:mb-2" />
                  <div className="text-lg md:text-2xl font-bold text-green-800">
                    {app._count.officerAssignments}
                  </div>
                  <div className="text-xs md:text-sm text-green-700 font-medium">
                    Assigned
                  </div>
                </CardContent>
              </Card>
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-3 md:p-4 text-center">
                  <FileCheck className="w-4 h-4 md:w-5 md:h-5 text-purple-700 mx-auto mb-1 md:mb-2" />
                  <div className="text-lg md:text-2xl font-bold text-purple-800">
                    {app._count.documents}
                  </div>
                  <div className="text-xs md:text-sm text-purple-700 font-medium">
                    Documents
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-3 md:p-4 text-center">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-700 mx-auto mb-1 md:mb-2" />
                  <div className="text-lg md:text-2xl font-bold text-orange-800">
                    {Math.ceil(
                      (new Date().getTime() -
                        new Date(app.createdAt).getTime()) /
                        (1000 * 3600 * 24)
                    )}
                  </div>
                  <div className="text-xs md:text-sm text-orange-700 font-medium">
                    Days
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Citizen Information */}
              <Card className="border-gray-200">
                <CardHeader className="border-b border-gray-100 p-3 md:p-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2 text-gray-800">
                    <User className="w-4 h-4" />
                    Citizen Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500 uppercase">
                        Name
                      </div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base break-words">
                        {app.citizenName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500 uppercase">
                        Phone
                      </div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base">
                        {app.citizenPhone}
                      </div>
                    </div>
                  </div>
                  {app.citizenEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-500 uppercase">
                          Email
                        </div>
                        <div className="font-semibold text-gray-900 text-sm md:text-base break-all">
                          {app.citizenEmail}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500 uppercase">
                        Address
                      </div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base leading-relaxed break-words">
                        {app.citizenAddress}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Application Information */}
              <Card className="border-gray-200">
                <CardHeader className="border-b border-gray-100 p-3 md:p-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2 text-gray-800">
                    <FileText className="w-4 h-4" />
                    Application Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500 uppercase">
                        Category
                      </div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base break-words">
                        {app.serviceCategory.name}
                      </div>
                    </div>
                  </div>
                  {app.department && (
                    <div className="flex items-center gap-2">
                      <Building className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-500 uppercase">
                          Department
                        </div>
                        <div className="font-semibold text-gray-900 text-sm md:text-base break-words">
                          {app.department.name}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500 uppercase">
                        Submitted
                      </div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base">
                        {formatIST(app.submittedAt)}
                      </div>
                    </div>
                  </div>
                  {app.currentHolder && (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-500 uppercase">
                          Handler
                        </div>
                        <div className="font-semibold text-gray-900 text-sm md:text-base break-words">
                          {app.currentHolder.officerProfile.fullName}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600 break-words">
                          {app.currentHolder.officerProfile.designation}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Subject */}
            {app.subject && (
              <Card className="border-gray-200">
                <CardHeader className="border-b border-gray-100 p-3 md:p-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2 text-gray-800">
                    <FileText className="w-4 h-4" />
                    Subject
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4">
                  <div className="text-gray-800 text-sm md:text-base leading-relaxed break-words">
                    {app.subject}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Workflow Timeline */}
            {app.workflow.length > 0 && (
              <Card className="border-gray-200">
                <CardHeader className="border-b border-gray-100 p-3 md:p-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2 text-gray-800">
                    <History className="w-4 h-4" />
                    Workflow Timeline
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Complete history of status changes
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <div className="relative">
                    <div className="absolute left-3 md:left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-400 to-purple-400"></div>
                    <div className="space-y-4 md:space-y-6">
                      {app.workflow.map((entry, index) => (
                        <div
                          key={index}
                          className="relative flex items-start gap-3 md:gap-6"
                        >
                          <div className="relative z-10 flex-shrink-0">
                            <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                              <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex-1 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-200 shadow-sm min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                              {getStatusBadge(entry.toStatus)}
                              <span className="text-xs text-gray-500 font-medium">
                                {formatIST(entry.createdAt)}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs md:text-sm font-semibold text-gray-900 break-words">
                                {entry.changedBy.officerProfile?.fullName ||
                                  entry.changedBy.email}
                              </div>
                              {entry.changedBy.officerProfile?.designation && (
                                <div className="text-xs md:text-sm text-gray-600 break-words">
                                  {entry.changedBy.officerProfile.designation} •{" "}
                                  {entry.changedBy.role}
                                </div>
                              )}
                              {entry.comments && (
                                <div className="text-xs md:text-sm text-gray-800 italic bg-white p-2 rounded-lg border border-gray-200 break-words">
                                  &ldquo;{entry.comments}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Officer Assignments */}
            {app.officerAssignments.length > 0 && (
              <Card className="border-gray-200">
                <CardHeader className="border-b border-gray-100 p-3 md:p-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2 text-gray-800">
                    <Users className="w-4 h-4" />
                    Officer Assignments
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Officers assigned to this application
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <div className="grid gap-3 md:gap-4">
                    {app.officerAssignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg md:rounded-xl p-3 md:p-4 border border-green-200"
                      >
                        <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 md:p-2 bg-green-100 rounded-lg flex-shrink-0">
                              <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-green-900 text-sm md:text-base break-words">
                                {assignment.assignedTo.officerProfile.fullName}
                              </div>
                              <div className="text-xs md:text-sm text-green-700 font-medium break-words">
                                {
                                  assignment.assignedTo.officerProfile
                                    .designation
                                }
                              </div>
                            </div>
                          </div>
                          {getPriorityBadge(assignment.priority)}
                        </div>
                        {assignment.instructions && (
                          <div className="bg-white p-2 md:p-3 rounded-lg border border-green-200 mb-2 md:mb-3">
                            <div className="text-xs font-medium text-green-600 uppercase mb-1">
                              Instructions
                            </div>
                            <div className="text-xs md:text-sm text-green-800 break-words">
                              {assignment.instructions}
                            </div>
                          </div>
                        )}
                        {assignment.createdAt && (
                          <div className="text-xs text-green-600 font-medium">
                            Assigned: {formatIST(assignment.createdAt)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UniversalTrackingPage() {
  const { data: session } = useSession();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("");
  const [serviceCategories, setServiceCategories] = useState<
    Array<{ id: string; name: string; description?: string; color?: string }>
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const fetchTrackingData = async (
    search?: string,
    status?: string,
    serviceCategory?: string,
    page?: number
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page || currentPage).toString(),
        limit: "10",
        ...(search !== undefined
          ? { search: search }
          : searchTerm && { search: searchTerm }),
        ...(status !== undefined
          ? status && status !== "ALL" && { status: status }
          : statusFilter && statusFilter !== "ALL" && { status: statusFilter }),
        ...(serviceCategory !== undefined
          ? serviceCategory &&
            serviceCategory !== "all" && { serviceCategory: serviceCategory }
          : serviceCategoryFilter &&
            serviceCategoryFilter !== "all" && {
              serviceCategory: serviceCategoryFilter,
            }),
      });

      const response = await fetch(`/api/tracking?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      } else {
        console.error("Failed to fetch tracking data");
      }
    } catch (error) {
      console.error("Error fetching tracking data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch("/api/service-categories");
      if (response.ok) {
        const categories = await response.json();
        setServiceCategories(categories);
      }
    } catch (error) {
      console.error("Error fetching service categories:", error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchTrackingData(
        undefined,
        statusFilter,
        serviceCategoryFilter,
        currentPage
      );
    }
  }, [session, currentPage, statusFilter, serviceCategoryFilter]);

  useEffect(() => {
    fetchServiceCategories();
  }, []);

  // Check if user is authorized to access tracking (only assigned frontdesk users)
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!session?.user) {
        setIsAuthorized(false);
        return;
      }

      // Only FRONT_DESK role can access tracking
      if (session.user.role !== "FRONT_DESK") {
        setIsAuthorized(false);
        return;
      }

      try {
        // Check if this frontdesk user has specific officer assignments
        const response = await fetch("/api/frontdesk/assignments");
        if (!response.ok) {
          setIsAuthorized(false);
          return;
        }

        const data = await response.json();
        if (data && Array.isArray(data.assignments)) {
          // User is authorized only if they have specific officer assignments
          const hasSpecificAssignments = data.assignments.some(
            (assignment: { officerId: string | null }) =>
              assignment.officerId !== null
          );
          setIsAuthorized(hasSpecificAssignments);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error checking frontdesk authorization:", error);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [session]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTrackingData(searchTerm, statusFilter, serviceCategoryFilter, 1);
  };

  const clearFilters = () => {
    const clearedSearch = "";
    const clearedStatus = "ALL";
    const clearedServiceCategory = "all";
    const clearedPage = 1;

    setSearchTerm(clearedSearch);
    setStatusFilter(clearedStatus);
    setServiceCategoryFilter(clearedServiceCategory);
    setCurrentPage(clearedPage);

    fetchTrackingData(clearedSearch, clearedStatus, "", clearedPage);
  };

  const handleViewDetails = (app: Application) => {
    setSelectedApp(app);
    setModalOpen(true);
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-full inline-block mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            Please log in to access tracking.
          </p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-full inline-block mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            You don&apos;t have permission to access this page. Only assigned
            frontdesk users can track applications.
          </p>
        </div>
      </div>
    );
  }

  if (loading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-sm md:text-base text-gray-600">
            Loading tracking data...
          </p>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    searchTerm ||
    (statusFilter && statusFilter !== "ALL") ||
    (serviceCategoryFilter && serviceCategoryFilter !== "all");

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 md:gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-blue-100 rounded-lg md:rounded-xl flex-shrink-0">
                  <BarChart3 className="w-5 h-5 md:w-8 md:h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                    Tracking
                  </h1>
                  <p className="text-sm md:text-lg text-gray-600 hidden sm:block">
                    Monitor application progress
                  </p>
                </div>
              </div>
              {trackingData && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 border-blue-200 text-blue-800 font-medium text-xs"
                  >
                    <User className="w-3 h-3 mr-1" />
                    {trackingData.userRole.replace("_", " ")}
                  </Badge>
                  <span className="text-xs md:text-sm text-gray-500">
                    • {trackingData.pagination.total} applications
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200 text-sm"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-orange-100 text-orange-800 text-xs"
                  >
                    {
                      [
                        searchTerm,
                        statusFilter !== "ALL" && statusFilter,
                        serviceCategoryFilter,
                      ].filter(Boolean).length
                    }
                  </Badge>
                )}
              </Button>

              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 px-2 md:px-3",
                    viewMode === "grid" && "bg-blue-600 text-white"
                  )}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-8 px-2 md:px-3",
                    viewMode === "table" && "bg-blue-600 text-white"
                  )}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {trackingData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs md:text-sm font-medium">
                      Total
                    </p>
                    <p className="text-2xl md:text-3xl font-bold">
                      {trackingData.pagination.total}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-blue-400 bg-opacity-30 rounded-lg md:rounded-xl">
                    <FileText className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs md:text-sm font-medium">
                      Active
                    </p>
                    <p className="text-2xl md:text-3xl font-bold">
                      {
                        trackingData.applications.filter(
                          (app) => app.status === "IN_PROGRESS"
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-green-400 bg-opacity-30 rounded-lg md:rounded-xl">
                    <Activity className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-xs md:text-sm font-medium">
                      Pending
                    </p>
                    <p className="text-2xl md:text-3xl font-bold">
                      {
                        trackingData.applications.filter((app) =>
                          ["PENDING", "OPEN"].includes(app.status)
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-yellow-400 bg-opacity-30 rounded-lg md:rounded-xl">
                    <Clock className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs md:text-sm font-medium">
                      Completed
                    </p>
                    <p className="text-2xl md:text-3xl font-bold">
                      {
                        trackingData.applications.filter((app) =>
                          ["RESOLVED", "CLOSED"].includes(app.status)
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-2 md:p-3 bg-purple-400 bg-opacity-30 rounded-lg md:rounded-xl">
                    <CheckCircle className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="bg-white border-gray-200 shadow-lg">
            <CardHeader className="border-b border-gray-100 p-4 md:p-6">
              <div className="flex items-start md:items-center justify-between gap-2 flex-col md:flex-row">
                <div>
                  <CardTitle className="text-base md:text-xl flex items-center gap-2">
                    <Search className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    Search & Filters
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">
                    Find specific applications
                  </CardDescription>
                </div>
                {(searchTerm ||
                  (statusFilter && statusFilter !== "ALL") ||
                  serviceCategoryFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs md:text-sm"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleSearch} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-gray-700">
                      Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 md:w-4 md:h-4" />
                      <Input
                        placeholder="RR Number, Name, Phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 md:pl-10 border-gray-300 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-gray-700">
                      Status
                    </label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="border-gray-300 text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            All Statuses
                          </div>
                        </SelectItem>
                        {Object.entries(statusConfig).map(([key, config]) => {
                          const IconComponent = config.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-gray-700">
                      Category
                    </label>
                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryOpen}
                          className="w-full justify-between border-gray-300 text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none"
                        >
                          {serviceCategoryFilter
                            ? serviceCategories.find(
                                (category) =>
                                  category.id === serviceCategoryFilter
                              )?.name || "All Categories"
                            : "All Categories"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search categories..."
                            className="focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none"
                          />
                          <CommandList className="max-h-48">
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => {
                                  setServiceCategoryFilter("");
                                  setCategoryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    serviceCategoryFilter === ""
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                All Categories
                              </CommandItem>
                              {serviceCategories.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={category.name}
                                  onSelect={() => {
                                    setServiceCategoryFilter(
                                      serviceCategoryFilter === category.id
                                        ? ""
                                        : category.id
                                    );
                                    setCategoryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      serviceCategoryFilter === category.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex items-center gap-2">
                                    {category.color && (
                                      <div
                                        className="w-3 h-3 rounded-full border"
                                        style={{
                                          backgroundColor: category.color,
                                        }}
                                      />
                                    )}
                                    {category.name}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 text-sm"
                  >
                    <Search className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {trackingData && (
          <>
            {/* Results Header */}
            <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 p-3 md:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900">
                      Results
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">
                      {trackingData.applications.length} of{" "}
                      {trackingData.pagination.total}
                    </p>
                  </div>
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  Page {trackingData.pagination.page} /{" "}
                  {trackingData.pagination.pages}
                </div>
              </div>
            </div>

            {/* Applications Grid/Table */}
            {trackingData.applications.length === 0 ? (
              <Card className="bg-white border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
                  <div className="p-3 md:p-4 bg-gray-100 rounded-xl md:rounded-2xl mb-4">
                    <FileText className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                    No applications found
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 text-center max-w-md mb-4 px-4">
                    No applications match your search. Try different filters.
                  </p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="text-sm"
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {trackingData.applications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onViewDetails={() => handleViewDetails(app)}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-white border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          RR Number
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Citizen
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                          Category
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          Progress
                        </th>
                        <th className="px-3 py-3 md:px-4 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {trackingData.applications.map((app) => (
                        <ApplicationTableRow
                          key={app.id}
                          app={app}
                          onViewDetails={() => handleViewDetails(app)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Pagination */}
            {trackingData.pagination.pages > 1 && (
              <Card className="bg-white border-gray-200">
                <CardContent className="p-3 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
                      Showing{" "}
                      {(trackingData.pagination.page - 1) *
                        trackingData.pagination.limit +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        trackingData.pagination.page *
                          trackingData.pagination.limit,
                        trackingData.pagination.total
                      )}{" "}
                      of {trackingData.pagination.total}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 text-sm"
                      >
                        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Prev</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from(
                          {
                            length: Math.min(3, trackingData.pagination.pages),
                          },
                          (_, i) => {
                            let page;
                            if (trackingData.pagination.pages <= 3) {
                              page = i + 1;
                            } else if (currentPage === 1) {
                              page = i + 1;
                            } else if (
                              currentPage === trackingData.pagination.pages
                            ) {
                              page = trackingData.pagination.pages - 2 + i;
                            } else {
                              page = currentPage - 1 + i;
                            }

                            if (
                              page < 1 ||
                              page > trackingData.pagination.pages
                            )
                              return null;

                            return (
                              <Button
                                key={page}
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                  "w-8 h-8 p-0 text-sm",
                                  currentPage === page &&
                                    "bg-blue-600 text-white"
                                )}
                              >
                                {page}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage(
                            Math.min(
                              trackingData.pagination.pages,
                              currentPage + 1
                            )
                          )
                        }
                        disabled={currentPage === trackingData.pagination.pages}
                        className="flex items-center gap-1 text-sm"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Application Details Modal */}
        {selectedApp && (
          <ApplicationDetailsModal
            app={selectedApp}
            open={modalOpen}
            onOpenChange={setModalOpen}
          />
        )}
      </div>
    </div>
  );
}
