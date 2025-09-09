"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  User,
  Clock,
  Search,
  RefreshCw,
  ArrowRight,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Grab,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { FilePreviewButton } from "@/components/FilePreview";

interface PullableApplication {
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
    color?: string;
  };
  citizenProfile?: {
    fullName: string;
    phone: string;
    address: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    isVerified: boolean;
    createdAt: string;
  }>;
}

export default function OfficerPullRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<PullableApplication[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<PullableApplication | null>(null);
  const [isPullDialogOpen, setIsPullDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [instructions, setInstructions] = useState("");
  // const [priority, setPriority] = useState<number>(1); // Always HIGH priority - removed from UI

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchApplications();
  }, [session, status, router]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/officers/pull");
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch applications");
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Error fetching applications");
    } finally {
      setLoading(false);
    }
  };

  const handlePullApplication = (application: PullableApplication) => {
    setSelectedApplication(application);
    setIsPullDialogOpen(true);
    setInstructions("");
    // setPriority(1); // Always HIGH priority - removed from UI
  };

  const onSubmitPull = async () => {
    if (!selectedApplication) return;

    try {
      setPulling(true);
      const response = await fetch("/api/officers/pull", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          // priority: 1, // Always HIGH priority - removed from UI
          instructions: instructions.trim(),
        }),
      });

      if (response.ok) {
        toast.success("Application successfully pulled and assigned to you");
        setIsPullDialogOpen(false);
        setSelectedApplication(null);
        setInstructions("");
        // setPriority(1); // Always HIGH priority - removed from UI
        fetchApplications(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to pull application");
      }
    } catch (error) {
      console.error("Error pulling application:", error);
      toast.error("Error pulling application");
    } finally {
      setPulling(false);
    }
  };

  const filteredApplications = applications.filter(
    (app) =>
      searchTerm === "" ||
      app.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.citizenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.rrNumber &&
        app.rrNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      app.serviceCategory.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-800";
      case 2:
        return "bg-yellow-100 text-yellow-800";
      case 3:
        return "bg-green-100 text-green-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Application Pull Requests
          </h1>
          <p className="text-muted-foreground">
            Pull applications from the queue and assign them to yourself for
            processing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchApplications}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredApplications.length} application(s) available
        </div>
      </div>

      {/* Applications Grid */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Applications Available
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              There are no open applications available for pulling at the
              moment. Check back later or refresh the page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <Card
              key={application.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base line-clamp-2">
                      {application.subject || "No Subject"}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className="bg-blue-100 text-blue-800 border-blue-200"
                        variant="outline"
                      >
                        OPEN
                      </Badge>
                      {application.rrNumber && (
                        <Badge variant="outline" className="text-xs">
                          {application.rrNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Applicant Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {application.citizenProfile?.fullName ||
                        application.citizenName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    📞{" "}
                    {application.citizenProfile?.phone ||
                      application.citizenPhone}
                  </div>
                </div>

                {/* Service Category */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        application.serviceCategory.color || "#3B82F6",
                    }}
                  />
                  <span className="text-sm font-medium">
                    {application.serviceCategory.name}
                  </span>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span>{application.documents.length} document(s)</span>
                    </div>
                  </div>

                  {/* Document List */}
                  {application.documents.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {application.documents.map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {document.documentType}
                            </div>
                            <div className="text-gray-500 truncate">
                              {document.fileName}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <FilePreviewButton
                              document={{
                                id: document.id,
                                fileName: document.fileName,
                                documentType: document.documentType,
                                isVerified: true,
                                fileSize: 0,
                              }}
                              applicationId={application.id}
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Created: {formatDate(application.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className="pt-2">
                  <Button
                    onClick={() => handlePullApplication(application)}
                    className="w-full"
                    size="sm"
                  >
                    <Grab className="h-4 w-4 mr-2" />
                    Pull Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pull Application Dialog */}
      <Dialog open={isPullDialogOpen} onOpenChange={setIsPullDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pull Application</DialogTitle>
            <DialogDescription>
              Pull this application from the queue and assign it to yourself for
              processing.
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Application Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Subject:</span>{" "}
                    {selectedApplication.subject}
                  </div>
                  <div>
                    <span className="font-medium">Applicant:</span>{" "}
                    {selectedApplication.citizenProfile?.fullName ||
                      selectedApplication.citizenName}
                  </div>
                  <div>
                    <span className="font-medium">Service:</span>{" "}
                    {selectedApplication.serviceCategory.name}
                  </div>
                  <div>
                    <span className="font-medium">Documents:</span>{" "}
                    {selectedApplication.documents.length} file(s)
                  </div>

                  {/* Document List */}
                  {selectedApplication.documents.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <Label>Attached Documents</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                        {selectedApplication.documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {document.documentType}
                              </div>
                              <div className="text-gray-500 truncate text-xs">
                                {document.fileName}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <FilePreviewButton
                                document={{
                                  id: document.id,
                                  fileName: document.fileName,
                                  documentType: document.documentType,
                                  isVerified: true,
                                  fileSize: 0,
                                }}
                                applicationId={selectedApplication.id}
                                variant="outline"
                                size="sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Priority is always HIGH - removed from UI */}

                <div>
                  <Label htmlFor="instructions">
                    Processing Notes (Optional)
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder="Add any notes or instructions for processing this application..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPullDialogOpen(false);
                setSelectedApplication(null);
                setInstructions("");
                // setPriority(1); // Always HIGH priority - removed from UI
              }}
            >
              Cancel
            </Button>
            <Button onClick={onSubmitPull} disabled={pulling}>
              {pulling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Pulling...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Pull Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
