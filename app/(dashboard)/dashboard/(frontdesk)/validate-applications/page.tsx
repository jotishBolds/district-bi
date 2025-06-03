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
} from "lucide-react";

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

interface Application {
  id: string;
  rrNumber?: string;
  status: string;
  submittedAt: string;
  createdAt: string;
  serviceCategory: ServiceCategory;
  citizen: {
    citizenProfile: CitizenProfile;
  };
  documents: Document[];
  officerAssignments: OfficerAssignment[];
}

const FrontDeskDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [validationForm, setValidationForm] = useState({
    isDocumentsComplete: false,
    isEligibilityVerified: false,
    validationNotes: "",
    shouldReject: false,
    rejectionReason: "",
  });

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        limit: "50",
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

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  // Handle application validation
  const handleValidation = async (applicationId: string) => {
    try {
      setProcessing(true);

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "validate",
          ...validationForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Validation failed");
      }

      const result = await response.json();

      // Show success message
      alert(
        validationForm.shouldReject
          ? "Application rejected successfully"
          : `Application validated successfully. RR Number: ${result.rrNumber}`
      );

      // Reset form and refresh data
      setValidationForm({
        isDocumentsComplete: false,
        isEligibilityVerified: false,
        validationNotes: "",
        shouldReject: false,
        rejectionReason: "",
      });

      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      console.error("Validation error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Validation failed"}`
      );
    } finally {
      setProcessing(false);
    }
  };
  // Filter applications based on search term
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
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "VALIDATED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Front Desk Dashboard
              </h1>
              <p className="text-gray-600">
                Validate applications and generate RR numbers
              </p>
            </div>
            <button
              onClick={fetchApplications}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by citizen name, service, or RR number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PENDING">Pending Validation</option>
                <option value="VALIDATED">Validated</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Applications ({filteredApplications.length})
                </h2>
              </div>

              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
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
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {app.citizen.citizenProfile.fullName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {app.serviceCategory.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
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

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />{" "}
                          {app?.documents?.length || 0} docs
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          SLA: {app?.serviceCategory?.slaDays || 0} days
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div>
            {selectedApp ? (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Application Details
                  </h2>
                </div>

                <div className="p-4 space-y-4">
                  {/* Citizen Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Citizen Information
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Name:</strong>{" "}
                        {selectedApp.citizen.citizenProfile.fullName}
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedApp.citizen.citizenProfile.phone}
                      </p>
                      <p className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5" />
                        <span className="text-xs">
                          {selectedApp.citizen.citizenProfile.address}
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
                      <p>
                        <strong>Service:</strong>{" "}
                        {selectedApp.serviceCategory.name}
                      </p>
                      <p>
                        <strong>SLA:</strong>{" "}
                        {selectedApp.serviceCategory.slaDays} days
                      </p>
                      <p>
                        <strong>Submitted:</strong>{" "}
                        {new Date(selectedApp.submittedAt).toLocaleString()}
                      </p>{" "}
                      {selectedApp?.officerAssignments?.length > 0 && (
                        <p>
                          <strong>Preferred Officer:</strong>{" "}
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
                      {selectedApp?.documents?.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {getDocumentTypeLabel(doc.documentType)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {doc.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(doc.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="View Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Validation Form - Only for PENDING applications */}
                  {selectedApp.status === "PENDING" && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Validation
                      </h3>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={validationForm.isDocumentsComplete}
                            onChange={(e) =>
                              setValidationForm((prev) => ({
                                ...prev,
                                isDocumentsComplete: e.target.checked,
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">
                            Documents are complete
                          </span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={validationForm.isEligibilityVerified}
                            onChange={(e) =>
                              setValidationForm((prev) => ({
                                ...prev,
                                isEligibilityVerified: e.target.checked,
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">Eligibility verified</span>
                        </label>

                        <textarea
                          placeholder="Validation notes..."
                          value={validationForm.validationNotes}
                          onChange={(e) =>
                            setValidationForm((prev) => ({
                              ...prev,
                              validationNotes: e.target.value,
                            }))
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={validationForm.shouldReject}
                            onChange={(e) =>
                              setValidationForm((prev) => ({
                                ...prev,
                                shouldReject: e.target.checked,
                              }))
                            }
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm text-red-600">
                            Reject this application
                          </span>
                        </label>

                        {validationForm.shouldReject && (
                          <textarea
                            placeholder="Rejection reason (required)..."
                            value={validationForm.rejectionReason}
                            onChange={(e) =>
                              setValidationForm((prev) => ({
                                ...prev,
                                rejectionReason: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows={2}
                            required
                          />
                        )}

                        <div className="flex gap-2 pt-2">
                          {validationForm.shouldReject ? (
                            <button
                              onClick={() => handleValidation(selectedApp.id)}
                              disabled={
                                processing ||
                                !validationForm.rejectionReason.trim()
                              }
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              {processing
                                ? "Rejecting..."
                                : "Reject Application"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleValidation(selectedApp.id)}
                              disabled={
                                processing ||
                                (!validationForm.isDocumentsComplete &&
                                  !validationForm.isEligibilityVerified)
                              }
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {processing
                                ? "Validating..."
                                : "Validate & Generate RR"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select an Application
                </h3>
                <p className="text-gray-600">
                  Click on an application from the list to view details and
                  perform validation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrontDeskDashboard;
