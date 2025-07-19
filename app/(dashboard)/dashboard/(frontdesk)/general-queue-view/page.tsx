"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  User,
  FileText,
  Search,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  UserCheck,
  Calendar,
  Grid3X3,
  List,
  X,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

interface QueuedApplication {
  id: string;
  rrNumber: string;
  subject: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail?: string;
  citizenAddress: string;
  submittedAt: string;
  createdAt: string;
  serviceCategory: {
    name: string;
    slaDays: number;
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    isVerified: boolean;
    createdAt: string;
  }>;
}

interface ProcessedApplication {
  id: string;
  rrNumber: string;
  subject: string;
  citizenName: string;
  status: string;
  serviceCategory: {
    name: string;
  };
  currentHolder?: {
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
  officerAssignments: Array<{
    assignedBy: {
      email: string;
    };
    assignedTo: {
      officerProfile: {
        fullName: string;
        designation: string;
      };
    };
    createdAt: string;
  }>;
  updatedAt: string;
}

interface QueueStats {
  totalQueued: number;
  totalProcessed: number;
  avgWaitTime: number;
  oldestInQueue: string | null;
}

export default function GeneralFrontdeskQueueView() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queuedApplications, setQueuedApplications] = useState<
    QueuedApplication[]
  >([]);
  const [processedApplications, setProcessedApplications] = useState<
    ProcessedApplication[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"queued" | "processed">("queued");
  const [stats, setStats] = useState<QueueStats>({
    totalQueued: 0,
    totalProcessed: 0,
    avgWaitTime: 0,
    oldestInQueue: null,
  });

  // Additional state for enhanced search and view modes
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session?.user?.role !== "FRONT_DESK") {
      router.push("/dashboard");
      return;
    }
    fetchQueueData();
  }, [session, status, router]);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      // Fetch current queue
      const queueResponse = await fetch("/api/frontdesk/general-queue");
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setQueuedApplications(queueData.queuedApplications || []);
        setProcessedApplications(queueData.processedApplications || []);
        setStats(
          queueData.stats || {
            totalQueued: 0,
            totalProcessed: 0,
            avgWaitTime: 0,
            oldestInQueue: null,
          }
        );
      } else {
        const error = await queueResponse.json();
        if (error.error?.includes("general frontdesk")) {
          toast.error(
            "This view is only available for general frontdesk users"
          );
          router.push("/dashboard");
          return;
        }
        throw new Error(error.error || "Failed to fetch queue data");
      }
    } catch (error) {
      console.error("Error fetching queue data:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load queue data"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "QUEUED":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Enhanced filtering logic
  const filteredQueuedApplications = queuedApplications.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.citizenName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.rrNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.serviceCategory.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      app.citizenPhone?.includes(searchQuery) ||
      app.citizenEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchTerm?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesServiceCategory =
      !selectedServiceCategory ||
      app.serviceCategory.name === selectedServiceCategory;

    return matchesSearch && matchesServiceCategory;
  });

  const filteredProcessedApplications = processedApplications.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.citizenName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.rrNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.serviceCategory.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      searchTerm?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesServiceCategory =
      !selectedServiceCategory ||
      app.serviceCategory.name === selectedServiceCategory;

    return matchesSearch && matchesServiceCategory;
  });

  // Clear all filters function
  const clearFilters = () => {
    setSearchTerm("");
    setSearchQuery("");
    setSelectedServiceCategory("");
  };

  // Render Grid View for Queued Applications
  const renderQueuedGridView = () => (
    <div className="grid grid-cols-1 gap-4 sm:gap-6">
      {filteredQueuedApplications.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Queue is Empty
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? "No applications match your search."
              : "No applications are currently waiting in the queue."}
          </p>
        </div>
      ) : (
        filteredQueuedApplications.map((application) => (
          <Card
            key={application.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 break-words">
                    {application.subject}
                  </h3>
                  <p className="text-sm text-gray-600">
                    RR:{" "}
                    <span className="font-mono font-medium">
                      {application.rrNumber}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <Badge variant="outline" className="whitespace-nowrap">
                    {application.serviceCategory.name}
                  </Badge>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTimeAgo(application.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Citizen Information
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">Name:</span>{" "}
                      {application.citizenName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">Phone:</span>{" "}
                      {application.citizenPhone}
                    </div>
                    {application.citizenEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="font-medium">Email:</span>{" "}
                        {application.citizenEmail}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 text-gray-400 mt-0.5" />
                      <div>
                        <span className="font-medium">Address:</span>
                        <div className="text-xs text-gray-600 mt-1">
                          {application.citizenAddress}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Documents ({application.documents.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {application.documents.map((doc) => (
                      <Badge
                        key={doc.id}
                        variant={doc.isVerified ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {getDocumentTypeLabel(doc.documentType)}
                        {doc.isVerified && " ✓"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 gap-2">
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>SLA: {application.serviceCategory.slaDays} days</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 self-start sm:self-auto">
                  Waiting for Assignment
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Render Table View for Queued Applications
  const renderQueuedTableView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 sm:px-6 py-3">Application</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Citizen</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Service</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Documents</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Time in Queue</TableHead>
              <TableHead className="px-3 sm:px-6 py-3 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQueuedApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Queue is Empty
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? "No applications match your search."
                      : "No applications are currently waiting in the queue."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredQueuedApplications.map((application) => (
                <React.Fragment key={application.id}>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {application.subject}
                        </div>
                        <div className="text-xs text-gray-500">
                          RR: {application.rrNumber}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {application.citizenName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.citizenPhone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <Badge variant="outline" className="w-fit">
                          {application.serviceCategory.name}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          SLA: {application.serviceCategory.slaDays} days
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {application.documents.length}
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {
                            application.documents.filter((d) => d.isVerified)
                              .length
                          }{" "}
                          verified)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-600">
                          {formatTimeAgo(application.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setExpandedDetails(
                              expandedDetails === application.id
                                ? null
                                : application.id
                            )
                          }
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                          Waiting
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {expandedDetails === application.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="px-0 py-0">
                        <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Citizen Details */}
                            <div className="bg-white rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                Complete Citizen Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-gray-400" />
                                  <span className="font-medium">
                                    Full Name:
                                  </span>{" "}
                                  {application.citizenName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span className="font-medium">
                                    Phone:
                                  </span>{" "}
                                  {application.citizenPhone}
                                </div>
                                {application.citizenEmail && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium">
                                      Email:
                                    </span>{" "}
                                    {application.citizenEmail}
                                  </div>
                                )}
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-3 w-3 text-gray-400 mt-0.5" />
                                  <div>
                                    <span className="font-medium">
                                      Address:
                                    </span>
                                    <div className="text-gray-600 mt-1">
                                      {application.citizenAddress}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Document Details */}
                            <div className="bg-white rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                Document Details ({application.documents.length}
                                )
                              </h4>
                              <div className="space-y-2">
                                {application.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-3 w-3 text-gray-400" />
                                      <span className="text-sm">
                                        {getDocumentTypeLabel(doc.documentType)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {doc.isVerified ? (
                                        <Badge
                                          variant="default"
                                          className="text-xs"
                                        >
                                          Verified ✓
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          Pending
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Application Timeline */}
                          <div className="mt-6 bg-white rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              Application Timeline
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="font-medium">Submitted:</span>
                                <span>
                                  {formatDate(application.submittedAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="font-medium">
                                  In Queue Since:
                                </span>
                                <span>{formatDate(application.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-medium">
                                  SLA Deadline:
                                </span>
                                <span>
                                  {new Date(
                                    new Date(application.createdAt).getTime() +
                                      application.serviceCategory.slaDays *
                                        24 *
                                        60 *
                                        60 *
                                        1000
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // Render Grid View for Processed Applications
  const renderProcessedGridView = () => (
    <div className="grid grid-cols-1 gap-4 sm:gap-6">
      {filteredProcessedApplications.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Processed Applications
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? "No processed applications match your search."
              : "No applications have been processed from the queue yet."}
          </p>
        </div>
      ) : (
        filteredProcessedApplications.map((application) => (
          <Card
            key={application.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 break-words">
                    {application.subject}
                  </h3>
                  <p className="text-sm text-gray-600">
                    RR:{" "}
                    <span className="font-mono font-medium">
                      {application.rrNumber}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <Badge className={getStatusColor(application.status)}>
                    {application.status.replace("_", " ")}
                  </Badge>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTimeAgo(application.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Citizen
                  </h4>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {application.citizenName}
                    </div>
                    <div>
                      <span className="font-medium">Service:</span>{" "}
                      {application.serviceCategory.name}
                    </div>
                  </div>
                </div>

                {application.officerAssignments.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Assignment Details
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-medium">Assigned to:</span>{" "}
                        {
                          application.officerAssignments[0]?.assignedTo
                            .officerProfile.fullName
                        }
                      </div>
                      <div>
                        <span className="font-medium">Pulled by:</span>{" "}
                        {application.officerAssignments[0]?.assignedBy.email}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{" "}
                        {formatDate(
                          application.officerAssignments[0]?.createdAt
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {application.currentHolder?.officerProfile && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 gap-2">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <UserCheck className="h-4 w-4" />
                    <span>
                      Currently with:{" "}
                      {application.currentHolder.officerProfile.fullName} -{" "}
                      {application.currentHolder.officerProfile.designation}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Render Table View for Processed Applications
  const renderProcessedTableView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 sm:px-6 py-3">Application</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Citizen</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Status</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Assigned To</TableHead>
              <TableHead className="px-3 sm:px-6 py-3">Last Updated</TableHead>
              <TableHead className="px-3 sm:px-6 py-3 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProcessedApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Processed Applications
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? "No processed applications match your search."
                      : "No applications have been processed from the queue yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProcessedApplications.map((application) => (
                <React.Fragment key={application.id}>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {application.subject}
                        </div>
                        <div className="text-xs text-gray-500">
                          RR: {application.rrNumber}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {application.citizenName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.serviceCategory.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      {application.officerAssignments.length > 0 ? (
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {
                              application.officerAssignments[0]?.assignedTo
                                .officerProfile.fullName
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {
                              application.officerAssignments[0]?.assignedTo
                                .officerProfile.designation
                            }
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {formatTimeAgo(application.updatedAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setExpandedDetails(
                              expandedDetails === application.id
                                ? null
                                : application.id
                            )
                          }
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {expandedDetails === application.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="px-0 py-0">
                        <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Citizen Details */}
                            <div className="bg-white rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                Citizen Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">
                                    Full Name:
                                  </span>{" "}
                                  {application.citizenName}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Service Category:
                                  </span>{" "}
                                  {application.serviceCategory.name}
                                </div>
                              </div>
                            </div>

                            {/* Assignment Details */}
                            {application.officerAssignments.length > 0 && (
                              <div className="bg-white rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Assignment History
                                </h4>
                                <div className="space-y-3">
                                  {application.officerAssignments.map(
                                    (assignment, index) => (
                                      <div
                                        key={index}
                                        className="p-3 bg-blue-50 rounded-lg"
                                      >
                                        <div className="text-sm space-y-1">
                                          <div>
                                            <span className="font-medium">
                                              Assigned to:
                                            </span>{" "}
                                            {
                                              assignment.assignedTo
                                                .officerProfile.fullName
                                            }
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Designation:
                                            </span>{" "}
                                            {
                                              assignment.assignedTo
                                                .officerProfile.designation
                                            }
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Pulled by:
                                            </span>{" "}
                                            {assignment.assignedBy.email}
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Date:
                                            </span>{" "}
                                            {formatDate(assignment.createdAt)}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Current Holder */}
                          {application.currentHolder?.officerProfile && (
                            <div className="mt-6 bg-white rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <UserCheck className="h-4 w-4 mr-2" />
                                Current Status
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-blue-600">
                                <UserCheck className="h-4 w-4" />
                                <span>
                                  Currently with:{" "}
                                  {
                                    application.currentHolder.officerProfile
                                      .fullName
                                  }{" "}
                                  -{" "}
                                  {
                                    application.currentHolder.officerProfile
                                      .designation
                                  }
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading queue overview...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Queue Overview
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">
                Monitor applications in the queue and track processing status
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={fetchQueueData}
                disabled={loading}
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Badge variant="secondary" className="text-sm">
                General Frontdesk View
              </Badge>
            </div>
          </div>

          {/* Enhanced Search and Controls */}
          <div className="space-y-4">
            {/* Search Bar and Controls Row */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Main Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search by RR number, citizen name, subject, service, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="">All Service Categories</option>
                  {Array.from(
                    new Set(
                      [...queuedApplications, ...processedApplications]
                        .map((app) => app.serviceCategory?.name)
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
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "table"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Clear Filters Button */}
              {(searchQuery || selectedServiceCategory) && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="whitespace-nowrap text-sm bg-transparent"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.totalQueued}
                  </p>
                  <p className="text-xs text-gray-500">In Queue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.totalProcessed}
                  </p>
                  <p className="text-xs text-gray-500">Processed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.avgWaitTime}h
                  </p>
                  <p className="text-xs text-gray-500">Avg Wait Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {stats.oldestInQueue
                      ? formatTimeAgo(stats.oldestInQueue)
                      : "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">Oldest in Queue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav
              className="flex space-x-4 sm:space-x-8 px-4 sm:px-6"
              aria-label="Tabs"
            >
              <button
                onClick={() => setActiveTab("queued")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "queued"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Queued Applications ({filteredQueuedApplications.length})
              </button>
              <button
                onClick={() => setActiveTab("processed")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "processed"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Recently Processed ({filteredProcessedApplications.length})
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "queued" ? (
              // Queued Applications
              <div className="space-y-4">
                {viewMode === "grid"
                  ? renderQueuedGridView()
                  : renderQueuedTableView()}
              </div>
            ) : (
              // Processed Applications
              <div className="space-y-4">
                {viewMode === "grid"
                  ? renderProcessedGridView()
                  : renderProcessedTableView()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
