"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  X,
  Loader2,
  Building2,
  FileText,
  MessageSquare,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Send,
  Paperclip,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  User,
  LogIn,
  UserCircle,
  Phone,
  Copy,
  Download,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OTPVerificationModal } from "@/components/samadhan/OTPVerificationModal";
import { SpeechToTextButton } from "@/components/samadhan/SpeechToTextButton";
import { AIWriteAssist } from "@/components/samadhan/AIWriteAssist";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";
import { useDynamicTranslation } from "@/hooks/useDynamicTranslation";

interface Section {
  id: string;
  name: string;
  description: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  sectionId: string;
  section?: Section;
  isActive?: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  serviceId: string;
}

type QueryType = "FEEDBACK" | "GRIEVANCE";

// Steps for Grievance form - Priority removed (set by DC/Admin when assigning)
// Subject and Description combined into one step
const GRIEVANCE_STEPS = [
  {
    id: "type",
    title: "Query Type",
    description: "What would you like to submit?",
  },
  {
    id: "visit",
    title: "DC Visit",
    description: "Did you visit the DC office?",
  },
  { id: "date", title: "Visit Date", description: "When did you visit?" },
  {
    id: "service",
    title: "Service",
    description: "Select the related service",
  },
  {
    id: "categories",
    title: "Categories",
    description: "Select service categories",
  },
  {
    id: "details",
    title: "Details",
    description: "Tell us about your grievance",
  },
  {
    id: "attachments",
    title: "Proof",
    description: "Upload supporting documents",
  },
  { id: "contact", title: "Contact", description: "Your contact information" },
  { id: "review", title: "Review", description: "Review and submit" },
];

// Steps for Feedback form - Single page form, no typeform style
// No tracking ID for feedback
const FEEDBACK_STEPS = [
  {
    id: "type",
    title: "Query Type",
    description: "What would you like to submit?",
  },
  {
    id: "feedback-form",
    title: "Share Feedback",
    description: "All fields in one place",
  },
];

// Success confirmation modal component - different for feedback vs grievances
function SuccessModal({
  isOpen,
  referenceId,
  onClose,
  isGuest,
  queryType,
}: {
  isOpen: boolean;
  referenceId: string;
  onClose: () => void;
  isGuest: boolean;
  queryType: "FEEDBACK" | "GRIEVANCE";
}) {
  const router = useRouter();
  const { t } = useSamadhanI18n();
  const isFeedback = queryType === "FEEDBACK";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referenceId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const content = [
      "═══════════════════════════════════════════",
      "     SAMADHAN - Grievance Tracking ID      ",
      "═══════════════════════════════════════════",
      "",
      `  Reference ID:  ${referenceId}`,
      "",
      `  Submitted on:  ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
      "",
      "  Track your grievance at:",
      `  ${typeof window !== "undefined" ? window.location.origin : ""}/samadhan/track/${referenceId}`,
      "",
      "═══════════════════════════════════════════",
      "  Keep this ID safe. You will need it to",
      "  check your grievance status anytime.",
      "═══════════════════════════════════════════",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${referenceId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div
            className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isFeedback
                ? "bg-gradient-to-br from-green-400 to-emerald-500"
                : "bg-gradient-to-br from-blue-400 to-indigo-500"
            }`}
          >
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <DialogTitle className="text-2xl text-center">
            {isFeedback
              ? t("submit.thankYouFeedback")
              : t("submit.successfullySubmitted")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-center space-y-2">
              <span className="block">
                {isFeedback
                  ? t("submit.feedbackReceivedMsg")
                  : t("submit.grievanceSubmittedMsg")}
              </span>
              <span className="block text-sm text-gray-500">
                {isFeedback
                  ? t("submit.feedbackAppreciateMsg")
                  : t("submit.seniorOfficerReview")}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Show Reference ID only for GRIEVANCE, not for FEEDBACK */}
        {!isFeedback && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 text-center space-y-3">
            <p className="text-sm text-gray-600 mb-2">
              {t("submit.yourReferenceId")}
            </p>
            <p className="text-xl font-mono font-bold text-blue-700 bg-white rounded-lg px-4 py-2 inline-block">
              {referenceId}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className={`text-xs gap-1.5 transition-all ${copied ? "bg-green-50 border-green-300 text-green-700" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? t("submit.copiedId") : t("submit.copyId")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Download className="h-3.5 w-3.5" />
                {t("submit.download")}
              </Button>
            </div>
            <p className="text-xs text-gray-500">{t("submit.saveIdNote")}</p>
          </div>
        )}

        {/* Feedback info message */}
        {isFeedback && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 text-center">
            <p className="text-sm text-green-800 mb-1">
              {t("submit.feedbackReceived")}
            </p>
            <p className="text-xs text-green-700">
              {t("submit.feedbackCannotTrack")}
            </p>
          </div>
        )}

        {!isFeedback && isGuest && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-800 mb-1">
              {t("submit.guestSubmission")}
            </p>
            <p className="text-xs text-amber-700">
              {t("submit.guestTrackNote")}
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {!isFeedback && (
            <Button
              onClick={() => router.push(`/samadhan/track/${referenceId}`)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {t("submit.trackStatus")}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push("/samadhan")}
            className="w-full"
          >
            {t("submit.backToHome")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TypeFormSubmitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <TypeFormContent />
    </Suspense>
  );
}

function TypeFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useSamadhanI18n();

  // Auth choice state - whether to show auth choice or form
  const [showAuthChoice, setShowAuthChoice] = useState(true);
  const [proceedAsGuest, setProceedAsGuest] = useState(false);

  // Use SAMADHAN session instead of NextAuth
  const [samadhanSession, setSamadhanSession] = useState<{
    userId: string;
    phone: string;
    name: string;
  } | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Current step tracking
  const [currentStep, setCurrentStep] = useState(() => {
    const stepParam = searchParams.get("step");
    return stepParam ? parseInt(stepParam, 10) : 0;
  });
  const [queryType, setQueryType] = useState<QueryType>(
    (searchParams.get("type") as QueryType) || "GRIEVANCE",
  );

  // Data
  const [sections, setSections] = useState<Section[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    [],
  );
  const [filteredCategories, setFilteredCategories] = useState<
    ServiceCategory[]
  >([]);

  // Dynamic translation for DB content (services, categories, sections)
  const dt = useDynamicTranslation([
    ...services.map((s) => s.name),
    ...(services.map((s) => s.description).filter(Boolean) as string[]),
    ...(services.map((s) => s.section?.name).filter(Boolean) as string[]),
    ...serviceCategories.map((c) => c.name),
    ...(serviceCategories
      .map((c) => c.description)
      .filter(Boolean) as string[]),
  ]);

  // Form state
  const [visitedDC, setVisitedDC] = useState<boolean | null>(null);
  const [visitDate, setVisitDate] = useState<string>("");
  const [visitDateOption, setVisitDateOption] = useState<string>("");
  const [sectionId, setSectionId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [citizenName, setCitizenName] = useState("");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [isAnonymousToOfficer, setIsAnonymousToOfficer] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Existing attachments from draft
  const [existingAttachments, setExistingAttachments] = useState<
    Array<{
      id: string;
      fileName: string;
      originalName: string;
      fileType: string;
      fileSize?: number;
    }>
  >([]);

  // Phone registration check state
  const [phoneCheckResult, setPhoneCheckResult] = useState<{
    isRegistered: boolean;
    name: string | null;
    ticketCount: number;
  } | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // OTP verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<
    "submit" | "draft" | null
  >(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showGuestConfirmModal, setShowGuestConfirmModal] = useState(false);
  const [showDraftSuccessModal, setShowDraftSuccessModal] = useState(false);
  const [submittedReferenceId, setSubmittedReferenceId] = useState("");
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Get current steps based on query type
  const steps = queryType === "GRIEVANCE" ? GRIEVANCE_STEPS : FEEDBACK_STEPS;
  const currentStepData = steps[currentStep];

  // Load draft data if draft parameter is present
  const loadDraft = async (draftReferenceId: string) => {
    setIsLoadingDraft(true);
    try {
      const response = await fetch(
        `/api/samadhan/tickets/draft/${draftReferenceId}`,
      );
      const data = await response.json();

      if (data.success && data.data) {
        const draft = data.data;

        // Set all form fields from draft data
        setQueryType(draft.queryType || "GRIEVANCE");
        setSectionId(draft.sectionId || "");
        setSubject(draft.subject || "");
        setSelectedServiceId(draft.selectedServiceId || "");
        setSelectedCategories(draft.selectedCategories || []);
        setDescription(draft.description || "");
        setVisitedDC(draft.visitedDC ?? null);
        setVisitDate(draft.visitDate || "");
        setCitizenName(draft.citizenName || "");
        setCitizenEmail(draft.citizenEmail || "");
        setCitizenPhone(draft.citizenPhone || "");
        setIsAnonymousToOfficer(draft.isAnonymousToOfficer || false);
        setExistingDraftId(draft.id);

        // Load existing attachments from draft
        if (draft.attachments && draft.attachments.length > 0) {
          setExistingAttachments(draft.attachments);
        }

        // Set visit date option if date exists
        if (draft.visitDate) {
          const today = new Date().toISOString().split("T")[0];
          const draftDatePart = draft.visitDate.split("T")[0]; // Extract date part from ISO string

          if (draftDatePart === today) {
            setVisitDateOption("today");
          } else {
            // Check if it was yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];

            if (draftDatePart === yesterdayStr) {
              setVisitDateOption("yesterday");
            } else {
              setVisitDateOption("specific");
              setVisitDate(draftDatePart); // Set the actual date for specific option
            }
          }
        }

        toast.success(t("submit.draftLoadedSuccess"));
      } else {
        toast.error(data.message || t("submit.failedLoadDraft"));
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
      toast.error(t("submit.failedLoadDraft"));
    } finally {
      setIsLoadingDraft(false);
    }
  };

  // Check SAMADHAN session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/samadhan/auth?action=session");
        const data = await response.json();
        if (data.authenticated && data.session) {
          setSamadhanSession(data.session);
          // If user is logged in, skip auth choice
          setShowAuthChoice(false);
          // Pre-fill contact info from session (only if not loading a draft)
          const draftId = searchParams.get("draft");
          if (!draftId) {
            setCitizenName(data.session.name || "");
            setCitizenPhone(data.session.phone || "");
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
    fetchSections();
    fetchServices();
    fetchServiceCategories();
  }, [searchParams]);

  // Load draft when draft parameter is present and services are loaded
  useEffect(() => {
    const draftId = searchParams.get("draft");
    if (draftId && samadhanSession && services.length > 0) {
      loadDraft(draftId);
    }
  }, [searchParams, samadhanSession, services]);

  // Track if service was manually changed (not from draft loading)
  const [serviceChangedManually, setServiceChangedManually] = useState(false);

  // Filter categories by selected service
  useEffect(() => {
    if (selectedServiceId) {
      setFilteredCategories(
        serviceCategories.filter((c) => c.serviceId === selectedServiceId),
      );
      // Reset category selection only if service was changed manually
      if (serviceChangedManually) {
        setSelectedCategories([]);
        setServiceChangedManually(false);
      }
      // Also update sectionId based on selected service
      const selectedService = services.find((s) => s.id === selectedServiceId);
      if (selectedService) {
        setSectionId(selectedService.sectionId);
      }
    } else {
      setFilteredCategories([]);
    }
  }, [selectedServiceId, serviceCategories, serviceChangedManually, services]);

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/samadhan/sections");
      const data = await response.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/samadhan/services");
      const data = await response.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch(
        "/api/samadhan/service-categories?includeInactive=false",
      );
      const data = await response.json();
      if (data.success) {
        setServiceCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch service categories:", error);
    }
  };

  // Check if phone number is already registered (debounced)
  const checkPhoneRegistration = async (phone: string) => {
    if (!phone || phone.length < 10) {
      setPhoneCheckResult(null);
      return;
    }

    setIsCheckingPhone(true);
    try {
      const response = await fetch(`/api/samadhan/check-phone?phone=${phone}`);
      const data = await response.json();
      if (data.success) {
        setPhoneCheckResult(data.data);
      }
    } catch (error) {
      console.error("Failed to check phone:", error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // Debounce phone check - only check after user stops typing
  useEffect(() => {
    if (samadhanSession) return; // Don't check if logged in

    const timer = setTimeout(() => {
      if (citizenPhone.length >= 10) {
        checkPhoneRegistration(citizenPhone);
      } else {
        setPhoneCheckResult(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [citizenPhone, samadhanSession]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        toast.error(t("submit.fileNotSupported", { name: file.name }));
        return false;
      }
      if (file.size > maxSize) {
        toast.error(t("submit.fileTooLarge", { name: file.name }));
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation for current step
  const validateCurrentStep = (): boolean => {
    switch (currentStepData.id) {
      case "type":
        return !!queryType;
      case "visit":
        return visitedDC !== null;
      case "date":
        if (!visitedDC) return true; // Skip if didn't visit
        return !!visitDate || !!visitDateOption;
      case "service":
        return !!selectedServiceId;
      case "categories":
        return true; // Optional
      case "details":
        // Combined subject + description step for grievance
        if (subject.trim().length < 3) {
          toast.error(t("submit.enterSubject3"));
          return false;
        }
        if (description.trim().length < 10) {
          toast.error(t("submit.enterDescription10"));
          return false;
        }
        return true;
      case "feedback-form":
        // All-in-one feedback form validation
        if (subject.trim().length < 3) {
          toast.error(t("submit.enterSubject3"));
          return false;
        }
        if (description.trim().length < 10) {
          toast.error(t("submit.enterDescription10"));
          return false;
        }
        // Name is optional in anonymous mode
        if (
          !isAnonymousToOfficer &&
          citizenName.trim() &&
          citizenName.trim().length < 2
        ) {
          toast.error(t("submit.enterValidName"));
          return false;
        }
        // Phone validation only if provided
        if (citizenPhone.trim() && citizenPhone.trim().length < 10) {
          toast.error(t("submit.enterValidPhone"));
          return false;
        }
        // Email validation only if provided
        if (
          citizenEmail.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(citizenEmail.trim())
        ) {
          toast.error(t("submit.enterValidEmail"));
          return false;
        }
        return true;
      case "attachments":
        return true; // Optional
      case "contact":
        // Name is optional - only validate if provided
        if (citizenName.trim() && citizenName.trim().length < 2) {
          toast.error(t("submit.enterValidName"));
          return false;
        }
        // Phone and email are optional - validation only if provided
        if (citizenPhone.trim() && citizenPhone.trim().length < 10) {
          toast.error(t("submit.enterValidPhone"));
          return false;
        }
        if (
          citizenEmail.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(citizenEmail.trim())
        ) {
          toast.error(t("submit.enterValidEmail"));
          return false;
        }
        return true;
      case "review":
        return true;
      default:
        return true;
    }
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) {
      toast.error(t("submit.pleaseCompleteStep"));
      return;
    }

    // Skip date step if didn't visit DC
    if (currentStepData.id === "visit" && !visitedDC) {
      // For grievance, skip to service; for feedback, skip differently
      if (queryType === "GRIEVANCE") {
        const dateStepIndex = steps.findIndex((s) => s.id === "date");
        if (dateStepIndex !== -1) {
          setCurrentStep(dateStepIndex + 1);
          return;
        }
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    // Skip date step if didn't visit DC OR if visited today (date was skipped)
    if (currentStep > 0) {
      const prevStepId = steps[currentStep - 1].id;
      // Skip date step when going back if:
      // 1. User didn't visit DC (!visitedDC)
      // 2. User selected "Yes, I visited today" (visitDateOption === "today")
      if (
        prevStepId === "date" &&
        (!visitedDC || visitDateOption === "today")
      ) {
        setCurrentStep(currentStep - 2);
        return;
      }
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if OTP verification is required before submission
  const requiresOtpVerification = (): boolean => {
    // Case 1: User is logged in - no OTP needed
    if (samadhanSession) {
      return false;
    }

    // Case 2: No phone number provided (guest) - no OTP needed
    if (!citizenPhone.trim() || citizenPhone.trim().length < 10) {
      return false;
    }

    // Case 3: Phone is already verified in this session - no OTP needed
    if (isPhoneVerified) {
      return false;
    }

    // Case 4: Phone number provided (new or existing) - OTP required
    return true;
  };

  // Handle OTP verification success
  const handleOtpVerified = (phone: string, token?: string) => {
    setIsPhoneVerified(true);
    setShowOtpModal(false);

    // If there was a pending submission, proceed with it
    if (pendingSubmission === "submit") {
      setPendingSubmission(null);
      setShowConfirmDialog(true);
    } else if (pendingSubmission === "draft") {
      setPendingSubmission(null);
      handleSubmit(true);
    }
  };

  // Initiate submission with OTP check
  const initiateSubmission = (asDraft: boolean = false) => {
    // Check if OTP verification is needed
    if (requiresOtpVerification()) {
      setPendingSubmission(asDraft ? "draft" : "submit");
      setShowOtpModal(true);
      return;
    }

    // No OTP needed, proceed with submission flow
    if (asDraft) {
      handleSubmit(true);
    } else {
      // If no phone number and not logged in, show guest confirmation
      if (!samadhanSession && !citizenPhone.trim()) {
        setShowGuestConfirmModal(true);
      } else {
        setShowConfirmDialog(true);
      }
    }
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    if (asDraft) {
      setIsSavingDraft(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      // Prepare date
      let finalVisitDate = visitDate;
      if (visitDateOption === "today") {
        finalVisitDate = new Date().toISOString();
      } else if (visitDateOption === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        finalVisitDate = yesterday.toISOString();
      }

      const submissionData = {
        queryType,
        sectionId: sectionId || sections[0]?.id, // Use first section for feedback if not selected
        subject,
        selectedServiceId: selectedServiceId || undefined,
        selectedCategories:
          selectedCategories.length > 0
            ? JSON.stringify(selectedCategories)
            : undefined,
        description,
        visitedDC: visitedDC ?? false,
        visitDate: finalVisitDate || undefined,
        citizenName: citizenName || undefined,
        citizenEmail: citizenEmail || undefined,
        citizenPhone: citizenPhone || undefined,
        isAnonymousToOfficer,
        isDraft: asDraft,
        ticketId: existingDraftId || undefined,
      };

      const response = await fetch("/api/samadhan/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to submit");
      }

      // Upload attachments if any (for both drafts and submissions)
      if (files.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;

        for (const file of files) {
          try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadResponse = await fetch(
              `/api/samadhan/tickets/${data.data.ticketId}/attachments`,
              {
                method: "POST",
                body: formData,
              },
            );

            const uploadData = await uploadResponse.json();
            if (uploadData.success) {
              uploadedCount++;
            } else {
              failedCount++;
              console.error(
                `Failed to upload ${file.name}:`,
                uploadData.message,
              );
            }
          } catch (uploadError) {
            failedCount++;
            console.error(`Error uploading ${file.name}:`, uploadError);
          }
        }

        // Show upload status
        if (failedCount > 0) {
          toast.warning(
            t("submit.filesUploadStatus", {
              uploaded: String(uploadedCount),
              failed: String(failedCount),
            }),
          );
        } else if (uploadedCount > 0) {
          toast.success(
            t("submit.attachmentsUploaded", { count: String(uploadedCount) }),
          );
        }
      }

      if (asDraft) {
        setExistingDraftId(data.data.ticketId);
        setSubmittedReferenceId(data.data.referenceId);
        setShowDraftSuccessModal(true);
      } else {
        setSubmittedReferenceId(data.data.referenceId);
        setShowSuccessModal(true);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      toast.error(err.message || t("submit.failedSubmit"));
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  // Progress percentage
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  // Render step content
  const renderStepContent = () => {
    const stepId = currentStepData.id;

    switch (stepId) {
      case "type":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.whatToSubmit")}
              </h2>
              <p className="text-gray-500">{t("submit.chooseQueryType")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <button
                onClick={() => {
                  setQueryType("GRIEVANCE");
                  setIsAnonymousToOfficer(false); // Anonymous not allowed for grievances
                  goToNextStep();
                }}
                className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  queryType === "GRIEVANCE"
                    ? "border-red-500 bg-red-50 shadow-md"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">
                  {t("submit.grievance")}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t("submit.reportComplaint")}
                </p>
              </button>
              <button
                onClick={() => {
                  setQueryType("FEEDBACK");
                  goToNextStep();
                }}
                className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  queryType === "FEEDBACK"
                    ? "border-green-500 bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <MessageSquare className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">
                  {t("submit.feedback")}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t("submit.shareExperience")}
                </p>
              </button>
            </div>
          </div>
        );

      case "visit":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.visitedDcToday")}
              </h2>
              <p className="text-gray-500">{t("submit.helpUnderstand")}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              <button
                onClick={() => {
                  setVisitedDC(true);
                  setVisitDateOption("today");
                  // Skip the date step since we know it's today
                  const serviceStepIndex = steps.findIndex(
                    (s) => s.id === "service",
                  );
                  if (serviceStepIndex !== -1) {
                    setTimeout(() => setCurrentStep(serviceStepIndex), 300);
                  }
                }}
                className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  visitedDC === true && visitDateOption === "today"
                    ? "border-green-500 bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">
                      {t("submit.yesVisitedToday")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  setVisitedDC(true);
                  setVisitDateOption("");
                  // Go directly to date step since user wants to select a date
                  const dateStepIndex = steps.findIndex((s) => s.id === "date");
                  if (dateStepIndex !== -1) {
                    setTimeout(() => setCurrentStep(dateStepIndex), 300);
                  }
                }}
                className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  visitedDC === true &&
                  visitDateOption !== "today" &&
                  visitDateOption !== ""
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">
                      {t("submit.yesOtherDay")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t("submit.selectDate")}
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  setVisitedDC(false);
                  setVisitDateOption("");
                  // Skip directly to service
                  const serviceStepIndex = steps.findIndex(
                    (s) => s.id === "service",
                  );
                  if (serviceStepIndex !== -1) {
                    setTimeout(() => setCurrentStep(serviceStepIndex), 300);
                  }
                }}
                className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  visitedDC === false
                    ? "border-gray-500 bg-gray-50 shadow-md"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    <X className="h-8 w-8 text-gray-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">
                      {t("submit.noHaventVisited")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t("submit.generalQuery")}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case "date":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.whenVisit")}
              </h2>
              <p className="text-gray-500">{t("submit.selectVisitDate")}</p>
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <RadioGroup
                value={visitDateOption}
                onValueChange={(value) => {
                  setVisitDateOption(value);
                  if (value !== "other") setVisitDate("");
                }}
                className="space-y-3"
              >
                <div
                  className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    visitDateOption === "today"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setVisitDateOption("today")}
                >
                  <RadioGroupItem value="today" id="today" />
                  <Label htmlFor="today" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("submit.today")}</span>
                    <span className="text-gray-500 ml-2">
                      ({format(new Date(), "MMM d, yyyy")})
                    </span>
                  </Label>
                </div>
                <div
                  className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    visitDateOption === "yesterday"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setVisitDateOption("yesterday")}
                >
                  <RadioGroupItem value="yesterday" id="yesterday" />
                  <Label htmlFor="yesterday" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("submit.yesterday")}</span>
                    <span className="text-gray-500 ml-2">
                      ({format(new Date(Date.now() - 86400000), "MMM d, yyyy")})
                    </span>
                  </Label>
                </div>
                <div
                  className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    visitDateOption === "other"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setVisitDateOption("other")}
                >
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="flex-1 cursor-pointer">
                    <span className="font-medium">{t("submit.pickDate")}</span>
                  </Label>
                </div>
              </RadioGroup>

              {visitDateOption === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pt-2"
                >
                  <Input
                    type="date"
                    value={visitDate ? visitDate.split("T")[0] : ""}
                    onChange={(e) => setVisitDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="text-center text-lg py-6"
                  />
                </motion.div>
              )}
            </div>
          </div>
        );

      case "service":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.selectService")}
              </h2>
              <p className="text-gray-500">{t("submit.chooseService")}</p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                {services
                  .filter((s) => s.isActive !== false)
                  .map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        if (selectedServiceId !== service.id) {
                          setServiceChangedManually(true);
                        }
                        setSelectedServiceId(service.id);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                        selectedServiceId === service.id
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{dt(service.name)}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {dt(service.description)}
                            </p>
                          )}
                          {service.section && (
                            <p className="text-xs text-blue-600 mt-1">
                              {t("submit.section")} {dt(service.section.name)}
                            </p>
                          )}
                        </div>
                        {selectedServiceId === service.id && (
                          <Check className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        );

      case "categories":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.selectCategories")}
              </h2>
              <p className="text-gray-500">{t("submit.selectAllApply")}</p>
            </div>
            <div className="max-w-lg mx-auto">
              {filteredCategories.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredCategories.map((category) => (
                    <label
                      key={category.id}
                      className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedCategories.includes(category.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([
                              ...selectedCategories,
                              category.id,
                            ]);
                          } else {
                            setSelectedCategories(
                              selectedCategories.filter(
                                (id) => id !== category.id,
                              ),
                            );
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{dt(category.name)}</p>
                        {category.description && (
                          <p className="text-sm text-gray-500">
                            {dt(category.description)}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t("submit.noCategoriesAvailable")}</p>
                  <p className="text-sm mt-1">{t("submit.canSkipStep")}</p>
                </div>
              )}
            </div>
          </div>
        );

      case "details":
        // Combined subject + description step for grievances (no priority - set by DC/Admin)
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.tellAboutGrievance")}
              </h2>
              <p className="text-gray-500">{t("submit.provideSubjectDesc")}</p>
            </div>

            {/* Helpful tips for filling the form */}
            <div className="max-w-lg mx-auto bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    {t("submit.tipsForClearGrievance")}
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc ml-4">
                    <li>{t("submit.tipSpecific")}</li>
                    <li>{t("submit.tipIncludeDates")}</li>
                    <li>{t("submit.tipDescribeWhat")}</li>
                    <li>{t("submit.tipMentionFollowUps")}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="max-w-lg mx-auto space-y-6">
              {/* Guide note for filling the grievance */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1.5">
                      {t("submit.howToWriteEffective")}
                    </p>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc ml-4">
                      <li>{t("submit.guideSubjectTip")}</li>
                      <li>{t("submit.guideDescriptionTip")}</li>
                      <li>{t("submit.guideReferencesTip")}</li>
                      <li>{t("submit.guideOutcomeTip")}</li>
                      <li>{t("submit.guideFactualTip")}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700">
                    {t("submit.subjectLabel")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <AIWriteAssist
                      field="subject"
                      currentText={subject}
                      onApply={(text) => setSubject(text)}
                      labels={{
                        aiAssist: t("submit.aiAssist"),
                        askAI: t("submit.askAIHelp"),
                        promptPlaceholder: t(
                          "submit.aiSubjectPromptPlaceholder",
                        ),
                        write: t("submit.aiWrite"),
                        improve: t("submit.aiImprove"),
                        summarize: t("submit.aiSummarize"),
                        apply: t("submit.aiApply"),
                        applyTranslation: t("submit.aiApply"),
                        generating: t("submit.aiGenerating"),
                        generatedText: t("submit.aiGeneratedText"),
                        translations: t("submit.aiTranslations"),
                      }}
                    />
                    <SpeechToTextButton
                      onTranscript={(text) =>
                        setSubject((prev) => (prev ? prev + " " + text : text))
                      }
                    />
                  </div>
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("submit.subjectPlaceholder")}
                  className="text-base"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  {subject.length}
                  {t("submit.characters100")}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700">
                    {t("submit.descriptionLabel")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <AIWriteAssist
                      field="description"
                      currentText={description}
                      onApply={(text) => setDescription(text)}
                      labels={{
                        aiAssist: t("submit.aiAssist"),
                        askAI: t("submit.askAIHelp"),
                        promptPlaceholder: t("submit.aiDescPromptPlaceholder"),
                        write: t("submit.aiWrite"),
                        improve: t("submit.aiImprove"),
                        summarize: t("submit.aiSummarize"),
                        apply: t("submit.aiApply"),
                        applyTranslation: t("submit.aiApply"),
                        generating: t("submit.aiGenerating"),
                        generatedText: t("submit.aiGeneratedText"),
                        translations: t("submit.aiTranslations"),
                      }}
                    />
                    <SpeechToTextButton
                      onTranscript={(text) =>
                        setDescription((prev) =>
                          prev ? prev + " " + text : text,
                        )
                      }
                    />
                  </div>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("submit.descriptionPlaceholder")}
                  rows={6}
                  className="resize-none text-base"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}
                  {t("submit.charactersMin10")}
                </p>
              </div>
            </div>
          </div>
        );

      case "feedback-form":
        // All-in-one feedback form - no typeform style, all fields at once
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.shareFeedback")}
              </h2>
              <p className="text-gray-500">{t("submit.allFieldsOnePlace")}</p>
            </div>
            <div className="max-w-lg mx-auto space-y-5">
              {/* Anonymous toggle */}
              <div
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                  isAnonymousToOfficer
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isAnonymousToOfficer ? (
                    <EyeOff className="h-5 w-5 text-green-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {isAnonymousToOfficer
                        ? t("submit.anonymousMode")
                        : t("submit.shareDetails")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAnonymousToOfficer
                        ? t("submit.officersSeeePseudonym")
                        : t("submit.officersCanContact")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isAnonymousToOfficer}
                  onCheckedChange={setIsAnonymousToOfficer}
                />
              </div>

              {/* Anonymous mode note for feedback */}
              {isAnonymousToOfficer && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3.5">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>{t("submit.submittingAnonymously")}</strong>{" "}
                    {t("submit.anonymousNote")}
                  </p>
                </div>
              )}

              {/* Subject */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    {t("submit.subjectLabel")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <AIWriteAssist
                      field="subject"
                      currentText={subject}
                      onApply={(text) => setSubject(text)}
                      labels={{
                        aiAssist: t("submit.aiAssist"),
                        askAI: t("submit.askAIHelp"),
                        promptPlaceholder: t(
                          "submit.aiSubjectPromptPlaceholder",
                        ),
                        write: t("submit.aiWrite"),
                        improve: t("submit.aiImprove"),
                        summarize: t("submit.aiSummarize"),
                        apply: t("submit.aiApply"),
                        applyTranslation: t("submit.aiApply"),
                        generating: t("submit.aiGenerating"),
                        generatedText: t("submit.aiGeneratedText"),
                        translations: t("submit.aiTranslations"),
                      }}
                    />
                    <SpeechToTextButton
                      onTranscript={(text) =>
                        setSubject((prev) => (prev ? prev + " " + text : text))
                      }
                    />
                  </div>
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("submit.feedbackSubjectPlaceholder")}
                  className="text-base"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    {t("submit.descriptionLabel")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <AIWriteAssist
                      field="description"
                      currentText={description}
                      onApply={(text) => setDescription(text)}
                      labels={{
                        aiAssist: t("submit.aiAssist"),
                        askAI: t("submit.askAIHelp"),
                        promptPlaceholder: t("submit.aiDescPromptPlaceholder"),
                        write: t("submit.aiWrite"),
                        improve: t("submit.aiImprove"),
                        summarize: t("submit.aiSummarize"),
                        apply: t("submit.aiApply"),
                        applyTranslation: t("submit.aiApply"),
                        generating: t("submit.aiGenerating"),
                        generatedText: t("submit.aiGeneratedText"),
                        translations: t("submit.aiTranslations"),
                      }}
                    />
                    <SpeechToTextButton
                      onTranscript={(text) =>
                        setDescription((prev) =>
                          prev ? prev + " " + text : text,
                        )
                      }
                    />
                  </div>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("submit.feedbackDescPlaceholder")}
                  rows={4}
                  className="resize-none text-base"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}
                  {t("submit.charactersMin10")}
                </p>
              </div>

              {/* Attachments */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {t("submit.attachmentsLabel")}{" "}
                  <span className="text-gray-400">{t("submit.optional")}</span>
                </Label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="feedback-file-upload"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="feedback-file-upload"
                    className="cursor-pointer"
                  >
                    <Paperclip className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {t("submit.clickToAddFiles")}
                    </p>
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Info - Optional */}
              {!isAnonymousToOfficer && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    {t("submit.contactInformation")}{" "}
                    <span className="text-gray-400">
                      {t("submit.optional")}
                    </span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">
                        {t("submit.name")}
                      </Label>
                      <Input
                        value={citizenName}
                        onChange={(e) => setCitizenName(e.target.value)}
                        placeholder={t("submit.yourName")}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        {t("submit.phone")}
                      </Label>
                      <Input
                        value={citizenPhone}
                        onChange={(e) => setCitizenPhone(e.target.value)}
                        placeholder={t("submit.phoneNumber")}
                        className="mt-1"
                        disabled={!!samadhanSession}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">
                      {t("submit.emailLabel")}
                    </Label>
                    <Input
                      type="email"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      placeholder={t("submit.emailPlaceholder")}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Submit button for feedback */}
              <div className="pt-4">
                <Button
                  onClick={() => {
                    if (validateCurrentStep()) {
                      initiateSubmission(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full py-5 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("submit.submitting")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("submit.submitFeedbackBtn")}
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  {t("submit.feedbackShareNote")}
                </p>
              </div>
            </div>
          </div>
        );

      case "attachments":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.addSupportingDocs")}
              </h2>
              <p className="text-gray-500">{t("submit.uploadProof")}</p>
            </div>
            <div className="max-w-lg mx-auto">
              {/* Show existing attachments from draft */}
              {existingAttachments.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {t("submit.previouslyUploaded", {
                      count: existingAttachments.length,
                    })}
                  </p>
                  <div className="space-y-2">
                    {existingAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {attachment.originalName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {attachment.fileSize
                                ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                                : attachment.fileType
                                    ?.split("/")[1]
                                    ?.toUpperCase() || "File"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300"
                        >
                          {t("submit.saved")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  {existingAttachments.length > 0
                    ? t("submit.addMoreFiles")
                    : t("submit.dragAndDrop")}
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,.pdf,.doc,.docx,.mp4,.mov"
                />
                <label htmlFor="file-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Paperclip className="h-4 w-4 mr-2" />
                      {t("submit.selectFilesBtn")}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-400 mt-4">
                  {t("submit.imagesSize")}
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.contactInfoStep")}
              </h2>
              <p className="text-gray-500">{t("submit.contactInfoDesc")}</p>
            </div>
            <div className="max-w-lg mx-auto space-y-4">
              {/* Anonymous toggle - Available for all query types */}
              <div
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  isAnonymousToOfficer
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isAnonymousToOfficer ? (
                    <EyeOff className="h-5 w-5 text-green-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {isAnonymousToOfficer
                        ? t("submit.anonymousMode")
                        : t("submit.shareContactDetails")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAnonymousToOfficer
                        ? t("submit.officersSeeePseudonymOnly")
                        : t("submit.officersCanContactDirectly")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isAnonymousToOfficer}
                  onCheckedChange={setIsAnonymousToOfficer}
                />
              </div>

              {/* Anonymous mode active - show info banner */}
              {isAnonymousToOfficer && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-100 rounded-full p-2 mt-0.5">
                      <EyeOff className="h-4 w-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">
                        {t("submit.submittingAnonymouslyNote")}
                      </p>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        {t("submit.anonymousDetailNote")}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-amber-900">
                      {t("submit.guestAnonymousNote")}
                    </p>
                    <ul className="text-xs text-amber-800 space-y-1 ml-4 list-disc">
                      <li>{t("submit.guestNote1")}</li>
                      <li>{t("submit.guestNote2")}</li>
                      <li>{t("submit.guestNote3")}</li>
                      <li>{t("submit.guestNote4")}</li>
                    </ul>
                  </div>
                  <p className="text-xs text-amber-700 italic">
                    💡 {t("submit.tipAddPhone")}
                  </p>
                </div>
              )}

              {/* Benefits of providing phone number - only show if not anonymous */}
              {!samadhanSession &&
                !phoneCheckResult?.isRegistered &&
                !isAnonymousToOfficer && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      {t("submit.benefitsPhone")}
                    </p>
                    <ul className="text-xs text-green-700 space-y-1 ml-6 list-disc">
                      <li>{t("submit.phoneBenefit1")}</li>
                      <li>{t("submit.phoneBenefit2")}</li>
                      <li>{t("submit.phoneBenefit3")}</li>
                      <li>{t("submit.phoneBenefit4")}</li>
                    </ul>
                  </div>
                )}

              {/* Already registered user message */}
              {!samadhanSession && phoneCheckResult?.isRegistered && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("submit.welcomeBack")}
                    {phoneCheckResult.name ? `, ${phoneCheckResult.name}` : ""}!
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    {t("submit.phoneAlreadyRegistered")}
                  </p>
                  {phoneCheckResult.ticketCount > 0 && (
                    <p className="text-xs text-blue-600 mb-2">
                      {t("submit.youHave")} {phoneCheckResult.ticketCount}
                      {t("submit.previousSubmissions")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Link href="/samadhan/login">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <LogIn className="h-3 w-3" />
                        {t("submit.loginToDashboard")}
                      </Button>
                    </Link>
                    <Link href="/samadhan/track">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <FileText className="h-3 w-3" />
                        {t("submit.trackPrevious")}
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-blue-600 mt-2 italic">
                    {t("submit.canContinueSubmit")}
                  </p>
                </div>
              )}

              {/* Contact fields - hidden when anonymous */}
              {!isAnonymousToOfficer && (
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>
                      {t("submit.yourNameLabel")}{" "}
                      <span className="text-gray-400">
                        {t("submit.optional")}
                      </span>
                    </Label>
                    <Input
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      placeholder={t("submit.enterFullName")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      {t("submit.phoneNumberLabel")}
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-50 text-green-700 border-green-200"
                      >
                        {t("submit.recommended")}
                      </Badge>
                      {isCheckingPhone && (
                        <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                      )}
                    </Label>
                    <Input
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      placeholder={
                        samadhanSession
                          ? t("submit.phoneFromAccount")
                          : t("submit.enterPhoneForReg")
                      }
                      className="mt-1"
                      disabled={!!samadhanSession}
                      readOnly={!!samadhanSession}
                    />
                    {samadhanSession && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {t("submit.phoneFromLoggedIn")}
                      </p>
                    )}
                    {!samadhanSession &&
                      citizenPhone.length >= 10 &&
                      phoneCheckResult && (
                        <p
                          className={`text-xs mt-1 ${phoneCheckResult.isRegistered ? "text-blue-600" : "text-green-600"}`}
                        >
                          {phoneCheckResult.isRegistered
                            ? t("submit.numberRecognized")
                            : t("submit.newNumberAutoReg")}
                        </p>
                      )}
                    {!samadhanSession &&
                      citizenPhone.length > 0 &&
                      citizenPhone.length < 10 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t("submit.enterAtLeast10")}
                        </p>
                      )}
                  </div>
                  <div>
                    <Label>
                      {t("submit.emailAddressLabel")}{" "}
                      <span className="text-gray-400">
                        {t("submit.optional")}
                      </span>
                    </Label>
                    <Input
                      type="email"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      placeholder={t("submit.enterEmail")}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t("submit.reviewSubmission")}
              </h2>
              <p className="text-gray-500">{t("submit.makeSureGood")}</p>
            </div>
            <div className="max-w-lg mx-auto space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("submit.type")}</span>
                    <Badge
                      variant={
                        queryType === "GRIEVANCE" ? "destructive" : "default"
                      }
                    >
                      {queryType}
                    </Badge>
                  </div>

                  {queryType === "GRIEVANCE" && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">
                          {t("submit.visitedDc")}
                        </span>
                        <span>
                          {visitedDC ? t("submit.yes") : t("submit.no")}
                        </span>
                      </div>
                      {visitedDC && visitDateOption && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">
                            {t("submit.visitDate")}
                          </span>
                          <span>
                            {visitDateOption === "today"
                              ? t("submit.today")
                              : visitDateOption === "yesterday"
                                ? t("submit.yesterday")
                                : visitDate
                                  ? format(new Date(visitDate), "MMM d, yyyy")
                                  : t("submit.notSpecified")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">
                          {t("submit.service")}
                        </span>
                        <span>
                          {dt(
                            services.find((s) => s.id === selectedServiceId)
                              ?.name,
                          ) || "N/A"}
                        </span>
                      </div>
                      {selectedCategories.length > 0 && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500">
                            {t("submit.categories")}
                          </span>
                          <div className="text-right">
                            {selectedCategories.map((id) => {
                              const category = serviceCategories.find(
                                (c) => c.id === id,
                              );
                              return category ? (
                                <Badge
                                  key={id}
                                  variant="outline"
                                  className="ml-1 mb-1"
                                >
                                  {dt(category.name)}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-gray-500 text-sm mb-1">
                      {t("submit.subjectReview")}
                    </p>
                    <p className="font-medium">
                      {subject || t("submit.notSpecified")}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">
                      {t("submit.descriptionReview")}
                    </p>
                    <p className="text-sm line-clamp-3">{description}</p>
                  </div>

                  {(files.length > 0 || existingAttachments.length > 0) && (
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500">
                          {t("submit.attachmentsLabel")}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {files.length + existingAttachments.length}{" "}
                          {t("submit.files")}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {/* Show existing attachments from draft */}
                        {existingAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg"
                          >
                            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                              <FileText className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {attachment.originalName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {attachment.fileSize
                                  ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                                  : t("submit.saved")}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-300 text-xs"
                            >
                              {t("submit.saved")}
                            </Badge>
                          </div>
                        ))}
                        {/* Show new files to upload */}
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-blue-600 border-blue-300 text-xs"
                            >
                              {t("submit.newFile")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-gray-500">{t("submit.privacy")}</span>
                    <span className="flex items-center gap-1">
                      {isAnonymousToOfficer ? (
                        <>
                          <EyeOff className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">
                            {t("submit.anonymous")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600">
                            {t("submit.visible")}
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Privacy note */}
                  {!samadhanSession &&
                    !citizenPhone.trim() &&
                    !isAnonymousToOfficer && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                        <p className="text-xs text-blue-700">
                          <strong>{t("submit.noteLabel")}</strong>{" "}
                          {t("submit.trackingIdNote")}
                        </p>
                      </div>
                    )}

                  {/* Registration notice if phone provided - different for existing vs new users */}
                  {!samadhanSession &&
                    citizenPhone.trim() &&
                    phoneCheckResult?.isRegistered && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                        <p className="text-xs text-blue-700">
                          <strong>{t("submit.welcomeBackReview")}</strong>{" "}
                          {t("submit.phoneLinkedNote")}
                        </p>
                      </div>
                    )}

                  {!samadhanSession &&
                    citizenPhone.trim() &&
                    !phoneCheckResult?.isRegistered && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                        <p className="text-xs text-green-700">
                          <strong>{t("submit.greatNote")}</strong>{" "}
                          {t("submit.autoRegNote")}
                        </p>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Quick edit section */}
              <Card className="border-orange-200 bg-orange-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-medium text-orange-800">
                      {t("submit.needChanges")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const descriptionStepIndex = steps.findIndex(
                          (step) => step.id === "description",
                        );
                        if (descriptionStepIndex !== -1) {
                          setCurrentStep(descriptionStepIndex);
                        }
                      }}
                      className="text-xs h-8"
                    >
                      {t("submit.editDetails")}
                    </Button>
                    {queryType === "GRIEVANCE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const serviceStepIndex = steps.findIndex(
                            (step) => step.id === "service",
                          );
                          if (serviceStepIndex !== -1) {
                            setCurrentStep(serviceStepIndex);
                          }
                        }}
                        className="text-xs h-8"
                      >
                        {t("submit.editService")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const attachmentsStepIndex = steps.findIndex(
                          (step) => step.id === "attachments",
                        );
                        if (attachmentsStepIndex !== -1) {
                          setCurrentStep(attachmentsStepIndex);
                        }
                      }}
                      className="text-xs h-8"
                    >
                      {t("submit.editFiles")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const contactStepIndex = steps.findIndex(
                          (step) => step.id === "contact",
                        );
                        if (contactStepIndex !== -1) {
                          setCurrentStep(contactStepIndex);
                        }
                      }}
                      className="text-xs h-8"
                    >
                      {t("submit.editContact")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* OTP Verification Info - Show when phone is provided and not verified */}
              {!samadhanSession &&
                citizenPhone.trim().length >= 10 &&
                !isPhoneVerified && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          {t("submit.phoneVerificationRequired")}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {t("submit.phoneVerificationDesc")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Phone Verified Badge */}
              {!samadhanSession &&
                citizenPhone.trim().length >= 10 &&
                isPhoneVerified && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          {t("submit.phoneVerified")}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          {t("submit.phoneVerifiedNote")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Submission note */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-600 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-500" />
                  <span>{t("submit.afterSubmitNote")}</span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  onClick={() => initiateSubmission(false)}
                  disabled={isSubmitting || isSavingDraft}
                  className="w-full py-6 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Send className="h-5 w-5 mr-2" />
                  {t(
                    queryType === "GRIEVANCE"
                      ? "submit.submitGrievance"
                      : "submit.submitFeedbackBtn",
                  )}
                </Button>
                {/* Show Save as Draft for logged-in users OR guests with phone number */}
                {(samadhanSession || citizenPhone.trim().length >= 10) && (
                  <Button
                    variant="outline"
                    onClick={() => initiateSubmission(true)}
                    disabled={isSubmitting || isSavingDraft}
                    className="w-full"
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("submit.saving")}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {t("submit.saveAsDraft")}
                      </>
                    )}
                  </Button>
                )}
                {/* Prompt to add phone for draft saving */}
                {!samadhanSession && citizenPhone.trim().length < 10 && (
                  <p className="text-xs text-center text-gray-500">
                    {t("submit.addPhoneForDraft")}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state while loading draft
  if (isLoadingDraft) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-4" />
        <p className="text-gray-600">{t("submit.loadingDraft")}</p>
      </div>
    );
  }

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-4" />
        <p className="text-gray-600">{t("submit.loading")}</p>
      </div>
    );
  }

  // Directly show the form - no auth choice screen anymore
  // Users can submit as guests and provide phone to get registered

  return (
    <div className="min-h-[60vh] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          href="/samadhan"
          className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("submit.backToHome")}
        </Link>

        <Card className="border-green-100 shadow-lg overflow-hidden p-0 gap-0">
          {/* Progress bar inside card */}
          <div className="h-1.5 bg-gray-100">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-gray-900">
                  {queryType === "GRIEVANCE"
                    ? t("submit.submitGrievanceTitle")
                    : t("submit.submitFeedbackTitle")}
                </CardTitle>
                <CardDescription>
                  {t("submit.stepOfTitle", {
                    current: currentStep + 1,
                    total: steps.length,
                  })}{" "}
                  {t(`submit.step.${currentStepData.id}`)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {existingDraftId && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-300"
                  >
                    {t("submit.editingDraft")}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-white">
                  {currentStep + 1}/{steps.length}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          {/* Footer navigation inside card */}
          {currentStepData.id !== "type" && (
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                {currentStep > 0 ? (
                  <Button
                    variant="outline"
                    onClick={goToPrevStep}
                    className="gap-2 hover:bg-gray-100 border-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("submit.back")}
                  </Button>
                ) : (
                  <div></div>
                )}

                {currentStepData.id === "review" ? (
                  <div className="text-sm text-gray-500">
                    {t("submit.reviewSubmissionAbove")}
                  </div>
                ) : (
                  <Button
                    onClick={goToNextStep}
                    className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {currentStep === steps.length - 2
                      ? t("submit.review")
                      : t("submit.continue")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        referenceId={submittedReferenceId}
        onClose={() => {
          setShowSuccessModal(false);
          // Reset verification state to prevent persistence across operations
          setIsPhoneVerified(false);
          setPendingSubmission(null);
        }}
        isGuest={!samadhanSession}
        queryType={queryType}
      />

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-center">
              {t("submit.readyToSubmit")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-3 pt-2">
                <span className="block text-base">
                  {t("submit.verifyAllDetails")} {queryType.toLowerCase()}.
                </span>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                  <span className="text-amber-800 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {t("submit.beforeSubmit")}
                  </span>
                  <ul className="text-amber-700 text-xs mt-2 space-y-1 ml-6 list-disc">
                    <li>{t("submit.ensureAccurate")}</li>
                    <li>{t("submit.verifyContactDetails")}</li>
                    <li>{t("submit.reviewAttached")}</li>
                  </ul>
                </div>
                <span className="block text-sm text-gray-500">
                  {t("submit.onceSubmitted")} {queryType.toLowerCase()}
                  {t("submit.sentToReviewQueue")}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-4">
            <Button
              onClick={() => {
                setShowConfirmDialog(false);
                handleSubmit(false);
              }}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("submit.submitting")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("submit.yesSubmitNow")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
              className="w-full"
            >
              {t("submit.goBackReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Success Modal */}
      <Dialog
        open={showDraftSuccessModal}
        onOpenChange={(open) => {
          setShowDraftSuccessModal(open);
          if (!open) {
            // Reset verification state to prevent persistence
            setIsPhoneVerified(false);
            setPendingSubmission(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Save className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-center">
              {t("submit.draftSaved")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-2">
                <span className="block">
                  {t("submit.yourDraftSaved", {
                    type: queryType.toLowerCase(),
                  })}
                </span>
                <span className="block text-sm text-gray-500">
                  {t("submit.continueEditingLaterDesc")}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 text-center">
            <span className="text-sm text-gray-600 block mb-2">
              {t("submit.yourDraftReference")}
            </span>
            <span className="text-xl font-mono font-bold text-amber-700 bg-white rounded-lg px-4 py-2 inline-block">
              {submittedReferenceId}
            </span>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => router.push("/samadhan/dashboard")}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
            >
              {t("submit.goToDashboard")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowDraftSuccessModal(false);
                // Reset verification state to prevent persistence
                setIsPhoneVerified(false);
                setPendingSubmission(null);
              }}
              className="w-full"
            >
              {t("submit.continueEditing")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Confirmation Modal - shown when submitting without phone */}
      <Dialog
        open={showGuestConfirmModal}
        onOpenChange={setShowGuestConfirmModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <UserCircle className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-center">
              {t("submit.submitAsGuest")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-3 pt-2">
                <span className="block text-base">
                  {t("submit.noPhoneProvided")}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">
              {t("submit.asGuestYouWill")}
            </p>
            <ul className="text-xs text-amber-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                {t("submit.guestBenefit1")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                {t("submit.guestBenefit2")}
              </li>
              <li className="flex items-start gap-2">
                <X className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                {t("submit.guestLimitation1")}
              </li>
              <li className="flex items-start gap-2">
                <X className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                {t("submit.guestLimitation2")}
              </li>
              <li className="flex items-start gap-2">
                <X className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                {t("submit.guestLimitation3")}
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-700">
              <strong>Tip:</strong> {t("submit.tipGoBackPhone")}
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowGuestConfirmModal(false);
                // Go back to contact step to add phone
                const contactStepIndex = steps.findIndex(
                  (s) => s.id === "contact",
                );
                if (contactStepIndex !== -1) {
                  setCurrentStep(contactStepIndex);
                }
              }}
              className="w-full border-green-300 text-green-700 hover:bg-green-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("submit.goBackAddPhone")}
            </Button>
            <Button
              onClick={() => {
                setShowGuestConfirmModal(false);
                setShowConfirmDialog(true);
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {t("submit.continueAsGuest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          setPendingSubmission(null);
        }}
        onVerified={handleOtpVerified}
        phone={citizenPhone}
        title={t("submit.verifyPhoneTitle")}
        description={
          phoneCheckResult?.isRegistered
            ? t("submit.verifyPhoneRegistered")
            : t("submit.verifyPhoneNew")
        }
        showPhoneInput={false}
        verifyOnly={true}
      />
    </div>
  );
}
