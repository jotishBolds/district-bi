"use client";

import { FilePreviewButton } from "@/components/FilePreview";

import React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  Clock,
  Search,
  Filter,
  RefreshCw,
  X,
  Phone,
  Forward,
  PlayCircle,
  Paperclip,
  CalendarIcon,
  History,
  Info,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Send,
  Grid3X3,
  List,
} from "lucide-react";
import { ServiceCategoryBadge } from "@/components/ui/service-category-badge";
import { ServiceCategoryEditModal } from "@/components/ui/service-category-edit-modal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { NotificationDialog } from "@/components/ui/notification-dialog";
import { toast } from "sonner";

// Types (keeping the same as original)
interface CitizenProfile {
  fullName: string;
  phone: string;
  address: string;
  aadhaarNumber?: string; // Legacy field
  alternateNumber?: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  color?: string;
}

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  isVerified: boolean;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OfficerProfile {
  fullName: string;
  designation: string;
}

interface OfficerAssignment {
  assignedTo: {
    id: string;
    officerProfile: OfficerProfile;
  };
  assignedBy?: {
    id: string;
    role?: string;
    officerProfile?: OfficerProfile;
  };
  priority: number;
  instructions?: string;
  expectedCompletionDate?: string;
  createdAt?: string;
}

interface ApplicationValidation {
  rrNumber: string;
  isDocumentsComplete: boolean;
  isEligibilityVerified: boolean;
  validationNotes?: string;
  validatedBy: {
    officerProfile: OfficerProfile;
  };
  createdAt: string;
}

interface WorkflowEntry {
  fromStatus: string | null;
  toStatus: string;
  changedBy: {
    officerProfile?: OfficerProfile;
    citizenProfile?: CitizenProfile;
  };
  comments?: string;
  createdAt: string;
}

interface ForwardingHistory {
  id: string;
  fromFrontdesk: {
    id: string;
    officerProfile?: OfficerProfile;
  };
  toFrontdesk: {
    id: string;
    officerProfile?: OfficerProfile;
  };
  fromOfficerId: string;
  toOfficerId: string;
  instructions?: string;
  isActive: boolean;
  createdAt: string;
}

interface OfficerForwardingHistory {
  id: string;
  fromOfficerId: string;
  toOfficerId: string;
  fromOfficer: {
    id: string;
    officerProfile?: OfficerProfile;
  };
  toOfficer: {
    id: string;
    officerProfile?: OfficerProfile;
  };
  instructions?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  forwardedAt: string;
  completedAt?: string;
}

interface Application {
  id: string;
  rrNumber?: string;
  subject?: string;
  status: string;
  submittedAt: string;
  validatedAt?: string;
  completedAt?: string;
  createdAt: string;
  applicationSource?: string;
  department?: {
    id: string;
    name: string;
    description?: string;
  };
  serviceCategory: ServiceCategory;
  currentHolder?: {
    id: string;
    officerProfile?: OfficerProfile;
  };
  citizen?: {
    citizenProfile: CitizenProfile;
  };
  citizenName?: string;
  citizenPhone?: string;
  citizenEmail?: string;
  citizenAddress?: string;
  citizenGender?: string;
  citizenAlternateNumber?: string;
  documents: Document[];
  officerAssignments: OfficerAssignment[];
  validation?: ApplicationValidation;
  workflow: WorkflowEntry[];
  frontdeskForwardings?: ForwardingHistory[];
  officerForwardings?: OfficerForwardingHistory[];
}

interface Officer {
  id: string;
  role: string;
  fullName: string;
  designation: string;
  department?: string;
  officeLocation?: string;
}

const OfficerDashboard = () => {
  const { data: session } = useSession();
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<Officer[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("IN_PROGRESS");
  const [forwardingFilter, setForwardingFilter] = useState("ALL");
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [actionDropdownOpen, setActionDropdownOpen] = useState<string | null>(
    null
  );
  const [actionForm, setActionForm] = useState({
    action: "",
    newStatus: "",
    message: "",
    forwardToOfficerId: "",
    // priority: 1, // Always HIGH priority - removed from UI
    instructions: "",
  });
  const [isSelfForward, setIsSelfForward] = useState(false);

  // Additional state for enhanced search and view modes
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedApplicationSource, setSelectedApplicationSource] =
    useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    variant?: "default" | "destructive";
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const [notificationDialog, setNotificationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Service category management state
  const [categoryEditModalOpen, setCategoryEditModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<{
    id: string;
    serviceCategory: {
      id: string;
      name: string;
      color?: string;
    };
  } | null>(null);

  // Helper functions - defined first to avoid temporal dead zone issues
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "High Priority";
      case "MEDIUM":
        return "Medium Priority";
      case "LOW":
        return "Low Priority";
      default:
        return "Normal Priority";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  // Helper function to check if current user forwarded this application but is not current holder
  const isForwardedByCurrentUser = (app: Application) => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return false;

    if (app.currentHolder?.id === currentUserId) return false;

    return (
      app.officerForwardings &&
      app.officerForwardings.some(
        (forwarding) =>
          forwarding.fromOfficerId === currentUserId ||
          forwarding.fromOfficer?.id === currentUserId
      )
    );
  };

  // Helper function to check if current user is the current holder of the application
  const isCurrentHolder = (app: Application) => {
    const currentUserId = session?.user?.id;
    return currentUserId && app.currentHolder?.id === currentUserId;
  };

  // Helper function to check if current user has any involvement with the application
  const hasApplicationInvolvement = (app: Application) => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return false;

    if (app.currentHolder?.id === currentUserId) return true;

    if (
      app.officerForwardings &&
      app.officerForwardings.some(
        (forwarding) =>
          forwarding.fromOfficerId === currentUserId ||
          forwarding.fromOfficer?.id === currentUserId
      )
    )
      return true;

    if (
      app.officerForwardings &&
      app.officerForwardings.some(
        (forwarding) =>
          forwarding.toOfficerId === currentUserId ||
          forwarding.toOfficer?.id === currentUserId
      )
    )
      return true;

    return false;
  };

  // Helper function to check if user has forwarded this specific application
  const hasForwardedThisApplication = (app: Application) => {
    const currentUserId = session?.user?.id;
    if (!currentUserId || !app.officerForwardings) return false;

    return app.officerForwardings.some(
      (forwarding) =>
        forwarding.fromOfficerId === currentUserId ||
        forwarding.fromOfficer?.id === currentUserId
    );
  };

  // Filter options with colors and icons - calculated dynamically with memoization
  const filterOptions = useMemo(() => {
    // Show loading state when data is being fetched or no data loaded yet
    const isDataLoading = loading || allApplications.length === 0;

    // Always calculate counts from ALL applications regardless of current filters
    // This ensures accurate counts are shown for each status badge
    const allUserApplications = allApplications.filter((app) =>
      hasApplicationInvolvement(app)
    );

    return [
      {
        value: "IN_PROGRESS",
        label: "In Progress",
        count: isDataLoading
          ? "..."
          : allUserApplications.filter((app) => app.status === "IN_PROGRESS")
              .length,
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: <Clock className="w-4 h-4" />,
      },
      {
        value: "RESOLVED",
        label: "Resolved",
        count: isDataLoading
          ? "..."
          : allUserApplications.filter((app) => app.status === "RESOLVED")
              .length,
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle className="w-4 h-4" />,
      },
      {
        value: "CLOSED",
        label: "Closed",
        count: isDataLoading
          ? "..."
          : allUserApplications.filter((app) => app.status === "CLOSED").length,
        color: "bg-red-100 text-red-800 border-red-200",
        icon: <XCircle className="w-4 h-4" />,
      },
      {
        value: "REOPENED",
        label: "Reopened",
        count: isDataLoading
          ? "..."
          : allUserApplications.filter((app) => app.status === "REOPENED")
              .length,
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: <RefreshCw className="w-4 h-4" />,
      },
    ];
  }, [allApplications, session?.user?.id, loading]); // Re-calculate when applications, user, or loading state changes

  // Keep the function for backwards compatibility but return memoized values
  const getFilterOptions = () => filterOptions;

  // Forwarding filter options with memoization
  const forwardingFilterOptions = useMemo(() => {
    // Show loading state when data is being fetched or no data loaded yet
    const isDataLoading = loading || allApplications.length === 0;
    const currentUserId = session?.user?.id;

    // Calculate count from ALL applications that user has forwarded
    const forwardedByMeCount = isDataLoading
      ? "..."
      : allApplications.filter((app) => {
          return hasForwardedThisApplication(app);
        }).length;

    return [
      {
        value: "FORWARDED_BY_ME",
        label: "Forwarded by Me",
        count: forwardedByMeCount,
        color: "bg-orange-100 text-orange-800 border-orange-200",
        icon: <Send className="w-4 h-4" />,
      },
    ];
  }, [allApplications, session?.user?.id, loading]);

  // Keep the function for backwards compatibility but return memoized values
  const getForwardingFilterOptions = () => forwardingFilterOptions;

  // Helper function to get citizen data
  const getCitizenData = (app: Application) => {
    if (app.citizen?.citizenProfile) {
      return {
        fullName: app.citizen.citizenProfile.fullName,
        phone: app.citizen.citizenProfile.phone,
        address: app.citizen.citizenProfile.address,
        aadhaarNumber: app.citizen.citizenProfile.aadhaarNumber, // Legacy profile field
        alternateNumber: (
          app.citizen.citizenProfile as CitizenProfile & {
            alternateNumber?: string;
          }
        )?.alternateNumber, // If profile has alternate number
      };
    } else {
      return {
        fullName: app.citizenName || "N/A",
        phone: app.citizenPhone || "N/A",
        address: app.citizenAddress || "N/A",
        alternateNumber: app.citizenAlternateNumber, // New application field
      };
    }
  };

  // Fetch functions
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: "50",
        includeForwardingHistory: "true",
      });

      // Add search parameter
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      // Add service category filter
      if (selectedServiceCategory) {
        params.append("serviceCategoryId", selectedServiceCategory);
      }

      // Add application source filter
      if (selectedApplicationSource) {
        params.append("applicationSource", selectedApplicationSource);
      }

      // Don't add status filter to the API call - we'll filter on frontend to maintain accurate counts
      // This ensures we always have all applications for accurate badge counts
      // if (statusFilter && statusFilter !== "ALL") {
      //   params.append("status", statusFilter);
      // }

      const response = await fetch(`/api/applications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      const data = await response.json();
      setAllApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedServiceCategory,
    selectedApplicationSource,
    // Removed statusFilter from dependencies since we're not filtering by status in API
  ]);

  const fetchAvailableOfficers = async () => {
    try {
      const response = await fetch("/api/officers/available");
      if (!response.ok) throw new Error("Failed to fetch officers");
      const officers = await response.json();
      setAvailableOfficers(officers || []);
    } catch (error) {
      console.error("Error fetching officers:", error);
    }
  };

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
    fetchApplications();
    fetchAvailableOfficers();
    fetchServiceCategories();
  }, [fetchApplications]);

  // Re-fetch applications when filters change (excluding statusFilter since it's now frontend-only)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchApplications();
    }, 300); // 300ms debounce for search

    return () => clearTimeout(timeoutId);
  }, [fetchApplications]);

  // Close action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setActionDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRefresh = () => {
    fetchApplications();
    fetchAvailableOfficers();
  };

  // Get status-specific button configuration
  const getStatusActionConfig = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return {
          label: "Mark as Resolved",
          icon: CheckCircle,
          bgColor: "bg-green-600 hover:bg-green-700",
          description:
            "Mark this application as resolved. The issue has been addressed.",
        };
      case "CLOSED":
        return {
          label: "Close Application",
          icon: XCircle,
          bgColor: "bg-red-600 hover:bg-red-700",
          description:
            "Close this application. No further action will be taken.",
        };
      case "REOPENED":
        return {
          label: "Reopen Application",
          icon: RefreshCw,
          bgColor: "bg-purple-600 hover:bg-purple-700",
          description: "Reopen this application for further processing.",
        };
      case "IN_PROGRESS":
        return {
          label: "Start Processing",
          icon: PlayCircle,
          bgColor: "bg-blue-600 hover:bg-blue-700",
          description: "Start processing this application.",
        };
      default:
        return {
          label: "Change Status",
          icon: RefreshCw,
          bgColor: "bg-muted hover:bg-muted/80",
          description: "Update the application status.",
        };
    }
  };

  // Handle application status changes
  const handleStatusChange = async (
    applicationId: string,
    newStatus: string,
    message: string
  ) => {
    try {
      setProcessing(true);
      const response = await fetch(
        `/api/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
            comments: message,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Status change failed");
      }

      let successMessage = "";
      switch (newStatus) {
        case "IN_PROGRESS":
          successMessage = "Application processing started successfully";
          break;
        case "RESOLVED":
          successMessage = "Application resolved successfully";
          break;
        case "CLOSED":
          successMessage = "Application closed successfully";
          break;
        case "REOPENED":
          successMessage = "Application reopened successfully";
          break;
        default:
          successMessage = "Status updated successfully";
      }

      toast.success(successMessage);
      setActionForm({
        action: "",
        newStatus: "",
        message: "",
        forwardToOfficerId: "",
        // priority: 1, // Always HIGH priority - removed from UI
        instructions: "",
      });
      setIsSelfForward(false);
      setSelectedApp(null);
      setShowDetails(null);
      fetchApplications();
    } catch (error) {
      console.error("Status change error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Status change failed";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleForwardApplication = async (
    applicationId: string,
    forwardToOfficerId: string,
    instructions: string
    // priority: number - Always HIGH priority - removed from UI
  ) => {
    try {
      setProcessing(true);
      const response = await fetch(
        `/api/applications/${applicationId}/forward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedToId: forwardToOfficerId,
            instructions: instructions,
            // priority: 1, // Always HIGH priority - removed from UI
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Forward failed");
      }

      const result = await response.json();
      toast.success(result.message || "Application forwarded successfully");
      setActionForm({
        action: "",
        newStatus: "",
        message: "",
        forwardToOfficerId: "",
        // priority: 1, // Always HIGH priority - removed from UI
        instructions: "",
      });
      setIsSelfForward(false);
      setSelectedApp(null);
      setShowDetails(null);
      fetchApplications();
    } catch (error) {
      console.error("Forward error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Forward failed";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications =
    allApplications?.filter((app) => {
      if (!hasApplicationInvolvement(app)) {
        return false;
      }

      if (forwardingFilter === "FORWARDED_BY_ME") {
        if (!hasForwardedThisApplication(app)) {
          return false;
        }

        const citizenData = getCitizenData(app);
        const matchesSearch =
          !searchQuery ||
          citizenData.fullName
            ?.toLowerCase()
            ?.includes(searchQuery.toLowerCase()) ||
          app?.serviceCategory?.name
            ?.toLowerCase()
            ?.includes(searchQuery.toLowerCase()) ||
          app?.subject?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
          app?.rrNumber?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
          citizenData.phone?.includes(searchQuery) ||
          app?.citizenEmail
            ?.toLowerCase()
            ?.includes(searchQuery.toLowerCase()) ||
          searchTerm?.toLowerCase()?.includes(searchQuery.toLowerCase());

        const matchesServiceCategory =
          !selectedServiceCategory ||
          app?.serviceCategory?.id === selectedServiceCategory;

        const matchesApplicationSource =
          !selectedApplicationSource ||
          app?.applicationSource === selectedApplicationSource;

        return (
          matchesSearch && matchesServiceCategory && matchesApplicationSource
        );
      }

      if (app.status !== statusFilter) return false;

      const citizenData = getCitizenData(app);
      const matchesSearch =
        !searchQuery ||
        citizenData.fullName
          ?.toLowerCase()
          ?.includes(searchQuery.toLowerCase()) ||
        app?.serviceCategory?.name
          ?.toLowerCase()
          ?.includes(searchQuery.toLowerCase()) ||
        app?.subject?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        app?.rrNumber?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        citizenData.phone?.includes(searchQuery) ||
        app?.citizenEmail?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        searchTerm?.toLowerCase()?.includes(searchQuery.toLowerCase());

      const matchesServiceCategory =
        !selectedServiceCategory ||
        app?.serviceCategory?.id === selectedServiceCategory;

      const matchesApplicationSource =
        !selectedApplicationSource ||
        app?.applicationSource === selectedApplicationSource;

      return (
        matchesSearch && matchesServiceCategory && matchesApplicationSource
      );
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800";
      case "CLOSED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800";
      case "REOPENED":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  const getPriorityColorByNumber = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800";
      case 2:
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800";
      case 3:
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  const getPriorityLabelByNumber = (priority: number) => {
    switch (priority) {
      case 1:
        return "High";
      case 2:
        return "Medium";
      case 3:
        return "Low";
      default:
        return "Medium";
    }
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

  const clearFilters = () => {
    setSearchTerm("");
    setSearchQuery("");
    setSelectedServiceCategory("");
    setSelectedApplicationSource("");
    setStatusFilter("IN_PROGRESS");
    setForwardingFilter("ALL");
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

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  // Render Grid View
  const renderGridView = () => (
    <div className="grid grid-cols-1 gap-4 sm:gap-6">
      {filteredApplications.map((app) => {
        const citizenData = getCitizenData(app);
        const isSelected = selectedApp?.id === app.id;
        const showingDetails = showDetails === app.id;
        const isForwardedByMe = isForwardedByCurrentUser(app);
        const isCurrentAppHolder = isCurrentHolder(app);

        return (
          <div
            key={app.id}
            className={`bg-card rounded-lg shadow-sm border transition-all ${
              isSelected
                ? "border-blue-300 shadow-md"
                : "border-border hover:shadow-md"
            }`}
          >
            {/* Main Card Content */}
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  {/* Subject - Top Priority */}
                  {app.subject && (
                    <h2 className="text-lg sm:text-xl font-bold text-blue-700 mb-2 break-words">
                      {app.subject}
                    </h2>
                  )}
                  {/* Category - Second Line */}
                  <div className="flex items-center flex-wrap gap-2 mb-3">
                    <ServiceCategoryBadge
                      category={{
                        id: app.serviceCategory.id,
                        name: app.serviceCategory.name,
                        color: app.serviceCategory.color,
                      }}
                      clickable={true}
                      onClick={() => {
                        setSelectedApplication(app);
                        setCategoryEditModalOpen(true);
                      }}
                      className="cursor-pointer hover:scale-105 transition-transform"
                    />

                    {app.department && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-100 px-2 py-1 rounded">
                          {app.department.name}
                        </span>
                      </>
                    )}

                    {app.applicationSource && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-md ${
                            app.applicationSource === "PUBLIC"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {app.applicationSource === "PUBLIC"
                            ? "📄 Public"
                            : "🏛️ Government"}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Name, Phone, Date in responsive layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-foreground break-words truncate">
                        {citizenData.fullName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="break-words">{citizenData.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                      <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="break-words">
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString()
                          : "Not submitted"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                      <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>{app.documents.length} documents</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Status and Actions */}
                <div className="flex flex-col sm:items-end gap-2 sm:ml-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Current Status as Badge */}
                    <span
                      className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>

                    {!isCurrentAppHolder && (
                      <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium border border-orange-200">
                        <Send className="w-3 h-3 mr-1" />
                        {isForwardedByMe ? "Forwarded by Me" : "View Only"}
                      </span>
                    )}
                  </div>

                  {/* Show current holder information when user is not the holder */}
                  {!isCurrentAppHolder && app.currentHolder && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
                      <User className="w-3 h-3 mr-1" />
                      Held by:{" "}
                      {app.currentHolder.officerProfile?.fullName ||
                        "Unknown Officer"}
                    </span>
                  )}

                  {/* RR Number */}
                  {app.rrNumber && (
                    <span className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                      RR: {app.rrNumber}
                    </span>
                  )}

                  {/* Actions Dropdown */}
                  <div className="relative" data-dropdown>
                    <button
                      onClick={() =>
                        setActionDropdownOpen(
                          actionDropdownOpen === app.id ? null : app.id
                        )
                      }
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border"
                      title="Actions"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {/* Actions Dropdown Menu */}
                    {actionDropdownOpen === app.id && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-lg shadow-lg border border-border z-20">
                        <div className="py-2">
                          {/* View Details */}
                          <button
                            onClick={() => {
                              setShowDetails(showingDetails ? null : app.id);
                              setActionDropdownOpen(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            {showingDetails ? "Hide Details" : "View Details"}
                          </button>

                          {/* Show message and actions based on user's relationship to the application */}
                          {!isCurrentHolder(app) ? (
                            <div className="px-4 py-3 text-xs text-orange-600 bg-orange-50 border-t border-orange-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Send className="w-3 h-3" />
                                View only mode
                              </div>
                              {app.currentHolder && (
                                <div className="text-xs text-muted-foreground">
                                  Currently held by:{" "}
                                  {app.currentHolder.officerProfile?.fullName ||
                                    "Unknown Officer"}
                                  (
                                  {app.currentHolder.officerProfile
                                    ?.designation || "Unknown Position"}
                                  )
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              {/* Forward Action */}
                              {[
                                "VALIDATED",
                                "IN_PROGRESS",
                                "REOPENED",
                              ].includes(app.status) && (
                                <>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => {
                                      setSelectedApp(app);
                                      setActionForm({
                                        ...actionForm,
                                        action: "forward",
                                      });
                                      setActionDropdownOpen(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                                  >
                                    <Forward className="w-4 h-4" />
                                    Forward Application
                                  </button>
                                </>
                              )}

                              {/* Status Change Actions */}
                              {(app.status === "IN_PROGRESS" ||
                                app.status === "RESOLVED" ||
                                app.status === "CLOSED" ||
                                app.status === "REOPENED") && (
                                <>
                                  <hr className="my-1" />
                                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Change Status
                                  </div>

                                  {/* Status-specific actions */}
                                  {app.status === "IN_PROGRESS" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedApp(app);
                                          setActionForm({
                                            ...actionForm,
                                            action: "change_status",
                                            newStatus: "RESOLVED",
                                          });
                                          setActionDropdownOpen(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Mark as Resolved
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedApp(app);
                                          setActionForm({
                                            ...actionForm,
                                            action: "change_status",
                                            newStatus: "CLOSED",
                                          });
                                          setActionDropdownOpen(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Close Application
                                      </button>
                                    </>
                                  )}

                                  {app.status === "RESOLVED" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedApp(app);
                                          setActionForm({
                                            ...actionForm,
                                            action: "change_status",
                                            newStatus: "REOPENED",
                                          });
                                          setActionDropdownOpen(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors"
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                        Reopen Application
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedApp(app);
                                          setActionForm({
                                            ...actionForm,
                                            action: "change_status",
                                            newStatus: "CLOSED",
                                          });
                                          setActionDropdownOpen(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Close Application
                                      </button>
                                    </>
                                  )}

                                  {app.status === "CLOSED" && (
                                    <button
                                      onClick={() => {
                                        setSelectedApp(app);
                                        setActionForm({
                                          ...actionForm,
                                          action: "change_status",
                                          newStatus: "REOPENED",
                                        });
                                        setActionDropdownOpen(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Reopen Application
                                    </button>
                                  )}

                                  {app.status === "REOPENED" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedApp(app);
                                          setActionForm({
                                            ...actionForm,
                                            action: "change_status",
                                            newStatus: "IN_PROGRESS",
                                          });
                                          setActionDropdownOpen(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                                      >
                                        <PlayCircle className="w-4 h-4" />
                                        Start Processing
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedApp(app);
                                          setActionForm({
                                            ...actionForm,
                                            action: "change_status",
                                            newStatus: "RESOLVED",
                                          });
                                          setActionDropdownOpen(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Mark as Resolved
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedApp(app);
                                          setActionForm({
                                            ...actionForm,
                                            action: "change_status",
                                            newStatus: "CLOSED",
                                          });
                                          setActionDropdownOpen(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Close Application
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Forwarding Timeline - Show when "Forwarded by Me" filter is active */}
              {forwardingFilter === "FORWARDED_BY_ME" &&
                app.officerForwardings &&
                app.officerForwardings.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Forwarding Timeline
                    </h4>
                    <div className="space-y-3">
                      {app.officerForwardings
                        .sort(
                          (a, b) =>
                            new Date(b.forwardedAt || b.createdAt).getTime() -
                            new Date(a.forwardedAt || a.createdAt).getTime()
                        )
                        .map((forwarding, index) => {
                          const isCurrentUserAction =
                            forwarding.fromOfficerId === session?.user?.id;
                          return (
                            <div
                              key={forwarding.id}
                              className={`flex items-start gap-3 ${
                                isCurrentUserAction
                                  ? "bg-orange-50 rounded-lg p-3"
                                  : ""
                              }`}
                            >
                              {/* Timeline dot */}
                              <div
                                className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                                  forwarding.isActive
                                    ? "bg-green-500"
                                    : "bg-muted"
                                }`}
                              />
                              {/* Timeline content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <p
                                    className={`text-sm ${
                                      isCurrentUserAction
                                        ? "font-medium text-orange-800"
                                        : "text-foreground"
                                    }`}
                                  >
                                    <span className="font-medium">
                                      {forwarding.fromOfficer?.officerProfile
                                        ?.fullName || "Unknown Officer"}
                                    </span>{" "}
                                    forwarded to{" "}
                                    <span className="font-medium">
                                      {forwarding.toOfficer?.officerProfile
                                        ?.fullName || "Unknown Officer"}
                                    </span>
                                    {isCurrentUserAction && (
                                      <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                                        Your Action
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {forwarding.isActive && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                        Active
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        forwarding.forwardedAt ||
                                          forwarding.createdAt
                                      ).toLocaleDateString()}{" "}
                                      {new Date(
                                        forwarding.forwardedAt ||
                                          forwarding.createdAt
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                {/* Instructions */}
                                {forwarding.instructions && (
                                  <p className="text-sm text-muted-foreground mt-1 italic">
                                    &quot;{forwarding.instructions}&quot;
                                  </p>
                                )}
                                {/* Completion info */}
                                {forwarding.completedAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completed on{" "}
                                    {new Date(
                                      forwarding.completedAt
                                    ).toLocaleDateString()}{" "}
                                    {new Date(
                                      forwarding.completedAt
                                    ).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* Expanded Details */}
              {showingDetails && (
                <div className="border-t pt-6 mt-4 space-y-4">
                  {/* Quick Summary */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {app.documents.length}
                        </div>
                        <div className="text-muted-foreground">Documents</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {app.officerAssignments?.length || 0}
                        </div>
                        <div className="text-muted-foreground">Assignments</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {app.frontdeskForwardings?.length || 0}
                        </div>
                        <div className="text-muted-foreground">Forwardings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {app.workflow?.length || 0}
                        </div>
                        <div className="text-muted-foreground">
                          Workflow Steps
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Sections */}
                  <div className="space-y-3">
                    {/* Application Information */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() =>
                          toggleSection(app.id, "application-info")
                        }
                        className="w-full px-4 py-3 bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between text-left"
                      >
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Application Information
                        </span>
                        {isSectionExpanded(app.id, "application-info") ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {isSectionExpanded(app.id, "application-info") && (
                        <div className="p-4 bg-card border-t">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Application ID:
                                </span>
                                <span className="block font-mono text-xs mt-1">
                                  {app.id}
                                </span>
                              </div>
                              {app.rrNumber && (
                                <div>
                                  <span className="text-muted-foreground">
                                    RR Number:
                                  </span>
                                  <span className="block font-semibold mt-1">
                                    {app.rrNumber}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">
                                  Service Category:
                                </span>
                                <span className="block font-medium mt-1">
                                  {app.serviceCategory.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Category: {app.serviceCategory.name}
                                </span>
                              </div>
                              {app.subject && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Subject:
                                  </span>
                                  <span className="block font-medium text-blue-600 mt-1">
                                    {app.subject}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">
                                  Current Status:
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(
                                    app.status
                                  )}`}
                                >
                                  {app.status}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Created:
                                </span>
                                <span className="block mt-1">
                                  {formatDate(app.createdAt)}
                                </span>
                              </div>
                              {app.submittedAt && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Submitted:
                                  </span>
                                  <span className="block mt-1">
                                    {formatDate(app.submittedAt)}
                                  </span>
                                </div>
                              )}
                              {app.validatedAt && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Validated:
                                  </span>
                                  <span className="block mt-1">
                                    {formatDate(app.validatedAt)}
                                  </span>
                                </div>
                              )}
                              {app.completedAt && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Completed:
                                  </span>
                                  <span className="block mt-1">
                                    {formatDate(app.completedAt)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Complete Citizen Details */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(app.id, "citizen-details")}
                        className="w-full px-4 py-3 bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between text-left"
                      >
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Complete Citizen Details
                        </span>
                        {isSectionExpanded(app.id, "citizen-details") ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {isSectionExpanded(app.id, "citizen-details") && (
                        <div className="p-4 bg-card border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Full Name:
                              </span>
                              <span className="block font-medium mt-1">
                                {citizenData.fullName}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Phone:
                              </span>
                              <span className="block mt-1">
                                {citizenData.phone}
                              </span>
                            </div>
                            {app.citizenEmail && (
                              <div>
                                <span className="text-muted-foreground">
                                  Email:
                                </span>
                                <span className="block mt-1">
                                  {app.citizenEmail}
                                </span>
                              </div>
                            )}
                            {app.citizenGender && (
                              <div>
                                <span className="text-muted-foreground">
                                  Gender:
                                </span>
                                <span className="block mt-1">
                                  {app.citizenGender}
                                </span>
                              </div>
                            )}
                            <div className="md:col-span-2">
                              <span className="text-muted-foreground">
                                Address:
                              </span>
                              <span className="block mt-1">
                                {citizenData.address}
                              </span>
                            </div>
                            {citizenData.alternateNumber && (
                              <div>
                                <span className="text-muted-foreground">
                                  Alternate Number:
                                </span>
                                <span className="block font-mono mt-1">
                                  {citizenData.alternateNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(app.id, "documents")}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                      >
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Documents ({app.documents.length})
                        </span>
                        {isSectionExpanded(app.id, "documents") ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {isSectionExpanded(app.id, "documents") && (
                        <div className="p-4 bg-white border-t">
                          <div className="space-y-3">
                            {app.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="bg-gray-50 rounded-lg p-4 text-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <span className="text-gray-500">
                                          Document Type:
                                        </span>
                                        <span className="block font-medium mt-1">
                                          {getDocumentTypeLabel(
                                            doc.documentType
                                          )}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          File Name:
                                        </span>
                                        <span className="block mt-1">
                                          {doc.fileName}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          File Size:
                                        </span>
                                        <span className="block mt-1">
                                          {(doc.fileSize / 1024).toFixed(1)} KB
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Uploaded:
                                        </span>
                                        <span className="block mt-1">
                                          {formatDate(doc.createdAt)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-4">
                                      <div>
                                        <span className="text-gray-500">
                                          Last Updated:
                                        </span>
                                        <span className="block mt-1">
                                          {formatDate(doc.updatedAt)}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Document verification removed - not needed */}
                                  </div>
                                  <div className="ml-4 flex flex-col gap-2">
                                    <FilePreviewButton
                                      document={doc}
                                      applicationId={app.id}
                                      variant="ghost"
                                      size="icon"
                                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                                    />
                                    {/* Document verification button removed - not needed */}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Workflow History */}
                    {app.workflow && app.workflow.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSection(app.id, "workflow")}
                          className="w-full px-4 py-3 bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between text-left"
                        >
                          <span className="font-medium text-foreground flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Application Workflow History ({app.workflow.length})
                          </span>
                          {isSectionExpanded(app.id, "workflow") ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {isSectionExpanded(app.id, "workflow") && (
                          <div className="p-4 bg-card border-t">
                            <div className="space-y-3">
                              {app.workflow.map((entry, index) => (
                                <div
                                  key={index}
                                  className="bg-muted rounded-lg p-4 text-sm"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-muted-foreground">
                                            Status Change:
                                          </span>
                                          <div className="mt-1 flex items-center gap-2">
                                            {entry.fromStatus && (
                                              <span
                                                className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                                  entry.fromStatus
                                                )}`}
                                              >
                                                {entry.fromStatus}
                                              </span>
                                            )}
                                            {entry.fromStatus && (
                                              <span className="text-muted-foreground">
                                                →
                                              </span>
                                            )}
                                            <span
                                              className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                                entry.toStatus
                                              )}`}
                                            >
                                              {entry.toStatus}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Changed By:
                                          </span>
                                          <span className="block font-medium mt-1">
                                            {entry.changedBy.officerProfile
                                              ?.fullName ||
                                              entry.changedBy.citizenProfile
                                                ?.fullName ||
                                              "System"}
                                          </span>
                                          {entry.changedBy.officerProfile
                                            ?.designation && (
                                            <span className="text-xs text-muted-foreground">
                                              {
                                                entry.changedBy.officerProfile
                                                  .designation
                                              }
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <span className="text-muted-foreground">
                                          Date:
                                        </span>
                                        <span className="block mt-1">
                                          {formatDate(entry.createdAt)}
                                        </span>
                                      </div>
                                      {entry.comments && (
                                        <div className="mt-2">
                                          <span className="text-muted-foreground">
                                            Comments:
                                          </span>
                                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 mt-1 text-sm">
                                            {entry.comments}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render Table View
  const renderTableView = () => (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Application
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Citizen
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Source
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documents
              </th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredApplications.map((app) => {
              const citizenData = getCitizenData(app);
              const isForwardedByMe = isForwardedByCurrentUser(app);
              const isCurrentAppHolder = isCurrentHolder(app);
              const showingDetails = showDetails === app.id;

              return (
                <React.Fragment key={app.id}>
                  <tr className="hover:bg-muted/50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {app.subject || app.serviceCategory.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          <ServiceCategoryBadge
                            category={{
                              id: app.serviceCategory.id,
                              name: app.serviceCategory.name,
                              color: app.serviceCategory.color,
                            }}
                            clickable={true}
                            onClick={() => {
                              setSelectedApplication(app);
                              setCategoryEditModalOpen(true);
                            }}
                            className="cursor-pointer hover:scale-105 transition-transform"
                          />
                        </div>
                        {app.rrNumber && (
                          <div className="text-xs text-gray-400">
                            RR: {app.rrNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {citizenData.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {citizenData.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
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
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                        {!isCurrentAppHolder && (
                          <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            <Send className="w-3 h-3 mr-1" />
                            {isForwardedByMe ? "Forwarded" : "View Only"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.submittedAt
                        ? new Date(app.submittedAt).toLocaleDateString()
                        : "Not submitted"}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Paperclip className="w-4 h-4" />
                        {app.documents.length}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setShowDetails(
                              showDetails === app.id ? null : app.id
                            )
                          }
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Actions Dropdown - Fixed positioning */}
                        <div className="relative" data-dropdown>
                          <button
                            onClick={() =>
                              setActionDropdownOpen(
                                actionDropdownOpen === app.id ? null : app.id
                              )
                            }
                            className="text-gray-400 hover:text-gray-600 p-1 rounded"
                            title="More Actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Actions Dropdown Menu - Fixed z-index and positioning */}
                          {actionDropdownOpen === app.id && (
                            <div
                              className="fixed bg-card rounded-lg shadow-lg border border-border z-50 min-w-[200px]"
                              style={{
                                top: `${
                                  Math.min(
                                    window.innerHeight - 300,
                                    (
                                      event?.target as HTMLElement
                                    )?.getBoundingClientRect?.()?.bottom + 5
                                  ) || 0
                                }px`,
                                left: `${Math.max(
                                  10,
                                  (
                                    event?.target as HTMLElement
                                  )?.getBoundingClientRect?.()?.right - 200 || 0
                                )}px`,
                              }}
                            >
                              <div className="py-2">
                                {/* View Details */}
                                <button
                                  onClick={() => {
                                    setShowDetails(
                                      showingDetails ? null : app.id
                                    );
                                    setActionDropdownOpen(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  {showingDetails
                                    ? "Hide Details"
                                    : "View Details"}
                                </button>

                                {!isCurrentHolder(app) ? (
                                  <div className="px-4 py-3 text-xs text-orange-600 bg-orange-50 border-t border-orange-100">
                                    <div className="flex items-center gap-2">
                                      <Send className="w-3 h-3" />
                                      View only mode
                                    </div>
                                    {app.currentHolder && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        Currently held by:{" "}
                                        {app.currentHolder.officerProfile
                                          ?.fullName || "Unknown Officer"}
                                        (
                                        {app.currentHolder.officerProfile
                                          ?.designation || "Unknown Position"}
                                        )
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    {/* Forward Action */}
                                    {[
                                      "VALIDATED",
                                      "IN_PROGRESS",
                                      "REOPENED",
                                    ].includes(app.status) && (
                                      <>
                                        <hr className="my-1" />
                                        <button
                                          onClick={() => {
                                            setSelectedApp(app);
                                            setActionForm({
                                              ...actionForm,
                                              action: "forward",
                                            });
                                            setActionDropdownOpen(null);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                                        >
                                          <Forward className="w-4 h-4" />
                                          Forward Application
                                        </button>
                                      </>
                                    )}

                                    {/* Status Change Actions */}
                                    {(app.status === "IN_PROGRESS" ||
                                      app.status === "RESOLVED" ||
                                      app.status === "CLOSED" ||
                                      app.status === "REOPENED") && (
                                      <>
                                        <hr className="my-1" />
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                          Change Status
                                        </div>

                                        {/* Status-specific actions */}
                                        {app.status === "IN_PROGRESS" && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setSelectedApp(app);
                                                setActionForm({
                                                  ...actionForm,
                                                  action: "change_status",
                                                  newStatus: "RESOLVED",
                                                });
                                                setActionDropdownOpen(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                                            >
                                              <CheckCircle className="w-4 h-4" />
                                              Mark as Resolved
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedApp(app);
                                                setActionForm({
                                                  ...actionForm,
                                                  action: "change_status",
                                                  newStatus: "CLOSED",
                                                });
                                                setActionDropdownOpen(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                            >
                                              <XCircle className="w-4 h-4" />
                                              Close Application
                                            </button>
                                          </>
                                        )}

                                        {app.status === "RESOLVED" && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setSelectedApp(app);
                                                setActionForm({
                                                  ...actionForm,
                                                  action: "change_status",
                                                  newStatus: "REOPENED",
                                                });
                                                setActionDropdownOpen(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors"
                                            >
                                              <RefreshCw className="w-4 h-4" />
                                              Reopen Application
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedApp(app);
                                                setActionForm({
                                                  ...actionForm,
                                                  action: "change_status",
                                                  newStatus: "CLOSED",
                                                });
                                                setActionDropdownOpen(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                            >
                                              <XCircle className="w-4 h-4" />
                                              Close Application
                                            </button>
                                          </>
                                        )}

                                        {app.status === "CLOSED" && (
                                          <button
                                            onClick={() => {
                                              setSelectedApp(app);
                                              setActionForm({
                                                ...actionForm,
                                                action: "change_status",
                                                newStatus: "REOPENED",
                                              });
                                              setActionDropdownOpen(null);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors"
                                          >
                                            <RefreshCw className="w-4 h-4" />
                                            Reopen Application
                                          </button>
                                        )}

                                        {app.status === "REOPENED" && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setSelectedApp(app);
                                                setActionForm({
                                                  ...actionForm,
                                                  action: "change_status",
                                                  newStatus: "IN_PROGRESS",
                                                });
                                                setActionDropdownOpen(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                                            >
                                              <PlayCircle className="w-4 h-4" />
                                              Start Processing
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedApp(app);
                                                setActionForm({
                                                  ...actionForm,
                                                  action: "change_status",
                                                  newStatus: "RESOLVED",
                                                });
                                                setActionDropdownOpen(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                                            >
                                              <CheckCircle className="w-4 h-4" />
                                              Mark as Resolved
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedApp(app);
                                                setActionForm({
                                                  ...actionForm,
                                                  action: "change_status",
                                                  newStatus: "CLOSED",
                                                });
                                                setActionDropdownOpen(null);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                            >
                                              <XCircle className="w-4 h-4" />
                                              Close Application
                                            </button>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details Row for Table View - Same as Grid View */}
                  {showingDetails && (
                    <tr>
                      <td colSpan={6} className="px-0 py-0">
                        <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
                          <div className="space-y-4">
                            {/* Forwarding Timeline - Show when "Forwarded by Me" filter is active */}
                            {forwardingFilter === "FORWARDED_BY_ME" &&
                              app.officerForwardings &&
                              app.officerForwardings.length > 0 && (
                                <div className="mb-6">
                                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Forwarding Timeline
                                  </h4>
                                  <div className="space-y-3">
                                    {app.officerForwardings
                                      .sort(
                                        (a, b) =>
                                          new Date(
                                            b.forwardedAt || b.createdAt
                                          ).getTime() -
                                          new Date(
                                            a.forwardedAt || a.createdAt
                                          ).getTime()
                                      )
                                      .map((forwarding, index) => {
                                        const isCurrentUserAction =
                                          forwarding.fromOfficerId ===
                                          session?.user?.id;
                                        return (
                                          <div
                                            key={forwarding.id}
                                            className={`flex items-start gap-3 ${
                                              isCurrentUserAction
                                                ? "bg-orange-50 rounded-lg p-3"
                                                : ""
                                            }`}
                                          >
                                            {/* Timeline dot */}
                                            <div
                                              className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                                                forwarding.isActive
                                                  ? "bg-green-500"
                                                  : "bg-gray-400"
                                              }`}
                                            />
                                            {/* Timeline content */}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <p
                                                  className={`text-sm ${
                                                    isCurrentUserAction
                                                      ? "font-medium text-orange-800"
                                                      : "text-gray-800"
                                                  }`}
                                                >
                                                  <span className="font-medium">
                                                    {forwarding.fromOfficer
                                                      ?.officerProfile
                                                      ?.fullName ||
                                                      "Unknown Officer"}
                                                  </span>{" "}
                                                  forwarded to{" "}
                                                  <span className="font-medium">
                                                    {forwarding.toOfficer
                                                      ?.officerProfile
                                                      ?.fullName ||
                                                      "Unknown Officer"}
                                                  </span>
                                                  {isCurrentUserAction && (
                                                    <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                                                      Your Action
                                                    </span>
                                                  )}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                  {forwarding.isActive && (
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                                      Active
                                                    </span>
                                                  )}
                                                  <span className="text-xs text-gray-500">
                                                    {new Date(
                                                      forwarding.forwardedAt ||
                                                        forwarding.createdAt
                                                    ).toLocaleDateString()}{" "}
                                                    {new Date(
                                                      forwarding.forwardedAt ||
                                                        forwarding.createdAt
                                                    ).toLocaleTimeString()}
                                                  </span>
                                                </div>
                                              </div>
                                              {/* Instructions */}
                                              {forwarding.instructions && (
                                                <p className="text-sm text-gray-600 mt-1 italic">
                                                  &quot;
                                                  {forwarding.instructions}
                                                  &quot;
                                                </p>
                                              )}
                                              {/* Completion info */}
                                              {forwarding.completedAt && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                  Completed on{" "}
                                                  {new Date(
                                                    forwarding.completedAt
                                                  ).toLocaleDateString()}{" "}
                                                  {new Date(
                                                    forwarding.completedAt
                                                  ).toLocaleTimeString()}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}

                            {/* Quick Summary */}
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {app.documents.length}
                                  </div>
                                  <div className="text-gray-600">Documents</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-600">
                                    {app.officerAssignments?.length || 0}
                                  </div>
                                  <div className="text-gray-600">
                                    Assignments
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-orange-600">
                                    {app.frontdeskForwardings?.length || 0}
                                  </div>
                                  <div className="text-gray-600">
                                    Forwardings
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {app.workflow?.length || 0}
                                  </div>
                                  <div className="text-gray-600">
                                    Workflow Steps
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Collapsible Sections - Same as Grid View */}
                            <div className="space-y-3">
                              {/* Application Information */}
                              <div className="border rounded-lg overflow-hidden">
                                <button
                                  onClick={() =>
                                    toggleSection(app.id, "application-info")
                                  }
                                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                                >
                                  <span className="font-medium text-gray-900 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Application Information
                                  </span>
                                  {isSectionExpanded(
                                    app.id,
                                    "application-info"
                                  ) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                {isSectionExpanded(
                                  app.id,
                                  "application-info"
                                ) && (
                                  <div className="p-4 bg-white border-t">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      <div className="space-y-3 text-sm">
                                        <div>
                                          <span className="text-gray-500">
                                            Application ID:
                                          </span>
                                          <span className="block font-mono text-xs mt-1">
                                            {app.id}
                                          </span>
                                        </div>
                                        {app.rrNumber && (
                                          <div>
                                            <span className="text-gray-500">
                                              RR Number:
                                            </span>
                                            <span className="block font-semibold mt-1">
                                              {app.rrNumber}
                                            </span>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-gray-500">
                                            Service Category:
                                          </span>
                                          <span className="block font-medium mt-1">
                                            {app.serviceCategory.name}
                                          </span>
                                        </div>
                                        {app.subject && (
                                          <div>
                                            <span className="text-gray-500">
                                              Subject:
                                            </span>
                                            <span className="block font-medium text-blue-600 mt-1">
                                              {app.subject}
                                            </span>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-gray-500">
                                            Current Status:
                                          </span>
                                          <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(
                                              app.status
                                            )}`}
                                          >
                                            {app.status}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-3 text-sm">
                                        <div>
                                          <span className="text-gray-500">
                                            Created:
                                          </span>
                                          <span className="block mt-1">
                                            {formatDate(app.createdAt)}
                                          </span>
                                        </div>
                                        {app.submittedAt && (
                                          <div>
                                            <span className="text-gray-500">
                                              Submitted:
                                            </span>
                                            <span className="block mt-1">
                                              {formatDate(app.submittedAt)}
                                            </span>
                                          </div>
                                        )}
                                        {app.validatedAt && (
                                          <div>
                                            <span className="text-gray-500">
                                              Validated:
                                            </span>
                                            <span className="block mt-1">
                                              {formatDate(app.validatedAt)}
                                            </span>
                                          </div>
                                        )}
                                        {app.completedAt && (
                                          <div>
                                            <span className="text-gray-500">
                                              Completed:
                                            </span>
                                            <span className="block mt-1">
                                              {formatDate(app.completedAt)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Complete Citizen Details */}
                              <div className="border rounded-lg overflow-hidden">
                                <button
                                  onClick={() =>
                                    toggleSection(app.id, "citizen-details")
                                  }
                                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                                >
                                  <span className="font-medium text-gray-900 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Complete Citizen Details
                                  </span>
                                  {isSectionExpanded(
                                    app.id,
                                    "citizen-details"
                                  ) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                {isSectionExpanded(
                                  app.id,
                                  "citizen-details"
                                ) && (
                                  <div className="p-4 bg-white border-t">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">
                                          Full Name:
                                        </span>
                                        <span className="block font-medium mt-1">
                                          {citizenData.fullName}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Phone:
                                        </span>
                                        <span className="block mt-1">
                                          {citizenData.phone}
                                        </span>
                                      </div>
                                      {app.citizenEmail && (
                                        <div>
                                          <span className="text-gray-500">
                                            Email:
                                          </span>
                                          <span className="block mt-1">
                                            {app.citizenEmail}
                                          </span>
                                        </div>
                                      )}
                                      {app.citizenGender && (
                                        <div>
                                          <span className="text-gray-500">
                                            Gender:
                                          </span>
                                          <span className="block mt-1">
                                            {app.citizenGender}
                                          </span>
                                        </div>
                                      )}
                                      <div className="md:col-span-2">
                                        <span className="text-gray-500">
                                          Address:
                                        </span>
                                        <span className="block mt-1">
                                          {citizenData.address}
                                        </span>
                                      </div>
                                      {citizenData.alternateNumber && (
                                        <div>
                                          <span className="text-gray-500">
                                            Alternate Number:
                                          </span>
                                          <span className="block font-mono mt-1">
                                            {citizenData.alternateNumber}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Documents */}
                              <div className="border rounded-lg overflow-hidden">
                                <button
                                  onClick={() =>
                                    toggleSection(app.id, "documents")
                                  }
                                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                                >
                                  <span className="font-medium text-gray-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Documents ({app.documents.length})
                                  </span>
                                  {isSectionExpanded(app.id, "documents") ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                {isSectionExpanded(app.id, "documents") && (
                                  <div className="p-4 bg-white border-t">
                                    <div className="space-y-3">
                                      {app.documents.map((doc) => (
                                        <div
                                          key={doc.id}
                                          className="bg-gray-50 rounded-lg p-4 text-sm"
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                  <span className="text-gray-500">
                                                    Document Type:
                                                  </span>
                                                  <span className="block font-medium mt-1">
                                                    {getDocumentTypeLabel(
                                                      doc.documentType
                                                    )}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">
                                                    File Name:
                                                  </span>
                                                  <span className="block mt-1">
                                                    {doc.fileName}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">
                                                    File Size:
                                                  </span>
                                                  <span className="block mt-1">
                                                    {(
                                                      doc.fileSize / 1024
                                                    ).toFixed(1)}{" "}
                                                    KB
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">
                                                    Uploaded:
                                                  </span>
                                                  <span className="block mt-1">
                                                    {formatDate(doc.createdAt)}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="mt-3 grid grid-cols-1 gap-4">
                                                <div>
                                                  <span className="text-gray-500">
                                                    Last Updated:
                                                  </span>
                                                  <span className="block mt-1">
                                                    {formatDate(doc.updatedAt)}
                                                  </span>
                                                </div>
                                              </div>
                                              {/* Document verification removed - not needed */}
                                            </div>
                                            <div className="ml-4 flex flex-col gap-2">
                                              <FilePreviewButton
                                                document={doc}
                                                applicationId={app.id}
                                                variant="ghost"
                                                size="icon"
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                                              />
                                              {/* Document verification button removed - not needed */}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Officer Assignments */}
                              {app.officerAssignments &&
                                app.officerAssignments.length > 0 && (
                                  <div className="border rounded-lg overflow-hidden">
                                    <button
                                      onClick={() =>
                                        toggleSection(
                                          app.id,
                                          "officer-assignments"
                                        )
                                      }
                                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                                    >
                                      <span className="font-medium text-gray-900 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Officer Assignments (
                                        {app.officerAssignments.length})
                                      </span>
                                      {isSectionExpanded(
                                        app.id,
                                        "officer-assignments"
                                      ) ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </button>
                                    {isSectionExpanded(
                                      app.id,
                                      "officer-assignments"
                                    ) && (
                                      <div className="p-4 bg-white border-t">
                                        <div className="space-y-3">
                                          {app.officerAssignments.map(
                                            (assignment, index) => (
                                              <div
                                                key={index}
                                                className="bg-gray-50 rounded-lg p-4 text-sm"
                                              >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div>
                                                    <span className="text-gray-500">
                                                      Assigned To:
                                                    </span>
                                                    <span className="block font-medium mt-1">
                                                      {
                                                        assignment.assignedTo
                                                          .officerProfile
                                                          .fullName
                                                      }
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                      {
                                                        assignment.assignedTo
                                                          .officerProfile
                                                          .designation
                                                      }
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-500">
                                                      Priority:
                                                    </span>
                                                    <span
                                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getPriorityColorByNumber(
                                                        assignment.priority
                                                      )}`}
                                                    >
                                                      {getPriorityLabelByNumber(
                                                        assignment.priority
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                                {assignment.expectedCompletionDate && (
                                                  <div className="mt-2">
                                                    <span className="text-gray-500">
                                                      Expected Completion:
                                                    </span>
                                                    <span className="block mt-1">
                                                      {formatDate(
                                                        assignment.expectedCompletionDate
                                                      )}
                                                    </span>
                                                  </div>
                                                )}
                                                {assignment.instructions && (
                                                  <div className="mt-2">
                                                    <span className="text-gray-500">
                                                      Instructions:
                                                    </span>
                                                    <div className="bg-blue-50 rounded p-2 mt-1 text-sm">
                                                      {assignment.instructions}
                                                    </div>
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

                              {/* Workflow History */}
                              {app.workflow && app.workflow.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                  <button
                                    onClick={() =>
                                      toggleSection(app.id, "workflow")
                                    }
                                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                                  >
                                    <span className="font-medium text-gray-900 flex items-center gap-2">
                                      <History className="w-4 h-4" />
                                      Application Workflow History (
                                      {app.workflow.length})
                                    </span>
                                    {isSectionExpanded(app.id, "workflow") ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                  {isSectionExpanded(app.id, "workflow") && (
                                    <div className="p-4 bg-white border-t">
                                      <div className="space-y-3">
                                        {app.workflow.map((entry, index) => (
                                          <div
                                            key={index}
                                            className="bg-gray-50 rounded-lg p-4 text-sm"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div>
                                                    <span className="text-gray-500">
                                                      Status Change:
                                                    </span>
                                                    <div className="mt-1 flex items-center gap-2">
                                                      {entry.fromStatus && (
                                                        <span
                                                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                                            entry.fromStatus
                                                          )}`}
                                                        >
                                                          {entry.fromStatus}
                                                        </span>
                                                      )}
                                                      {entry.fromStatus && (
                                                        <span className="text-gray-400">
                                                          →
                                                        </span>
                                                      )}
                                                      <span
                                                        className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                                          entry.toStatus
                                                        )}`}
                                                      >
                                                        {entry.toStatus}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-500">
                                                      Changed By:
                                                    </span>
                                                    <span className="block font-medium mt-1">
                                                      {entry.changedBy
                                                        .officerProfile
                                                        ?.fullName ||
                                                        entry.changedBy
                                                          .citizenProfile
                                                          ?.fullName ||
                                                        "System"}
                                                    </span>
                                                    {entry.changedBy
                                                      .officerProfile
                                                      ?.designation && (
                                                      <span className="text-xs text-gray-400">
                                                        {
                                                          entry.changedBy
                                                            .officerProfile
                                                            .designation
                                                        }
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="mt-2">
                                                  <span className="text-gray-500">
                                                    Date:
                                                  </span>
                                                  <span className="block mt-1">
                                                    {formatDate(
                                                      entry.createdAt
                                                    )}
                                                  </span>
                                                </div>
                                                {entry.comments && (
                                                  <div className="mt-2">
                                                    <span className="text-gray-500">
                                                      Comments:
                                                    </span>
                                                    <div className="bg-blue-50 rounded p-2 mt-1 text-sm">
                                                      {entry.comments}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Officer Dashboard
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage and process applications assigned to you
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Enhanced Search and Controls */}
          <div className="space-y-4">
            {/* Search Bar and View Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by RR number, citizen name, subject, service, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Service Category Filter */}
              <div className="w-full lg:w-64">
                <select
                  value={selectedServiceCategory}
                  onChange={(e) => setSelectedServiceCategory(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="">All Service Categories</option>
                  {serviceCategories
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Application Source Filter */}
              <div className="w-full lg:w-48">
                <select
                  value={selectedApplicationSource}
                  onChange={(e) => setSelectedApplicationSource(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="">All Sources</option>
                  <option value="PUBLIC">📄 Public Portal</option>
                  <option value="GOVERNMENT">🏛️ Government</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "grid"
                      ? "bg-card text-blue-600 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "table"
                      ? "bg-card text-blue-600 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Clear Filters Button */}
              {(searchQuery ||
                selectedServiceCategory ||
                selectedApplicationSource) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-3 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Filter Badges */}
          <div className="space-y-3 mt-4">
            {/* Status and Forwarding Filters */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Status:</span>
                </div>
                {getFilterOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full border text-xs sm:text-sm font-medium transition-all ${
                      statusFilter === option.value
                        ? option.color + " shadow-sm"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {option.icon}
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="bg-white bg-opacity-70 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold">
                      {loading ? "..." : option.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Forwarding Filters */}
              {getForwardingFilterOptions().length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">Forwarding:</span>
                  </div>
                  {getForwardingFilterOptions().map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setForwardingFilter(option.value)}
                      className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full border text-xs sm:text-sm font-medium transition-all ${
                        forwardingFilter === option.value
                          ? option.color + " shadow-sm"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {option.icon}
                      <span className="hidden sm:inline">{option.label}</span>
                      <span className="bg-white bg-opacity-70 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold">
                        {loading ? "..." : option.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(searchTerm ||
              statusFilter !== "IN_PROGRESS" ||
              forwardingFilter === "FORWARDED_BY_ME") && (
              <div className="flex justify-start">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Applications Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="bg-card rounded-lg shadow-sm p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm p-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No applications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === "grid" ? renderGridView() : renderTableView()}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedApp && actionForm.action && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                    {actionForm.action === "forward" && (
                      <Forward className="w-5 h-5 text-purple-600" />
                    )}
                    {actionForm.action === "approve" && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {actionForm.action === "reject" && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    {actionForm.action === "forward"
                      ? "Forward Application"
                      : actionForm.action === "approve"
                      ? "Approve Application"
                      : "Close Application"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Application:{" "}
                    {selectedApp.subject || selectedApp.serviceCategory.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    setIsSelfForward(false);
                    setActionForm({
                      action: "",
                      newStatus: "",
                      message: "",
                      forwardToOfficerId: "",
                      // priority: 1, // Always HIGH priority - removed from UI
                      instructions: "",
                    });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-4 sm:px-6 py-6">
              <div className="space-y-6">
                {/* Application Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Applicant:</span>
                      <span className="block font-medium mt-1">
                        {selectedApp.citizenName || selectedApp.citizenPhone}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(
                          selectedApp.status
                        )}`}
                      >
                        {selectedApp.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Service:</span>
                      <span className="block font-medium mt-1">
                        {selectedApp.serviceCategory.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Documents:</span>
                      <span className="block mt-1">
                        {selectedApp.documents.length} files
                      </span>
                    </div>
                  </div>
                </div>

                {/* Forward Officer Selection */}
                {actionForm.action === "forward" && (
                  <>
                    {/* Self-Forward Checkbox */}
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <input
                        type="checkbox"
                        id="selfForward"
                        checked={isSelfForward}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsSelfForward(checked);
                          setActionForm({
                            ...actionForm,
                            forwardToOfficerId: checked
                              ? session?.user?.id || ""
                              : "",
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="selfForward" className="flex-1 text-sm">
                        <span className="font-medium text-blue-800">
                          Self-forward
                        </span>
                        <p className="text-blue-700 text-xs mt-1">
                          Forward this application to myself with instructions
                          for future action
                        </p>
                      </label>
                    </div>

                    {!isSelfForward && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Select Officer to Forward To
                        </label>
                        <select
                          value={actionForm.forwardToOfficerId}
                          onChange={(e) =>
                            setActionForm({
                              ...actionForm,
                              forwardToOfficerId: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-purple-500 focus:ring-purple-500 text-sm"
                        >
                          <option value="">Choose an officer...</option>
                          {availableOfficers.map((officer) => (
                            <option key={officer.id} value={officer.id}>
                              {officer.fullName} ({officer.designation})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isSelfForward && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800">
                          <User className="w-4 h-4" />
                          <span className="font-medium">
                            Self-forwarding to:
                          </span>
                        </div>
                        <p className="text-green-700 text-sm mt-1">
                          {session?.user?.email} (You)
                        </p>
                      </div>
                    )}

                    {/* Priority is always HIGH - removed from UI */}
                  </>
                )}

                {/* Comments/Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {actionForm.action === "forward"
                      ? isSelfForward
                        ? "Instructions for Self-Forward (Required)"
                        : "Instructions for Officer"
                      : actionForm.action === "change_status"
                      ? "Message (Required)"
                      : "Comments"}
                    {actionForm.action === "forward" && isSelfForward && (
                      <span className="text-red-500 text-sm ml-1">*</span>
                    )}
                  </label>
                  <textarea
                    value={
                      actionForm.action === "forward"
                        ? actionForm.instructions
                        : actionForm.message
                    }
                    onChange={(e) =>
                      setActionForm({
                        ...actionForm,
                        [actionForm.action === "forward"
                          ? "instructions"
                          : "message"]: e.target.value,
                      })
                    }
                    placeholder={
                      actionForm.action === "forward"
                        ? isSelfForward
                          ? "Provide detailed instructions for yourself (required for self-forward)..."
                          : "Provide detailed instructions for the assigned officer..."
                        : actionForm.action === "change_status"
                        ? "Provide a reason for this status change..."
                        : "Add your comments regarding this action..."
                    }
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Status Change Section */}
                {actionForm.action === "change_status" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Status Change Confirmation
                    </label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {actionForm.newStatus === "RESOLVED" && (
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          )}
                          {actionForm.newStatus === "CLOSED" && (
                            <XCircle className="w-8 h-8 text-red-600" />
                          )}
                          {actionForm.newStatus === "REOPENED" && (
                            <RefreshCw className="w-8 h-8 text-purple-600" />
                          )}
                          {actionForm.newStatus === "IN_PROGRESS" && (
                            <PlayCircle className="w-8 h-8 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {getStatusActionConfig(actionForm.newStatus).label}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {
                              getStatusActionConfig(actionForm.newStatus)
                                .description
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => {
                  setSelectedApp(null);
                  setIsSelfForward(false);
                  setActionForm({
                    action: "",
                    newStatus: "",
                    message: "",
                    forwardToOfficerId: "",
                    // priority: 1, // Always HIGH priority - removed from UI
                    instructions: "",
                  });
                }}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionForm.action === "change_status") {
                    handleStatusChange(
                      selectedApp.id,
                      actionForm.newStatus,
                      actionForm.message
                    );
                  } else if (actionForm.action === "forward") {
                    handleForwardApplication(
                      selectedApp.id,
                      actionForm.forwardToOfficerId,
                      actionForm.instructions
                      // priority: 1 - Always HIGH priority - removed from UI
                    );
                  }
                }}
                disabled={
                  processing ||
                  (actionForm.action === "change_status" &&
                    (!actionForm.newStatus || !actionForm.message)) ||
                  (actionForm.action === "forward" &&
                    (!actionForm.forwardToOfficerId ||
                      (isSelfForward && !actionForm.instructions) ||
                      (!isSelfForward && !actionForm.instructions)))
                }
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-white font-medium disabled:opacity-50 transition-colors ${
                  actionForm.action === "change_status"
                    ? getStatusActionConfig(actionForm.newStatus).bgColor
                    : actionForm.action === "forward"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionForm.action === "change_status" &&
                      React.createElement(
                        getStatusActionConfig(actionForm.newStatus).icon,
                        { className: "w-4 h-4" }
                      )}
                    {actionForm.action === "forward" && (
                      <Forward className="w-4 h-4" />
                    )}
                    {actionForm.action === "change_status"
                      ? getStatusActionConfig(actionForm.newStatus).label
                      : actionForm.action === "forward"
                      ? "Forward Application"
                      : "Submit Action"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Category Edit Modal */}
      <ServiceCategoryEditModal
        isOpen={categoryEditModalOpen}
        onCloseAction={() => setCategoryEditModalOpen(false)}
        applicationId={selectedApplication?.id || ""}
        currentCategory={selectedApplication?.serviceCategory}
        onCategoryUpdatedAction={() => {
          // Refresh the applications list
          fetchApplications();
          setCategoryEditModalOpen(false);
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
      />

      {/* Notification Dialog */}
      <NotificationDialog
        isOpen={notificationDialog.isOpen}
        onClose={() =>
          setNotificationDialog({ ...notificationDialog, isOpen: false })
        }
        title={notificationDialog.title}
        message={notificationDialog.message}
        type={notificationDialog.type}
      />
    </div>
  );
};

export default OfficerDashboard;
