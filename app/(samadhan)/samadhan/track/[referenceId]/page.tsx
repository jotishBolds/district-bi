"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
  Send,
  Loader2,
  Download,
  Calendar,
  User,
  Building,
  Lock,
  Shield,
  Phone,
  LogIn,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

interface TicketData {
  id: string;
  referenceId: string;
  queryType: "FEEDBACK" | "GRIEVANCE";
  status: string;
  section: { id: string; name: string };
  serviceAvailed: string | null;
  description: string;
  resolutionMessage: string | null;
  createdAt: string;
  slaDeadline: string | null;
  isAppeal?: boolean;
  citizenId?: string | null; // Track if ticket belongs to registered user
  citizenPhone?: string | null; // Masked phone for verification
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
    label: "Pending Review",
    icon: Clock,
    textClass: "text-gray-600",
    borderClass: "border-gray-300",
    bgClass: "bg-gray-100",
  },
  SEEN: {
    color: "blue",
    label: "Under Review",
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
    label: "Information Requested",
    icon: AlertCircle,
    textClass: "text-orange-600",
    borderClass: "border-orange-300",
    bgClass: "bg-orange-100",
  },
  AWAITING_ESCALATION: {
    color: "orange",
    label: "Awaiting Escalation",
    icon: AlertCircle,
    textClass: "text-orange-600",
    borderClass: "border-orange-300",
    bgClass: "bg-orange-100",
  },
  ESCALATED: {
    color: "purple",
    label: "Escalated",
    icon: AlertCircle,
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
    label: "Appealed - Under Review by Higher Authority",
    icon: AlertCircle,
    textClass: "text-purple-600",
    borderClass: "border-purple-300",
    bgClass: "bg-purple-100",
  },
  APPEAL_FILED: {
    color: "purple",
    label: "Appeal Filed",
    icon: AlertCircle,
    textClass: "text-purple-600",
    borderClass: "border-purple-300",
    bgClass: "bg-purple-100",
  },
  OVERDUE: {
    color: "red",
    label: "Overdue",
    icon: AlertCircle,
    textClass: "text-red-600",
    borderClass: "border-red-300",
    bgClass: "bg-red-100",
  },
};

const queryTypeConfig = {
  FEEDBACK: {
    icon: MessageSquare,
    color: "green",
    textClass: "text-green-600",
    bgClass: "bg-green-100",
  },
  GRIEVANCE: {
    icon: AlertCircle,
    color: "red",
    textClass: "text-red-600",
    bgClass: "bg-red-100",
  },
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ referenceId: string }>;
}) {
  const { referenceId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useSamadhanI18n();
  const isPreVerified = searchParams.get("verified") === "true";
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

  // Attachment upload state
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showAddAttachmentSection, setShowAddAttachmentSection] =
    useState(false);

  // Session and attachment access state
  const [samadhanSession, setSamadhanSession] = useState<{
    userId: string;
    phone: string;
    name: string;
  } | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [attachmentAccessToken, setAttachmentAccessToken] = useState<
    string | null
  >(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isGuestTicket, setIsGuestTicket] = useState(false);
  const [ticketOwnerPhone, setTicketOwnerPhone] = useState<string | null>(null);
  const [isOwnerVerified, setIsOwnerVerified] = useState(false); // Track if ownership is verified
  const [showOwnershipVerifyModal, setShowOwnershipVerifyModal] =
    useState(false); // Modal for ownership verification

  // Check SAMADHAN session on mount (but don't require login)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/samadhan/auth?action=session");
        const data = await response.json();
        if (data.authenticated && data.session) {
          setSamadhanSession(data.session);
        }
        // Don't redirect if not logged in - allow tracking with OTP verification
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [referenceId, router]);

  useEffect(() => {
    // Wait for session check to complete before fetching ticket
    if (!isCheckingSession) {
      fetchTicket();
    }
  }, [referenceId, isCheckingSession, samadhanSession]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(
        `/api/samadhan/tickets?referenceId=${referenceId}`,
      );
      const data = await response.json();

      if (data.success) {
        // Block feedback tickets from being tracked
        if (data.data.queryType === "FEEDBACK") {
          toast.error(t("home.feedbackCannotBeTracked"));
          router.push("/samadhan");
          return;
        }

        setTicket(data.data);
        // Check if this is a guest ticket (no citizenId)
        setIsGuestTicket(!data.data.citizenId);
        setTicketOwnerPhone(data.data.citizenPhone || null);

        // Always grant access to view ticket details and attachments
        // Generate access token for all users viewing via tracking link
        const token = `${data.data.referenceId}:public:${Date.now()}:verified`;
        setAttachmentAccessToken(token);
        setIsOwnerVerified(true); // Auto-verify - anyone with tracking ID can view
      } else {
        toast.error(t("ticket.ticketNotFound"));
        router.push("/samadhan");
      }
    } catch (error) {
      toast.error(t("ticket.failedLoad"));
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP for attachment verification
  const handleSendVerificationOtp = async () => {
    if (!verifyPhone || verifyPhone.length < 10) {
      toast.error(t("login.invalidPhone"));
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch("/api/samadhan/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: verifyPhone,
          action: "send-otp",
          verifyOnly: true, // Just verify, don't create session
          referenceId: ticket?.referenceId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
        toast.success(t("login.otpSent"));
      } else {
        toast.error(data.message || t("login.failedSendOtp"));
      }
    } catch (error) {
      toast.error(t("login.failedSendOtp"));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP for attachment access
  const handleVerifyOtp = async () => {
    if (!verifyOtp || verifyOtp.length !== 6) {
      toast.error(t("ticket.invalidOtp"));
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/samadhan/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: verifyPhone,
          otp: verifyOtp,
          action: "verify-otp",
          verifyOnly: true,
          referenceId: ticket?.referenceId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Generate attachment access token
        const token = `${
          ticket?.referenceId
        }:${verifyPhone}:${Date.now()}:verified`;
        setAttachmentAccessToken(token);
        setShowVerifyModal(false);
        setShowOwnershipVerifyModal(false); // Close ownership modal too
        setIsOwnerVerified(true); // Mark ownership as verified
        toast.success(t("ticket.verifiedAccess"));

        // Reset verification state
        setVerifyOtp("");
        setOtpSent(false);
      } else {
        toast.error(data.message || t("ticket.invalidOtp"));
      }
    } catch (error) {
      toast.error(t("ticket.verificationFailed"));
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle attachment click
  const handleAttachmentClick = async (
    attachment: TicketData["attachments"][0],
    action: "view" | "download",
  ) => {
    // If user has access token, open directly
    if (attachmentAccessToken || samadhanSession) {
      const baseUrl = `/api/samadhan/tickets/${ticket?.id}/attachments/${attachment.id}`;
      const url = attachmentAccessToken
        ? `${baseUrl}?trackingToken=${encodeURIComponent(
            attachmentAccessToken,
          )}${action === "download" ? "&action=download" : ""}`
        : `${baseUrl}${action === "download" ? "?action=download" : ""}`;
      window.open(url, "_blank");
      return;
    }

    // Guest ticket - show message
    if (isGuestTicket) {
      toast.error(
        "You submitted this as a guest. Attachments are only available to registered users. Please register to access full features.",
        { duration: 5000 },
      );
      return;
    }

    // Registered ticket but not logged in - prompt for verification
    setShowVerifyModal(true);
  };

  // Handle attachment file selection
  const handleAttachmentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newFiles = Array.from(e.target.files || []);
    const validFiles = newFiles.filter((file) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "video/mp4",
        "video/quicktime",
      ];
      const maxSize = file.type.startsWith("video/")
        ? 50 * 1024 * 1024
        : 10 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: File type not supported`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large`);
        return false;
      }
      return true;
    });

    setNewAttachments((prev) => [...prev, ...validFiles]);
  };

  // Remove selected attachment
  const removeNewAttachment = (index: number) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload new attachments
  const handleUploadAttachments = async () => {
    if (!ticket || newAttachments.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      for (const file of newAttachments) {
        const formData = new FormData();
        formData.append("file", file);

        // Include tracking token for guest uploads
        if (attachmentAccessToken) {
          formData.append("trackingToken", attachmentAccessToken);
        }

        const response = await fetch(
          `/api/samadhan/tickets/${ticket.id}/attachments`,
          {
            method: "POST",
            body: formData,
          },
        );

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || `Failed to upload ${file.name}`);
        }
      }

      toast.success(
        `${newAttachments.length} attachment(s) uploaded successfully`,
      );
      setNewAttachments([]);
      setShowAddAttachmentSection(false);
      // Refresh ticket to show new attachments
      fetchTicket();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Upload failed");
      toast.error(err.message);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAcceptResolution = async () => {
    if (!ticket) return;

    try {
      // Build headers - include verification info for OTP-verified users
      const headers: Record<string, string> = {};
      if (isPreVerified) {
        headers["x-preverified"] = "true";
      }
      if (attachmentAccessToken) {
        headers["x-tracking-token"] = attachmentAccessToken;
      }

      const response = await fetch(
        `/api/samadhan/tickets/${ticket.id || ticket.referenceId}/accept`,
        {
          method: "POST",
          headers,
        },
      );
      const data = await response.json();

      if (data.success) {
        toast.success(t("ticket.resolutionAccepted"));
        fetchTicket();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(t("ticket.failedAcceptResolution"));
    }
  };

  const handleSubmitInfoResponse = async (requestId: string) => {
    if (!responseText.trim()) {
      toast.error(t("ticket.provideResponse"));
      return;
    }

    if (!ticket) {
      toast.error(t("ticket.ticketNotFound"));
      return;
    }

    setIsSubmittingResponse(true);
    try {
      // Build headers - include verification info for OTP-verified users
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // If user is pre-verified via OTP or has access token, include it
      if (isPreVerified) {
        headers["x-preverified"] = "true";
      }
      if (attachmentAccessToken) {
        headers["x-tracking-token"] = attachmentAccessToken;
      }

      // Use ticket.id if available, otherwise use referenceId (API supports both)
      const response = await fetch(
        `/api/samadhan/tickets/${
          ticket.id || referenceId
        }/info-request/${requestId}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ response: responseText }),
        },
      );

      const data = await response.json();

      if (data.success) {
        toast.success(t("ticket.responseSubmitted"));
        setResponseText("");
        setSelectedInfoRequestId(null);
        fetchTicket();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(t("ticket.failedSubmitResponse"));
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleFileAppeal = async () => {
    if (appealReason.length < 20) {
      toast.error(t("ticket.appealReasonMin"));
      return;
    }

    if (!ticket) {
      toast.error("Ticket not found");
      return;
    }

    try {
      // Build headers - include verification info for OTP-verified users
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (isPreVerified) {
        headers["x-preverified"] = "true";
      }
      if (attachmentAccessToken) {
        headers["x-tracking-token"] = attachmentAccessToken;
      }

      const response = await fetch(
        `/api/samadhan/tickets/${ticket.id || referenceId}/appeal`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ reason: appealReason }),
        },
      );

      const data = await response.json();

      if (data.success) {
        toast.success(t("ticket.appealFiled"));
        router.push(`/samadhan/track/${data.data.referenceId}`);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(t("ticket.failedFileAppeal"));
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
        <p>{t("ticket.ticketNotFound")}</p>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.UNSEEN;
  const StatusIcon = status.icon;
  const queryConfig = queryTypeConfig[ticket.queryType];
  const QueryIcon = queryConfig.icon;
  const pendingInfoRequest = ticket.infoRequests.find(
    (r) => r.status === "PENDING",
  );

  // Show verification required screen if not the owner and not verified
  // This applies to both logged-in users who don't own the ticket AND non-logged-in users
  if (!isOwnerVerified && showOwnershipVerifyModal) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Link
            href="/samadhan"
            className="inline-flex items-center text-sm text-gray-600 hover:text-green-600 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle>{t("ticket.verificationRequired")}</CardTitle>
              <CardDescription>
                {t("ticket.verificationRequiredDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Ticket:{" "}
                  <span className="font-semibold">{ticket.referenceId}</span>
                </p>
                {ticketOwnerPhone && (
                  <p className="text-xs text-gray-500 mt-1">
                    Registered phone:{" "}
                    {ticketOwnerPhone.length > 4
                      ? `${ticketOwnerPhone.slice(0, 2)}${"*".repeat(ticketOwnerPhone.length - 4)}${ticketOwnerPhone.slice(-2)}`
                      : ticketOwnerPhone}
                  </p>
                )}
              </div>

              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t("ticket.phoneNumber")}
                    </label>
                    <div className="flex space-x-2">
                      <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md text-sm">
                        +91
                      </span>
                      <Input
                        type="tel"
                        value={verifyPhone}
                        onChange={(e) =>
                          setVerifyPhone(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        placeholder={t("ticket.enterPhoneNumber")}
                        className="rounded-l-none"
                        maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {t("ticket.enterPhoneUsed")}
                    </p>
                  </div>
                  <Button
                    onClick={handleSendVerificationOtp}
                    disabled={isSendingOtp || verifyPhone.length < 10}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("login.sendingOtp")}
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4 mr-2" />
                        {t("ticket.sendOtp")}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-center block">
                      {t("ticket.enterOtp")}
                    </label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={verifyOtp}
                        onChange={setVerifyOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || verifyOtp.length !== 6}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("login.verifying")}
                      </>
                    ) : (
                      t("ticket.verifyOtp")
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOtpSent(false);
                      setVerifyOtp("");
                    }}
                    className="w-full text-sm"
                  >
                    {t("login.changeNumber")}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          href="/samadhan"
          className="inline-flex items-center text-sm text-gray-600 hover:text-green-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Feedback notice */}
        {ticket.queryType === "FEEDBACK" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  {t("ticket.feedbackSubmitted")}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {t("ticket.feedbackMessage")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 ${queryConfig.bgClass} rounded-lg flex items-center justify-center`}
                >
                  <QueryIcon className={`h-6 w-6 ${queryConfig.textClass}`} />
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
              {/* Status badge - For feedback, always show "Submitted", for grievance show actual status */}
              {ticket.queryType === "FEEDBACK" ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-300"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Submitted
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={`${status.textClass} ${status.borderClass}`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Ticket Summary Card */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t("ticket.ticketDetails")}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Query Type */}
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      ticket.queryType === "GRIEVANCE"
                        ? "bg-red-100"
                        : ticket.queryType === "FEEDBACK"
                          ? "bg-green-100"
                          : "bg-amber-100"
                    }`}
                  >
                    <QueryIcon
                      className={`h-5 w-5 ${
                        ticket.queryType === "GRIEVANCE"
                          ? "text-red-600"
                          : ticket.queryType === "FEEDBACK"
                            ? "text-green-600"
                            : "text-amber-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {t("ticket.queryType")}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {ticket.queryType.charAt(0) +
                        ticket.queryType.slice(1).toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Section */}
                {ticket.queryType === "GRIEVANCE" && (
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100">
                      <Building className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {t("ticket.sectionDepartment")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {ticket.section.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Service */}
                {ticket.serviceAvailed && (
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {t("ticket.serviceSelected")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {ticket.serviceAvailed}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submitted Date */}
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {t("ticket.submittedOn")}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(ticket.createdAt), "PPp")}
                    </p>
                  </div>
                </div>

                {/* SLA Deadline */}
                {ticket.queryType !== "FEEDBACK" && ticket.slaDeadline && (
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {t("ticket.expectedResolution")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(ticket.slaDeadline), "PPp")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Assigned Officer */}
                {ticket.assignedOfficer && (
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm sm:col-span-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {t("ticket.assignedOfficer")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {ticket.assignedOfficer.name}
                        {ticket.assignedOfficer.designation && (
                          <span className="text-gray-500 font-normal text-sm ml-1">
                            ({ticket.assignedOfficer.designation})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {t("ticket.description")}
              </h3>
              <p className="text-gray-600 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Attachments */}
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  {t("ticket.attachments")}
                </h3>
                {ticket.attachments.length > 0 && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {ticket.attachments.length} file(s) attached
                  </span>
                )}
              </div>

              {/* Existing attachments */}
              {ticket.attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {ticket.attachments.map((attachment) => {
                    const isImage = attachment.fileType?.startsWith("image/");
                    const isPdf = attachment.fileType === "application/pdf";

                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center space-x-2 p-3 rounded-lg transition-colors bg-gray-50 hover:bg-gray-100"
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
                                1,
                              )} KB`}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {(isImage || isPdf) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleAttachmentClick(attachment, "view")
                              }
                              title="View"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAttachmentClick(attachment, "download")
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
              )}

              {/* No attachments message */}
              {ticket.attachments.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No attachments were added
                </p>
              )}

              {/* Add Attachment Section - Hidden for tracking view */}
              {false && showAddAttachmentSection && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Add Supporting Documents
                  </h4>

                  {/* File input */}
                  <div className="mb-3">
                    <label className="block">
                      <input
                        type="file"
                        multiple
                        onChange={handleAttachmentFileChange}
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,video/mp4,video/quicktime"
                      />
                      <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors bg-white">
                        <Upload className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-blue-700">
                          Click to select files or drag and drop
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                          Images, PDF, Word docs, Videos (max 10MB, videos 50MB)
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Selected files preview */}
                  {newAttachments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <p className="text-xs text-blue-700 font-medium">
                        Selected files:
                      </p>
                      {newAttachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white rounded-lg p-2 border border-blue-100"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNewAttachment(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUploadAttachments}
                      disabled={
                        newAttachments.length === 0 || isUploadingAttachment
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isUploadingAttachment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload{" "}
                          {newAttachments.length > 0
                            ? `(${newAttachments.length})`
                            : ""}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddAttachmentSection(false);
                        setNewAttachments([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Resolution Message - Only for GRIEVANCE */}
            {ticket.queryType === "GRIEVANCE" && ticket.resolutionMessage && (
              <>
                <Separator />
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("ticket.resolution")}
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
                        {t("ticket.acceptResolution")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsAppealModalOpen(true)}
                      >
                        {t("ticket.fileAppeal")}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Information Request Response - Only for GRIEVANCE */}
            {ticket.queryType === "GRIEVANCE" && pendingInfoRequest && (
              <>
                <Separator />
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {t("ticket.informationRequested")}
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
                          {t("ticket.submitResponse")}
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
                      {t("ticket.respondNow")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status Timeline - Only for GRIEVANCE */}
        {ticket.queryType === "GRIEVANCE" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("ticket.statusHistory")}
              </CardTitle>
              {ticket.isAppeal && ticket.originalTicket && (
                <CardDescription>
                  This is an appeal ticket for{" "}
                  {ticket.originalTicket.referenceId}. Complete history shown
                  below.
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
                    <div
                      key={history.id}
                      className="flex items-start space-x-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${historyStatus.bgClass}`}
                      >
                        <HistoryIcon
                          className={`h-4 w-4 ${historyStatus.textClass}`}
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
                            statusConfig[history.toStatus] ||
                            statusConfig.UNSEEN;
                          const HistoryIcon = historyStatus.icon;

                          return (
                            <div
                              key={`original-${history.id}`}
                              className="flex items-start space-x-3 opacity-80"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${historyStatus.bgClass}`}
                              >
                                <HistoryIcon
                                  className={`h-4 w-4 ${historyStatus.textClass}`}
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
                        },
                      )}
                    </>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appeal Modal - Only for GRIEVANCE */}
        {ticket.queryType === "GRIEVANCE" && isAppealModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{t("ticket.fileAppeal")}</CardTitle>
                <CardDescription>{t("ticket.fileAppealDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Please explain why you are appealing this resolution..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-gray-500">
                  {t("ticket.minCharsRequired")}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleFileAppeal} className="flex-1">
                    {t("ticket.submitAppeal")}
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

        {/* OTP Verification Modal for Attachments */}
        <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <DialogTitle className="text-center">
                {t("otp.verifyIdentity")}
              </DialogTitle>
              <DialogDescription className="text-center">
                {ticketOwnerPhone ? (
                  <>
                    {t("ticket.enterPhoneVerify")} ({ticketOwnerPhone})
                  </>
                ) : (
                  <>{t("ticket.enterPhoneOwnership")}</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("ticket.phoneNumber")}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="tel"
                        placeholder={t("ticket.enterPhoneNumber")}
                        value={verifyPhone}
                        onChange={(e) =>
                          setVerifyPhone(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        className="pl-10"
                        maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {t("ticket.enterPhoneUsed")}
                    </p>
                  </div>
                  <Button
                    onClick={handleSendVerificationOtp}
                    disabled={isSendingOtp || verifyPhone.length < 10}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-center block">
                      Enter OTP
                    </label>
                    <p className="text-xs text-gray-500 text-center mb-4">
                      We&apos;ve sent a 6-digit code to {verifyPhone}
                    </p>
                    <div className="flex justify-center">
                      <InputOTP
                        value={verifyOtp}
                        onChange={setVerifyOtp}
                        maxLength={6}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="border-green-200 focus:border-green-500"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || verifyOtp.length !== 6}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Access"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOtpSent(false);
                      setVerifyOtp("");
                    }}
                    className="w-full"
                  >
                    Change Phone Number
                  </Button>
                </>
              )}

              <div className="text-center pt-2 border-t">
                <p className="text-xs text-gray-500 mb-2">
                  Or login to your account for full access
                </p>
                <Link href="/samadhan/login">
                  <Button variant="outline" size="sm" className="gap-1">
                    <LogIn className="h-3 w-3" />
                    Login / Register
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
