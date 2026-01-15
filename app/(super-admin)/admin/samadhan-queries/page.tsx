"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Loader2,
  RefreshCcw,
  Filter,
  ChevronDown,
  FileText,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

interface QueryRequest {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  queryDescription: string;
  submissionDate: string | null;
  status: string;
  matchedTickets: string | null;
  adminNotes: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SamadhanQueriesPage() {
  const router = useRouter();
  const [queries, setQueries] = useState<QueryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // View/Respond dialog states
  const [selectedQuery, setSelectedQuery] = useState<QueryRequest | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [matchedTickets, setMatchedTickets] = useState("");
  const [responseStatus, setResponseStatus] = useState<string>("REVIEWED");
  const [isResponding, setIsResponding] = useState(false);

  // Fetch queries
  const fetchQueries = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (searchTerm) {
        params.set("search", searchTerm);
      }

      const response = await fetch(
        `/api/admin/samadhan-queries?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch queries");
      const data = await response.json();
      setQueries(data.queries || []);
    } catch (error) {
      console.error("Error fetching queries:", error);
      toast.error("Failed to load queries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [statusFilter]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQueries();
  };

  // Open view dialog
  const handleView = (query: QueryRequest) => {
    setSelectedQuery(query);
    setShowViewDialog(true);
  };

  // Open respond dialog
  const handleOpenRespond = (query: QueryRequest) => {
    setSelectedQuery(query);
    setAdminNotes(query.adminNotes || "");
    setMatchedTickets(query.matchedTickets || "");
    setResponseStatus(query.status === "PENDING" ? "REVIEWED" : query.status);
    setShowRespondDialog(true);
  };

  // Submit response
  const handleSubmitResponse = async () => {
    if (!selectedQuery) return;

    setIsResponding(true);
    try {
      const response = await fetch(
        `/api/admin/samadhan-queries/${selectedQuery.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: responseStatus,
            adminNotes,
            matchedTickets: matchedTickets || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update query");
      }

      toast.success("Query updated successfully");
      setShowRespondDialog(false);
      fetchQueries();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update query"
      );
    } finally {
      setIsResponding(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "REVIEWED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            <Eye className="h-3 w-3 mr-1" />
            Reviewed
          </Badge>
        );
      case "RESPONDED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Responded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Count stats
  const pendingCount = queries.filter((q) => q.status === "PENDING").length;
  const reviewedCount = queries.filter((q) => q.status === "REVIEWED").length;
  const respondedCount = queries.filter((q) => q.status === "RESPONDED").length;

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-amber-600" />
            SAMADHAN Query Requests
          </h1>
          <p className="text-gray-500 mt-1">
            Manage status queries submitted by citizens
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchQueries}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-yellow-100 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {pendingCount}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Reviewed</p>
                <p className="text-2xl font-bold text-blue-800">
                  {reviewedCount}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-100 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Responded</p>
                <p className="text-2xl font-bold text-green-800">
                  {respondedCount}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="secondary" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </form>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="RESPONDED">Responded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queries Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : queries.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No queries found
              </h3>
              <p className="text-gray-500 mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No query requests have been submitted yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queries.map((query) => (
                    <TableRow key={query.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{query.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>+91 {query.phone}</span>
                          </div>
                          {query.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span>{query.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2 max-w-xs">
                          {query.queryDescription}
                        </p>
                      </TableCell>
                      <TableCell>{getStatusBadge(query.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {format(new Date(query.createdAt), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(query)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRespond(query)}
                            className="gap-1"
                          >
                            <Send className="h-4 w-4" />
                            Respond
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Query Details
            </DialogTitle>
          </DialogHeader>
          {selectedQuery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  <p className="font-medium">{selectedQuery.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedQuery.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Phone</Label>
                  <p className="font-medium">+91 {selectedQuery.phone}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-medium">
                    {selectedQuery.email || "Not provided"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">
                  Query Description
                </Label>
                <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">
                  {selectedQuery.queryDescription}
                </p>
              </div>

              {selectedQuery.adminNotes && (
                <div>
                  <Label className="text-xs text-gray-500">Admin Notes</Label>
                  <p className="mt-1 text-sm bg-blue-50 p-3 rounded-lg text-blue-800">
                    {selectedQuery.adminNotes}
                  </p>
                </div>
              )}

              {selectedQuery.matchedTickets && (
                <div>
                  <Label className="text-xs text-gray-500">
                    Matched Tickets
                  </Label>
                  <p className="mt-1 text-sm font-mono bg-green-50 p-3 rounded-lg text-green-800">
                    {selectedQuery.matchedTickets}
                  </p>
                </div>
              )}

              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  Created:{" "}
                  {format(
                    new Date(selectedQuery.createdAt),
                    "dd MMM yyyy, HH:mm"
                  )}
                </span>
                {selectedQuery.respondedAt && (
                  <span>
                    Responded:{" "}
                    {format(
                      new Date(selectedQuery.respondedAt),
                      "dd MMM yyyy, HH:mm"
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Respond to Query
            </DialogTitle>
            <DialogDescription>
              Update status and add notes for this query
            </DialogDescription>
          </DialogHeader>
          {selectedQuery && (
            <div className="space-y-4">
              {/* Query Preview */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {selectedQuery.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedQuery.queryDescription.slice(0, 100)}
                  {selectedQuery.queryDescription.length > 100 ? "..." : ""}
                </p>
              </div>

              {/* Status Selection */}
              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={responseStatus}
                  onValueChange={setResponseStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="REVIEWED">Reviewed</SelectItem>
                    <SelectItem value="RESPONDED">Responded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Matched Tickets */}
              <div className="space-y-2">
                <Label>Matched Ticket IDs (Optional)</Label>
                <Input
                  placeholder="e.g., SAMADHAN-2024-01-001, SAMADHAN-2024-01-002"
                  value={matchedTickets}
                  onChange={(e) => setMatchedTickets(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Enter comma-separated ticket reference IDs if found
                </p>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add notes about this query, response sent to user, etc."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRespondDialog(false)}
              disabled={isResponding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={isResponding}
              className="gap-2"
            >
              {isResponding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
