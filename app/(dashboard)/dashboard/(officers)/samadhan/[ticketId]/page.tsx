"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building,
  Calendar,
  FileText,
  Send,
  Upload,
  Plus,
  Edit2,
  AlertTriangle,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { SLACountdown } from "@/components/samadhan/SLACountdown";

interface TicketDetail {
  id: string;
  referenceId: string;
  queryType: "FEEDBACK" | "GRIEVANCE";
  status: string;
  section: { id: string; name: string };
  subject: string | null;
  serviceAvailed: string | null;
  serviceCategories: string | null;
  visitDate: string | null;
  visitedDC: boolean | null;
  description: string;
  resolutionMessage: string | null;
  isAppeal: boolean;
  originalTicketId: string | null;
  citizen: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  assignedOfficer: { name: string; designation: string } | null;
  escalatedTo: { name: string; designation: string } | null;
  sla: {
    deadline: string | null;
    status: "GREEN" | "YELLOW" | "RED" | "N/A";
    seenAt: string | null;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    breachedAt: string | null;
  };
  attachments: Array<{
    id: string;
    fileName: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    uploadedByType: string;
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
    attachments: Array<{ id: string; fileName: string; originalName: string }>;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changeReason: string | null;
    changedByName: string;
    createdAt: string;
  }>;
  // Original ticket data for appeal tickets
  originalTicket: {
    referenceId: string;
    status: string;
    assignedOfficer?: {
      name: string;
      designation: string;
    } | null;
    statusHistory: Array<{
      id: string;
      fromStatus: string | null;
      toStatus: string;
      changeReason: string | null;
      changedByName: string;
      createdAt: string;
    }>;
  } | null;
  internalNotes: Array<{
    id: string;
    content: string;
    createdAt: string;
    createdBy: { officerProfile: { fullName: string } };
  }>;
  permissions: {
    canEdit: boolean;
    canAddNote: boolean;
    canViewCitizenDetails: boolean;
    canIntervene: boolean;
    isAssignedOfficer: boolean;
    isEscalatedOfficer: boolean;
    isAdmin: boolean;
    isHigherAuthority: boolean;
    isSlaBreached: boolean;
    isOverdue: boolean;
    isAppealed: boolean;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

const statusConfig: Record<
  string,
  {
    color: string;
    label: string;
    icon: React.ElementType;
    textClass: string;
    borderClass: string;
    bgClass: string;
  }
> = {
  UNSEEN: {
    color: "gray",
    label: "Unseen",
    icon: Clock,
    textClass: "text-gray-600",
    borderClass: "border-gray-300",
    bgClass: "bg-gray-100",
  },
  SEEN: {
    color: "blue",
    label: "Seen",
    icon: FileText,
    textClass: "text-blue-600",
    borderClass: "border-blue-300",
    bgClass: "bg-blue-100",
  },
  ACKNOWLEDGED: {
    color: "blue",
    label: "Acknowledged",
    icon: CheckCircle,
    textClass: "text-blue-600",
    borderClass: "border-blue-300",
    bgClass: "bg-blue-100",
  },
  IN_PROGRESS: {
    color: "yellow",
    label: "In Progress",
    icon: Clock,
    textClass: "text-yellow-600",
    borderClass: "border-yellow-300",
    bgClass: "bg-yellow-100",
  },
  PENDING_INFORMATION: {
    color: "orange",
    label: "Pending Information",
    icon: AlertCircle,
    textClass: "text-orange-600",
    borderClass: "border-orange-300",
    bgClass: "bg-orange-100",
  },
  AWAITING_ESCALATION: {
    color: "orange",
    label: "Awaiting Escalation",
    icon: AlertTriangle,
    textClass: "text-orange-600",
    borderClass: "border-orange-300",
    bgClass: "bg-orange-100",
  },
  ESCALATED: {
    color: "purple",
    label: "Escalated",
    icon: AlertTriangle,
    textClass: "text-purple-600",
    borderClass: "border-purple-300",
    bgClass: "bg-purple-100",
  },
  RESOLVED: {
    color: "green",
    label: "Resolved",
    icon: CheckCircle,
    textClass: "text-green-600",
    borderClass: "border-green-300",
    bgClass: "bg-green-100",
  },
  CLOSED: {
    color: "green",
    label: "Closed",
    icon: CheckCircle,
    textClass: "text-green-600",
    borderClass: "border-green-300",
    bgClass: "bg-green-100",
  },
  CLOSED_NO_RESPONSE: {
    color: "red",
    label: "Closed - No Response",
    icon: XCircle,
    textClass: "text-red-600",
    borderClass: "border-red-300",
    bgClass: "bg-red-100",
  },
  APPEALED: {
    color: "purple",
    label: "Appealed - Under Higher Authority Review",
    icon: AlertTriangle,
    textClass: "text-purple-600",
    borderClass: "border-purple-300",
    bgClass: "bg-purple-100",
  },
  APPEAL_FILED: {
    color: "purple",
    label: "Appeal Filed",
    icon: AlertTriangle,
    textClass: "text-purple-600",
    borderClass: "border-purple-300",
    bgClass: "bg-purple-100",
  },
  OVERDUE: {
    color: "red",
    label: "Overdue",
    icon: AlertTriangle,
    textClass: "text-red-600",
    borderClass: "border-red-300",
    bgClass: "bg-red-100",
  },
};

const queryTypeConfig = {
  FEEDBACK: {
    icon: MessageSquare,
    color: "green",
    label: "Feedback",
    textClass: "text-green-600",
    bgClass: "bg-green-100",
  },
  GRIEVANCE: {
    icon: AlertCircle,
    color: "red",
    label: "Grievance",
    textClass: "text-red-600",
    bgClass: "bg-red-100",
  },
};

export default function OfficerTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isInfoRequestDialogOpen, setIsInfoRequestDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [infoRequestDescription, setInfoRequestDescription] = useState("");
  const [infoRequestDeadline, setInfoRequestDeadline] = useState(7);
  const [noteContent, setNoteContent] = useState("");
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapsible sections
  const [showNotes, setShowNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/samadhan/tickets/${ticketId}`);
      const data = await response.json();

      if (data.success) {
        // The API automatically changes UNSEEN to SEEN when viewed
        // and returns the updated status, so we just use the data directly
        setTicket(data.data);
      } else {
        toast.error("Ticket not found");
        router.push("/dashboard/samadhan");
      }
    } catch (error) {
      toast.error("Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: string, message?: string) => {
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = { status };
      if (message) body.message = message;
      if (status === "RESOLVED") body.resolutionMessage = resolutionMessage;

      const response = await fetch(`/api/samadhan/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Status updated successfully");
        fetchTicket();
        setIsStatusDialogOpen(false);
        setIsResolveDialogOpen(false);
        setStatusMessage("");
        setResolutionMessage("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createInfoRequest = async () => {
    if (!infoRequestDescription.trim()) {
      toast.error("Please describe what information you need");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/samadhan/tickets/${ticketId}/info-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: infoRequestDescription,
            deadlineDays: infoRequestDeadline,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Information request sent to citizen");
        fetchTicket();
        setIsInfoRequestDialogOpen(false);
        setInfoRequestDescription("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to create info request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Please enter note content");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/samadhan/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Note added");
        fetchTicket();
        setIsNoteDialogOpen(false);
        setNoteContent("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p>Ticket not found</p>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.UNSEEN;
  const StatusIcon = status.icon;
  const queryConfig = queryTypeConfig[ticket.queryType];
  const QueryIcon = queryConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/samadhan">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold break-all">
                {ticket.referenceId}
              </h1>
              <Badge variant="outline" className={queryConfig.textClass}>
                {queryConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={
                  ticket.queryType === "FEEDBACK"
                    ? "text-green-600 border-green-300"
                    : `${status.textClass} ${status.borderClass}`
                }
              >
                {ticket.queryType === "FEEDBACK" ? "Submitted" : status.label}
              </Badge>
              {ticket.sla.status === "RED" &&
                ticket.queryType !== "FEEDBACK" && (
                  <Badge variant="destructive">SLA Breached</Badge>
                )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Submitted {format(new Date(ticket.timestamps.createdAt), "PPp")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap ml-14 sm:ml-0">
          {ticket.queryType !== "FEEDBACK" &&
            ticket.permissions.canEdit &&
            ticket.status !== "UNSEEN" && (
              <>
                <Dialog
                  open={isInfoRequestDialogOpen}
                  onOpenChange={setIsInfoRequestDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Request Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Additional Information</DialogTitle>
                      <DialogDescription>
                        Ask the citizen to provide additional information or
                        documents.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>What information do you need?</Label>
                        <Textarea
                          value={infoRequestDescription}
                          onChange={(e) =>
                            setInfoRequestDescription(e.target.value)
                          }
                          placeholder="Please describe what information or documents you need from the citizen..."
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label>Response Deadline (days)</Label>
                        <Select
                          value={infoRequestDeadline.toString()}
                          onValueChange={(v) =>
                            setInfoRequestDeadline(parseInt(v))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="5">5 days</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsInfoRequestDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createInfoRequest}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Send Request
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isResolveDialogOpen}
                  onOpenChange={setIsResolveDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Resolve Ticket</DialogTitle>
                      <DialogDescription>
                        Provide a detailed resolution message to the citizen
                        (minimum 100 characters).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea
                        value={resolutionMessage}
                        onChange={(e) => setResolutionMessage(e.target.value)}
                        placeholder="Explain what action was taken and the resolution..."
                        rows={6}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {resolutionMessage.length}/100 minimum characters
                      </p>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsResolveDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => updateStatus("RESOLVED")}
                        disabled={
                          isSubmitting || resolutionMessage.length < 100
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Resolve Ticket
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
        </div>
      </div>

      {/* Higher Authority Intervention Notice */}
      {ticket.queryType !== "FEEDBACK" &&
        ticket.permissions.isHigherAuthority &&
        ticket.permissions.canIntervene && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-purple-900">
                    Higher Authority Intervention Available
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    As a higher authority, you can take action on this ticket.
                    {ticket.permissions.isAppealed &&
                      " This ticket has been appealed and requires higher authority review."}
                    {ticket.permissions.isSlaBreached &&
                      " SLA has been breached - immediate action required."}
                    {ticket.permissions.isOverdue &&
                      !ticket.permissions.isSlaBreached &&
                      " This ticket is overdue and needs attention."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Query Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject/Title if provided */}
              {ticket.subject && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">
                    Subject/Issue Title
                  </p>
                  <p className="font-semibold text-gray-900">
                    {ticket.subject}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {ticket.queryType !== "FEEDBACK" && (
                  <div className="flex items-start space-x-3">
                    <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Section</p>
                      <p className="font-medium">{ticket.section.name}</p>
                    </div>
                  </div>
                )}
                {ticket.serviceAvailed && (
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Service</p>
                      <p className="font-medium">{ticket.serviceAvailed}</p>
                    </div>
                  </div>
                )}
                {ticket.serviceCategories && (
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Service Category</p>
                      <p className="font-medium">{ticket.serviceCategories}</p>
                    </div>
                  </div>
                )}
                {ticket.visitDate && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Visit Date</p>
                      <p className="font-medium">
                        {format(new Date(ticket.visitDate), "PPP")}
                        {ticket.visitedDC && (
                          <span className="text-green-600 ml-2">
                            (Visited DC Office)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {ticket.queryType !== "FEEDBACK" && ticket.sla.deadline && (
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">SLA Deadline</p>
                      <SLACountdown
                        deadline={ticket.sla.deadline}
                        status={ticket.status}
                        size="md"
                        showLabel={true}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-500 mb-2">Description</p>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* UNSEEN Status Notice */}
              {ticket.queryType !== "FEEDBACK" &&
                ticket.status === "UNSEEN" && (
                  <>
                    <Separator />
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-800">
                            New Ticket - Awaiting Review
                          </p>
                          <p className="text-sm text-blue-600">
                            SLA tracking will start when you view the ticket
                            details. Status will automatically change to
                            &quot;Seen&quot;.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              {/* Appeal Information */}
              {ticket.isAppeal && ticket.originalTicketId && (
                <>
                  <Separator />
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-orange-800">
                          Appeal Ticket
                        </p>
                        <p className="text-sm text-orange-600 mb-2">
                          This is an appeal for a previously resolved/rejected
                          ticket
                        </p>
                        {ticket.originalTicket && (
                          <div className="bg-white/50 rounded p-3 mt-2 text-sm">
                            <p className="text-gray-700">
                              <span className="font-medium">
                                Original Ticket:
                              </span>{" "}
                              {ticket.originalTicket.referenceId}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-medium">
                                Original Status:
                              </span>{" "}
                              <Badge variant="outline" className="ml-1">
                                {ticket.originalTicket.status}
                              </Badge>
                            </p>
                            {ticket.originalTicket.assignedOfficer && (
                              <p className="text-gray-700">
                                <span className="font-medium">
                                  Previously Assigned To:
                                </span>{" "}
                                {ticket.originalTicket.assignedOfficer.name}
                                {ticket.originalTicket.assignedOfficer
                                  .designation && (
                                  <span className="text-gray-500">
                                    {" "}
                                    (
                                    {
                                      ticket.originalTicket.assignedOfficer
                                        .designation
                                    }
                                    )
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Attachments */}
              {ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500 mb-3">
                      Attachments ({ticket.attachments.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ticket.attachments.map((attachment) => {
                        const isImage =
                          attachment.fileType?.startsWith("image/");
                        const isPdf = attachment.fileType === "application/pdf";
                        const viewUrl =
                          attachment.viewUrl ||
                          `/api/samadhan/tickets/${ticket.id}/attachments/${attachment.id}`;
                        const downloadUrl =
                          attachment.downloadUrl ||
                          `${viewUrl}?action=download`;

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
                                  ?.toUpperCase() || "File"}{" "}
                                • {(attachment.fileSize / 1024).toFixed(1)} KB
                                {attachment.uploadedByType &&
                                  ` • ${
                                    attachment.uploadedByType === "OFFICER"
                                      ? "Officer"
                                      : "Citizen"
                                  }`}
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
                                onClick={() =>
                                  window.open(downloadUrl, "_blank")
                                }
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
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <p className="font-medium text-green-800">Resolution</p>
                    </div>
                    <p className="text-green-700 whitespace-pre-wrap">
                      {ticket.resolutionMessage}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Info Requests */}
          {ticket.infoRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Information Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.infoRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 rounded-lg border ${
                      request.status === "PENDING"
                        ? "bg-orange-50 border-orange-200"
                        : request.status === "RESPONDED"
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={
                          request.status === "PENDING"
                            ? "text-orange-600 border-orange-300"
                            : request.status === "RESPONDED"
                              ? "text-green-600 border-green-300"
                              : "text-gray-600"
                        }
                      >
                        {request.status}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        {format(new Date(request.createdAt), "PP")}
                      </p>
                    </div>
                    <p className="mb-2">{request.description}</p>
                    <p className="text-sm text-gray-500">
                      Deadline: {format(new Date(request.deadline), "PP")}
                    </p>
                    {request.citizenResponse && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-1">
                          Citizen Response:
                        </p>
                        <p className="text-sm">{request.citizenResponse}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Internal Notes */}
          {ticket.permissions.canAddNote && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowNotes(!showNotes)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Internal Notes ({ticket.internalNotes.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Dialog
                      open={isNoteDialogOpen}
                      onOpenChange={setIsNoteDialogOpen}
                    >
                      <DialogTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Internal Note</DialogTitle>
                          <DialogDescription>
                            Notes are only visible to officers and
                            administrators.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Enter your note..."
                            rows={4}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsNoteDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={addNote} disabled={isSubmitting}>
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Add Note
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {showNotes ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {showNotes && (
                <CardContent className="space-y-3">
                  {ticket.internalNotes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No internal notes yet
                    </p>
                  ) : (
                    ticket.internalNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">
                            {note.createdBy?.officerProfile?.fullName ||
                              "Officer"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(note.createdAt), "PPp")}
                          </p>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Citizen Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Citizen Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.citizen ? (
                <>
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">
                        {ticket.citizen.name || "Not provided"}
                      </p>
                    </div>
                  </div>
                  {ticket.permissions.canViewCitizenDetails && (
                    <>
                      {ticket.citizen.phone && (
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">
                              {ticket.citizen.phone}
                            </p>
                          </div>
                        </div>
                      )}
                      {ticket.citizen.email && (
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">
                              {ticket.citizen.email}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Anonymous submission</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Status Update */}
          {ticket.queryType !== "FEEDBACK" &&
            ticket.permissions.canEdit &&
            ticket.status !== "UNSEEN" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Show appropriate status options based on current status */}
                  {ticket.status === "UNSEEN" && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updateStatus("SEEN")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Mark as Seen
                    </Button>
                  )}
                  {["ACKNOWLEDGED", "IN_PROGRESS"].map((s) => {
                    const statusConf = statusConfig[s];
                    return (
                      <Button
                        key={s}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => updateStatus(s)}
                        disabled={ticket.status === s}
                      >
                        <statusConf.icon className="h-4 w-4 mr-2" />
                        Mark as {statusConf.label}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

          {/* Status History */}
          {ticket.queryType !== "FEEDBACK" && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowHistory(!showHistory)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Status History</CardTitle>
                  {showHistory ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
                {ticket.isAppeal && ticket.originalTicket && (
                  <CardDescription className="text-xs">
                    Appeal for {ticket.originalTicket.referenceId} - Complete
                    history shown below
                  </CardDescription>
                )}
              </CardHeader>
              {showHistory && (
                <CardContent>
                  <div className="space-y-4">
                    {ticket.statusHistory.map((history, index) => {
                      const historyStatus =
                        statusConfig[history.toStatus] || statusConfig.UNSEEN;
                      const HistoryIcon = historyStatus.icon;

                      return (
                        <div
                          key={history.id}
                          className="flex items-start space-x-3"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${historyStatus.bgClass} flex-shrink-0`}
                          >
                            <HistoryIcon
                              className={`h-4 w-4 ${historyStatus.textClass}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {historyStatus.label}
                            </p>
                            {history.changeReason && (
                              <p className="text-xs text-gray-600 whitespace-pre-line">
                                {history.changeReason}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              {history.changedByName} •{" "}
                              {format(new Date(history.createdAt), "PP")}
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
                                statusConfig[history.toStatus] ||
                                statusConfig.UNSEEN;
                              const HistoryIcon = historyStatus.icon;

                              return (
                                <div
                                  key={`original-${history.id}`}
                                  className="flex items-start space-x-3 opacity-80"
                                >
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${historyStatus.bgClass} flex-shrink-0`}
                                  >
                                    <HistoryIcon
                                      className={`h-4 w-4 ${historyStatus.textClass}`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">
                                      {historyStatus.label}
                                    </p>
                                    {history.changeReason && (
                                      <p className="text-xs text-gray-600 whitespace-pre-line">
                                        {history.changeReason}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                      {history.changedByName} •{" "}
                                      {format(
                                        new Date(history.createdAt),
                                        "PP",
                                      )}
                                    </p>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </>
                      )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
