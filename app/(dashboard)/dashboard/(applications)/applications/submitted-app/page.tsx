"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Calendar,
  User,
  Clock,
  Search,
  Filter,
  Eye,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock4,
  FileCheck,
  Hourglass,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/ui/page-header";

interface Application {
  id: string;
  rrNumber?: string;
  status: string;
  createdAt: string;
  submittedAt?: string;
  validatedAt?: string;
  completedAt?: string;
  serviceCategory: {
    name: string;
    slaDays: number;
  };
  currentHolder?: {
    officerProfile: {
      fullName: string;
      designation: string;
    };
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    isVerified: boolean;
  }>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const APPLICATION_STATUSES = [
  { value: "ALL", label: "All Applications" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending Validation" },
  { value: "VALIDATED", label: "Validated" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "VALIDATED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "IN_PROGRESS":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "APPROVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "DRAFT":
      return <FileText className="h-4 w-4" />;
    case "PENDING":
      return <Clock4 className="h-4 w-4" />;
    case "VALIDATED":
      return <FileCheck className="h-4 w-4" />;
    case "IN_PROGRESS":
      return <Hourglass className="h-4 w-4" />;
    case "APPROVED":
      return <CheckCircle2 className="h-4 w-4" />;
    case "REJECTED":
      return <XCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

export default function ApplicationsList() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/applications?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const data = await response.json();
      setApplications(data.applications);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching applications:", error);
      setError("Failed to load applications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]); // Add dependencies here

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApplications = applications.filter(
    (app) =>
      app.serviceCategory.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (app.rrNumber &&
        app.rrNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDaysRemaining = (createdAt: string, slaDays: number) => {
    const created = new Date(createdAt);
    const deadline = new Date(
      created.getTime() + slaDays * 24 * 60 * 60 * 1000
    );
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <PageHeader className="mb-8 mt-[-80px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="flex-1">
            <PageHeaderHeading>My Applications</PageHeaderHeading>
            <PageHeaderDescription>
              Track and manage your submitted applications
            </PageHeaderDescription>
          </div>
          <div className="sm:ml-auto">
            <Button
              onClick={() => router.push("/dashboard/applications/create")}
              className="bg-blue-700 hover:bg-blue-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by service name or RR number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No applications found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "ALL"
                  ? "No applications match your current filters."
                  : "You haven't submitted any applications yet."}
              </p>
              <Button
                onClick={() => router.push("/dashboard/applications/create")}
                className="bg-blue-700 hover:bg-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Application
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            const daysRemaining = calculateDaysRemaining(
              application.createdAt,
              application.serviceCategory.slaDays
            );

            return (
              <Card
                key={application.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() =>
                  router.push(
                    `/dashboard/applications/submitted-app/${application.id}`
                  )
                }
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(
                            application.status
                          )} flex items-center gap-1`}
                        >
                          {getStatusIcon(application.status)}
                          {application.status.replace("_", " ")}
                        </Badge>
                        {application.rrNumber && (
                          <Badge variant="secondary" className="font-mono">
                            {application.rrNumber}
                          </Badge>
                        )}
                      </div>

                      {/* Service Category */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {application.serviceCategory.name}
                        </h3>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            Created: {formatDate(application.createdAt)}
                          </span>
                        </div>

                        {application.submittedAt && (
                          <div className="flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>
                              Submitted: {formatDate(application.submittedAt)}
                            </span>
                          </div>
                        )}

                        {application.currentHolder && (
                          <div className="flex items-center text-gray-600">
                            <User className="h-4 w-4 mr-2" />
                            <span>
                              Officer:{" "}
                              {
                                application.currentHolder.officerProfile
                                  .fullName
                              }
                            </span>
                          </div>
                        )}

                        <div className="flex items-center text-gray-600">
                          <FileText className="h-4 w-4 mr-2" />
                          <span>
                            {application.documents.length} document(s)
                          </span>
                        </div>

                        {application.status !== "COMPLETED" &&
                          application.status !== "REJECTED" && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              <span
                                className={`text-sm ${
                                  daysRemaining < 0
                                    ? "text-red-600"
                                    : daysRemaining <= 2
                                    ? "text-orange-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {daysRemaining < 0
                                  ? `Overdue by ${Math.abs(daysRemaining)} days`
                                  : `${daysRemaining} days remaining`}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button variant="ghost" size="sm" className="ml-4">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} applications
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i;
                if (pageNum > pagination.pages) return null;

                return (
                  <Button
                    key={pageNum}
                    variant={
                      pageNum === pagination.page ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
