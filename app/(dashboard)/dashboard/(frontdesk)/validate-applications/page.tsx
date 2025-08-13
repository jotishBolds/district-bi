"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  Calendar,
  AlertCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  CheckSquare,
  X,
  Download,
  Phone,
  MapPin,
  ZoomIn,
  ZoomOut,
  PlayCircle,
  Send,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { NotificationDialog } from "@/components/ui/notification-dialog";
import { toast } from "sonner";

// Types based on your Prisma schema
interface CitizenProfile {
  fullName: string;
  phone: string;
  address: string;
  aadhaarNumber?: string;
}

interface ServiceCategory {
  name: string;
  slaDays: number;
}

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  isVerified: boolean;
  createdAt: string;
}

interface FrontdeskAssignment {
  id: string;
  officerId: string | null;
  officer: {
    id: string;
    fullName: string;
    designation: string;
    department: string;
  } | null;
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
}

interface Officer {
  id: string;
  role: string;
  fullName: string;
  designation: string;
  department?: string;
  officeLocation?: string;
}

interface Application {
  id: string;
  rrNumber?: string;
  subject?: string;
  status: string;
  submittedAt: string;
  createdAt: string;
  serviceCategory: ServiceCategory;
  citizen?: {
    citizenProfile: CitizenProfile;
  };
  documents: Document[];
  officerAssignments: OfficerAssignment[];
  // Direct citizen fields for new backend shape
  citizenName?: string;
  citizenPhone?: string;
  citizenEmail?: string;
  citizenAddress?: string;
  citizenGender?: string;
  citizenAadhaar?: string;
}

const VALID_STATUSES = [
  "PENDING",
  "VALIDATED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
];

const FrontDeskDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Add state to track frontdesk assignments and type
  const [frontdeskAssignments, setFrontdeskAssignments] = useState<
    FrontdeskAssignment[]
  >([]);
  const [isGeneralFrontdesk, setIsGeneralFrontdesk] = useState(false);
  // Add document preview modal states
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  const [actionForm, setActionForm] = useState({
    action: "",
    comments: "",
    rejectionReason: "",
    forwardToOfficerId: "",
    priority: 2,
    instructions: "",
  });

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Fetch all relevant statuses
      const params = new URLSearchParams({
        limit: "50",
      });
      const response = await fetch(`/api/applications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      const data = await response.json();

      // Only show applications with valid statuses
      const filteredByStatus = (data.applications || []).filter(
        (app: Application) => VALID_STATUSES.includes(app.status)
      );

      setApplications(filteredByStatus);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available officers for forwarding
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

  // Fetch frontdesk assignments to determine type
  const fetchFrontdeskAssignments = async () => {
    try {
      const response = await fetch("/api/frontdesk/assignments");
      if (!response.ok)
        throw new Error("Failed to fetch frontdesk assignments");
      const data = await response.json();

      if (data && Array.isArray(data.assignments)) {
        setFrontdeskAssignments(data.assignments);

        // Determine if this is a general frontdesk user
        const hasSpecificAssignments = data.assignments.some(
          (assignment: FrontdeskAssignment) => assignment.officerId !== null
        );
        setIsGeneralFrontdesk(!hasSpecificAssignments);
      } else {
        setFrontdeskAssignments([]);
        setIsGeneralFrontdesk(true); // Default to general if no assignments
      }
    } catch (error) {
      console.error("Error fetching frontdesk assignments:", error);
      setFrontdeskAssignments([]);
      setIsGeneralFrontdesk(true); // Default to general on error
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchAvailableOfficers();
    fetchFrontdeskAssignments();
  }, []);

  // Filter applications based on search term
  const filteredApplications =
    applications?.filter(
      (app) =>
        (app?.citizen?.citizenProfile?.fullName || app.citizenName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        app?.serviceCategory?.name
          ?.toLowerCase()
          ?.includes(searchTerm.toLowerCase()) ||
        app?.subject?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        app?.rrNumber?.toLowerCase()?.includes(searchTerm.toLowerCase())
    ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-orange-100 text-orange-800";
      case "VALIDATED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "RESOLVED":
        return "bg-emerald-100 text-emerald-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      case "REOPENED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  // Handle application actions
  const handleApplicationAction = async (
    applicationId: string,
    action: string
  ) => {
    try {
      setProcessing(true);

      // Find target officer before validation for better error message
      const availableOfficersForApp = getAvailableOfficersForApp(selectedApp);
      const targetOfficer = availableOfficersForApp.find(
        (o) => o.id === actionForm.forwardToOfficerId
      );

      // Validate required fields for forwarding
      if (action === "forward") {
        if (!actionForm.forwardToOfficerId) {
          throw new Error("Please select an officer to forward to");
        }
        if (!actionForm.instructions) {
          throw new Error("Please provide instructions for the officer");
        }
        if (!targetOfficer?.fullName) {
          throw new Error("Selected officer details not found");
        }
      }

      // Build the payload based on the action
      const payload = {
        action: "forward", // Use standard forward action
        forwardToOfficerId: actionForm.forwardToOfficerId,
        priority: actionForm.priority,
        instructions: actionForm.instructions,
        targetOfficerName: targetOfficer?.fullName,
        // Include current assigned officer info for notification
        currentAssignedOfficer:
          selectedApp?.officerAssignments?.[0]?.assignedTo?.id || null,
        // Add a flag to indicate this is from frontdesk
        forwardedBy: "frontdesk",
      };

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Action failed");
      }

      const result = await response.json();

      // Show success message
      const successMessage = `Application forwarded successfully${
        targetOfficer?.fullName ? ` to ${targetOfficer.fullName}` : ""
      }`;
      toast.success(successMessage);

      // Reset form and refresh data
      setActionForm({
        action: "",
        comments: "",
        rejectionReason: "",
        forwardToOfficerId: "",
        priority: 2,
        instructions: "",
      });

      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      console.error("Action error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Action failed";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-800";
      case 2:
        return "bg-yellow-100 text-yellow-800";
      case 3:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: number) => {
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

  // Get available officers excluding already assigned ones
  const getAvailableOfficersForApp = (app: Application | null) => {
    if (!app) return availableOfficers;

    // Get currently assigned officer IDs
    const assignedOfficerIds =
      app.officerAssignments?.map((assignment) => assignment.assignedTo.id) ||
      [];

    // Filter out already assigned officers
    return availableOfficers.filter(
      (officer) => !assignedOfficerIds.includes(officer.id)
    );
  };

  // Handle document preview
  const handlePreviewDocument = async (document: Document) => {
    setPreviewDocument(document);
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      // Check if file exists and is accessible
      const fileUrl = getDocumentUrl(document.filePath);

      // For images and PDFs, we'll check if they load properly
      if (isImageFile(document.fileName) || isPdfFile(document.fileName)) {
        // Let the browser handle the loading, we'll catch errors in the components
        setTimeout(() => setPreviewLoading(false), 500);
      } else {
        setPreviewLoading(false);
      }
    } catch (error) {
      console.error("Document preview error:", error);
      setPreviewError(
        `Failed to load document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setPreviewLoading(false);
    }
  };

  // Helper function to construct proper document URL
  const getDocumentUrl = (filePath: string): string => {
    if (!filePath) {
      return "";
    }

    // If it's already a full URL, return as-is
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }

    // If it starts with /, remove it to make it relative
    const cleanPath = filePath.startsWith("/")
      ? filePath.substring(1)
      : filePath;

    // Use the API endpoint to serve files
    const apiUrl = `/api/${cleanPath}`;

    return apiUrl;
  };

  // Helper function to safely format file size
  const formatFileSize = (fileSize: number | undefined | null): string => {
    if (!fileSize || isNaN(fileSize)) {
      return "Unknown size";
    }

    if (fileSize < 1024) {
      return `${fileSize} B`;
    } else if (fileSize < 1024 * 1024) {
      return `${(fileSize / 1024).toFixed(1)} KB`;
    } else {
      return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Helper function to safely format date
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) {
      return "Unknown date";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  // Helper function to safely format date with time
  const formatDateTime = (dateString: string | undefined | null): string => {
    if (!dateString) {
      return "Unknown date";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  const closePreview = () => {
    setPreviewDocument(null);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  // Handle keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (previewDocument && event.key === "Escape") {
        closePreview();
      }
    };

    if (previewDocument) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [previewDocument]);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "📄";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "🖼️";
      case "doc":
      case "docx":
        return "📝";
      default:
        return "📎";
    }
  };

  const isImageFile = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(
      extension || ""
    );
  };

  const isPdfFile = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension === "pdf";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isGeneralFrontdesk
                  ? "General Front Desk Dashboard"
                  : "Front Desk Dashboard"}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {isGeneralFrontdesk
                  ? "General frontdesk - cannot forward applications"
                  : "Forward applications to appropriate officers"}
              </p>
            </div>
            <div className="flex gap-2">
              {!isGeneralFrontdesk && (
                <button
                  onClick={() => (window.location.href = "/dashboard/queue")}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto"
                >
                  <PlayCircle className="w-4 h-4" />
                  View Queue
                </button>
              )}
              <button
                onClick={() => {
                  fetchApplications();
                  fetchAvailableOfficers();
                  fetchFrontdeskAssignments();
                }}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by citizen name, service, subject, or RR number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            {/* Status filter dropdown removed */}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Applications List */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Applications ({filteredApplications.length})
                </h2>
              </div>

              <div className="divide-y divide-gray-200 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Loading applications...</p>
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">No applications found</p>
                  </div>
                ) : (
                  filteredApplications.map((app) => (
                    <div
                      key={app.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedApp?.id === app.id
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : ""
                      }`}
                      onClick={() => setSelectedApp(app)}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {/* Show citizen name from direct field if available */}
                            {app.citizen?.citizenProfile?.fullName ||
                              app.citizenName}
                          </h3>
                          {app.subject && (
                            <p className="text-sm text-blue-600 truncate font-medium">
                              {app.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 truncate">
                            {app.serviceCategory.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              app.status
                            )}`}
                          >
                            {app.status.replace("_", " ")}
                          </span>
                          {app.rrNumber && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {app.rrNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            {new Date(app.submittedAt).toLocaleDateString()}
                          </span>
                          <span className="sm:hidden">
                            {new Date(app.submittedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {app?.documents?.length || 0} docs
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            Estimated Time: {app?.serviceCategory?.slaDays || 0}{" "}
                            days
                          </span>
                          <span className="sm:hidden">
                            {app?.serviceCategory?.slaDays || 0}d
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className="col-span-1">
            {selectedApp ? (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Application Details
                  </h2>
                </div>

                <div className="p-4 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {/* Citizen Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Citizen Information
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="break-words">
                        <strong>Name:</strong>{" "}
                        {selectedApp.citizen?.citizenProfile?.fullName ||
                          selectedApp.citizenName}
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span className="break-all">
                          {selectedApp.citizen?.citizenProfile?.phone ||
                            selectedApp.citizenPhone}
                        </span>
                      </p>
                      <p className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="text-xs break-words">
                          {selectedApp.citizen?.citizenProfile?.address ||
                            selectedApp.citizenAddress}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Service Details
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="break-words">
                        <strong>Service:</strong>{" "}
                        {selectedApp.serviceCategory.name}
                      </p>
                      {selectedApp.subject && (
                        <p className="break-words">
                          <strong>Subject:</strong>{" "}
                          <span className="text-blue-600 font-medium">
                            {selectedApp.subject}
                          </span>
                        </p>
                      )}
                      <p>
                        <strong>Estimated Time:</strong>{" "}
                        {selectedApp.serviceCategory.slaDays} days
                      </p>
                      <p className="break-words">
                        <strong>Submitted:</strong>{" "}
                        <span className="hidden sm:inline">
                          {new Date(selectedApp.submittedAt).toLocaleString()}
                        </span>
                        <span className="sm:hidden">
                          {new Date(
                            selectedApp.submittedAt
                          ).toLocaleDateString()}
                        </span>
                      </p>
                      {selectedApp?.officerAssignments?.length > 0 && (
                        <p className="break-words">
                          <strong>Currently Assigned Officer:</strong>{" "}
                          {
                            selectedApp?.officerAssignments[0]?.assignedTo
                              ?.officerProfile?.fullName
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Documents (
                      {selectedApp?.documents?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {selectedApp?.documents?.length === 0 ? (
                        <div className="flex items-center justify-center p-4 sm:p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <div className="text-center">
                            <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-xs sm:text-sm text-gray-600">
                              No documents uploaded
                            </p>
                          </div>
                        </div>
                      ) : (
                        selectedApp?.documents?.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <span className="text-lg sm:text-2xl">
                                  {getFileIcon(doc.fileName)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                    {getDocumentTypeLabel(doc.documentType)}
                                  </p>
                                </div>
                                <p
                                  className="text-xs text-gray-600 truncate"
                                  title={doc.fileName}
                                >
                                  {doc.fileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(doc.fileSize)} •{" "}
                                  <span className="hidden sm:inline">
                                    {formatDate(doc.createdAt)}
                                  </span>
                                  <span className="sm:hidden">
                                    {new Date(doc.createdAt).toLocaleDateString(
                                      "en-US",
                                      { month: "short", day: "numeric" }
                                    )}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Preview Document"
                                onClick={() => handlePreviewDocument(doc)}
                              >
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Download Document"
                                onClick={() => {
                                  const fileUrl = getDocumentUrl(doc.filePath);
                                  window.open(fileUrl, "_blank");
                                }}
                              >
                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Action Form - Show for applications that need forwarding */}
                  {["IN_PROGRESS", "VALIDATED"].includes(
                    selectedApp.status
                  ) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <PlayCircle className="w-4 h-4" />
                        Take Action
                      </h4>

                      <div className="space-y-3">
                        {/* Action Selection */}
                        <div>
                          <select
                            value={actionForm.action}
                            onChange={(e) =>
                              setActionForm({
                                ...actionForm,
                                action: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select Action</option>
                            <option value="forward">Forward to Officer</option>
                          </select>
                        </div>

                        {/* Forward Officer Selection */}
                        {actionForm.action === "forward" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Forward to Officer
                            </label>
                            {selectedApp?.officerAssignments?.length > 0 && (
                              <p className="text-xs text-gray-500 mb-2">
                                Note: Currently assigned officers are excluded
                                from the list
                              </p>
                            )}
                            <select
                              value={actionForm.forwardToOfficerId}
                              onChange={(e) =>
                                setActionForm({
                                  ...actionForm,
                                  forwardToOfficerId: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="">Select Officer</option>
                              {getAvailableOfficersForApp(selectedApp).map(
                                (officer) => (
                                  <option key={officer.id} value={officer.id}>
                                    {officer.fullName} - {officer.designation}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        )}

                        {/* Priority Selection for Forward */}
                        {actionForm.action === "forward" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={actionForm.priority}
                              onChange={(e) =>
                                setActionForm({
                                  ...actionForm,
                                  priority: parseInt(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value={1}>High</option>
                              <option value={2}>Medium</option>
                              <option value={3}>Low</option>
                            </select>
                          </div>
                        )}

                        {/* Comments/Instructions */}
                        <div>
                          <textarea
                            value={actionForm.instructions}
                            onChange={(e) =>
                              setActionForm({
                                ...actionForm,
                                instructions: e.target.value,
                              })
                            }
                            placeholder="Instructions for the assigned officer"
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        {/* Action Button */}
                        <div className="pt-2">
                          {actionForm.action === "forward" ? (
                            <button
                              onClick={() =>
                                handleApplicationAction(
                                  selectedApp.id,
                                  "forward"
                                )
                              }
                              disabled={processing}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              {processing
                                ? "Forwarding..."
                                : "Forward Application"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8 text-center">
                <FileText className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Select an Application
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Click on an application from the list to view details and
                  forward to appropriate officers.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking outside
            if (e.target === e.currentTarget) {
              closePreview();
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {getFileIcon(previewDocument.fileName)}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getDocumentTypeLabel(previewDocument.documentType)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {previewDocument.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(previewDocument.fileSize)} • Uploaded:{" "}
                    {formatDate(previewDocument.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const fileUrl = getDocumentUrl(previewDocument.filePath);
                    window.open(fileUrl, "_blank");
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-4 overflow-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center h-96">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading preview...</span>
                </div>
              ) : previewError ? (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Preview Error
                  </h4>
                  <p className="text-gray-600 mb-4">{previewError}</p>
                  <button
                    onClick={() => {
                      const fileUrl = getDocumentUrl(previewDocument.filePath);
                      window.open(fileUrl, "_blank");
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Try Opening in New Tab
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Document Preview */}
                  {isImageFile(previewDocument.fileName) ? (
                    <div className="flex justify-center">
                      {getDocumentUrl(previewDocument.filePath) ? (
                        <img
                          src={getDocumentUrl(previewDocument.filePath)}
                          alt={previewDocument.fileName}
                          className="max-w-full max-h-[600px] object-contain rounded border"
                          onError={(e) => {
                            setPreviewError(
                              `Failed to load image: ${getDocumentUrl(
                                previewDocument.filePath
                              )}`
                            );
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-center bg-gray-50 rounded">
                          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            No File Path
                          </h4>
                          <p className="text-gray-600">
                            The file path is missing for this document.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : isPdfFile(previewDocument.fileName) ? (
                    <div className="w-full h-[600px] border rounded">
                      {getDocumentUrl(previewDocument.filePath) ? (
                        <iframe
                          src={`${getDocumentUrl(
                            previewDocument.filePath
                          )}#toolbar=1`}
                          className="w-full h-full rounded"
                          title={previewDocument.fileName}
                          onError={(e) => {
                            setPreviewError(
                              `Failed to load PDF: ${getDocumentUrl(
                                previewDocument.filePath
                              )}`
                            );
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-center bg-gray-50 rounded">
                          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            No File Path
                          </h4>
                          <p className="text-gray-600">
                            The file path is missing for this document.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-center bg-gray-50 rounded">
                      <span className="text-6xl mb-4">
                        {getFileIcon(previewDocument.fileName)}
                      </span>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Preview not available
                      </h4>
                      <p className="text-gray-600 mb-4">
                        This file type cannot be previewed in the browser.
                      </p>
                      <button
                        onClick={() => {
                          const fileUrl = getDocumentUrl(
                            previewDocument.filePath
                          );
                          window.open(fileUrl, "_blank");
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Open in New Tab
                      </button>
                    </div>
                  )}

                  {/* Document Info */}
                  <div className="bg-gray-50 rounded p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Document Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="ml-2 text-gray-600">
                          {getDocumentTypeLabel(previewDocument.documentType)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          File Size:
                        </span>
                        <span className="ml-2 text-gray-600">
                          {formatFileSize(previewDocument.fileSize)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Uploaded:
                        </span>
                        <span className="ml-2 text-gray-600">
                          {formatDateTime(previewDocument.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Verification:
                        </span>
                        <span
                          className={`ml-2 px-2 py-1 rounded text-xs ${
                            previewDocument.isVerified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {previewDocument.isVerified ? "Verified" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

export default FrontDeskDashboard;
