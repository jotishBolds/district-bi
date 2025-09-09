"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package,
  CheckCircle,
  Clock,
  Send,
  Search,
  RefreshCw,
  Filter,
  TrendingUp,
  FileText,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Application {
  id: string;
  rrNumber: string;
  subject: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail?: string;
  status: string;
  isDispatched: boolean;
  dispatchedAt?: string;
  completedAt?: string;
  createdAt: string;
  serviceCategory: {
    name: string;
    slaDays: number;
  };
  department: {
    name: string;
  };
  currentHolder?: {
    id: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
  dispatchedBy?: {
    id: string;
    officerProfile?: {
      fullName: string;
      designation: string;
    };
  };
}

interface DispatchStats {
  overview: {
    totalClosed: number;
    totalDispatched: number;
    pendingDispatch: number;
    dispatchRate: number;
  };
  departmentStats: Record<
    string,
    {
      total: number;
      dispatched: number;
      pending: number;
    }
  >;
  recentDispatches: Application[];
  timeframe: string;
}

export default function DispatchDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DispatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [dispatchStatus, setDispatchStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selection and dispatch
  const [selectedApplications, setSelectedApplications] = useState<string[]>(
    []
  );
  const [showDispatchDialog, setShowDispatchDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(searchTerm && { search: searchTerm }),
        ...(selectedDepartment &&
          selectedDepartment !== "ALL" && { departmentId: selectedDepartment }),
        dispatchStatus,
      });

      const response = await fetch(`/api/dispatch?${params}`);
      if (!response.ok) throw new Error("Failed to fetch applications");

      const data = await response.json();
      setApplications(data.applications);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedDepartment, dispatchStatus]);

  useEffect(() => {
    if (session?.user?.role !== "DISPATCH_HANDLER") {
      router.push("/dashboard");
      return;
    }

    fetchApplications();
    fetchDepartments();
    fetchStats();
  }, [session, fetchApplications, router]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");

      const data = await response.json();
      // Use data.departments from API response
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]); // fallback to empty array on error
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dispatch/stats?timeframe=all");
      if (!response.ok) throw new Error("Failed to fetch stats");

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSingleDispatch = async (
    applicationId: string,
    isDispatched: boolean
  ) => {
    try {
      setProcessing(true);

      const response = await fetch(`/api/dispatch/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDispatched }),
      });

      if (!response.ok) throw new Error("Failed to update dispatch status");

      await fetchApplications();
      await fetchStats();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error updating dispatch status:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDispatch = async () => {
    if (selectedApplications.length === 0) return;

    try {
      setProcessing(true);

      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationIds: selectedApplications }),
      });

      if (!response.ok) throw new Error("Failed to dispatch applications");

      await fetchApplications();
      await fetchStats();
      setSelectedApplications([]);
      setShowDispatchDialog(false);
    } catch (error) {
      console.error("Error dispatching applications:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = () => {
    const eligibleApps = applications.filter((app) => !app.isDispatched);
    if (selectedApplications.length === eligibleApps.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(eligibleApps.map((app) => app.id));
    }
  };

  const handleSelectApplication = (applicationId: string) => {
    setSelectedApplications((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (isDispatched: boolean) => {
    return isDispatched
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-orange-100 text-orange-800 border-orange-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Dashboard</h1>
          <p className="text-gray-600">
            Manage application dispatch and delivery
          </p>
        </div>
        <Button
          onClick={fetchApplications}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Closed
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.overview.totalClosed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Dispatched
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.overview.totalDispatched}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Actions
            </CardTitle>
            {selectedApplications.length > 0 && (
              <Button
                onClick={() => setShowDispatchDialog(true)}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Dispatch Selected ({selectedApplications.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="RR Number, Name, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Dispatch Status</Label>
              <Select value={dispatchStatus} onValueChange={setDispatchStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applications</SelectItem>
                  <SelectItem value="pending">Pending Dispatch</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDepartment("ALL");
                  setDispatchStatus("all");
                  setPage(1);
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Applications for Dispatch</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedApplications.length ===
                  applications.filter((app) => !app.isDispatched).length
                }
                onCheckedChange={handleSelectAll}
              />
              <Label>Select All Eligible</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedApplications.includes(app.id)
                    ? "bg-blue-50 border-blue-200"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!app.isDispatched && (
                      <Checkbox
                        checked={selectedApplications.includes(app.id)}
                        onCheckedChange={() => handleSelectApplication(app.id)}
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{app.rrNumber}</span>
                        <Badge className={getStatusColor(app.isDispatched)}>
                          {app.isDispatched ? "Dispatched" : "Pending"}
                        </Badge>
                        <Badge variant="outline">{app.department.name}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{app.subject}</p>
                      <p className="text-xs text-gray-500">
                        {app.citizenName} • {app.citizenPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-gray-600">
                        Completed: {formatDate(app.completedAt)}
                      </p>
                      {app.isDispatched && (
                        <p className="text-green-600">
                          Dispatched: {formatDate(app.dispatchedAt)}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={app.isDispatched ? "destructive" : "default"}
                      onClick={() =>
                        handleSingleDispatch(app.id, !app.isDispatched)
                      }
                      disabled={processing}
                    >
                      {app.isDispatched ? "Revert" : "Dispatch"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {applications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No applications found for the selected filters.
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Dispatch Confirmation Dialog */}
      <Dialog open={showDispatchDialog} onOpenChange={setShowDispatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Dispatch</DialogTitle>
            <DialogDescription>
              Are you sure you want to dispatch {selectedApplications.length}{" "}
              applications? This action will mark them as dispatched and record
              the dispatch timestamp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDispatchDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkDispatch} disabled={processing}>
              {processing ? "Dispatching..." : "Confirm Dispatch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
