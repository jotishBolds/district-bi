"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  User,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  Send,
  ArrowRight,
  ArrowLeft,
  Users,
  AlertCircle,
  Download,
  Grid3X3,
  List,
  X,
  Paperclip,
  Activity,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Timer,
  UserCheck,
  FolderOpen,
  PlayCircle,
  CheckCircle2,
  XCircleIcon,
  RotateCcw,
} from "lucide-react";
import { getRoleMapping } from "@/lib/officer-roles";
import { UserRole } from "@/app/generated/prisma";

// Enhanced Types
interface Document {
  id: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  isVerified: boolean;
  verificationNotes?: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    role: string;
    email: string;
    citizenProfile?: {
      fullName: string;
    };
  };
  verifiedBy?: {
    id: string;
    role: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
}

interface WorkflowEntry {
  fromStatus: string | null;
  toStatus: string;
  comments?: string;
  createdAt: string;
  changedBy: {
    id: string;
    role: string;
    level: number | null;
    email: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
}

interface OfficerForwarding {
  id: string;
  instructions?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  fromOfficer: {
    id: string;
    level: number | null;
    role: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
  toOfficer: {
    id: string;
    level: number | null;
    role: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
}

interface FrontdeskForwarding {
  id: string;
  instructions?: string;
  isActive: boolean;
  createdAt: string;
  fromFrontdesk: {
    id: string;
    role: string;
    email: string;
  };
  toFrontdesk: {
    id: string;
    role: string;
    email: string;
  };
}

interface Officer {
  id: string;
  role: string;
  level: number | null;
  officerProfile: {
    fullName: string;
    designation: string;
  } | null;
  applicationCount: number;
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  reopened: number;
  ageStats: {
    recent: number;
    medium: number;
    old: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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
  department?: {
    id: string;
    name: string;
    description?: string;
  };
  serviceCategory: {
    name: string;
    slaDays: number;
  };
  submittedAt: string;
  validatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  currentHolder: {
    id: string;
    level: number | null;
    role: string;
    officerProfile: {
      fullName: string;
      designation: string;
    };
  } | null;
  workflow: WorkflowEntry[];
  officerAssignments: {
    assignedTo: {
      id: string;
      level: number | null;
      role: string;
      officerProfile: {
        fullName: string;
        designation: string;
      };
    };
    assignedBy?: {
      id: string;
      level: number | null;
      role: string;
      email: string;
      officerProfile?: {
        fullName: string;
        designation: string;
      };
    };
    priority: number;
    expectedCompletionDate: string | null;
    createdAt?: string;
    instructions?: string;
  }[];
  documents: Document[];
  officerForwardings?: OfficerForwarding[];
  frontdeskForwardings?: FrontdeskForwarding[];
}

const DCDashboard = () => {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string; description?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [ageFilter, setAgeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [showApplications, setShowApplications] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [showDocumentModal, setShowDocumentModal] = useState<{
    show: boolean;
    documents: Document[];
    applicationId: string;
  }>({ show: false, documents: [], applicationId: "" });
  const [stats, setStats] = useState<Stats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    reopened: 0,
    ageStats: {
      recent: 0,
      medium: 0,
      old: 0,
    },
    pagination: {
      page: 1,
      limit: 10,
      totalCount: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  });

  // Fetch applications for DC
  const fetchApplications = async (status?: string, page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: status || selectedStatus === "ALL" ? "" : selectedStatus,
        search: searchTerm,
        officerId: selectedOfficer,
        departmentId: selectedDepartment,
        ageFilter: ageFilter,
        page: page.toString(),
        limit: "10",
      });
      const response = await fetch(`/api/dc/applications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      const data = await response.json();
      setApplications(data.applications || []);
      setOfficers(data.officers || []);
      setDepartments(data.departments || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [
    selectedStatus,
    selectedOfficer,
    selectedDepartment,
    ageFilter,
    currentPage,
  ]);

  const handleStatusCardClick = (status: string) => {
    setSelectedStatus(status);
    setShowApplications(true);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchApplications(selectedStatus, currentPage);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedOfficer("");
    setSelectedDepartment("");
    setAgeFilter("");
    setSelectedStatus("ALL");
    setShowApplications(false);
    setCurrentPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <FolderOpen className="w-6 h-6" />;
      case "IN_PROGRESS":
        return <PlayCircle className="w-6 h-6" />;
      case "RESOLVED":
        return <CheckCircle2 className="w-6 h-6" />;
      case "CLOSED":
        return <XCircleIcon className="w-6 h-6" />;
      case "REOPENED":
        return <RotateCcw className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return {
          gradient: "from-blue-500 to-blue-600",
          bg: "bg-blue-500",
          text: "text-blue-600",
          light: "bg-blue-50",
          border: "border-blue-200",
        };
      case "IN_PROGRESS":
        return {
          gradient: "from-purple-500 to-purple-600",
          bg: "bg-purple-500",
          text: "text-purple-600",
          light: "bg-purple-50",
          border: "border-purple-200",
        };
      case "RESOLVED":
        return {
          gradient: "from-green-500 to-green-600",
          bg: "bg-green-500",
          text: "text-green-600",
          light: "bg-green-50",
          border: "border-green-200",
        };
      case "CLOSED":
        return {
          gradient: "from-red-500 to-red-600",
          bg: "bg-red-500",
          text: "text-red-600",
          light: "bg-red-50",
          border: "border-red-200",
        };
      case "REOPENED":
        return {
          gradient: "from-orange-500 to-orange-600",
          bg: "bg-orange-500",
          text: "text-orange-600",
          light: "bg-orange-50",
          border: "border-orange-200",
        };
      default:
        return {
          gradient: "from-gray-500 to-gray-600",
          bg: "bg-gray-500",
          text: "text-gray-600",
          light: "bg-gray-50",
          border: "border-gray-200",
        };
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "IN_PROGRESS":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CLOSED":
        return "bg-red-100 text-red-800 border-red-200";
      case "REOPENED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getAgeColor = (days: number) => {
    if (days < 3) return "bg-green-100 text-green-800 border-green-200";
    if (days <= 7) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const calculateApplicationAge = (submittedAt: string) => {
    const now = new Date();
    const submitted = new Date(submittedAt);
    return Math.floor(
      (now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const getOfficerShortForm = (role: string) => {
    const mapping = getRoleMapping(role as UserRole);
    return mapping?.shortDesignation || role;
  };

  const toggleSection = (applicationId: string, sectionName: string) => {
    const key = `${applicationId}-${sectionName}`;
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isSectionExpanded = (applicationId: string, sectionName: string) => {
    const key = `${applicationId}-${sectionName}`;
    return expandedSections[key] || false;
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-800 border-red-200";
      case 2:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 3:
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLevelColor = (level: number | null) => {
    if (level === null) return "bg-gray-100 text-gray-800";
    switch (level) {
      case 0:
        return "bg-purple-100 text-purple-800";
      case 1:
        return "bg-blue-100 text-blue-800";
      case 2:
        return "bg-green-100 text-green-800";
      case 3:
        return "bg-yellow-100 text-yellow-800";
      case 4:
        return "bg-orange-100 text-orange-800";
      case 5:
        return "bg-red-100 text-red-800";
      case 6:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelText = (level: number | null) => {
    if (level === null) return "N/A";
    const levels = {
      0: "DC (Level 0)",
      1: "ADC (Level 1)",
      2: "RO (Level 2)",
      3: "SDM (Level 3)",
      4: "DYDIR (Level 4)",
      5: "Level 5",
      6: "Level 6",
    };
    return levels[level as keyof typeof levels] || `Level ${level}`;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ID_PROOF: "ID Proof",
      ADDRESS_PROOF: "Address Proof",
      APPLICATION_FORM: "Application Form",
      SUPPORTING_DOCUMENT: "Supporting Document",
      PAYMENT_RECEIPT: "Payment Receipt",
    };
    return labels[type] || type;
  };

  const calculateSlaProgress = (app: Application) => {
    if (!app.validatedAt || !app.serviceCategory.slaDays) return null;
    const startDate = new Date(app.validatedAt);
    const endDate = app.completedAt ? new Date(app.completedAt) : new Date();
    const totalDays = app.serviceCategory.slaDays;
    const elapsedDays = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      elapsed: elapsedDays,
      total: totalDays,
      percentage: Math.min(100, Math.round((elapsedDays / totalDays) * 100)),
      isOverdue: elapsedDays > totalDays,
    };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const openDocumentModal = (documents: Document[], applicationId: string) => {
    setShowDocumentModal({ show: true, documents, applicationId });
  };

  const closeDocumentModal = () => {
    setShowDocumentModal({ show: false, documents: [], applicationId: "" });
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const response = await fetch(
        `/api/${doc.filePath.replace(/^uploads[\\/]/, "")}`
      );
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = doc.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  // Professional Status Cards Component
  const renderStatusCards = () => {
    const statusCards = [
      {
        status: "OPEN",
        title: "Open Applications",
        count: stats.open,
        description: "Awaiting assignment",
        icon: FolderOpen,
        colors: getStatusColor("OPEN"),
      },
      {
        status: "IN_PROGRESS",
        title: "In Progress",
        count: stats.inProgress,
        description: "Being processed",
        icon: PlayCircle,
        colors: getStatusColor("IN_PROGRESS"),
      },
      {
        status: "RESOLVED",
        title: "Resolved",
        count: stats.resolved,
        description: "Successfully completed",
        icon: CheckCircle2,
        colors: getStatusColor("RESOLVED"),
      },
      {
        status: "CLOSED",
        title: "Closed",
        count: stats.closed,
        description: "Finalized applications",
        icon: XCircleIcon,
        colors: getStatusColor("CLOSED"),
      },
      {
        status: "REOPENED",
        title: "Reopened",
        count: stats.reopened,
        description: "Require attention",
        icon: RotateCcw,
        colors: getStatusColor("REOPENED"),
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {statusCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.status}
              onClick={() => handleStatusCardClick(card.status)}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            >
              {/* Background Gradient Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
              ></div>

              {/* Card Content */}
              <div className="relative p-6">
                {/* Header with Icon and Count */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-3 rounded-xl ${card.colors.light} ${card.colors.border} border`}
                  >
                    <IconComponent className={`w-6 h-6 ${card.colors.text}`} />
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-3xl font-bold ${card.colors.text} leading-none`}
                    >
                      {card.count.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">
                      APPLICATIONS
                    </div>
                  </div>
                </div>

                {/* Title and Description */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Progress Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Click to view details</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </div>

              {/* Hover Effect Border */}
              <div
                className={`absolute inset-0 border-2 border-transparent group-hover:${card.colors.border.replace(
                  "border-",
                  "border-"
                )} rounded-2xl transition-colors duration-300`}
              ></div>
            </div>
          );
        })}
      </div>
    );
  };

  // Age Filter Component (only shown for OPEN and IN_PROGRESS)
  const renderAgeFilter = () => {
    if (selectedStatus !== "OPEN" && selectedStatus !== "IN_PROGRESS")
      return null;

    const ageFilters = [
      {
        key: "recent",
        label: "Recent",
        description: "< 3 days",
        count: stats.ageStats.recent,
        color: "green",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
        activeColor: "bg-green-100 border-green-300 text-green-800",
      },
      {
        key: "medium",
        label: "Medium",
        description: "3-7 days",
        count: stats.ageStats.medium,
        color: "yellow",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
        activeColor: "bg-yellow-100 border-yellow-300 text-yellow-800",
      },
      {
        key: "old",
        label: "Old",
        description: "> 7 days",
        count: stats.ageStats.old,
        color: "red",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
        activeColor: "bg-red-100 border-red-300 text-red-800",
      },
    ];

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Timer className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Filter by Application Age
            </h3>
            <p className="text-sm text-gray-600">
              Filter applications based on how long they&apos;ve been in the
              system
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ageFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() =>
                setAgeFilter(ageFilter === filter.key ? "" : filter.key)
              }
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                ageFilter === filter.key
                  ? filter.activeColor
                  : `${filter.bgColor} ${
                      filter.borderColor
                    } hover:${filter.borderColor.replace("200", "300")}`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-3 h-3 rounded-full bg-${filter.color}-500`}
                ></div>
                <div
                  className={`text-2xl font-bold ${
                    ageFilter === filter.key
                      ? filter.textColor
                      : filter.textColor
                  }`}
                >
                  {filter.count}
                </div>
              </div>
              <div className="text-left">
                <div className={`font-semibold ${filter.textColor}`}>
                  {filter.label}
                </div>
                <div className={`text-sm ${filter.textColor} opacity-75`}>
                  {filter.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced Filters Component
  const renderFilters = () => {
    if (!showApplications) return null;

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by RR number, citizen name, or service category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchApplications(selectedStatus, 1);
                }}
                className="pl-12 pr-4 w-full h-12 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm placeholder-gray-500"
              />
            </div>
          </div>

          {/* Officer Filter */}
          <div className="min-w-[200px]">
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-4 text-sm transition-all duration-200"
            >
              <option value="">All Officers</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.officerProfile?.fullName || "Unknown"} (
                  {getOfficerShortForm(officer.role)}) -{" "}
                  {officer.applicationCount}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="min-w-[200px]">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-4 text-sm transition-all duration-200"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === "cards"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Clear Filters */}
          {(searchTerm ||
            selectedOfficer ||
            selectedDepartment ||
            ageFilter) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    );
  };

  // Enhanced Applications Cards Component
  const renderApplicationsCards = () => (
    <div className="grid grid-cols-1 gap-6">
      {applications.map((app) => {
        const age = calculateApplicationAge(app.submittedAt);
        const showingDetails = showDetails === app.id;
        const slaProgress = calculateSlaProgress(app);
        const statusColors = getStatusColor(app.status);

        return (
          <div
            key={app.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Application Title */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`p-2 rounded-lg ${statusColors.light} ${statusColors.border} border`}
                    >
                      <FileText className={`w-5 h-5 ${statusColors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {app.rrNumber}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{app.serviceCategory.name}</span>
                        {app.department && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">
                              {app.department.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status and Age Badges */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusBadgeColor(
                        app.status
                      )}`}
                    >
                      {app.status.replace("_", " ")}
                    </span>
                    {(selectedStatus === "OPEN" ||
                      selectedStatus === "IN_PROGRESS") && (
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getAgeColor(
                          age
                        )}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {age} days old
                      </span>
                    )}
                  </div>

                  {/* Citizen Information */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{app.citizenName}</span>
                      <span>•</span>
                      <span>{app.citizenPhone}</span>
                    </div>
                    {app.citizenEmail && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-4 h-4"></span>
                        <span>{app.citizenEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openDocumentModal(app.documents, app.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    title="View Documents"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="font-medium">{app.documents.length}</span>
                  </button>
                  <button
                    onClick={() =>
                      setShowDetails(showingDetails ? null : app.id)
                    }
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={showingDetails ? "Hide Details" : "Show Details"}
                  >
                    {showingDetails ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Current Holder */}
            {app.currentHolder && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Current Officer:</span>{" "}
                    {app.currentHolder.officerProfile.fullName}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelColor(
                      app.currentHolder.level
                    )}`}
                  >
                    {getLevelText(app.currentHolder.level)}
                  </span>
                </div>
              </div>
            )}

            {/* SLA Progress */}
            {slaProgress && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-600 font-medium">
                    Time Progress
                  </span>
                  <span
                    className={`font-semibold ${
                      slaProgress.isOverdue ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {slaProgress.elapsed}/{slaProgress.total} days (
                    {slaProgress.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      slaProgress.isOverdue ? "bg-red-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${slaProgress.percentage}%` }}
                  ></div>
                </div>
                {slaProgress.isOverdue && (
                  <div className="flex items-center gap-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">
                      Application is overdue
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Expanded Details */}
            {showingDetails && (
              <div className="p-6 bg-gray-50 space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {app.workflow?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Status Changes</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {app.officerAssignments?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Assignments</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {(app.officerForwardings?.length || 0) +
                        (app.frontdeskForwardings?.length || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Forwardings</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {app.documents?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Documents</div>
                  </div>
                </div>

                {/* Collapsible Sections */}
                <div className="space-y-4">
                  {/* Application Information */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleSection(app.id, "application-info")}
                      className="w-full px-6 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Application Information
                      </span>
                      {isSectionExpanded(app.id, "application-info") ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {isSectionExpanded(app.id, "application-info") && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                          <div className="space-y-3">
                            <div>
                              <p className="text-gray-500 font-medium mb-1">
                                Citizen Name
                              </p>
                              <p className="text-gray-900">{app.citizenName}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-medium mb-1">
                                Phone
                              </p>
                              <p className="text-gray-900">
                                {app.citizenPhone}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-medium mb-1">
                                Email
                              </p>
                              <p className="text-gray-900">
                                {app.citizenEmail || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-gray-500 font-medium mb-1">
                                Service Category
                              </p>
                              <p className="text-gray-900">
                                {app.serviceCategory.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-medium mb-1">
                                Submitted At
                              </p>
                              <p className="text-gray-900">
                                {formatDateTime(app.submittedAt)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-medium mb-1">
                                Validated At
                              </p>
                              <p className="text-gray-900">
                                {formatDateTime(app.validatedAt)}
                              </p>
                            </div>
                          </div>
                          {app.citizenAddress && (
                            <div className="md:col-span-2">
                              <p className="text-gray-500 font-medium mb-1">
                                Address
                              </p>
                              <p className="text-gray-900">
                                {app.citizenAddress}
                              </p>
                            </div>
                          )}
                          {app.subject && (
                            <div className="md:col-span-2">
                              <p className="text-gray-500 font-medium mb-1">
                                Subject
                              </p>
                              <p className="text-gray-900">{app.subject}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status History */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleSection(app.id, "status-history")}
                      className="w-full px-6 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Status History ({app.workflow?.length || 0})
                      </span>
                      {isSectionExpanded(app.id, "status-history") ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {isSectionExpanded(app.id, "status-history") && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        {app.workflow && app.workflow.length > 0 ? (
                          <div className="space-y-4">
                            {app.workflow.map((entry, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-4 relative"
                              >
                                {index < app.workflow.length - 1 && (
                                  <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                                )}
                                <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full mt-1"></div>
                                <div className="flex-1 min-w-0 bg-white p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                                        entry.toStatus
                                      )}`}
                                    >
                                      {entry.fromStatus
                                        ? `${entry.fromStatus} → ${entry.toStatus}`
                                        : entry.toStatus}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDateTime(entry.createdAt)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <span>Changed by:</span>
                                      <span className="font-medium">
                                        {entry.changedBy.officerProfile
                                          ?.fullName || entry.changedBy.email}
                                      </span>
                                      {entry.changedBy.officerProfile && (
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${getLevelColor(
                                            entry.changedBy.level
                                          )}`}
                                        >
                                          {getLevelText(entry.changedBy.level)}
                                        </span>
                                      )}
                                    </div>
                                    {entry.comments && (
                                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                                        <strong>Comments:</strong>{" "}
                                        {entry.comments}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No status changes recorded</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Officer Assignments */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleSection(app.id, "assignments")}
                      className="w-full px-6 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Officer Assignments (
                        {app.officerAssignments?.length || 0})
                      </span>
                      {isSectionExpanded(app.id, "assignments") ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {isSectionExpanded(app.id, "assignments") && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        {app.officerAssignments &&
                        app.officerAssignments.length > 0 ? (
                          <div className="space-y-4">
                            {app.officerAssignments.map((assignment, index) => (
                              <div
                                key={index}
                                className="bg-white p-4 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                      <UserCheck className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {
                                          assignment.assignedTo.officerProfile
                                            .fullName
                                        }
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {
                                          assignment.assignedTo.officerProfile
                                            .designation
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelColor(
                                        assignment.assignedTo.level
                                      )}`}
                                    >
                                      {getLevelText(
                                        assignment.assignedTo.level
                                      )}
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                                        assignment.priority
                                      )}`}
                                    >
                                      Priority {assignment.priority}
                                    </span>
                                  </div>
                                </div>
                                {assignment.assignedBy && (
                                  <div className="text-xs text-gray-500 mb-2">
                                    Assigned by:{" "}
                                    {assignment.assignedBy.officerProfile
                                      ?.fullName || assignment.assignedBy.email}
                                  </div>
                                )}
                                {assignment.instructions && (
                                  <div className="text-sm bg-gray-50 p-3 rounded mb-2">
                                    <strong>Instructions:</strong>{" "}
                                    {assignment.instructions}
                                  </div>
                                )}
                                {assignment.expectedCompletionDate && (
                                  <div className="text-xs text-gray-500">
                                    Expected completion:{" "}
                                    {formatDate(
                                      assignment.expectedCompletionDate
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No officer assignments</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Forwarding History */}
                  {((app.officerForwardings &&
                    app.officerForwardings.length > 0) ||
                    (app.frontdeskForwardings &&
                      app.frontdeskForwardings.length > 0)) && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() =>
                          toggleSection(app.id, "forwarding-history")
                        }
                        className="w-full px-6 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Forwarding History (
                          {(app.officerForwardings?.length || 0) +
                            (app.frontdeskForwardings?.length || 0)}
                          )
                        </span>
                        {isSectionExpanded(app.id, "forwarding-history") ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {isSectionExpanded(app.id, "forwarding-history") && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                          <div className="space-y-4">
                            {/* Officer Forwardings */}
                            {app.officerForwardings &&
                              app.officerForwardings.map(
                                (forwarding, index) => (
                                  <div
                                    key={`officer-${index}`}
                                    className="bg-blue-50 border border-blue-200 p-4 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <ArrowRight className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-medium text-blue-800">
                                        Officer Forwarding
                                      </span>
                                      {forwarding.isActive && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-600 font-medium mb-1">
                                          From:
                                        </p>
                                        <p className="text-gray-900">
                                          {forwarding.fromOfficer.officerProfile
                                            ?.fullName || "Unknown"}
                                        </p>
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs mt-1 ${getLevelColor(
                                            forwarding.fromOfficer.level
                                          )}`}
                                        >
                                          {getLevelText(
                                            forwarding.fromOfficer.level
                                          )}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 font-medium mb-1">
                                          To:
                                        </p>
                                        <p className="text-gray-900">
                                          {forwarding.toOfficer.officerProfile
                                            ?.fullName || "Unknown"}
                                        </p>
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs mt-1 ${getLevelColor(
                                            forwarding.toOfficer.level
                                          )}`}
                                        >
                                          {getLevelText(
                                            forwarding.toOfficer.level
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(
                                          forwarding.priority
                                        )}`}
                                      >
                                        Priority {forwarding.priority}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatDateTime(forwarding.createdAt)}
                                      </span>
                                    </div>
                                    {forwarding.instructions && (
                                      <div className="mt-3 p-3 bg-white rounded text-sm">
                                        <strong>Instructions:</strong>{" "}
                                        {forwarding.instructions}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}

                            {/* Frontdesk Forwardings */}
                            {app.frontdeskForwardings &&
                              app.frontdeskForwardings.map(
                                (forwarding, index) => (
                                  <div
                                    key={`frontdesk-${index}`}
                                    className="bg-green-50 border border-green-200 p-4 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <Send className="w-4 h-4 text-green-600" />
                                      <span className="text-sm font-medium text-green-800">
                                        Frontdesk Forwarding
                                      </span>
                                      {forwarding.isActive && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-600 font-medium mb-1">
                                          From:
                                        </p>
                                        <p className="text-gray-900">
                                          {forwarding.fromFrontdesk.email}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 font-medium mb-1">
                                          To:
                                        </p>
                                        <p className="text-gray-900">
                                          {forwarding.toFrontdesk.email}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-3">
                                      {formatDateTime(forwarding.createdAt)}
                                    </div>
                                    {forwarding.instructions && (
                                      <div className="mt-3 p-3 bg-white rounded text-sm">
                                        <strong>Instructions:</strong>{" "}
                                        {forwarding.instructions}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Applications List Component - Table View
  const renderApplicationsTable = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Application
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Citizen
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Current Holder
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Documents
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {applications.map((app) => {
              const slaProgress = calculateSlaProgress(app);
              const showingDetails = showDetails === app.id;
              return (
                <React.Fragment key={app.id}>
                  <tr
                    className={`transition-colors ${
                      showingDetails ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {app.rrNumber}
                          </div>
                          <div className="text-sm text-gray-600">
                            {app.serviceCategory.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {app.citizenName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {app.citizenPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                          app.status
                        )}`}
                      >
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.currentHolder ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.currentHolder.officerProfile.fullName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {app.currentHolder.officerProfile.designation}
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getLevelColor(
                              app.currentHolder.level
                            )}`}
                          >
                            {getLevelText(app.currentHolder.level)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {slaProgress ? (
                        <div className="w-full">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>
                              {slaProgress.elapsed}/{slaProgress.total} days
                            </span>
                            <span>{slaProgress.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                slaProgress.isOverdue
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${slaProgress.percentage}%` }}
                            ></div>
                          </div>
                          {slaProgress.isOverdue && (
                            <div className="text-xs text-red-600 mt-1">
                              Overdue
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openDocumentModal(app.documents, app.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="font-medium">
                          {app.documents.length}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() =>
                          setShowDetails(showingDetails ? null : app.id)
                        }
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Toggle Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {/* Expanded Details Row */}
                  {showingDetails && (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 bg-gray-50">
                        <div className="space-y-6">
                          {/* Application Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Citizen Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Name:</span>
                                  <span className="ml-2 font-medium">
                                    {app.citizenName}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Phone:</span>
                                  <span className="ml-2 font-medium">
                                    {app.citizenPhone}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <span className="ml-2 font-medium">
                                    {app.citizenEmail || "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Address:
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {app.citizenAddress}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Application Timeline
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-500">
                                    Submitted:
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {formatDateTime(app.submittedAt)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Validated:
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {formatDateTime(app.validatedAt)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Completed:
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {formatDateTime(app.completedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Statistics
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-center p-2 bg-blue-50 rounded">
                                  <div className="font-bold text-blue-600">
                                    {app.workflow?.length || 0}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    Status Changes
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded">
                                  <div className="font-bold text-green-600">
                                    {app.officerAssignments?.length || 0}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    Assignments
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-orange-50 rounded">
                                  <div className="font-bold text-orange-600">
                                    {(app.officerForwardings?.length || 0) +
                                      (app.frontdeskForwardings?.length || 0)}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    Forwards
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-purple-50 rounded">
                                  <div className="font-bold text-purple-600">
                                    {app.documents?.length || 0}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    Documents
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Latest Status Changes */}
                          {app.workflow && app.workflow.length > 0 && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Recent Status Changes
                              </h4>
                              <div className="space-y-2">
                                {app.workflow
                                  .slice(-3)
                                  .reverse()
                                  .map((entry, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                                            entry.toStatus
                                          )}`}
                                        >
                                          {entry.toStatus}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                          by{" "}
                                          {entry.changedBy.officerProfile
                                            ?.fullName || entry.changedBy.email}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {formatDateTime(entry.createdAt)}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Applications List Component
  const renderApplicationsList = () => {
    if (!showApplications || applications.length === 0) return null;

    return (
      <>
        {viewMode === "cards"
          ? renderApplicationsCards()
          : renderApplicationsTable()}
        {renderPagination()}
      </>
    );
  };

  // Enhanced Pagination Component
  const renderPagination = () => {
    if (!showApplications || stats.pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200 mt-6">
        <div className="text-sm text-gray-600">
          Showing{" "}
          <span className="font-medium">
            {(stats.pagination.page - 1) * stats.pagination.limit + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(
              stats.pagination.page * stats.pagination.limit,
              stats.pagination.totalCount
            )}
          </span>{" "}
          of <span className="font-medium">{stats.pagination.totalCount}</span>{" "}
          results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={!stats.pagination.hasPrev}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-700">
            Page {stats.pagination.page} of {stats.pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!stats.pagination.hasNext}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Application Status Report
              </h1>
              <p className="text-gray-600 mt-2">
                Comprehensive application progress monitoring and management
                system
              </p>
            </div>
            <div className="flex items-center gap-3">
              {showApplications && (
                <button
                  onClick={() => {
                    setShowApplications(false);
                    setSelectedStatus("ALL");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Overview
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Overview Section */}
        {!showApplications && (
          <>
            {/* Status Cards */}
            {renderStatusCards()}

            {/* Recent Applications Overview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Recent Applications
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Latest {applications.length} applications in the system
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Activity className="w-4 h-4" />
                  <span>Live Updates</span>
                </div>
              </div>

              {applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.slice(0, 5).map((app) => {
                    const showingDetails = showDetails === app.id;
                    const age = calculateApplicationAge(app.submittedAt);
                    const slaProgress = calculateSlaProgress(app);
                    const statusColors = getStatusColor(app.status);

                    return (
                      <div key={app.id}>
                        <div
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            showingDetails
                              ? "bg-blue-50 border-blue-200"
                              : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-2 rounded-lg ${statusColors.light} ${statusColors.border} border`}
                              >
                                <FileText
                                  className={`w-4 h-4 ${statusColors.text}`}
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {app.rrNumber}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {app.citizenName} • {app.serviceCategory.name}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(
                                  app.status
                                )}`}
                              >
                                {app.status.replace("_", " ")}
                              </span>
                              <button
                                onClick={() =>
                                  openDocumentModal(app.documents, app.id)
                                }
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                title="View Documents"
                              >
                                <Paperclip className="w-4 h-4" />
                                <span className="font-medium">
                                  {app.documents.length}
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  setShowDetails(showingDetails ? null : app.id)
                                }
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                                title={
                                  showingDetails
                                    ? "Hide Details"
                                    : "View Details"
                                }
                              >
                                <Eye className="w-4 h-4" />
                                {showingDetails ? "Hide" : "View"}
                              </button>
                              <div className="text-sm text-gray-500 font-medium">
                                {formatDate(app.submittedAt)}
                              </div>
                            </div>
                          </div>

                          {/* Current Holder */}
                          {app.currentHolder && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                              <UserCheck className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-gray-700">
                                <span className="font-medium">
                                  Current Officer:
                                </span>{" "}
                                {app.currentHolder.officerProfile.fullName}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelColor(
                                  app.currentHolder.level
                                )}`}
                              >
                                {getLevelText(app.currentHolder.level)}
                              </span>
                            </div>
                          )}

                          {/* SLA Progress */}
                          {slaProgress && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-600 font-medium">
                                  Time Progress
                                </span>
                                <span
                                  className={`font-semibold ${
                                    slaProgress.isOverdue
                                      ? "text-red-600"
                                      : "text-blue-600"
                                  }`}
                                >
                                  {slaProgress.elapsed}/{slaProgress.total} days
                                  ({slaProgress.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    slaProgress.isOverdue
                                      ? "bg-red-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{
                                    width: `${slaProgress.percentage}%`,
                                  }}
                                ></div>
                              </div>
                              {slaProgress.isOverdue && (
                                <div className="flex items-center gap-2 mt-2">
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-sm text-red-600 font-medium">
                                    Application is overdue
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded Details for Overview */}
                        {showingDetails && (
                          <div className="mt-4 bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                            {/* Statistics Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                                <div className="text-2xl font-bold text-blue-600 mb-1">
                                  {app.workflow?.length || 0}
                                </div>
                                <div className="text-sm text-blue-700">
                                  Status Changes
                                </div>
                              </div>
                              <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                                <div className="text-2xl font-bold text-green-600 mb-1">
                                  {app.officerAssignments?.length || 0}
                                </div>
                                <div className="text-sm text-green-700">
                                  Assignments
                                </div>
                              </div>
                              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center">
                                <div className="text-2xl font-bold text-orange-600 mb-1">
                                  {(app.officerForwardings?.length || 0) +
                                    (app.frontdeskForwardings?.length || 0)}
                                </div>
                                <div className="text-sm text-orange-700">
                                  Forwardings
                                </div>
                              </div>
                              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-center">
                                <div className="text-2xl font-bold text-purple-600 mb-1">
                                  {app.documents?.length || 0}
                                </div>
                                <div className="text-sm text-purple-700">
                                  Documents
                                </div>
                              </div>
                            </div>

                            {/* Quick Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Citizen Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Name:</span>
                                    <span className="font-medium">
                                      {app.citizenName}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">
                                      Phone:
                                    </span>
                                    <span className="font-medium">
                                      {app.citizenPhone}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">
                                      Email:
                                    </span>
                                    <span className="font-medium">
                                      {app.citizenEmail || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Timeline
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">
                                      Submitted:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(app.submittedAt)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">
                                      Validated:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(app.validatedAt)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">
                                      Completed:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(app.completedAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No recent applications found
                  </h3>
                  <p className="text-gray-600">
                    Applications will appear here once they are submitted
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Applications Detail Section */}
        {showApplications && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedStatus.replace("_", " ")} Applications
              </h2>
              <p className="text-gray-600">
                Showing all applications with status:{" "}
                {selectedStatus.replace("_", " ")}
              </p>
            </div>

            {/* Age Filter */}
            {renderAgeFilter()}

            {/* Filters */}
            {renderFilters()}

            {/* Applications List */}
            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Loading applications...
                </h3>
                <p className="text-gray-600">
                  Please wait while we fetch the data
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No applications found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your filters or check back later for new
                  applications.
                </p>
              </div>
            ) : (
              renderApplicationsList()
            )}
          </>
        )}
      </div>

      {/* Enhanced Document Modal */}
      {showDocumentModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Application Documents
                </h3>
                <p className="text-sm text-gray-600">
                  {showDocumentModal.documents.length} documents found
                </p>
              </div>
              <button
                onClick={closeDocumentModal}
                className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {showDocumentModal.documents.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {showDocumentModal.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {doc.fileName}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {getDocumentTypeLabel(doc.documentType)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              Size: {(doc.fileSize / 1024).toFixed(1)} KB
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                doc.isVerified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {doc.isVerified
                                ? "Verified"
                                : "Pending Verification"}
                            </span>
                            <span>Uploaded: {formatDate(doc.createdAt)}</span>
                          </div>
                          {doc.verificationNotes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">
                                <strong>Notes:</strong> {doc.verificationNotes}
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="ml-4 flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No documents available
                  </h4>
                  <p className="text-gray-600">
                    No documents have been uploaded for this application yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DCDashboard;
