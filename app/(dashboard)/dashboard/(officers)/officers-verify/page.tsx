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
  ArrowRight,
  MessageSquare,
  Forward,
  PlayCircle,
  UserCheck,
  FileCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

// Types
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

interface OfficerProfile {
  fullName: string;
  designation: string;
}

interface OfficerAssignment {
  assignedTo: {
    id: string;
    officerProfile: OfficerProfile;
  };
  priority: number;
  instructions?: string;
  expectedCompletionDate?: string;
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

interface Application {
  id: string;
  rrNumber?: string;
  status: string;
  submittedAt: string;
  validatedAt?: string;
  completedAt?: string;
  createdAt: string;
  serviceCategory: ServiceCategory;
  citizen: {
    citizenProfile: CitizenProfile;
  };
  documents: Document[];
  officerAssignments: OfficerAssignment[];
  validation?: ApplicationValidation;
  workflow: WorkflowEntry[];
}

interface Officer {
  id: string;
  role: string;
  fullName: string; // Directly include fullName here since your API returns it at the root level
  designation: string;
  department?: string;
  officeLocation?: string;
}

const OfficerDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("VALIDATED");
  const [showWorkflowHistory, setShowWorkflowHistory] = useState(false);

  const [actionForm, setActionForm] = useState({
    action: "",
    comments: "",
    rejectionReason: "",
    forwardToOfficerId: "",
    priority: 2,
    instructions: "",
  });

  // Fetch applications assigned to current officer
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        limit: "50",
        assignedToMe: "true", // Filter for applications assigned to current officer
      });

      const response = await fetch(`/api/applications?${params}`);
      if (!response.ok) throw new Error("Failed to fetch applications");

      const data = await response.json();
      setApplications(data.applications || []);
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

  useEffect(() => {
    fetchApplications();
    fetchAvailableOfficers();
  }, [statusFilter]);

  // Handle application actions
  const handleApplicationAction = async (
    applicationId: string,
    action: string
  ) => {
    try {
      setProcessing(true);

      // Find target officer before validation for better error message
      let targetOfficer = null;
      if (action === "forward") {
        targetOfficer = availableOfficers.find(
          (o) => o.id === actionForm.forwardToOfficerId
        );
      }

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
        action,
        ...(action === "forward" && {
          forwardToOfficerId: actionForm.forwardToOfficerId,
          priority: actionForm.priority,
          instructions: actionForm.instructions,
          targetOfficerName: targetOfficer?.fullName, // Include officer name in payload
        }),
        ...(action === "reject" && {
          rejectionReason: actionForm.rejectionReason,
        }),
        ...((action === "process" || action === "approve") && {
          comments: actionForm.comments,
        }),
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
      const result = await response.json(); // Show success message
      let successMessage = "";
      switch (action) {
        case "process":
          successMessage = "Application processing started successfully";
          break;
        case "approve":
          successMessage = "Application approved successfully";
          break;
        case "reject":
          successMessage = "Application rejected successfully";
          break;
        case "forward":
          // Safely access target officer name
          const targetOfficer = availableOfficers.find(
            (o) => o.id === actionForm.forwardToOfficerId
          );
          successMessage = `Application forwarded successfully${
            targetOfficer?.fullName ? ` to ${targetOfficer.fullName}` : ""
          }`;

        default:
          successMessage = "Action completed successfully";
      }
      alert(successMessage);

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
      alert(
        `Error: ${error instanceof Error ? error.message : "Action failed"}`
      );
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications =
    applications?.filter(
      (app) =>
        app?.citizen?.citizenProfile?.fullName
          ?.toLowerCase()
          ?.includes(searchTerm.toLowerCase()) ||
        app?.serviceCategory?.name
          ?.toLowerCase()
          ?.includes(searchTerm.toLowerCase()) ||
        app?.rrNumber?.toLowerCase()?.includes(searchTerm.toLowerCase())
    ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const calculateDaysRemaining = (expectedDate?: string, slaDays?: number) => {
    if (!expectedDate && !slaDays) return null;

    const today = new Date();
    let targetDate: Date;

    if (expectedDate) {
      targetDate = new Date(expectedDate);
    } else if (slaDays) {
      targetDate = new Date();
      targetDate.setDate(today.getDate() + slaDays);
    } else {
      return null;
    }

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Officer Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage and process applications assigned to you
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="VALIDATED">Validated</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-600">No applications found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm divide-y">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedApp?.id === app.id ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {app.citizen.citizenProfile.fullName}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              app.status
                            )}`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {app.serviceCategory.name}
                        </p>
                        {app.rrNumber && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            RR Number: {app.rrNumber}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </div>
                        {app.officerAssignments?.length > 0 &&
                          app.officerAssignments[0] && (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPriorityColor(
                                app.officerAssignments[0].priority
                              )}`}
                            >
                              {getPriorityLabel(
                                app.officerAssignments[0].priority
                              )}{" "}
                              Priority
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application Details */}
          <div>
            {selectedApp ? (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Application Details
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedApp.serviceCategory.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedApp(null)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {/* Applicant Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Applicant Details
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Name:</span>
                          <span className="ml-2 text-gray-900">
                            {selectedApp.citizen.citizenProfile.fullName}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2 text-gray-900">
                            {selectedApp.citizen.citizenProfile.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Application Status */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Application Status
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              selectedApp.status
                            )}`}
                          >
                            {selectedApp.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">RR Number:</span>
                          <span className="ml-2 text-gray-900">
                            {selectedApp.rrNumber || "Not assigned"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Submitted:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date(
                              selectedApp.submittedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">SLA Days:</span>
                          <span className="ml-2 text-gray-900">
                            {selectedApp.serviceCategory.slaDays} days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Documents
                    </h4>
                    <div className="space-y-2">
                      {selectedApp.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-gray-50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-gray-900">
                                {getDocumentTypeLabel(doc.documentType)}
                              </span>
                              <p className="text-gray-500 text-xs mt-0.5">
                                {doc.fileName}
                              </p>
                            </div>
                            <div>
                              {doc.isVerified ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Form */}
                  {["VALIDATED", "IN_PROGRESS"].includes(
                    selectedApp.status
                  ) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
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
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select Action</option>
                            {selectedApp.status === "VALIDATED" && (
                              <option value="process">Start Processing</option>
                            )}
                            {selectedApp.status === "IN_PROGRESS" && (
                              <>
                                <option value="approve">Approve</option>
                                <option value="reject">Reject</option>
                              </>
                            )}
                            <option value="forward">
                              Forward to Another Officer
                            </option>
                          </select>
                        </div>

                        {/* Forward Officer Selection */}
                        {actionForm.action === "forward" && (
                          <div>
                            <select
                              value={actionForm.forwardToOfficerId}
                              onChange={(e) =>
                                setActionForm({
                                  ...actionForm,
                                  forwardToOfficerId: e.target.value,
                                })
                              }
                              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="">Select Officer</option>
                              {availableOfficers.map((officer) => (
                                <option key={officer.id} value={officer.id}>
                                  {officer.fullName} ({officer.designation})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Priority Selection for Forward */}
                        {actionForm.action === "forward" && (
                          <div>
                            <select
                              value={actionForm.priority}
                              onChange={(e) =>
                                setActionForm({
                                  ...actionForm,
                                  priority: parseInt(e.target.value),
                                })
                              }
                              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value={1}>High Priority</option>
                              <option value={2}>Medium Priority</option>
                              <option value={3}>Low Priority</option>
                            </select>
                          </div>
                        )}

                        {/* Comments/Instructions */}
                        <div>
                          <textarea
                            value={
                              actionForm.action === "forward"
                                ? actionForm.instructions
                                : actionForm.comments
                            }
                            onChange={(e) =>
                              setActionForm({
                                ...actionForm,
                                [actionForm.action === "forward"
                                  ? "instructions"
                                  : "comments"]: e.target.value,
                              })
                            }
                            placeholder={
                              actionForm.action === "forward"
                                ? "Instructions for the assigned officer"
                                : "Add your comments"
                            }
                            rows={3}
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        {/* Rejection Reason */}
                        {actionForm.action === "reject" && (
                          <div>
                            <textarea
                              value={actionForm.rejectionReason}
                              onChange={(e) =>
                                setActionForm({
                                  ...actionForm,
                                  rejectionReason: e.target.value,
                                })
                              }
                              placeholder="Provide reason for rejection"
                              rows={3}
                              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="pt-2">
                          {actionForm.action === "reject" ? (
                            <button
                              onClick={() =>
                                handleApplicationAction(
                                  selectedApp.id,
                                  "reject"
                                )
                              }
                              disabled={
                                processing || !actionForm.rejectionReason
                              }
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              {processing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                "Reject Application"
                              )}
                            </button>
                          ) : actionForm.action === "process" ? (
                            <button
                              onClick={() =>
                                handleApplicationAction(
                                  selectedApp.id,
                                  "process"
                                )
                              }
                              disabled={processing || !actionForm.comments}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {processing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                "Start Processing"
                              )}
                            </button>
                          ) : actionForm.action === "approve" ? (
                            <button
                              onClick={() =>
                                handleApplicationAction(
                                  selectedApp.id,
                                  "approve"
                                )
                              }
                              disabled={processing || !actionForm.comments}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {processing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                "Approve Application"
                              )}
                            </button>
                          ) : actionForm.action === "forward" ? (
                            <button
                              onClick={() =>
                                handleApplicationAction(
                                  selectedApp.id,
                                  "forward"
                                )
                              }
                              disabled={
                                processing ||
                                !actionForm.forwardToOfficerId ||
                                !actionForm.instructions
                              }
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {processing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                "Forward Application"
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-600">
                  Select an application to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
