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
  Send,
  ArrowRight,
  Users,
  Download,
  Grid3X3,
  List,
  X,
  Paperclip,
  Activity,
  TrendingUp,
  Timer,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";

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
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [showDocumentModal, setShowDocumentModal] = useState<{
    show: boolean;
    documents: Document[];
    applicationId: string;
  }>({ show: false, documents: [], applicationId: "" });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  // Fetch applications for DC
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter === "ALL" ? "" : statusFilter,
        search: searchTerm,
      });
      const response = await fetch(`/api/dc/applications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      const data = await response.json();
      setApplications(data.applications || []);
      setStats(
        data.stats || {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleRefresh = () => {
    fetchApplications();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedServiceCategory("");
    setStatusFilter("ALL");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200 shadow-sm";
      case "VALIDATED":
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200 shadow-sm";
      case "IN_PROGRESS":
        return "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border-purple-200 shadow-sm";
      case "RESOLVED":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 shadow-sm";
      case "CLOSED":
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200 shadow-sm";
      case "REOPENED":
        return "bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-orange-200 shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200 shadow-sm";
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200 shadow-sm";
      case 2:
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200 shadow-sm";
      case 3:
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200 shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200 shadow-sm";
    }
  };

  const getLevelColor = (level: number | null) => {
    if (level === null)
      return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800";
    switch (level) {
      case 0:
        return "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800";
      case 1:
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800";
      case 2:
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800";
      case 3:
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800";
      case 4:
        return "bg-gradient-to-r from-orange-100 to-red-100 text-orange-800";
      case 5:
        return "bg-gradient-to-r from-red-100 to-pink-100 text-red-800";
      case 6:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800";
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800";
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

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      app.citizenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.rrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.serviceCategory.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedServiceCategory ||
      app.serviceCategory.name === selectedServiceCategory;
    return matchesStatus && matchesSearch && matchesCategory;
  });

  const openDocumentModal = (documents: Document[], applicationId: string) => {
    setShowDocumentModal({ show: true, documents, applicationId });
  };

  const closeDocumentModal = () => {
    setShowDocumentModal({ show: false, documents: [], applicationId: "" });
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const response = await fetch(`/api/${doc.filePath}`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  // Grid View Component
  const renderGridView = () => (
    <div className="grid grid-cols-1 gap-4 sm:gap-6">
      {filteredApplications.map((app) => {
        const showingDetails = showDetails === app.id;
        const slaProgress = calculateSlaProgress(app);
        return (
          <div
            key={app.id}
            className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            {/* Colorful Header Strip */}
            <div
              className={`h-2 ${
                app.status === "PENDING"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-400"
                  : app.status === "VALIDATED"
                  ? "bg-gradient-to-r from-blue-400 to-cyan-400"
                  : app.status === "IN_PROGRESS"
                  ? "bg-gradient-to-r from-purple-400 to-indigo-400"
                  : app.status === "RESOLVED"
                  ? "bg-gradient-to-r from-green-400 to-emerald-400"
                  : app.status === "CLOSED"
                  ? "bg-gradient-to-r from-gray-400 to-slate-400"
                  : "bg-gradient-to-r from-orange-400 to-red-400"
              }`}
            ></div>

            {/* Main Card Content */}
            <div className="p-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-xl">
                        {app.rrNumber}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${getStatusColor(
                        app.status
                      )}`}
                    >
                      {app.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-lg inline-block">
                      {app.serviceCategory.name}
                    </p>
                    <p className="text-base font-medium text-gray-800">
                      <User className="w-4 h-4 inline mr-2 text-blue-600" />
                      {app.citizenName}
                    </p>
                    {app.subject && (
                      <p className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                        <strong>Subject:</strong> {app.subject}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-3 sm:ml-4">
                  <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Submitted: {formatDate(app.submittedAt)}
                  </div>
                  {app.currentHolder && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg border border-indigo-200">
                      <User className="w-4 h-4 text-indigo-600" />
                      <div className="text-sm">
                        <span className="font-semibold text-gray-800">
                          {app.currentHolder.officerProfile.fullName}
                        </span>
                        <span
                          className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getLevelColor(
                            app.currentHolder.level
                          )}`}
                        >
                          {getLevelText(app.currentHolder.level)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openDocumentModal(app.documents, app.id)}
                      className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span className="font-semibold">
                        {app.documents.length}
                      </span>{" "}
                      docs
                    </button>
                    <button
                      onClick={() =>
                        setShowDetails(showingDetails ? null : app.id)
                      }
                      className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-gray-200 hover:border-blue-300"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* SLA Progress */}
              {slaProgress && (
                <div className="mb-6 bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-600" />
                      Time Progress
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold">
                      {slaProgress.elapsed}/{slaProgress.total} days
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div
                      className={`h-3 rounded-full shadow-sm ${
                        slaProgress.isOverdue
                          ? "bg-gradient-to-r from-red-500 to-pink-500"
                          : "bg-gradient-to-r from-blue-500 to-cyan-500"
                      }`}
                      style={{
                        width: `${slaProgress.percentage}%`,
                      }}
                    ></div>
                  </div>
                  {slaProgress.isOverdue && (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                        Overdue
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Expanded Details */}
              {showingDetails && (
                <div className="border-t-2 border-gray-100 pt-6 mt-4 space-y-6">
                  {/* Application Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-xl text-white shadow-lg">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">
                          {app.workflow?.length || 0}
                        </div>
                        <div className="text-blue-100 text-sm font-medium">
                          Status Changes
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-4 rounded-xl text-white shadow-lg">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">
                          {app.officerAssignments?.length || 0}
                        </div>
                        <div className="text-green-100 text-sm font-medium">
                          Assignments
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-xl text-white shadow-lg">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">
                          {(app.officerForwardings?.length || 0) +
                            (app.frontdeskForwardings?.length || 0)}
                        </div>
                        <div className="text-orange-100 text-sm font-medium">
                          Forwardings
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-4 rounded-xl text-white shadow-lg">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">
                          {app.documents?.length || 0}
                        </div>
                        <div className="text-purple-100 text-sm font-medium">
                          Documents
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Sections */}
                  <div className="space-y-4">
                    {/* Application Information */}
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() =>
                          toggleSection(app.id, "application-info")
                        }
                        className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 text-left text-sm font-semibold text-gray-800 hover:from-gray-100 hover:to-blue-100 flex items-center justify-between transition-all duration-200"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          Application Information
                        </span>
                        {isSectionExpanded(app.id, "application-info") ? (
                          <ChevronUp className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                      {isSectionExpanded(app.id, "application-info") && (
                        <div className="p-6 border-t-2 border-gray-100 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-gray-600 font-medium mb-1">
                                Citizen Name
                              </p>
                              <p className="font-bold text-gray-900">
                                {app.citizenName}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-gray-600 font-medium mb-1">
                                Phone
                              </p>
                              <p className="font-bold text-gray-900">
                                {app.citizenPhone}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-gray-600 font-medium mb-1">
                                Email
                              </p>
                              <p className="font-bold text-gray-900">
                                {app.citizenEmail || "N/A"}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-gray-600 font-medium mb-1">
                                Service Category
                              </p>
                              <p className="font-bold text-gray-900">
                                {app.serviceCategory.name}
                              </p>
                            </div>
                            <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                              <p className="text-gray-600 font-medium mb-1">
                                Address
                              </p>
                              <p className="font-bold text-gray-900">
                                {app.citizenAddress}
                              </p>
                            </div>
                            {app.subject && (
                              <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-blue-700 font-medium mb-1">
                                  Subject
                                </p>
                                <p className="font-bold text-blue-900">
                                  {app.subject}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status History */}
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => toggleSection(app.id, "status-history")}
                        className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-green-50 text-left text-sm font-semibold text-gray-800 hover:from-gray-100 hover:to-green-100 flex items-center justify-between transition-all duration-200"
                      >
                        <span className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-600" />
                          Status History ({app.workflow?.length || 0})
                        </span>
                        {isSectionExpanded(app.id, "status-history") ? (
                          <ChevronUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-green-600" />
                        )}
                      </button>
                      {isSectionExpanded(app.id, "status-history") && (
                        <div className="p-6 border-t-2 border-gray-100 bg-white">
                          {app.workflow && app.workflow.length > 0 ? (
                            <div className="space-y-4">
                              {app.workflow.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-4 relative bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200"
                                >
                                  {index < app.workflow.length - 1 && (
                                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-purple-400"></div>
                                  )}
                                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mt-1 shadow-md border-2 border-white"></div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(
                                          entry.toStatus
                                        )}`}
                                      >
                                        {entry.fromStatus
                                          ? `${entry.fromStatus} → ${entry.toStatus}`
                                          : entry.toStatus}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <strong>Changed by:</strong>{" "}
                                        <span className="font-semibold text-blue-800">
                                          {entry.changedBy.officerProfile
                                            ?.fullName || entry.changedBy.email}
                                        </span>
                                        {entry.changedBy.officerProfile && (
                                          <span
                                            className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getLevelColor(
                                              entry.changedBy.level
                                            )}`}
                                          >
                                            {getLevelText(
                                              entry.changedBy.level
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">
                                        {formatDateTime(entry.createdAt)}
                                      </div>
                                      {entry.comments && (
                                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                                          <strong className="text-yellow-800">
                                            Comments:
                                          </strong>{" "}
                                          <span className="text-yellow-900">
                                            {entry.comments}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-500 font-medium">
                                No status changes recorded
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Officer Assignments */}
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => toggleSection(app.id, "assignments")}
                        className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-purple-50 text-left text-sm font-semibold text-gray-800 hover:from-gray-100 hover:to-purple-100 flex items-center justify-between transition-all duration-200"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          Officer Assignments (
                          {app.officerAssignments?.length || 0})
                        </span>
                        {isSectionExpanded(app.id, "assignments") ? (
                          <ChevronUp className="w-5 h-5 text-purple-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-purple-600" />
                        )}
                      </button>
                      {isSectionExpanded(app.id, "assignments") && (
                        <div className="p-6 border-t-2 border-gray-100 bg-white">
                          {app.officerAssignments &&
                          app.officerAssignments.length > 0 ? (
                            <div className="space-y-4">
                              {app.officerAssignments.map(
                                (assignment, index) => (
                                  <div
                                    key={index}
                                    className="p-4 border-2 border-purple-200 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="bg-white p-3 rounded-lg border border-purple-200 flex-1 mr-4">
                                        <div className="font-bold text-gray-900 text-lg">
                                          {
                                            assignment.assignedTo.officerProfile
                                              .fullName
                                          }
                                        </div>
                                        <div className="text-sm text-gray-600 font-medium">
                                          {
                                            assignment.assignedTo.officerProfile
                                              .designation
                                          }
                                        </div>
                                        <span
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-2 ${getLevelColor(
                                            assignment.assignedTo.level
                                          )}`}
                                        >
                                          {getLevelText(
                                            assignment.assignedTo.level
                                          )}
                                        </span>
                                      </div>
                                      <span
                                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border-2 ${getPriorityColor(
                                          assignment.priority
                                        )}`}
                                      >
                                        Priority {assignment.priority}
                                      </span>
                                    </div>
                                    {assignment.assignedBy && (
                                      <div className="text-sm text-gray-600 mb-3 bg-white p-2 rounded border border-gray-200">
                                        <strong>Assigned by:</strong>{" "}
                                        {assignment.assignedBy.officerProfile
                                          ?.fullName ||
                                          assignment.assignedBy.email}
                                      </div>
                                    )}
                                    {assignment.instructions && (
                                      <div className="text-sm bg-white p-3 rounded-lg border-2 border-blue-200">
                                        <strong className="text-blue-800">
                                          Instructions:
                                        </strong>{" "}
                                        <span className="text-blue-900">
                                          {assignment.instructions}
                                        </span>
                                      </div>
                                    )}
                                    {assignment.expectedCompletionDate && (
                                      <div className="text-sm text-gray-600 mt-3 bg-yellow-50 p-2 rounded border border-yellow-200">
                                        <Clock className="w-4 h-4 inline mr-1 text-yellow-600" />
                                        <strong>Expected completion:</strong>{" "}
                                        {formatDate(
                                          assignment.expectedCompletionDate
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-500 font-medium">
                                No officer assignments
                              </p>
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
                      <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <button
                          onClick={() =>
                            toggleSection(app.id, "forwarding-history")
                          }
                          className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-orange-50 text-left text-sm font-semibold text-gray-800 hover:from-gray-100 hover:to-orange-100 flex items-center justify-between transition-all duration-200"
                        >
                          <span className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-orange-600" />
                            Forwarding History (
                            {(app.officerForwardings?.length || 0) +
                              (app.frontdeskForwardings?.length || 0)}
                            )
                          </span>
                          {isSectionExpanded(app.id, "forwarding-history") ? (
                            <ChevronUp className="w-5 h-5 text-orange-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-orange-600" />
                          )}
                        </button>
                        {isSectionExpanded(app.id, "forwarding-history") && (
                          <div className="p-6 border-t-2 border-gray-100 bg-white">
                            <div className="space-y-4">
                              {/* Officer Forwardings */}
                              {app.officerForwardings &&
                                app.officerForwardings.map(
                                  (forwarding, index) => (
                                    <div
                                      key={`officer-${index}`}
                                      className="p-4 border-2 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm"
                                    >
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                                          <ArrowRight className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm font-bold text-blue-800">
                                          Officer Forwarding
                                        </span>
                                        {forwarding.isActive && (
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-sm">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                                          <p className="text-blue-700 font-semibold mb-1">
                                            From:
                                          </p>
                                          <p className="font-bold text-gray-900">
                                            {forwarding.fromOfficer
                                              .officerProfile?.fullName ||
                                              "Unknown"}
                                          </p>
                                          <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getLevelColor(
                                              forwarding.fromOfficer.level
                                            )}`}
                                          >
                                            {getLevelText(
                                              forwarding.fromOfficer.level
                                            )}
                                          </span>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                                          <p className="text-blue-700 font-semibold mb-1">
                                            To:
                                          </p>
                                          <p className="font-bold text-gray-900">
                                            {forwarding.toOfficer.officerProfile
                                              ?.fullName || "Unknown"}
                                          </p>
                                          <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getLevelColor(
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
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 ${getPriorityColor(
                                            forwarding.priority
                                          )}`}
                                        >
                                          Priority {forwarding.priority}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                          {formatDateTime(forwarding.createdAt)}
                                        </span>
                                      </div>
                                      {forwarding.instructions && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border-2 border-blue-200 text-sm">
                                          <strong className="text-blue-800">
                                            Instructions:
                                          </strong>{" "}
                                          <span className="text-blue-900">
                                            {forwarding.instructions}
                                          </span>
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
                                      className="p-4 border-2 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm"
                                    >
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                                          <Send className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm font-bold text-green-800">
                                          Frontdesk Forwarding
                                        </span>
                                        {forwarding.isActive && (
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-sm">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="bg-white p-3 rounded-lg border border-green-200">
                                          <p className="text-green-700 font-semibold mb-1">
                                            From:
                                          </p>
                                          <p className="font-bold text-gray-900">
                                            {forwarding.fromFrontdesk.email}
                                          </p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-green-200">
                                          <p className="text-green-700 font-semibold mb-1">
                                            To:
                                          </p>
                                          <p className="font-bold text-gray-900">
                                            {forwarding.toFrontdesk.email}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-3 bg-gray-100 px-2 py-1 rounded">
                                        {formatDateTime(forwarding.createdAt)}
                                      </div>
                                      {forwarding.instructions && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border-2 border-green-200 text-sm">
                                          <strong className="text-green-800">
                                            Instructions:
                                          </strong>{" "}
                                          <span className="text-green-900">
                                            {forwarding.instructions}
                                          </span>
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
          </div>
        );
      })}
    </div>
  );

  // Table View Component
  const renderTableView = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Application
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Citizen
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Current Holder
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Documents
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredApplications.map((app) => {
              const slaProgress = calculateSlaProgress(app);
              const showingDetails = showDetails === app.id;
              return (
                <React.Fragment key={app.id}>
                  <tr
                    className={
                      showingDetails
                        ? "bg-gradient-to-r from-blue-50 to-cyan-50"
                        : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200"
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {app.rrNumber}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium mt-1 bg-gray-100 px-2 py-1 rounded">
                          {app.serviceCategory.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {app.citizenName}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          {app.citizenPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border-2 ${getStatusColor(
                          app.status
                        )}`}
                      >
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.currentHolder ? (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg border border-indigo-200">
                          <div className="text-sm font-bold text-gray-900">
                            {app.currentHolder.officerProfile.fullName}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            {app.currentHolder.officerProfile.designation}
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getLevelColor(
                              app.currentHolder.level
                            )}`}
                          >
                            {getLevelText(app.currentHolder.level)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-2 rounded-lg">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {slaProgress ? (
                        <div className="w-full">
                          <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                            <span className="bg-white px-2 py-1 rounded">
                              {slaProgress.elapsed}/{slaProgress.total} days
                            </span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {slaProgress.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                            <div
                              className={`h-3 rounded-full shadow-sm ${
                                slaProgress.isOverdue
                                  ? "bg-gradient-to-r from-red-500 to-pink-500"
                                  : "bg-gradient-to-r from-blue-500 to-cyan-500"
                              }`}
                              style={{ width: `${slaProgress.percentage}%` }}
                            ></div>
                          </div>
                          {slaProgress.isOverdue && (
                            <div className="text-xs font-bold text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                              Overdue
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openDocumentModal(app.documents, app.id)}
                        className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
                      >
                        <Paperclip className="w-4 h-4" />
                        {app.documents.length}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() =>
                          setShowDetails(showingDetails ? null : app.id)
                        }
                        className="text-blue-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 p-3 rounded-lg transition-all duration-200 border-2 border-blue-200 hover:border-transparent shadow-sm hover:shadow-md"
                        title="Toggle Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                  {/* Expanded Details Row */}
                  {showingDetails && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 bg-gradient-to-r from-gray-50 to-blue-50"
                      >
                        <div className="space-y-6">
                          {/* Application Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-lg">
                              <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Citizen Information
                              </h4>
                              <div className="space-y-3 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-600 font-medium">
                                    Name:
                                  </span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    {app.citizenName}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-600 font-medium">
                                    Phone:
                                  </span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    {app.citizenPhone}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-600 font-medium">
                                    Email:
                                  </span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    {app.citizenEmail || "N/A"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-600 font-medium">
                                    Address:
                                  </span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    {app.citizenAddress}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border-2 border-green-200 shadow-lg">
                              <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-green-600" />
                                Application Timeline
                              </h4>
                              <div className="space-y-3 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-600 font-medium">
                                    Submitted:
                                  </span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    {formatDateTime(app.submittedAt)}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-600 font-medium">
                                    Validated:
                                  </span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    {formatDateTime(app.validatedAt)}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <span className="text-gray-600 font-medium">
                                    Completed:
                                  </span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    {formatDateTime(app.completedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border-2 border-purple-200 shadow-lg">
                              <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                Statistics
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="text-center p-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg shadow-md">
                                  <div className="font-bold text-xl">
                                    {app.workflow?.length || 0}
                                  </div>
                                  <div className="text-blue-100 text-xs font-medium">
                                    Status Changes
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-lg shadow-md">
                                  <div className="font-bold text-xl">
                                    {app.officerAssignments?.length || 0}
                                  </div>
                                  <div className="text-green-100 text-xs font-medium">
                                    Assignments
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-lg shadow-md">
                                  <div className="font-bold text-xl">
                                    {(app.officerForwardings?.length || 0) +
                                      (app.frontdeskForwardings?.length || 0)}
                                  </div>
                                  <div className="text-orange-100 text-xs font-medium">
                                    Forwards
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-lg shadow-md">
                                  <div className="font-bold text-xl">
                                    {app.documents?.length || 0}
                                  </div>
                                  <div className="text-purple-100 text-xs font-medium">
                                    Documents
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Latest Status Changes */}
                          {app.workflow && app.workflow.length > 0 && (
                            <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-lg">
                              <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                Recent Status Changes
                              </h4>
                              <div className="space-y-3">
                                {app.workflow
                                  .slice(-3)
                                  .reverse()
                                  .map((entry, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(
                                            entry.toStatus
                                          )}`}
                                        >
                                          {entry.toStatus}
                                        </span>
                                        <span className="text-sm text-gray-700 font-medium">
                                          by{" "}
                                          {entry.changedBy.officerProfile
                                            ?.fullName || entry.changedBy.email}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full font-medium">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                District Collector - Application Progress
              </h1>
              <p className="text-sm text-gray-600 mt-2 font-medium">
                Monitor all application progress and detailed status tracking
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-sm font-semibold mb-1">
                  Total Applications
                </div>
                <div className="text-4xl font-bold">{stats.total}</div>
              </div>
              <FileText className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-amber-100 text-sm font-semibold mb-1">
                  Pending Validation
                </div>
                <div className="text-4xl font-bold">{stats.pending}</div>
              </div>
              <Clock className="w-8 h-8 text-amber-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-purple-100 text-sm font-semibold mb-1">
                  In Progress
                </div>
                <div className="text-4xl font-bold">{stats.inProgress}</div>
              </div>
              <Activity className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-100 text-sm font-semibold mb-1">
                  Completed
                </div>
                <div className="text-4xl font-bold">{stats.completed}</div>
              </div>
              <CheckSquare className="w-8 h-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-red-100 text-sm font-semibold mb-1">
                  Overdue
                </div>
                <div className="text-4xl font-bold">{stats.overdue}</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by RR number, citizen name, or service category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchApplications();
                  }}
                  className="pl-12 w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="VALIDATED">Validated</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
              </select>
              <select
                value={selectedServiceCategory}
                onChange={(e) => setSelectedServiceCategory(e.target.value)}
                className="rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 font-medium"
              >
                <option value="">All Service Categories</option>
                {Array.from(
                  new Set(
                    applications
                      ?.map((app) => app.serviceCategory?.name)
                      .filter(Boolean)
                  )
                )
                  .sort()
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
              <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    viewMode === "table"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
              </div>
              {(searchTerm ||
                selectedServiceCategory ||
                statusFilter !== "ALL") && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 text-sm font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-gray-600 font-medium text-lg">
              Loading applications...
            </p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium text-lg">
              No applications found
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === "grid" ? renderGridView() : renderTableView()}
          </div>
        )}
      </div>

      {/* Document Modal */}
      {showDocumentModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b-2 border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Paperclip className="w-6 h-6 text-blue-600" />
                Application Documents ({showDocumentModal.documents.length})
              </h3>
              <button
                onClick={closeDocumentModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              {showDocumentModal.documents.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {showDocumentModal.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg">
                              {doc.fileName}
                            </h4>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 ${
                                doc.isVerified
                                  ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200"
                                  : "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200"
                              }`}
                            >
                              {doc.isVerified ? "Verified" : "Pending"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <span className="font-semibold text-gray-800">
                                Type:
                              </span>{" "}
                              <span className="font-medium">
                                {getDocumentTypeLabel(doc.documentType)}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <span className="font-semibold text-gray-800">
                                Size:
                              </span>{" "}
                              <span className="font-medium">
                                {(doc.fileSize / 1024).toFixed(1)} KB
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <span className="font-semibold text-gray-800">
                                Uploaded:
                              </span>{" "}
                              <span className="font-medium">
                                {formatDateTime(doc.createdAt)}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <span className="font-semibold text-gray-800">
                                Uploaded by:
                              </span>{" "}
                              <span className="font-medium">
                                {doc.uploadedBy?.citizenProfile?.fullName ||
                                  doc.uploadedBy?.email ||
                                  "Unknown"}
                              </span>
                            </div>
                          </div>
                          {doc.verifiedBy && (
                            <div className="mt-4 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                              <span className="font-semibold text-green-800">
                                Verified by:
                              </span>{" "}
                              <span className="font-medium text-green-900">
                                {doc.verifiedBy.officerProfile?.fullName ||
                                  "Unknown Officer"}{" "}
                                ({doc.verifiedBy.officerProfile?.designation})
                              </span>
                            </div>
                          )}
                          {doc.verificationNotes && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                              <span className="font-semibold text-blue-800">
                                Notes:
                              </span>{" "}
                              <span className="text-blue-900 font-medium">
                                {doc.verificationNotes}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="ml-6 flex items-center gap-2 px-6 py-3 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 border-2 border-transparent rounded-xl hover:shadow-lg transition-all duration-200 font-semibold"
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
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-6" />
                  <p className="text-gray-600 font-medium text-lg">
                    No documents available for this application
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
