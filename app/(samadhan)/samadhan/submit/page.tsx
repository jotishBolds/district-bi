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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

// Steps for Grievance form
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
    id: "subject",
    title: "Subject",
    description: "Brief title for your query",
  },
  {
    id: "description",
    title: "Details",
    description: "Describe your experience",
  },
  {
    id: "attachments",
    title: "Proof",
    description: "Upload supporting documents",
  },
  { id: "contact", title: "Contact", description: "Your contact information" },
  { id: "review", title: "Review", description: "Review and submit" },
];

// Steps for Feedback form
const FEEDBACK_STEPS = [
  {
    id: "type",
    title: "Query Type",
    description: "What would you like to submit?",
  },
  {
    id: "subject",
    title: "Subject",
    description: "Brief title for your feedback",
  },
  { id: "description", title: "Details", description: "Share your feedback" },
  {
    id: "attachments",
    title: "Attachments",
    description: "Add any documents (optional)",
  },
  { id: "contact", title: "Contact", description: "Your contact information" },
  { id: "review", title: "Review", description: "Review and submit" },
];

// Success confirmation modal component - different for guests vs registered users
function SuccessModal({
  isOpen,
  referenceId,
  onClose,
  isGuest,
}: {
  isOpen: boolean;
  referenceId: string;
  onClose: () => void;
  isGuest: boolean;
}) {
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <DialogTitle className="text-2xl text-center">
            🎉 Successfully Submitted!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-center space-y-2">
              <span className="block">
                Your query has been submitted and is now in the review queue.
              </span>
              <span className="block text-sm text-gray-500">
                A senior officer will review and assign your ticket shortly.
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Show Reference ID only for registered users */}
        {!isGuest ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Your Reference ID</p>
            <p className="text-xl font-mono font-bold text-blue-700 bg-white rounded-lg px-4 py-2 inline-block">
              {referenceId}
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Save this ID to track your query status
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 text-center">
            <p className="text-sm text-amber-800 mb-2">Guest Submission</p>
            <p className="text-sm text-amber-700">
              Your query has been received. Since you submitted as a guest, you
              won&apos;t be able to track its status online.
            </p>
            <p className="text-xs text-amber-600 mt-3">
              You may receive updates via SMS if you provided your phone number.
              For full tracking features, please register next time.
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {!isGuest ? (
            <>
              <Button
                onClick={() => router.push(`/samadhan/track/${referenceId}`)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Track Status
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/samadhan/dashboard")}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => router.push("/samadhan/login")}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
              >
                Register for Full Access
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/samadhan/query-status")}
                className="w-full"
              >
                Request Status Update Later
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push("/samadhan")}
            className="w-full"
          >
            Back to Home
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

  // Use SAMADHAN session instead of NextAuth
  const [samadhanSession, setSamadhanSession] = useState<{
    userId: string;
    phone: string;
    name: string;
  } | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Current step tracking
  const [currentStep, setCurrentStep] = useState(0);
  const [queryType, setQueryType] = useState<QueryType>(
    (searchParams.get("type") as QueryType) || "GRIEVANCE"
  );

  // Data
  const [sections, setSections] = useState<Section[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [filteredCategories, setFilteredCategories] = useState<
    ServiceCategory[]
  >([]);

  // Form state
  const [visitedDC, setVisitedDC] = useState<boolean | null>(null);
  const [visitDate, setVisitDate] = useState<string>("");
  const [visitDateOption, setVisitDateOption] = useState<string>("");
  const [sectionId, setSectionId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [citizenName, setCitizenName] = useState("");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [isAnonymousToOfficer, setIsAnonymousToOfficer] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
        `/api/samadhan/tickets/draft/${draftReferenceId}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        const draft = data.data;

        // Set all form fields from draft data
        setQueryType(draft.queryType || "GRIEVANCE");
        setPriority(draft.priority || "MEDIUM");
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

        // Set visit date option if date exists
        if (draft.visitDate) {
          const today = new Date().toISOString().split("T")[0];
          if (draft.visitDate === today) {
            setVisitDateOption("today");
          } else {
            setVisitDateOption("specific");
          }
        }

        toast.success("Draft loaded successfully");
      } else {
        toast.error(data.message || "Failed to load draft");
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
      toast.error("Failed to load draft");
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
        serviceCategories.filter((c) => c.serviceId === selectedServiceId)
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
        "/api/samadhan/service-categories?includeInactive=false"
      );
      const data = await response.json();
      if (data.success) {
        setServiceCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch service categories:", error);
    }
  };

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
        toast.error(`${file.name}: File type not supported`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large`);
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
      case "subject":
        return subject.trim().length >= 3;
      case "description":
        return description.trim().length >= 10;
      case "attachments":
        return true; // Optional
      case "contact":
        return true; // Optional but we have defaults
      case "review":
        return true;
      default:
        return true;
    }
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) {
      toast.error("Please complete this step before continuing");
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
        priority: queryType === "GRIEVANCE" ? priority : undefined,
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

      // Upload attachments if any and not draft
      if (files.length > 0 && !asDraft) {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          await fetch(
            `/api/samadhan/tickets/${data.data.ticketId}/attachments`,
            {
              method: "POST",
              body: formData,
            }
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
      toast.error(err.message || "Failed to submit query");
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
                What would you like to submit?
              </h2>
              <p className="text-gray-500">Choose the type of query</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <button
                onClick={() => {
                  setQueryType("GRIEVANCE");
                  goToNextStep();
                }}
                className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  queryType === "GRIEVANCE"
                    ? "border-red-500 bg-red-50 shadow-md"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Grievance</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Report a complaint or issue
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
                <h3 className="font-semibold text-lg">Feedback</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Share your experience
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
                Did you visit the DC office today?
              </h2>
              <p className="text-gray-500">
                Help us understand your experience better
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              <button
                onClick={() => {
                  setVisitedDC(true);
                  setVisitDateOption("today");
                  // Skip the date step since we know it's today
                  const serviceStepIndex = steps.findIndex(
                    (s) => s.id === "service"
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
                      Yes, I visited today
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
                      Yes, but some other day
                    </h3>
                    <p className="text-sm text-gray-500">
                      I&apos;ll select the date
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
                    (s) => s.id === "service"
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
                      No, I haven&apos;t visited
                    </h3>
                    <p className="text-sm text-gray-500">
                      I have a general query
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
                When did you visit?
              </h2>
              <p className="text-gray-500">Select the date of your visit</p>
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
                    <span className="font-medium">Today</span>
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
                    <span className="font-medium">Yesterday</span>
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
                    <span className="font-medium">Pick a date</span>
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
                Select a Service
              </h2>
              <p className="text-gray-500">
                Choose the service related to your query
              </p>
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
                          <h3 className="font-semibold">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {service.description}
                            </p>
                          )}
                          {service.section && (
                            <p className="text-xs text-blue-600 mt-1">
                              Section: {service.section.name}
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
                Select Categories
              </h2>
              <p className="text-gray-500">Select all that apply (optional)</p>
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
                                (id) => id !== category.id
                              )
                            );
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-gray-500">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No categories available for this service</p>
                  <p className="text-sm mt-1">You can skip this step</p>
                </div>
              )}
            </div>
          </div>
        );

      case "subject":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                What&apos;s this about?
              </h2>
              <p className="text-gray-500">
                Give a brief title for your {queryType.toLowerCase()}
              </p>
            </div>
            <div className="max-w-lg mx-auto">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Delay in document processing"
                className="text-lg py-6 text-center"
                autoFocus
              />
              <p className="text-sm text-gray-500 text-center mt-2">
                {subject.length}/100 characters
              </p>

              {queryType === "GRIEVANCE" && (
                <div className="mt-6">
                  <Label className="text-center block mb-3">
                    Priority Level
                  </Label>
                  <div className="flex gap-3 justify-center">
                    {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          priority === p
                            ? p === "HIGH"
                              ? "border-red-500 bg-red-50 text-red-700"
                              : p === "MEDIUM"
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : "border-gray-500 bg-gray-50 text-gray-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "description":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Tell us more
              </h2>
              <p className="text-gray-500">
                Describe your {queryType.toLowerCase()} in detail
              </p>
            </div>
            <div className="max-w-lg mx-auto">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Describe your ${queryType.toLowerCase()} in detail. Include any relevant information that will help us understand and address your concern...`}
                rows={8}
                className="resize-none text-base"
                autoFocus
              />
              <p className="text-sm text-gray-500 text-center mt-2">
                {description.length} characters (minimum 10)
              </p>
            </div>
          </div>
        );

      case "attachments":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Add supporting documents
              </h2>
              <p className="text-gray-500">
                Upload any proof or relevant files (optional)
              </p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop files here, or click to select
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
                      Select Files
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-400 mt-4">
                  Images (5MB), PDF (10MB), Videos (50MB)
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
                Contact Information
              </h2>
              <p className="text-gray-500">
                How should we reach you? (optional)
              </p>
            </div>
            <div className="max-w-lg mx-auto space-y-4">
              {/* Anonymous toggle */}
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
                        ? "Anonymous Submission"
                        : "Share Contact Details"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAnonymousToOfficer
                        ? "Officers will see a pseudonym only"
                        : "Officers can contact you directly"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isAnonymousToOfficer}
                  onCheckedChange={setIsAnonymousToOfficer}
                />
              </div>

              {/* Contact fields */}
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Your Name</Label>
                  <Input
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={citizenEmail}
                    onChange={(e) => setCitizenEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1"
                  />
                </div>
              </div>

              {isAnonymousToOfficer &&
                (citizenName || citizenPhone || citizenEmail) && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    Your info is stored privately and NOT shown to officers
                  </p>
                )}
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Review Your Submission
              </h2>
              <p className="text-gray-500">
                Make sure everything looks good before submitting
              </p>
            </div>
            <div className="max-w-lg mx-auto space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Type</span>
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
                        <span className="text-gray-500">Visited DC</span>
                        <span>{visitedDC ? "Yes" : "No"}</span>
                      </div>
                      {visitedDC && visitDateOption && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Visit Date</span>
                          <span>
                            {visitDateOption === "today"
                              ? "Today"
                              : visitDateOption === "yesterday"
                              ? "Yesterday"
                              : visitDate
                              ? format(new Date(visitDate), "MMM d, yyyy")
                              : "Not specified"}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Service</span>
                        <span>
                          {services.find((s) => s.id === selectedServiceId)
                            ?.name || "N/A"}
                        </span>
                      </div>
                      {selectedCategories.length > 0 && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500">Categories</span>
                          <div className="text-right">
                            {selectedCategories.map((id) => {
                              const category = serviceCategories.find(
                                (c) => c.id === id
                              );
                              return category ? (
                                <Badge
                                  key={id}
                                  variant="outline"
                                  className="ml-1 mb-1"
                                >
                                  {category.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Priority</span>
                        <Badge
                          variant={
                            priority === "HIGH"
                              ? "destructive"
                              : priority === "MEDIUM"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {priority}
                        </Badge>
                      </div>
                    </>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-gray-500 text-sm mb-1">Subject</p>
                    <p className="font-medium">{subject || "Not specified"}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Description</p>
                    <p className="text-sm line-clamp-3">{description}</p>
                  </div>

                  {files.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Attachments</span>
                      <Badge variant="outline">{files.length} file(s)</Badge>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-gray-500">Privacy</span>
                    <span className="flex items-center gap-1">
                      {isAnonymousToOfficer ? (
                        <>
                          <EyeOff className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Anonymous</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600">Visible</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Show logged in status */}
                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-gray-500">Submitted as</span>
                    {samadhanSession ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <ShieldCheck className="h-4 w-4" />
                        Registered ({samadhanSession.name})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        Guest User
                      </span>
                    )}
                  </div>

                  {/* Guest user warning */}
                  {!samadhanSession && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                      <p className="text-xs text-orange-700">
                        <strong>Note:</strong> You&apos;re submitting as a
                        guest. To access attachments and full tracking features
                        later, consider{" "}
                        <Link
                          href="/samadhan/login"
                          className="underline font-medium"
                        >
                          registering/logging in
                        </Link>{" "}
                        first.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isSubmitting || isSavingDraft}
                  className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Submit {queryType === "GRIEVANCE" ? "Grievance" : "Feedback"}
                </Button>
                {/* Only show Save as Draft for logged-in users */}
                {samadhanSession && (
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting || isSavingDraft}
                    className="w-full"
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save as Draft
                      </>
                    )}
                  </Button>
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading your draft...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/samadhan")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="flex items-center gap-3">
            <Image
              src="/assets/seal_of_sikkim.png"
              width={32}
              height={32}
              alt="Seal"
              className="object-contain"
            />
            <div className="flex flex-col items-center">
              <span className="font-semibold text-gray-900">SAMADHAN</span>
              {existingDraftId && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-700 border-amber-300"
                >
                  Editing Draft
                </Badge>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {currentStep + 1} / {steps.length}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
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
      </div>

      {/* Footer navigation */}
      {currentStepData.id !== "type" && currentStepData.id !== "review" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={goToPrevStep}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button onClick={goToNextStep} className="gap-2">
              {currentStep === steps.length - 2 ? "Review" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        referenceId={submittedReferenceId}
        onClose={() => setShowSuccessModal(false)}
        isGuest={!samadhanSession}
      />

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-center">
              Ready to Submit?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-3 pt-2">
                <span className="block text-base">
                  Please verify all details before submitting your{" "}
                  {queryType.toLowerCase()}.
                </span>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                  <span className="text-amber-800 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Before you submit:
                  </span>
                  <ul className="text-amber-700 text-xs mt-2 space-y-1 ml-6 list-disc">
                    <li>Ensure all information is accurate</li>
                    <li>Verify your contact details are correct</li>
                    <li>Review attached documents if any</li>
                  </ul>
                </div>
                <span className="block text-sm text-gray-500">
                  Once submitted, your {queryType.toLowerCase()} will be sent to
                  the review queue.
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
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Yes, Submit Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
              className="w-full"
            >
              Go Back & Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Success Modal */}
      <Dialog
        open={showDraftSuccessModal}
        onOpenChange={setShowDraftSuccessModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Save className="h-10 w-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-center">
              ✨ Draft Saved!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-2">
                <span className="block">
                  Your {queryType.toLowerCase()} has been saved as a draft.
                </span>
                <span className="block text-sm text-gray-500">
                  You can continue editing and submit it later from your
                  dashboard.
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 text-center">
            <span className="text-sm text-gray-600 block mb-2">
              Your Draft Reference
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
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowDraftSuccessModal(false);
              }}
              className="w-full"
            >
              Continue Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
