"use client";

import { FilePreviewButton } from "@/components/FilePreview";
import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  FileText,
  User,
  CalendarIcon,
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
  SlidersHorizontal,
  Phone,
  Mail,
  MapPin,
  Building,
  Tag,
  Filter,
  Loader2,
} from "lucide-react";
import { getRoleMapping } from "@/lib/officer-roles";
import type { UserRole } from "@/app/generated/prisma";
import { ServiceCategoryBadge } from "@/components/ui/service-category-badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { NotificationDialog } from "@/components/ui/notification-dialog";
import { toast } from "sonner";
import { ServiceCategoryEditModal } from "@/components/ui/service-category-edit-modal";
import { canUserManageServiceCategories } from "@/lib/service-category-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  applicationSource?: string;
  department?: {
    id: string;
    name: string;
    description?: string;
  };
  serviceCategory: {
    id: string;
    name: string;
    slaDays: number;
    color?: string;
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
  const [selectedOfficer, setSelectedOfficer] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedServiceCategory, setSelectedServiceCategory] =
    useState<string>("all");
  const [selectedApplicationSource, setSelectedApplicationSource] =
    useState<string>("all");
  const [serviceCategories, setServiceCategories] = useState<
    { id: string; name: string; color?: string }[]
  >([]);
  const [ageFilter, setAgeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [currentPage, setCurrentPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
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
  const [isCategoryEditModalOpen, setIsCategoryEditModalOpen] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState<string>("");
  const [editingCurrentCategory, setEditingCurrentCategory] = useState<
    | {
        id: string;
        name: string;
        color?: string;
      }
    | undefined
  >(undefined);
  const [canManageCategories, setCanManageCategories] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
  const fetchApplications = useCallback(
    async (status?: string, page = 1) => {
      try {
        setLoading(true);

        // Handle status parameter correctly
        const statusParam = status || selectedStatus;
        const finalStatus =
          statusParam === "all" || statusParam === "ALL" ? "" : statusParam;

        const params = new URLSearchParams({
          status: finalStatus,
          search: searchTerm,
          officerId: selectedOfficer === "all" ? "" : selectedOfficer,
          departmentId: selectedDepartment === "all" ? "" : selectedDepartment,
          serviceCategoryId:
            selectedServiceCategory === "all" ? "" : selectedServiceCategory,
          applicationSource:
            selectedApplicationSource === "all"
              ? ""
              : selectedApplicationSource,
          ageFilter: ageFilter,
          startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
          endDate: endDate ? format(endDate, "yyyy-MM-dd") : "",
          page: page.toString(),
          limit: "10",
        });

        console.log("Fetching with params:", Object.fromEntries(params));

        const response = await fetch(`/api/dc/applications?${params}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch applications: ${errorText}`);
        }

        const data = await response.json();
        setApplications(data.applications || []);
        setOfficers(data.officers || []);
        setDepartments(data.departments || []);
        setServiceCategories(data.serviceCategories || []);
        setStats(
          data.stats || {
            total: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
            reopened: 0,
            ageStats: { recent: 0, medium: 0, old: 0 },
            pagination: {
              page: 1,
              limit: 10,
              totalCount: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          }
        );
        setCurrentPage(page);
      } catch (error) {
        console.error("Error fetching applications:", error);
        setApplications([]);
        setStats((prev) => ({
          ...prev,
          pagination: {
            page: 1,
            limit: 10,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        }));
      } finally {
        setLoading(false);
      }
    },
    [
      selectedStatus,
      searchTerm,
      selectedOfficer,
      selectedDepartment,
      selectedServiceCategory,
      selectedApplicationSource,
      ageFilter,
      startDate,
      endDate,
    ]
  );

  const fetchRecentApplications = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "5",
        recent: "true",
      });
      const response = await fetch(`/api/dc/applications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch recent applications");
      const data = await response.json();
      setApplications(data.applications || []);
      // Also fetch the full stats for the dashboard
      setStats(
        data.stats || {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
          reopened: 0,
          ageStats: { recent: 0, medium: 0, old: 0 },
          pagination: data.stats?.pagination || {
            page: 1,
            limit: 5,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        }
      );
    } catch (error) {
      console.error("Error fetching recent applications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch("/api/service-categories");
      if (!response.ok) throw new Error("Failed to fetch service categories");
      const categories = await response.json();
      setServiceCategories(categories || []);
    } catch (error) {
      console.error("Error fetching service categories:", error);
    }
  };

  useEffect(() => {
    // Fetch service categories on initial load as backup
    fetchServiceCategories();
  }, []);

  // Check if user can manage service categories
  useEffect(() => {
    const checkPermissions = async () => {
      if (session?.user?.role) {
        const canManage = await canUserManageServiceCategories(
          session.user.role
        );
        setCanManageCategories(canManage);
      }
    };
    checkPermissions();
  }, [session]);

  useEffect(() => {
    if (showApplications) {
      fetchApplications(selectedStatus, currentPage);
    } else {
      fetchRecentApplications(recentPage);
    }
  }, [
    currentPage,
    recentPage,
    showApplications,
    selectedStatus,
    searchTerm,
    selectedOfficer,
    selectedDepartment,
    selectedServiceCategory,
    selectedApplicationSource,
    ageFilter,
    startDate,
    endDate,
    fetchApplications,
    fetchRecentApplications,
  ]);

  const handleStatusCardClick = (status: string) => {
    setSelectedStatus(status);
    setShowApplications(true);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    if (showApplications) {
      fetchApplications(selectedStatus, currentPage);
    } else {
      fetchRecentApplications(recentPage);
    }
  };

  // Service Category Edit Modal Functions
  const openCategoryEditModal = (
    applicationId: string,
    currentCategory: { id: string; name: string; color?: string }
  ) => {
    setEditingApplicationId(applicationId);
    setEditingCurrentCategory(currentCategory);
    setIsCategoryEditModalOpen(true);
  };

  const closeCategoryEditModal = () => {
    setIsCategoryEditModalOpen(false);
    setEditingApplicationId("");
    setEditingCurrentCategory(undefined);
  };

  const handleCategoryUpdated = () => {
    if (showApplications) {
      fetchApplications(selectedStatus, currentPage);
    } else {
      fetchRecentApplications(recentPage);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedOfficer("all");
    setSelectedDepartment("all");
    setSelectedServiceCategory("all");
    setSelectedApplicationSource("all");
    setAgeFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedStatus("all"); // Changed from "ALL" to "all" for consistency
    setShowApplications(false);
    setCurrentPage(1);
    setRecentPage(1);
    // Fetch recent applications after clearing filters
    fetchRecentApplications(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <FolderOpen className="w-5 h-5" />;
      case "IN_PROGRESS":
        return <PlayCircle className="w-5 h-5" />;
      case "RESOLVED":
        return <CheckCircle2 className="w-5 h-5" />;
      case "CLOSED":
        return <XCircleIcon className="w-5 h-5" />;
      case "REOPENED":
        return <RotateCcw className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TOTAL":
        return {
          gradient: "from-indigo-500 to-indigo-600",
          bg: "bg-indigo-500",
          text: "text-indigo-600",
          light: "bg-indigo-50",
          border: "border-indigo-200",
          ring: "ring-indigo-500/20",
        };
      case "OPEN":
        return {
          gradient: "from-blue-500 to-blue-600",
          bg: "bg-blue-500",
          text: "text-blue-600",
          light: "bg-blue-50",
          border: "border-blue-200",
          ring: "ring-blue-500/20",
        };
      case "IN_PROGRESS":
        return {
          gradient: "from-purple-500 to-purple-600",
          bg: "bg-purple-500",
          text: "text-purple-600",
          light: "bg-purple-50",
          border: "border-purple-200",
          ring: "ring-purple-500/20",
        };
      case "RESOLVED":
        return {
          gradient: "from-green-500 to-green-600",
          bg: "bg-green-500",
          text: "text-green-600",
          light: "bg-green-50",
          border: "border-green-200",
          ring: "ring-green-500/20",
        };
      case "CLOSED":
        return {
          gradient: "from-red-500 to-red-600",
          bg: "bg-red-500",
          text: "text-red-600",
          light: "bg-red-50",
          border: "border-red-200",
          ring: "ring-red-500/20",
        };
      case "REOPENED":
        return {
          gradient: "from-orange-500 to-orange-600",
          bg: "bg-orange-500",
          text: "text-orange-600",
          light: "bg-orange-50",
          border: "border-orange-200",
          ring: "ring-orange-500/20",
        };
      default:
        return {
          gradient: "from-gray-500 to-gray-600",
          bg: "bg-gray-500",
          text: "text-gray-600",
          light: "bg-gray-50",
          border: "border-gray-200",
          ring: "ring-gray-500/20",
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
      // Fetch the presigned URL from the API
      const response = await fetch(`/api/documents/${doc.id}`);
      if (!response.ok) throw new Error("Download failed");
      const data = await response.json();
      const fileResponse = await fetch(data.url);
      if (!fileResponse.ok) throw new Error("Failed to download file");
      const blob = await fileResponse.blob();
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
      toast.error("Failed to download document");
    }
  };

  // Professional Status Cards Component
  const renderStatusCards = () => {
    const statusCards = [
      {
        status: "all",
        title: "Total",
        count: stats.total,
        description: "All applications",
        icon: BarChart3,
        colors: getStatusColor("TOTAL"),
      },
      {
        status: "OPEN",
        title: "Open",
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

    // Separate total card from other status cards
    const totalCard = statusCards.find((card) => card.status === "all");
    const otherStatusCards = statusCards.filter(
      (card) => card.status !== "all"
    );

    return (
      <div className="mb-6 lg:mb-8 space-y-4 lg:space-y-6">
        {/* Total Applications Card - Full Width Row */}
        {totalCard && (
          <div className="w-full">
            <div
              key={totalCard.status}
              onClick={() => handleStatusCardClick(totalCard.status)}
              className="group relative overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 p-6 lg:p-8"
            >
              <div className="flex items-center justify-between">
                {/* Left Section - Icon and Count */}
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-blue-100 border-2 border-blue-200">
                    <BarChart3 className="w-8 h-8 lg:w-10 lg:h-10 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-3xl lg:text-5xl font-bold text-blue-600 leading-none">
                      {totalCard.count.toLocaleString()}
                    </div>
                    <div className="text-sm lg:text-base text-blue-600 mt-1 font-semibold">
                      TOTAL APPLICATIONS
                    </div>
                  </div>
                </div>

                {/* Right Section - Title and Description */}
                <div className="text-right">
                  <h3 className="text-xl lg:text-2xl font-bold text-blue-700 group-hover:text-blue-800 transition-colors">
                    {totalCard.title}
                  </h3>
                  <p className="text-sm lg:text-base text-blue-600 leading-relaxed mt-1">
                    {totalCard.description}
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-3 text-sm text-blue-600">
                    <span>Click to view all</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl lg:rounded-2xl"></div>
            </div>
          </div>
        )}

        {/* Other Status Cards - Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {otherStatusCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.status}
                onClick={() => handleStatusCardClick(card.status)}
                className="group relative overflow-hidden rounded-xl lg:rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              >
                {/* Background Gradient Overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                ></div>

                {/* Card Content */}
                <div className="relative p-4 lg:p-6">
                  {/* Header with Icon and Count */}
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <div
                      className={`p-2 lg:p-3 rounded-lg lg:rounded-xl ${card.colors.light} ${card.colors.border} border`}
                    >
                      <IconComponent
                        className={`w-4 h-4 lg:w-5 lg:h-5 ${card.colors.text}`}
                      />
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xl lg:text-3xl font-bold ${card.colors.text} leading-none`}
                      >
                        {card.count.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium hidden lg:block">
                        APPLICATIONS
                      </div>
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm lg:text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs lg:text-sm text-gray-600 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Click to view</span>
                      <ArrowRight className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div
                  className={`absolute inset-0 border-2 border-transparent group-hover:${card.colors.border.replace(
                    "border-",
                    "border-"
                  )} rounded-xl lg:rounded-2xl transition-colors duration-300`}
                ></div>
              </div>
            );
          })}
        </div>
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
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-200 mb-4 lg:mb-6">
        <div className="flex items-center gap-3 mb-4 lg:mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Timer className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base lg:text-lg font-semibold text-gray-900">
              Filter by Application Age
            </h3>
            <p className="text-xs lg:text-sm text-gray-600 mt-1">
              Filter applications based on how long they&apos;ve been in the
              system
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          {ageFilters.map((filter) => (
            <Button
              key={filter.key}
              variant="outline"
              onClick={() =>
                setAgeFilter(ageFilter === filter.key ? "" : filter.key)
              }
              className={cn(
                "p-3 lg:p-4 h-auto flex-col items-start space-y-2 transition-all duration-200 hover:shadow-md",
                ageFilter === filter.key
                  ? filter.activeColor
                  : `${filter.bgColor} ${
                      filter.borderColor
                    } hover:${filter.borderColor.replace("200", "300")}`
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-${filter.color}-500`}
                ></div>
                <div
                  className={`text-lg lg:text-2xl font-bold ${
                    ageFilter === filter.key
                      ? filter.textColor
                      : filter.textColor
                  }`}
                >
                  {filter.count}
                </div>
              </div>
              <div className="text-left w-full">
                <div
                  className={`font-semibold text-sm lg:text-base ${filter.textColor}`}
                >
                  {filter.label}
                </div>
                <div
                  className={`text-xs lg:text-sm ${filter.textColor} opacity-75`}
                >
                  {filter.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced Professional Filters Component with shadcn UI
  const renderFilters = () => {
    if (!showApplications) return null;

    const hasActiveFilters =
      searchTerm ||
      (selectedOfficer && selectedOfficer !== "all") ||
      (selectedDepartment && selectedDepartment !== "all") ||
      (selectedServiceCategory && selectedServiceCategory !== "all") ||
      (selectedApplicationSource && selectedApplicationSource !== "all") ||
      ageFilter ||
      startDate ||
      endDate;

    return (
      <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 mb-4 lg:mb-6">
        {/* Header Section - Always Visible */}
        <div className="p-4 lg:p-6 border-b border-gray-100">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 lg:w-5 lg:h-5" />
            <Input
              type="text"
              placeholder="Search by RR number, citizen name, or service category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchApplications(selectedStatus, 1);
              }}
              className="pl-10 lg:pl-12 h-10 lg:h-12 text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center justify-between lg:hidden">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 h-10 px-4",
                showFilters || hasActiveFilters
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  !
                </span>
              )}
            </Button>

            {/* Mobile View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "p-2 h-8",
                  viewMode === "cards"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-700"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 h-8",
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-700"
                )}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop View Mode Toggle */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "cards"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
                Cards
              </Button>
              <Button
                variant="ghost"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                )}
              >
                <List className="w-4 h-4" />
                List
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:block p-6 bg-gradient-to-br from-slate-50/50 to-gray-50/30">
          {/* Filter Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
              <Filter className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Advanced Filters
              </h3>
              <p className="text-xs text-gray-600">
                Refine your search criteria
              </p>
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Officer Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                Officer <span className="text-gray-500">(Optional)</span>
              </Label>
              <Select
                value={selectedOfficer}
                onValueChange={setSelectedOfficer}
              >
                <SelectTrigger className="h-9 border-gray-200 text-sm">
                  <SelectValue placeholder="All Officers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Officers</SelectItem>
                  {officers.map((officer) => (
                    <SelectItem key={officer.id} value={officer.id}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium text-xs">
                          {officer.officerProfile?.fullName || "Unknown"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getOfficerShortForm(officer.role)} •{" "}
                          {officer.applicationCount} apps
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                Department <span className="text-gray-500">(Optional)</span>
              </Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="h-9 border-gray-200 text-sm">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      <span className="truncate text-sm">
                        {department.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Category Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                Service Category{" "}
                <span className="text-gray-500">(Optional)</span>
              </Label>
              <Select
                value={selectedServiceCategory}
                onValueChange={setSelectedServiceCategory}
              >
                <SelectTrigger className="h-9 border-gray-200 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {serviceCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="truncate text-sm">{category.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Application Source Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                Source <span className="text-gray-500">(Optional)</span>
              </Label>
              <Select
                value={selectedApplicationSource}
                onValueChange={setSelectedApplicationSource}
              >
                <SelectTrigger className="h-9 border-gray-200 text-sm">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <span>📄</span>
                      <span className="text-sm">Public Portal</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="GOVERNMENT">
                    <div className="flex items-center gap-2">
                      <span>🏛️</span>
                      <span className="text-sm">Government</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal border-gray-200 text-sm",
                      !startDate && "text-gray-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                    {startDate
                      ? format(startDate, "MMM dd, yyyy")
                      : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date && endDate && endDate < date) {
                        setEndDate(undefined);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                End Date
                {startDate && !endDate && (
                  <span className="text-red-500 text-xs">Required</span>
                )}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!startDate}
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal border-gray-200 text-sm",
                      !endDate && "text-gray-500",
                      !startDate && "opacity-50 cursor-not-allowed bg-gray-50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                    {endDate
                      ? format(endDate, "MMM dd, yyyy")
                      : startDate
                      ? "Select end date"
                      : "Select start date first"}
                  </Button>
                </PopoverTrigger>
                {startDate && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => {
                        if (date > new Date()) return true;
                        if (startDate && date < startDate) return true;
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                )}
              </Popover>
            </div>
          </div>

          {/* Clear Filters Button - Desktop */}
          {hasActiveFilters && (
            <div className="flex justify-center pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-9 px-6 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                <X className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Filters - Collapsible */}
        {showFilters && (
          <div className="lg:hidden border-t border-gray-100 p-4 bg-gray-50/50">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Filter Options
              </h3>
              <p className="text-xs text-gray-600">
                Customize your search criteria
              </p>
            </div>

            <div className="space-y-4">
              {/* Officer Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Officer
                </Label>
                <Select
                  value={selectedOfficer}
                  onValueChange={setSelectedOfficer}
                >
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="All Officers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Officers</SelectItem>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium text-sm">
                            {officer.officerProfile?.fullName || "Unknown"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getOfficerShortForm(officer.role)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Department
                </Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        <span className="truncate">{department.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Service Category
                </Label>
                <Select
                  value={selectedServiceCategory}
                  onValueChange={setSelectedServiceCategory}
                >
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {serviceCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="truncate">{category.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Application Source Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Source
                </Label>
                <Select
                  value={selectedApplicationSource}
                  onValueChange={setSelectedApplicationSource}
                >
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="PUBLIC">
                      <div className="flex items-center gap-2">
                        <span>📄</span>
                        <span>Public Portal</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="GOVERNMENT">
                      <div className="flex items-center gap-2">
                        <span>🏛️</span>
                        <span>Government</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile Date Filters */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">
                  Date Range
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">
                      Start Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 justify-start text-left font-normal border-gray-200",
                            !startDate && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                          {startDate ? (
                            <span className="text-sm">
                              {format(startDate, "MMM dd")}
                            </span>
                          ) : (
                            <span className="text-sm">Start</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => {
                            if (date > new Date()) return true;
                            if (endDate && date > endDate) return true;
                            return false;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">
                      End Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 justify-start text-left font-normal border-gray-200",
                            !endDate && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                          {endDate ? (
                            <span className="text-sm">
                              {format(endDate, "MMM dd")}
                            </span>
                          ) : (
                            <span className="text-sm">End</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => {
                            if (date > new Date()) return true;
                            if (startDate && date < startDate) return true;
                            return false;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Clear Filters Button - Mobile */}
              {hasActiveFilters && (
                <div className="flex justify-center pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearFilters();
                      setShowFilters(false);
                    }}
                    className="h-10 px-6 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Enhanced Mobile-First Applications Cards Component with Fixed Text Overflow
  const renderApplicationsCards = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
      {applications.map((app) => {
        const age = calculateApplicationAge(app.submittedAt);
        const showingDetails = showDetails === app.id;
        const slaProgress = calculateSlaProgress(app);
        const statusColors = getStatusColor(app.status);

        return (
          <div
            key={app.id}
            className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group h-fit"
          >
            {/* Card Header */}
            <div className="p-4 lg:p-6">
              {/* Top Row - RR Number and Actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`p-2 lg:p-2.5 rounded-lg lg:rounded-xl ${statusColors.light} ${statusColors.border} border group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}
                  >
                    <FileText
                      className={`w-4 h-4 lg:w-5 lg:h-5 ${statusColors.text}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                      {app.rrNumber}
                    </h3>
                    {app.subject && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                        {app.subject}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDocumentModal(app.documents, app.id)}
                    className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200"
                    title="View Documents"
                  >
                    <Paperclip className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1" />
                    {app.documents.length}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setShowDetails(showingDetails ? null : app.id)
                    }
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    title={showingDetails ? "Hide Details" : "Show Details"}
                  >
                    {showingDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Citizen Information */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900 truncate">
                    {app.citizenName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{app.citizenPhone}</span>
                </div>
                {app.citizenEmail && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{app.citizenEmail}</span>
                  </div>
                )}
              </div>

              {/* Service Category - Positioned Below Citizen Info */}
              <div className="mb-4">
                <ServiceCategoryBadge
                  category={{
                    id: app.serviceCategory.id,
                    name: app.serviceCategory.name,
                    color: app.serviceCategory.color,
                  }}
                  variant="default"
                  clickable={canManageCategories}
                  onClick={
                    canManageCategories
                      ? () =>
                          openCategoryEditModal(app.id, {
                            id: app.serviceCategory.id,
                            name: app.serviceCategory.name,
                            color: app.serviceCategory.color,
                          })
                      : undefined
                  }
                />
              </div>

              {/* Status and Metadata Row */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium border ${getStatusBadgeColor(
                      app.status
                    )}`}
                  >
                    {app.status.replace("_", " ")}
                  </span>
                  {(selectedStatus === "OPEN" ||
                    selectedStatus === "IN_PROGRESS") && (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAgeColor(
                        age
                      )}`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {age}d
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {formatDate(app.submittedAt)}
                </div>
              </div>

              {/* Additional Info Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {app.applicationSource && (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      app.applicationSource === "PUBLIC"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {app.applicationSource === "PUBLIC"
                      ? "📄 Public"
                      : "🏛️ Gov"}
                  </span>
                )}
                {app.department && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    <Building className="w-3 h-3 mr-1" />
                    {app.department.name}
                  </span>
                )}
              </div>
            </div>

            {/* Current Holder */}
            {app.currentHolder && (
              <div className="px-4 lg:px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                    <UserCheck className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        Current Officer:
                      </span>
                    </div>
                    <div className="font-semibold text-green-700 truncate">
                      {app.currentHolder.officerProfile.fullName}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLA Progress */}
            {slaProgress && (
              <div className="px-4 lg:px-6 py-4 border-t border-gray-100">
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
                <div className="w-full bg-gray-200 rounded-full h-2 lg:h-3">
                  <div
                    className={`h-2 lg:h-3 rounded-full transition-all duration-300 ${
                      slaProgress.isOverdue ? "bg-red-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${slaProgress.percentage}%` }}
                  ></div>
                </div>
                {slaProgress.isOverdue && (
                  <div className="flex items-center gap-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-600 font-medium">
                      Application is overdue
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Expanded Details */}
            {showingDetails && (
              <div className="p-4 lg:p-6 bg-gray-50 space-y-4 lg:space-y-6 border-t border-gray-100">
                {/* Statistics Cards - Fixed Text Overflow */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                  <div className="bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl border border-gray-200 text-center overflow-hidden">
                    <div className="text-xl lg:text-2xl font-bold text-blue-600 mb-1">
                      {app.workflow?.length || 0}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 leading-tight break-words">
                      Status Changes
                    </div>
                  </div>
                  <div className="bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl border border-gray-200 text-center overflow-hidden">
                    <div className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
                      {app.officerAssignments?.length || 0}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 leading-tight break-words">
                      Assignments
                    </div>
                  </div>
                  <div className="bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl border border-gray-200 text-center overflow-hidden">
                    <div className="text-xl lg:text-2xl font-bold text-orange-600 mb-1">
                      {(app.officerForwardings?.length || 0) +
                        (app.frontdeskForwardings?.length || 0)}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 leading-tight break-words">
                      Forwardings
                    </div>
                  </div>
                  <div className="bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl border border-gray-200 text-center overflow-hidden">
                    <div className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
                      {app.documents?.length || 0}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 leading-tight break-words">
                      Documents
                    </div>
                  </div>
                </div>

                {/* Collapsible Sections */}
                <div className="space-y-3 lg:space-y-4">
                  {/* Application Information */}
                  <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSection(app.id, "application-info")}
                      className="w-full px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between h-auto"
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
                    </Button>
                    {isSectionExpanded(app.id, "application-info") && (
                      <div className="px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="space-y-4 text-sm">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-3">
                              <div className="flex items-start gap-2">
                                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-500 font-medium mb-1">
                                    Citizen Name
                                  </p>
                                  <p className="text-gray-900">
                                    {app.citizenName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-500 font-medium mb-1">
                                    Phone
                                  </p>
                                  <p className="text-gray-900">
                                    {app.citizenPhone}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-500 font-medium mb-1">
                                    Email
                                  </p>
                                  <p className="text-gray-900">
                                    {app.citizenEmail || "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-500 font-medium mb-1">
                                    Address
                                  </p>
                                  <p className="text-gray-900">
                                    {app.citizenAddress}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-500 font-medium mb-1">
                                    Service Category
                                  </p>
                                  <p className="text-gray-900">
                                    {app.serviceCategory.name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-500 font-medium mb-1">
                                    Timeline
                                  </p>
                                  <div className="space-y-1">
                                    <p className="text-gray-900">
                                      <span className="font-medium">
                                        Submitted:
                                      </span>{" "}
                                      {formatDateTime(app.submittedAt)}
                                    </p>
                                    <p className="text-gray-900">
                                      <span className="font-medium">
                                        Validated:
                                      </span>{" "}
                                      {formatDateTime(app.validatedAt)}
                                    </p>
                                    <p className="text-gray-900">
                                      <span className="font-medium">
                                        Completed:
                                      </span>{" "}
                                      {formatDateTime(app.completedAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {app.subject && (
                                <div className="flex items-start gap-2">
                                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-gray-500 font-medium mb-1">
                                      Subject
                                    </p>
                                    <p className="text-gray-900">
                                      {app.subject}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status History */}
                  <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSection(app.id, "status-history")}
                      className="w-full px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between h-auto"
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
                    </Button>
                    {isSectionExpanded(app.id, "status-history") && (
                      <div className="px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
                        {app.workflow && app.workflow.length > 0 ? (
                          <div className="space-y-3 lg:space-y-4">
                            {app.workflow.map((entry, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 lg:gap-4 relative"
                              >
                                {index < app.workflow.length - 1 && (
                                  <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                                )}
                                <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full mt-1"></div>
                                <div className="flex-1 min-w-0 bg-white p-3 lg:p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                                    <div className="flex items-center gap-2 flex-wrap">
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
                          <div className="text-center py-6 lg:py-8 text-gray-500">
                            <History className="w-6 h-6 lg:w-8 lg:h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                              No status changes recorded
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Officer Assignments */}
                  <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSection(app.id, "assignments")}
                      className="w-full px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between h-auto"
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
                    </Button>
                    {isSectionExpanded(app.id, "assignments") && (
                      <div className="px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
                        {app.officerAssignments &&
                        app.officerAssignments.length > 0 ? (
                          <div className="space-y-3 lg:space-y-4">
                            {app.officerAssignments.map((assignment, index) => (
                              <div
                                key={index}
                                className="bg-white p-3 lg:p-4 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                                      <UserCheck className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 truncate">
                                        {
                                          assignment.assignedTo.officerProfile
                                            .fullName
                                        }
                                      </div>
                                      <div className="text-sm text-gray-600 truncate">
                                        {
                                          assignment.assignedTo.officerProfile
                                            .designation
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
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
                                      P{assignment.priority}
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
                          <div className="text-center py-6 lg:py-8 text-gray-500">
                            <Users className="w-6 h-6 lg:w-8 lg:h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No officer assignments</p>
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
                    <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          toggleSection(app.id, "forwarding-history")
                        }
                        className="w-full px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between h-auto"
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
                      </Button>
                      {isSectionExpanded(app.id, "forwarding-history") && (
                        <div className="px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
                          <div className="space-y-3 lg:space-y-4">
                            {/* Officer Forwardings */}
                            {app.officerForwardings &&
                              app.officerForwardings.map(
                                (forwarding, index) => (
                                  <div
                                    key={`officer-${index}`}
                                    className="bg-blue-50 border border-blue-200 p-3 lg:p-4 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                                    <div className="space-y-3 text-sm">
                                      <div className="grid grid-cols-1 gap-3">
                                        <div>
                                          <p className="text-gray-600 font-medium mb-1">
                                            From:
                                          </p>
                                          <p className="text-gray-900">
                                            {forwarding.fromOfficer
                                              .officerProfile?.fullName ||
                                              "Unknown"}
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
                                    </div>
                                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
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
                                    className="bg-green-50 border border-green-200 p-3 lg:p-4 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                                    <div className="space-y-3 text-sm">
                                      <div className="grid grid-cols-1 gap-3">
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

  // Enhanced Mobile-First Applications Table Component
  const renderApplicationsTable = () => (
    <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Mobile Table - Stacked Cards */}
      <div className="lg:hidden">
        {applications.map((app) => {
          const slaProgress = calculateSlaProgress(app);
          const showingDetails = showDetails === app.id;
          return (
            <div
              key={app.id}
              className={`border-b border-gray-200 last:border-b-0 transition-colors ${
                showingDetails ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="p-4 space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {app.rrNumber}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <ServiceCategoryBadge
                          category={{
                            id: app.serviceCategory.id,
                            name: app.serviceCategory.name,
                            color: app.serviceCategory.color,
                          }}
                          variant="outline"
                          size="sm"
                          clickable={canManageCategories}
                          onClick={
                            canManageCategories
                              ? () =>
                                  openCategoryEditModal(app.id, {
                                    id: app.serviceCategory.id,
                                    name: app.serviceCategory.name,
                                    color: app.serviceCategory.color,
                                  })
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setShowDetails(showingDetails ? null : app.id)
                    }
                    className="flex-shrink-0 h-8 w-8 p-0"
                    title="Toggle Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {/* Citizen Info */}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {app.citizenName}
                    </div>
                    <div className="text-xs text-gray-600">
                      {app.citizenPhone}
                    </div>
                  </div>
                </div>

                {/* Status and Source */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                        app.status
                      )}`}
                    >
                      {app.status.replace("_", " ")}
                    </span>
                    {app.applicationSource && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          app.applicationSource === "PUBLIC"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {app.applicationSource === "PUBLIC"
                          ? "📄 Public"
                          : "🏛️ Gov"}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDocumentModal(app.documents, app.id)}
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200"
                  >
                    <Paperclip className="w-3 h-3 mr-1" />
                    {app.documents.length}
                  </Button>
                </div>

                {/* Current Holder */}
                {app.currentHolder && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-700 font-medium truncate">
                        {app.currentHolder.officerProfile.fullName}
                      </div>
                      <div className="text-xs text-green-600">
                        {app.currentHolder.officerProfile.designation}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(
                        app.currentHolder.level
                      )}`}
                    >
                      {getLevelText(app.currentHolder.level)}
                    </span>
                  </div>
                )}

                {/* Progress Bar */}
                {slaProgress && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>
                        {slaProgress.elapsed}/{slaProgress.total} days
                      </span>
                      <span>{slaProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          slaProgress.isOverdue ? "bg-red-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${slaProgress.percentage}%` }}
                      ></div>
                    </div>
                    {slaProgress.isOverdue && (
                      <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Overdue
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Details for Mobile */}
              {showingDetails && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-4 pt-4">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {app.workflow?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600">
                          Status Changes
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                        <div className="text-lg font-bold text-green-600">
                          {app.officerAssignments?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Assignments</div>
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Contact Information
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span className="font-medium">
                            {app.citizenPhone}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span className="font-medium truncate ml-2">
                            {app.citizenEmail || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Latest Status Changes */}
                    {app.workflow && app.workflow.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                          <History className="w-4 h-4" />
                          Recent Changes
                        </h4>
                        <div className="space-y-2">
                          {app.workflow
                            .slice(-2)
                            .reverse()
                            .map((entry, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(
                                      entry.toStatus
                                    )}`}
                                  >
                                    {entry.toStatus}
                                  </span>
                                  <span className="text-gray-600 truncate">
                                    by{" "}
                                    {entry.changedBy.officerProfile?.fullName ||
                                      entry.changedBy.email}
                                  </span>
                                </div>
                                <span className="text-gray-500 text-xs">
                                  {formatDate(entry.createdAt)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
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
                Source
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
                          <div className="text-sm text-gray-600 mt-1">
                            <ServiceCategoryBadge
                              category={{
                                id: app.serviceCategory.id,
                                name: app.serviceCategory.name,
                                color: app.serviceCategory.color,
                              }}
                              variant="outline"
                              size="sm"
                              clickable={canManageCategories}
                              onClick={
                                canManageCategories
                                  ? () =>
                                      openCategoryEditModal(app.id, {
                                        id: app.serviceCategory.id,
                                        name: app.serviceCategory.name,
                                        color: app.serviceCategory.color,
                                      })
                                  : undefined
                              }
                            />
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
                      {app.applicationSource && (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            app.applicationSource === "PUBLIC"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {app.applicationSource === "PUBLIC"
                            ? "📄 Public"
                            : "🏛️ Government"}
                        </span>
                      )}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDocumentModal(app.documents, app.id)}
                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        {app.documents.length}
                      </Button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowDetails(showingDetails ? null : app.id)
                        }
                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                        title="Toggle Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                  {/* Expanded Details Row */}
                  {showingDetails && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6 bg-gray-50">
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
                                <CalendarIcon className="w-4 h-4" />
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

  // Enhanced Mobile-First Pagination Component
  const renderPagination = () => {
    if (!showApplications || stats.pagination.totalPages <= 1) return null;

    return (
      <div className="bg-white px-4 lg:px-6 py-4 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 mt-4 lg:mt-6">
        {/* Mobile Pagination */}
        <div className="flex items-center justify-between lg:hidden">
          <div className="text-sm text-gray-600">
            Page {stats.pagination.page} of {stats.pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!stats.pagination.hasPrev}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!stats.pagination.hasNext}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Pagination */}
        <div className="hidden lg:flex items-center justify-between">
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
            of{" "}
            <span className="font-medium">{stats.pagination.totalCount}</span>{" "}
            results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!stats.pagination.hasPrev}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {stats.pagination.page} of {stats.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!stats.pagination.hasNext}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Recent Applications Pagination Component
  const renderRecentPagination = () => {
    if (showApplications || stats.pagination.totalPages <= 1) return null;

    return (
      <div className="bg-white px-4 lg:px-6 py-4 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 mt-4 lg:mt-6">
        {/* Mobile Pagination */}
        <div className="flex items-center justify-between lg:hidden">
          <div className="text-sm text-gray-600">
            Page {recentPage} of {stats.pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecentPage(recentPage - 1)}
              disabled={recentPage <= 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecentPage(recentPage + 1)}
              disabled={recentPage >= stats.pagination.totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Pagination */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing recent applications - Page {recentPage} of{" "}
            {stats.pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setRecentPage(recentPage - 1)}
              disabled={recentPage <= 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {recentPage} of {stats.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setRecentPage(recentPage + 1)}
              disabled={recentPage >= stats.pagination.totalPages}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Mobile-First Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Application Status Report
              </h1>
              <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">
                Comprehensive application progress monitoring and management
                system
              </p>
            </div>
            <div className="flex items-center gap-3">
              {showApplications && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApplications(false);
                    setSelectedStatus("ALL");
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Overview</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              )}
              <Button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-8">
        {/* Overview Section */}
        {!showApplications && (
          <>
            {/* Status Cards */}
            {renderStatusCards()}

            {/* Recent Applications Overview */}
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div>
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
                    Recent Applications
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-600 mt-1">
                    Latest applications in the system
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600">
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Live Updates</span>
                </div>
              </div>

              {applications.length > 0 ? (
                <>
                  <div className="space-y-3 lg:space-y-4">
                    {applications.map((app) => {
                      const showingDetails = showDetails === app.id;
                      const age = calculateApplicationAge(app.submittedAt);
                      const slaProgress = calculateSlaProgress(app);
                      const statusColors = getStatusColor(app.status);

                      return (
                        <div key={app.id}>
                          <div
                            className={`p-3 lg:p-4 rounded-lg lg:rounded-xl border transition-all duration-200 ${
                              showingDetails
                                ? "bg-blue-50 border-blue-200"
                                : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 lg:gap-4 flex-1 min-w-0">
                                <div
                                  className={`p-2 rounded-lg ${statusColors.light} ${statusColors.border} border flex-shrink-0`}
                                >
                                  <FileText
                                    className={`w-4 h-4 ${statusColors.text}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  {/* RR Number */}
                                  <div className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">
                                    {app.rrNumber}
                                  </div>

                                  {/* Subject - Below RR Number */}
                                  {app.subject && (
                                    <div className="text-xs lg:text-sm text-gray-600 mb-2 line-clamp-1">
                                      {app.subject}
                                    </div>
                                  )}

                                  {/* Citizen Information */}
                                  <div className="text-xs lg:text-sm text-gray-600">
                                    <span className="font-medium">
                                      {app.citizenName}
                                    </span>
                                    <span className="mx-2">•</span>
                                    <span>{app.citizenPhone}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Side - Category, Status, and Actions */}
                              <div className="flex flex-col items-end gap-2 lg:gap-3 ml-3 lg:ml-4 flex-shrink-0">
                                {/* Service Category - On Right */}
                                <ServiceCategoryBadge
                                  category={{
                                    id: app.serviceCategory.id,
                                    name: app.serviceCategory.name,
                                    color: app.serviceCategory.color,
                                  }}
                                  variant="outline"
                                  size="sm"
                                  clickable={canManageCategories}
                                  onClick={
                                    canManageCategories
                                      ? () =>
                                          openCategoryEditModal(app.id, {
                                            id: app.serviceCategory.id,
                                            name: app.serviceCategory.name,
                                            color: app.serviceCategory.color,
                                          })
                                      : undefined
                                  }
                                />

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium border ${getStatusBadgeColor(
                                      app.status
                                    )}`}
                                  >
                                    {app.status.replace("_", " ")}
                                  </span>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openDocumentModal(app.documents, app.id)
                                    }
                                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                    title="View Documents"
                                  >
                                    <Paperclip className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                                    {app.documents.length}
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setShowDetails(
                                        showingDetails ? null : app.id
                                      )
                                    }
                                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                                    title={
                                      showingDetails
                                        ? "Hide Details"
                                        : "View Details"
                                    }
                                  >
                                    <Eye className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                                    <span className="hidden lg:inline">
                                      {showingDetails ? "Hide" : "View"}
                                    </span>
                                  </Button>
                                </div>

                                <div className="text-xs text-gray-500 font-medium">
                                  {formatDate(app.submittedAt)}
                                </div>
                              </div>
                            </div>

                            {/* Current Holder */}
                            {app.currentHolder && (
                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                                <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-xs lg:text-sm text-gray-700 flex-1 min-w-0">
                                  <span className="font-medium">
                                    Current Officer:
                                  </span>{" "}
                                  <span className="truncate">
                                    {app.currentHolder.officerProfile.fullName}
                                  </span>
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelColor(
                                    app.currentHolder.level
                                  )} flex-shrink-0`}
                                >
                                  {getLevelText(app.currentHolder.level)}
                                </span>
                              </div>
                            )}

                            {/* SLA Progress */}
                            {slaProgress && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center text-xs lg:text-sm mb-2">
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
                                    {slaProgress.elapsed}/{slaProgress.total}{" "}
                                    days ({slaProgress.percentage}%)
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
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <span className="text-xs lg:text-sm text-red-600 font-medium">
                                      Application is overdue
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Expanded Details for Overview */}
                          {showingDetails && (
                            <div className="mt-3 lg:mt-4 bg-white border border-gray-200 rounded-lg lg:rounded-xl p-4 lg:p-6 space-y-4 lg:space-y-6">
                              {/* Statistics Cards - Fixed Text Overflow */}
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                                <div className="bg-blue-50 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-blue-200 text-center">
                                  <div className="text-xl lg:text-2xl font-bold text-blue-600 mb-1">
                                    {app.workflow?.length || 0}
                                  </div>
                                  <div className="text-xs lg:text-sm text-blue-700 leading-tight">
                                    Status Changes
                                  </div>
                                </div>
                                <div className="bg-green-50 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-green-200 text-center">
                                  <div className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
                                    {app.officerAssignments?.length || 0}
                                  </div>
                                  <div className="text-xs lg:text-sm text-green-700 leading-tight">
                                    Assignments
                                  </div>
                                </div>
                                <div className="bg-orange-50 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-orange-200 text-center">
                                  <div className="text-xl lg:text-2xl font-bold text-orange-600 mb-1">
                                    {(app.officerForwardings?.length || 0) +
                                      (app.frontdeskForwardings?.length || 0)}
                                  </div>
                                  <div className="text-xs lg:text-sm text-orange-700 leading-tight">
                                    Forwardings
                                  </div>
                                </div>
                                <div className="bg-purple-50 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-purple-200 text-center">
                                  <div className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
                                    {app.documents?.length || 0}
                                  </div>
                                  <div className="text-xs lg:text-sm text-purple-700 leading-tight">
                                    Documents
                                  </div>
                                </div>
                              </div>

                              {/* Quick Info Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm lg:text-base">
                                    <User className="w-4 h-4" />
                                    Citizen Information
                                  </h4>
                                  <div className="space-y-2 text-xs lg:text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">
                                        Name:
                                      </span>
                                      <span className="font-medium truncate ml-2">
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
                                      <span className="font-medium truncate ml-2">
                                        {app.citizenEmail || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm lg:text-base">
                                    <CalendarIcon className="w-4 h-4" />
                                    Timeline
                                  </h4>
                                  <div className="space-y-2 text-xs lg:text-sm">
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
                  {/* Recent Applications Pagination */}
                  {renderRecentPagination()}
                </>
              ) : (
                <div className="text-center py-8 lg:py-12 text-gray-500">
                  <FileText className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
                    No recent applications found
                  </h3>
                  <p className="text-sm lg:text-base text-gray-600">
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
            <div className="mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                {selectedStatus.replace("_", " ")} Applications
              </h2>
              <p className="text-sm lg:text-base text-gray-600">
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
              <div className="bg-white rounded-xl lg:rounded-2xl p-8 lg:p-12 text-center shadow-sm border border-gray-200">
                <RefreshCw className="w-6 h-6 lg:w-8 lg:h-8 animate-spin mx-auto text-blue-600 mb-4" />
                <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
                  Loading applications...
                </h3>
                <p className="text-sm lg:text-base text-gray-600">
                  Please wait while we fetch the data
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-xl lg:rounded-2xl p-8 lg:p-12 text-center shadow-sm border border-gray-200">
                <FileText className="w-8 h-8 lg:w-12 lg:h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
                  No applications found
                </h3>
                <p className="text-sm lg:text-base text-gray-600">
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
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-4 lg:px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                  Application Documents
                </h3>
                <p className="text-xs lg:text-sm text-gray-600">
                  {showDocumentModal.documents.length} documents found
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDocumentModal}
                className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {showDocumentModal.documents.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {showDocumentModal.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-lg lg:rounded-xl p-4 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {doc.fileName}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {getDocumentTypeLabel(doc.documentType)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
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
                        <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                          <FilePreviewButton
                            document={doc}
                            applicationId={showDocumentModal.applicationId}
                            variant="outline"
                            size="sm"
                            className="h-8"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                            className="h-8 flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 lg:py-12">
                  <FileText className="w-8 h-8 lg:w-12 lg:h-12 mx-auto text-gray-400 mb-4" />
                  <h4 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
                    No documents available
                  </h4>
                  <p className="text-sm lg:text-base text-gray-600">
                    No documents have been uploaded for this application yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Service Category Edit Modal */}
      <ServiceCategoryEditModal
        isOpen={isCategoryEditModalOpen}
        onCloseAction={closeCategoryEditModal}
        applicationId={editingApplicationId}
        currentCategory={editingCurrentCategory}
        onCategoryUpdatedAction={handleCategoryUpdated}
      />
    </div>
  );
};

export default DCDashboard;
