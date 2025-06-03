"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Types
interface Application {
  id: string;
  rrNumber: string;
  status: string;
  serviceCategory: {
    name: string;
    slaDays: number;
  };
  citizen: {
    citizenProfile: {
      fullName: string;
      phone: string;
    };
  };
  submittedAt: string;
  validatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  currentHolder: {
    officerProfile: {
      fullName: string;
      designation: string;
    };
  } | null;
  workflow: {
    toStatus: string;
    createdAt: string;
  }[];
  officerAssignments: {
    assignedTo: {
      officerProfile: {
        fullName: string;
      };
    };
    priority: number;
    expectedCompletionDate: string | null;
  }[];
}

const DCDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "VALIDATED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-purple-100 text-purple-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                District Collector Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor all application progress and SLA compliance
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Total Applications</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Pending Validation</div>
            <div className="text-2xl font-semibold text-yellow-600">
              {stats.pending}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">In Progress</div>
            <div className="text-2xl font-semibold text-purple-600">
              {stats.inProgress}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-semibold text-green-600">
              {stats.completed}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Overdue</div>
            <div className="text-2xl font-semibold text-red-600">
              {stats.overdue}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Applications List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="VALIDATED">Validated</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div className="w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchApplications();
                    }}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-600">No applications found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm divide-y">
                {applications.map((app) => (
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
                            {app.rrNumber}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              app.status
                            )}`}
                          >
                            {app.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {app.serviceCategory.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Applicant: {app.citizen.citizenProfile.fullName}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          Submitted: {formatDate(app.submittedAt)}
                        </div>
                        {app.officerAssignments?.[0] && (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPriorityColor(
                              app.officerAssignments[0].priority
                            )}`}
                          >
                            Priority: {app.officerAssignments[0].priority}
                          </span>
                        )}
                      </div>
                    </div>
                    {app.validatedAt && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>SLA Progress</span>
                          <span>
                            {calculateSlaProgress(app)?.elapsed || 0}/
                            {app.serviceCategory.slaDays} days
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              calculateSlaProgress(app)?.isOverdue
                                ? "bg-red-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${
                                calculateSlaProgress(app)?.percentage || 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
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
                        RR Number: {selectedApp.rrNumber}
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
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Service Category</p>
                      <p className="font-medium">
                        {selectedApp.serviceCategory.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">SLA Days</p>
                      <p className="font-medium">
                        {selectedApp.serviceCategory.slaDays} days
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            selectedApp.status
                          )}`}
                        >
                          {selectedApp.status.replace("_", " ")}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current Holder</p>
                      <p className="font-medium">
                        {selectedApp.currentHolder
                          ? selectedApp.currentHolder.officerProfile.fullName
                          : "Unassigned"}
                      </p>
                    </div>
                  </div>

                  {/* Applicant Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Applicant Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Full Name</p>
                        <p className="font-medium">
                          {selectedApp.citizen.citizenProfile.fullName}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="font-medium">
                          {selectedApp.citizen.citizenProfile.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Application Timeline
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <p className="text-gray-500">Submitted</p>
                        <p className="font-medium">
                          {formatDate(selectedApp.submittedAt)}
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-gray-500">Validated</p>
                        <p className="font-medium">
                          {formatDate(selectedApp.validatedAt)}
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-gray-500">Completed</p>
                        <p className="font-medium">
                          {formatDate(selectedApp.completedAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SLA Progress */}
                  {selectedApp.validatedAt && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        SLA Progress
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <p className="text-gray-500">Days Elapsed</p>
                          <p className="font-medium">
                            {calculateSlaProgress(selectedApp)?.elapsed || 0}{" "}
                            days
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-gray-500">Total SLA Days</p>
                          <p className="font-medium">
                            {selectedApp.serviceCategory.slaDays} days
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium">
                            {calculateSlaProgress(selectedApp)?.isOverdue ? (
                              <span className="text-red-600">Overdue</span>
                            ) : (
                              <span className="text-green-600">On Track</span>
                            )}
                          </p>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                calculateSlaProgress(selectedApp)?.isOverdue
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                              }`}
                              style={{
                                width: `${
                                  calculateSlaProgress(selectedApp)
                                    ?.percentage || 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assignment History */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Assignment History
                    </h4>
                    <div className="space-y-3 text-sm">
                      {selectedApp.officerAssignments.map((assignment, idx) => (
                        <div key={idx} className="border-b pb-2 last:border-0">
                          <div className="flex justify-between">
                            <p className="font-medium">
                              {assignment.assignedTo.officerProfile.fullName}
                            </p>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                assignment.priority
                              )}`}
                            >
                              Priority: {assignment.priority}
                            </span>
                          </div>
                          {assignment.expectedCompletionDate && (
                            <div className="flex justify-between mt-1">
                              <p className="text-gray-500">Due Date</p>
                              <p>
                                {formatDate(assignment.expectedCompletionDate)}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status History */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Status History
                    </h4>
                    <div className="space-y-3 text-sm">
                      {selectedApp.workflow.map((entry, idx) => (
                        <div key={idx} className="border-b pb-2 last:border-0">
                          <div className="flex justify-between">
                            <p className="font-medium">
                              {entry.toStatus.replace("_", " ")}
                            </p>
                            <p className="text-gray-500">
                              {formatDate(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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

export default DCDashboard;
