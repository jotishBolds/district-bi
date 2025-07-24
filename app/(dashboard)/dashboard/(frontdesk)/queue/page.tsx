"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  FileText,
  ArrowRight,
  Grid3X3,
  List,
  Filter,
  X,
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

interface AssignedOfficer {
  id: string;
  fullName: string;
  designation: string;
  department: string;
}

const pullSchema = z.object({
  officerId: z.string().min(1, "Officer selection is required"),
  priority: z.number().min(1).max(3),
  instructions: z
    .string()
    .min(10, "Instructions must be at least 10 characters"),
});

type PullFormData = z.infer<typeof pullSchema>;

export default function ApplicationQueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queuedApplications, setQueuedApplications] = useState<
    QueuedApplication[]
  >([]);
  const [assignedOfficers, setAssignedOfficers] = useState<AssignedOfficer[]>(
    []
  );
  const [selectedApplication, setSelectedApplication] =
    useState<QueuedApplication | null>(null);
  const [isPullDialogOpen, setIsPullDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const form = useForm<PullFormData>({
    resolver: zodResolver(pullSchema),
    defaultValues: {
      officerId: "",
      priority: 2,
      instructions: "",
    },
  });

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

    fetchQueue();
  }, [session, status, router]);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/frontdesk/queue");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch queue");
      }

      const data = await response.json();
      setQueuedApplications(data.applications || []);
      setAssignedOfficers(data.assignedOfficers || []);
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load queue"
      );

      // If user is not authorized for queue, redirect to regular dashboard
      if (
        error instanceof Error &&
        error.message.includes("specific frontdesk")
      ) {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePullApplication = (application: QueuedApplication) => {
    setSelectedApplication(application);
    setIsPullDialogOpen(true);

    // Auto-select officer if there's only one assigned
    const defaultOfficerId =
      assignedOfficers.length === 1 ? assignedOfficers[0].id : "";

    form.reset({
      officerId: defaultOfficerId,
      priority: 2,
      instructions: "",
    });
  };

  const onSubmit = async (data: PullFormData) => {
    if (!selectedApplication) return;

    try {
      setPulling(true);
      const response = await fetch("/api/frontdesk/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          officerId: data.officerId,
          priority: data.priority,
          instructions: data.instructions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to pull application");
      }

      toast.success(result.message);
      setIsPullDialogOpen(false);
      setSelectedApplication(null);
      form.reset();
      fetchQueue(); // Refresh the queue
    } catch (error) {
      console.error("Error pulling application:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to pull application"
      );
    } finally {
      setPulling(false);
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

  // Filter applications based on search term
  const filteredApplications = queuedApplications.filter(
    (app) =>
      app.citizenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.rrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.serviceCategory.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      app.citizenPhone.includes(searchTerm) ||
      (app.citizenEmail &&
        app.citizenEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const clearFilters = () => {
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading application queue...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">
                Application Queue
              </h1>
              <p className="text-gray-600 mt-2">
                Pull applications from queue and assign to your designated
                officers
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={fetchQueue}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Badge variant="secondary" className="text-sm">
                {filteredApplications.length} of {queuedApplications.length}{" "}
                shown
              </Badge>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by RR number, citizen name, subject, service, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={clearFilters}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Grid3X3 className="w-4 h-4 mr-2 inline-block" />
                Grid
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 text-sm font-medium transition-colors border-l ${
                  viewMode === "table"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "text-gray-700 hover:bg-gray-50 border-gray-200"
                }`}
              >
                <List className="w-4 h-4 mr-2 inline-block" />
                Table
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {searchTerm && (
            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                Showing {filteredApplications.length} of{" "}
                {queuedApplications.length} applications
              </span>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Assigned Officers Info */}
          {assignedOfficers.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-900 mb-2">
                Your Assigned Officers:
              </h3>
              <div className="flex flex-wrap gap-2">
                {assignedOfficers.map((officer) => (
                  <Badge
                    key={officer.id}
                    variant="outline"
                    className="bg-white"
                  >
                    {officer.fullName} - {officer.designation}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Queue List */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              {queuedApplications.length === 0 ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Queue is Empty
                  </h3>
                  <p className="text-gray-600 text-center">
                    No applications are currently waiting in the queue.
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Applications Found
                  </h3>
                  <p className="text-gray-600 text-center">
                    No applications match your search criteria.
                  </p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid gap-6">
            {filteredApplications.map((application) => (
              <Card
                key={application.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {application.subject}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        RR Number:{" "}
                        <span className="font-mono font-medium">
                          {application.rrNumber}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2">
                        {application.serviceCategory.name}
                      </Badge>
                      <p className="text-sm text-gray-500">
                        <Clock className="inline h-4 w-4 mr-1" />
                        {formatTimeAgo(application.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Citizen Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Citizen Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>{" "}
                        {application.citizenName}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {application.citizenPhone}
                      </div>
                      {application.citizenEmail && (
                        <div>
                          <span className="font-medium">Email:</span>{" "}
                          {application.citizenEmail}
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <span className="font-medium">Address:</span>{" "}
                        {application.citizenAddress}
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents ({application.documents.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
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

                  {/* SLA Warning */}
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>SLA: {application.serviceCategory.slaDays} days</span>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handlePullApplication(application)}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Pull & Assign to Officer
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RR Number</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Citizen</TableHead>
                    <TableHead>Service Category</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>SLA Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-medium">
                        {application.rrNumber}
                      </TableCell>
                      <TableCell>
                        <div
                          className="max-w-xs truncate"
                          title={application.subject}
                        >
                          {application.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {application.citizenName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.citizenPhone}
                          </div>
                          {application.citizenEmail && (
                            <div className="text-sm text-gray-500">
                              {application.citizenEmail}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {application.serviceCategory.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {application.documents.slice(0, 2).map((doc) => (
                            <Badge
                              key={doc.id}
                              variant={doc.isVerified ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {getDocumentTypeLabel(doc.documentType)}
                              {doc.isVerified && " ✓"}
                            </Badge>
                          ))}
                          {application.documents.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{application.documents.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatTimeAgo(application.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(application.submittedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          {application.serviceCategory.slaDays}d
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handlePullApplication(application)}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <ArrowRight className="h-3 w-3" />
                          Pull & Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pull Application Dialog */}
        <Dialog open={isPullDialogOpen} onOpenChange={setIsPullDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Pull Application from Queue</DialogTitle>
              <DialogDescription>
                Assign this application to one of your designated officers.
              </DialogDescription>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Application Details</h4>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">RR:</span>{" "}
                      {selectedApplication.rrNumber}
                    </div>
                    <div>
                      <span className="font-medium">Subject:</span>{" "}
                      {selectedApplication.subject}
                    </div>
                    <div>
                      <span className="font-medium">Citizen:</span>{" "}
                      {selectedApplication.citizenName}
                    </div>
                    <div>
                      <span className="font-medium">Service:</span>{" "}
                      {selectedApplication.serviceCategory.name}
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    {assignedOfficers.length === 1 ? (
                      // Show assigned officer info instead of dropdown when only one officer
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Assigned Officer
                        </label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="font-medium text-blue-900">
                            {assignedOfficers[0].fullName}
                          </div>
                          <div className="text-sm text-blue-700">
                            {assignedOfficers[0].designation} -{" "}
                            {assignedOfficers[0].department}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Show dropdown when multiple officers
                      <FormField
                        control={form.control}
                        name="officerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign to Officer *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an officer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {assignedOfficers.map((officer) => (
                                  <SelectItem
                                    key={officer.id}
                                    value={officer.id}
                                  >
                                    {officer.fullName} - {officer.designation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(1)}>
                                    High
                                  </Badge>
                                  <span>Urgent</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="2">
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(2)}>
                                    Medium
                                  </Badge>
                                  <span>Normal</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="3">
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(3)}>
                                    Low
                                  </Badge>
                                  <span>Can wait</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructions for Officer *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide detailed instructions for handling this application..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPullDialogOpen(false)}
                        disabled={pulling}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={pulling}>
                        {pulling ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Pulling...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Pull & Assign
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
