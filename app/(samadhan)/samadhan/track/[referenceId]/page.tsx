"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileText,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  XCircle,
  Upload,
  Send,
  Loader2,
  Download,
  Calendar,
  User,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";

interface TicketData {
  id: string;
  referenceId: string;
  queryType: "FEEDBACK" | "GRIEVANCE" | "SUGGESTION";
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: string;
  section: { id: string; name: string };
  serviceAvailed: string | null;
  description: string;
  resolutionMessage: string | null;
  createdAt: string;
  slaDeadline: string | null;
  isAppeal?: boolean;
  originalTicketId?: string;
  originalTicket?: {
    referenceId: string;
    status: string;
    statusHistory: Array<{
      id: string;
      fromStatus: string | null;
      toStatus: string;
      changeReason: string | null;
      isSystemGenerated: boolean;
      createdAt: string;
    }>;
  };
  assignedOfficer?: {
    name: string;
    designation: string;
  } | null;
  attachments: Array<{
    id: string;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize?: number;
    viewUrl?: string;
    downloadUrl?: string;
    createdAt: string;
  }>;
  infoRequests: Array<{
    id: string;
    description: string;
    documentTypes: string | null;
    deadline: string;
    status: string;
    citizenResponse: string | null;
    respondedAt: string | null;
    createdAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changeReason: string | null;
    isSystemGenerated: boolean;
    createdAt: string;
  }>;
}

const statusConfig: Record<
  string,
  { color: string; label: string; icon: React.ElementType }
> = {
  UNSEEN: { color: "gray", label: "Pending Review", icon: Clock },
  SEEN: { color: "blue", label: "Under Review", icon: FileText },
  ACKNOWLEDGED: { color: "blue", label: "Acknowledged", icon: CheckCircle },
  IN_PROGRESS: { color: "yellow", label: "In Progress", icon: Clock },
  PENDING_INFORMATION: {
    color: "orange",
    label: "Information Requested",
    icon: AlertCircle,
  },
  AWAITING_ESCALATION: {
    color: "orange",
    label: "Awaiting Escalation",
    icon: AlertCircle,
  },
  ESCALATED: { color: "purple", label: "Escalated", icon: AlertCircle },
  RESOLVED: { color: "green", label: "Resolved", icon: CheckCircle },
  CLOSED: { color: "green", label: "Closed", icon: CheckCircle },
  CLOSED_NO_RESPONSE: {
    color: "red",
    label: "Closed - No Response",
    icon: XCircle,
  },
  APPEALED: {
    color: "purple",
    label: "Appealed - Under Review by Higher Authority",
    icon: AlertCircle,
  },
  APPEAL_FILED: { color: "purple", label: "Appeal Filed", icon: AlertCircle },
  OVERDUE: { color: "red", label: "Overdue", icon: AlertCircle },
};

const queryTypeConfig = {
  FEEDBACK: { icon: MessageSquare, color: "green" },
  GRIEVANCE: { icon: AlertCircle, color: "red" },
  SUGGESTION: { icon: Lightbulb, color: "amber" },
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ referenceId: string }>;
}) {
  const { referenceId } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [selectedInfoRequestId, setSelectedInfoRequestId] = useState<
    string | null
  >(null);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");

  useEffect(() => {
    fetchTicket();
  }, [referenceId]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(
        `/api/samadhan/tickets?referenceId=${referenceId}`
      );
      const data = await response.json();

      if (data.success) {
        setTicket(data.data);
      } else {
        toast.error("Ticket not found");
        router.push("/samadhan/track");
      }
    } catch (error) {
      toast.error("Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptResolution = async () => {
    if (!ticket) return;

    try {
      const response = await fetch(
        `/api/samadhan/tickets/${ticket.id || ticket.referenceId}/accept`,
        {
          method: "POST",
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success("Resolution accepted. Thank you!");
        fetchTicket();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to accept resolution");
    }
  };

  const handleSubmitInfoResponse = async (requestId: string) => {
    if (!responseText.trim()) {
      toast.error("Please provide a response");
      return;
    }

    if (!ticket) {
      toast.error("Ticket not found");
      return;
    }

    setIsSubmittingResponse(true);
    try {
      // Use ticket.id if available, otherwise use referenceId (API supports both)
      const response = await fetch(
        `/api/samadhan/tickets/${
          ticket.id || referenceId
        }/info-request/${requestId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: responseText }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Response submitted successfully");
        setResponseText("");
        setSelectedInfoRequestId(null);
        fetchTicket();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to submit response");
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleFileAppeal = async () => {
    if (appealReason.length < 20) {
      toast.error(
        "Please provide a detailed reason for appeal (at least 20 characters)"
      );
      return;
    }

    if (!ticket) {
      toast.error("Ticket not found");
      return;
    }

    try {
      const response = await fetch(
        `/api/samadhan/tickets/${ticket.id || referenceId}/appeal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: appealReason }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Appeal filed successfully");
        router.push(`/samadhan/track/${data.data.referenceId}`);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to file appeal");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ticket not found</p>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.UNSEEN;
  const StatusIcon = status.icon;
  const queryConfig = queryTypeConfig[ticket.queryType];
  const QueryIcon = queryConfig.icon;
  const pendingInfoRequest = ticket.infoRequests.find(
    (r) => r.status === "PENDING"
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          href="/samadhan"
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 bg-${queryConfig.color}-100 rounded-lg flex items-center justify-center`}
                >
                  <QueryIcon
                    className={`h-6 w-6 text-${queryConfig.color}-600`}
                  />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {ticket.referenceId}
                  </CardTitle>
                  <CardDescription>
                    {ticket.queryType.charAt(0) +
                      ticket.queryType.slice(1).toLowerCase()}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-${status.color}-600 border-${status.color}-300`}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Section</p>
                  <p className="font-medium">{ticket.section.name}</p>
                </div>
              </div>
              {ticket.serviceAvailed && (
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-medium">{ticket.serviceAvailed}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Submitted On</p>
                  <p className="font-medium">
                    {format(new Date(ticket.createdAt), "PPp")}
                  </p>
                </div>
              </div>
              {ticket.slaDeadline && (
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Expected Resolution</p>
                    <p className="font-medium">
                      {format(new Date(ticket.slaDeadline), "PPp")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Description
              </h3>
              <p className="text-gray-600 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Attachments */}
            {ticket.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Attachments
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ticket.attachments.map((attachment) => {
                      const isImage = attachment.fileType?.startsWith("image/");
                      const isPdf = attachment.fileType === "application/pdf";
                      const viewUrl =
                        attachment.viewUrl ||
                        `/api/samadhan/tickets/${ticket.id}/attachments/${attachment.id}`;
                      const downloadUrl =
                        attachment.downloadUrl || `${viewUrl}?action=download`;

                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center space-x-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              title={attachment.originalName}
                            >
                              {attachment.originalName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {attachment.fileType
                                ?.split("/")[1]
                                ?.toUpperCase() || "File"}
                              {attachment.fileSize &&
                                ` • ${(attachment.fileSize / 1024).toFixed(
                                  1
                                )} KB`}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {(isImage || isPdf) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(viewUrl, "_blank")}
                                title="View"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(downloadUrl, "_blank")}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Resolution Message */}
            {ticket.resolutionMessage && (
              <>
                <Separator />
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolution
                  </h3>
                  <p className="text-green-700 whitespace-pre-wrap">
                    {ticket.resolutionMessage}
                  </p>

                  {/* Action Buttons for Resolved Status */}
                  {ticket.status === "RESOLVED" && (
                    <div className="mt-4 flex gap-3">
                      <Button
                        onClick={handleAcceptResolution}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Accept Resolution
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsAppealModalOpen(true)}
                      >
                        File Appeal
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Information Request Response */}
            {pendingInfoRequest && (
              <>
                <Separator />
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Information Requested
                  </h3>
                  <p className="text-orange-700 mb-3">
                    {pendingInfoRequest.description}
                  </p>
                  <p className="text-sm text-orange-600 mb-4">
                    Deadline:{" "}
                    {format(new Date(pendingInfoRequest.deadline), "PPp")}
                  </p>

                  {selectedInfoRequestId === pendingInfoRequest.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Your response..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleSubmitInfoResponse(pendingInfoRequest.id)
                          }
                          disabled={isSubmittingResponse}
                        >
                          {isSubmittingResponse ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Submit Response
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedInfoRequestId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() =>
                        setSelectedInfoRequestId(pendingInfoRequest.id)
                      }
                    >
                      Respond Now
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status History</CardTitle>
            {ticket.isAppeal && ticket.originalTicket && (
              <CardDescription>
                This is an appeal ticket for {ticket.originalTicket.referenceId}
                . Complete history shown below.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current ticket's status history */}
              {ticket.statusHistory.map((history, index) => {
                const historyStatus =
                  statusConfig[history.toStatus] || statusConfig.UNSEEN;
                const HistoryIcon = historyStatus.icon;

                return (
                  <div key={history.id} className="flex items-start space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center bg-${historyStatus.color}-100`}
                    >
                      <HistoryIcon
                        className={`h-4 w-4 text-${historyStatus.color}-600`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{historyStatus.label}</p>
                      {history.changeReason && (
                        <p className="text-sm text-gray-600 whitespace-pre-line">
                          {history.changeReason}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {format(new Date(history.createdAt), "PPp")}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Original ticket's status history for appeal tickets */}
              {ticket.isAppeal &&
                ticket.originalTicket &&
                ticket.originalTicket.statusHistory && (
                  <>
                    <div className="border-t border-dashed border-gray-300 my-4 pt-4">
                      <p className="text-sm font-medium text-gray-500 mb-4 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Original Ticket History (
                        {ticket.originalTicket.referenceId})
                      </p>
                    </div>
                    {ticket.originalTicket.statusHistory.map(
                      (history, index) => {
                        const historyStatus =
                          statusConfig[history.toStatus] || statusConfig.UNSEEN;
                        const HistoryIcon = historyStatus.icon;

                        return (
                          <div
                            key={`original-${history.id}`}
                            className="flex items-start space-x-3 opacity-80"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center bg-${historyStatus.color}-100`}
                            >
                              <HistoryIcon
                                className={`h-4 w-4 text-${historyStatus.color}-600`}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {historyStatus.label}
                              </p>
                              {history.changeReason && (
                                <p className="text-sm text-gray-600 whitespace-pre-line">
                                  {history.changeReason}
                                </p>
                              )}
                              <p className="text-xs text-gray-400">
                                {format(new Date(history.createdAt), "PPp")}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Appeal Modal */}
        {isAppealModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>File Appeal</CardTitle>
                <CardDescription>
                  If you are not satisfied with the resolution, you can file an
                  appeal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Please explain why you are appealing this resolution..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-gray-500">
                  Minimum 20 characters required
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleFileAppeal} className="flex-1">
                    Submit Appeal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAppealModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
