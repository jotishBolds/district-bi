"use client";

import { validateFile } from "@/lib/s3-storage";
import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Upload,
  X,
  User,
  UserCheck,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Globe,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ServiceCategorySelector } from "@/components/ui/service-category-selector";

interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

interface Officer {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  profile: {
    id: string;
    fullName: string;
    designation: string;
    department: string;
    officeLocation?: string;
    isAvailable: boolean;
  } | null;
}

interface FrontdeskAssignment {
  id: string;
  officerId: string | null;
  officer: {
    id: string;
    fullName: string;
    designation: string;
    department: string;
  } | null;
}

// Create schemas for both application types - service category is optional for general frontdesk
const publicApplicationSchemaGeneral = z.object({
  serviceCategoryId: z.string().optional(), // Optional for general frontdesk
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  citizenName: z.string().min(2, "Name must be at least 2 characters"),
  citizenPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  citizenEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  citizenAddress: z.string().min(5, "Address must be at least 5 characters"),
  citizenGender: z.string().optional(),
  citizenAadhaar: z.string().optional(),
  assignedOfficerId: z.string().optional(),
  priority: z.number().min(1).max(3),
  instructions: z.string().optional(),
});

const publicApplicationSchemaAssigned = z.object({
  serviceCategoryId: z.string().min(1, "Service category is required"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  citizenName: z.string().min(2, "Name must be at least 2 characters"),
  citizenPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  citizenEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  citizenAddress: z.string().min(5, "Address must be at least 5 characters"),
  citizenGender: z.string().optional(),
  citizenAadhaar: z.string().optional(),
  assignedOfficerId: z.string().optional(),
  priority: z.number().min(1).max(3),
  instructions: z.string().optional(),
});

const governmentApplicationSchemaGeneral = z.object({
  serviceCategoryId: z.string().optional(), // Optional for general frontdesk
  departmentId: z.string().min(1, "Department is required"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  citizenName: z.string().min(2, "Name must be at least 2 characters"),
  citizenPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  citizenEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  citizenAddress: z.string().min(5, "Address must be at least 5 characters"),
  citizenGender: z.string().optional(),
  citizenAadhaar: z.string().optional(),
  assignedOfficerId: z.string().optional(),
  priority: z.number().min(1).max(3),
  instructions: z.string().optional(),
});

const governmentApplicationSchemaAssigned = z.object({
  serviceCategoryId: z.string().min(1, "Service category is required"),
  departmentId: z.string().min(1, "Department is required"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  citizenName: z.string().min(2, "Name must be at least 2 characters"),
  citizenPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  citizenEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  citizenAddress: z.string().min(5, "Address must be at least 5 characters"),
  citizenGender: z.string().optional(),
  citizenAadhaar: z.string().optional(),
  assignedOfficerId: z.string().optional(),
  priority: z.number().min(1).max(3),
  instructions: z.string().optional(),
});

type ApplicationFormData = {
  serviceCategoryId?: string; // Made optional to accommodate general frontdesk
  departmentId?: string;
  subject: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail?: string;
  citizenAddress: string;
  citizenGender?: string;
  citizenAadhaar?: string;
  assignedOfficerId?: string;
  priority: number;
  instructions?: string;
};

// Update steps array to be dynamic based on frontdesk type
const getSteps = (isGeneralFrontdesk: boolean) => {
  if (isGeneralFrontdesk) {
    return [
      { id: 1, name: "Service & Info", icon: Settings },
      { id: 2, name: "Citizen Info", icon: User },
      { id: 3, name: "Documents", icon: FileText },
    ];
  }
  return [
    { id: 1, name: "Service & Info", icon: Settings },
    { id: 2, name: "Citizen Info", icon: User },
    { id: 3, name: "Documents", icon: FileText },
    { id: 4, name: "Assignment", icon: UserCheck },
  ];
};

export default function CreateApplicationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [frontdeskAssignments, setFrontdeskAssignments] = useState<
    FrontdeskAssignment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [documents, setDocuments] = useState<
    Array<{
      file: File;
      documentType: string;
    }>
  >([]);
  // Add state to track if user is general frontdesk
  const [isGeneralFrontdesk, setIsGeneralFrontdesk] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [applicationType, setApplicationType] = useState<
    "PUBLIC" | "GOVERNMENT"
  >("PUBLIC");

  // Add refs for each step card
  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const [highlightedStep, setHighlightedStep] = useState<number | null>(null);

  // Add refs for form inputs to enable auto-focus
  const serviceCategoryRef = useRef<HTMLButtonElement>(null);
  const citizenNameRef = useRef<HTMLInputElement>(null);
  const documentUploadRef = useRef<HTMLInputElement>(null);
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  // Get current schema based on application type and frontdesk type
  const getCurrentSchema = () => {
    if (applicationType === "PUBLIC") {
      return isGeneralFrontdesk
        ? publicApplicationSchemaGeneral
        : publicApplicationSchemaAssigned;
    } else {
      return isGeneralFrontdesk
        ? governmentApplicationSchemaGeneral
        : governmentApplicationSchemaAssigned;
    }
  };

  // State for uncategorised category ID
  const [uncategorisedCategoryId, setUncategorisedCategoryId] =
    useState<string>("");

  // Initialize form without resolver first
  const form = useForm<ApplicationFormData>({
    defaultValues: {
      serviceCategoryId: "",
      departmentId: "",
      subject: "",
      citizenName: "",
      citizenPhone: "",
      citizenEmail: "",
      citizenAddress: "",
      citizenGender: "",
      citizenAadhaar: "",
      assignedOfficerId: "",
      priority: 1, // Default to HIGH priority
      instructions: "",
    },
  });

  const watchedFields = form.watch();

  // Add step validation functions
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Service & Department/Info
        const hasServiceCategory = isGeneralFrontdesk
          ? true
          : !!watchedFields.serviceCategoryId; // General frontdesk doesn't need category
        const hasSubject = !!watchedFields.subject;

        if (applicationType === "PUBLIC") {
          return hasServiceCategory && hasSubject;
        } else {
          return (
            hasServiceCategory && hasSubject && !!watchedFields.departmentId
          );
        }
      case 2: // Citizen Info
        return !!(
          watchedFields.citizenName &&
          watchedFields.citizenPhone &&
          watchedFields.citizenAddress
        );
      case 3: // Documents
        return documents.length > 0;
      case 4: // Assignment (only for specific frontdesk)
        if (isGeneralFrontdesk) {
          return true; // Step 4 doesn't exist for general frontdesk
        } else {
          // For specific frontdesk, only officer assignment is required, instructions are optional
          return !!watchedFields.assignedOfficerId;
        }
      default:
        return false;
    }
  };

  // Helper function to get required steps for validation
  const getRequiredSteps = () => {
    return isGeneralFrontdesk ? [1, 2, 3] : [1, 2, 3, 4];
  };

  // Helper function to check if all required steps are completed
  const allStepsCompleted = () => {
    return getRequiredSteps().every((step) => validateStep(step));
  };

  // Enhanced goToStep with scroll and highlight, accounting for sticky header offset
  const goToStep = (step: number) => {
    setCurrentStep(step);
    setTimeout(() => {
      const ref = stepRefs[step - 1]?.current;
      if (ref) {
        // Find the sticky header height (top header + progress bar)
        // You may need to adjust this value if your sticky headers change height
        const header = document.querySelector(
          ".bg-white.border-b.sticky.top-0"
        );
        const progress = document.querySelector(
          ".sm\\:hidden.bg-white.border-b.sticky.top-16, .hidden.sm\\:block.bg-white.border-b.sticky.top-16"
        );
        let offset = 0;
        if (header) offset += (header as HTMLElement).offsetHeight;
        if (progress) offset += (progress as HTMLElement).offsetHeight;
        // Fallback if not found
        if (!offset) offset = 80; // default header height
        const rect = ref.getBoundingClientRect();
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        window.scrollTo({
          top: rect.top + scrollTop - offset - 180, // 12px extra for spacing
          behavior: "smooth",
        });
        setHighlightedStep(step);
        setTimeout(() => setHighlightedStep(null), 900);

        // Auto-focus the first input of the step
        setTimeout(() => {
          switch (step) {
            case 1: // Service step
              serviceCategoryRef.current?.focus();
              break;
            case 2: // Citizen info step
              citizenNameRef.current?.focus();
              break;
            case 3: // Documents step
              documentUploadRef.current?.focus();
              break;
            case 4: // Officer assignment step (for specific frontdesk)
              if (!isGeneralFrontdesk) {
                instructionsRef.current?.focus();
              }
              break;
          }
        }, 1000); // Wait for scroll animation to complete
      }
    }, 100);
  };

  // Calculate progress based on filled fields and show red for incomplete steps
  const calculateProgress = () => {
    const totalSteps = isGeneralFrontdesk ? 3 : 4;
    const stepsToCheck = isGeneralFrontdesk ? [1, 2, 3] : [1, 2, 3, 4];
    const validSteps = stepsToCheck.filter((step) => validateStep(step));
    return (validSteps.length / totalSteps) * 100;
  };

  // Check if a step is incomplete (user has interacted but not completed)
  const isStepIncomplete = (step: number): boolean => {
    switch (step) {
      case 1: // Service
        return false; // Service step is simple, either selected or not
      case 2: // Citizen Info
        const hasPartialCitizenInfo = !!(
          watchedFields.citizenName ||
          watchedFields.citizenPhone ||
          watchedFields.citizenAddress
        );
        return hasPartialCitizenInfo && !validateStep(2);
      case 3: // Documents
        return false; // Documents either uploaded or not
      case 4: // Assignment (only for specific frontdesk)
        if (isGeneralFrontdesk) {
          return false; // Step 4 doesn't exist for general frontdesk
        }
        // Since instructions are now optional, only show incomplete if officer not assigned
        return !validateStep(4);
      default:
        return false;
    }
  };

  // Check if any step is incomplete
  const hasIncompleteSteps = (): boolean => {
    const stepsToCheck = isGeneralFrontdesk ? [1, 2, 3] : [1, 2, 3, 4];
    return stepsToCheck.some((step) => isStepIncomplete(step));
  };

  // Get progress bar class based on completion status
  const getProgressClass = (): string => {
    if (hasIncompleteSteps()) {
      return "h-2 [&>div]:bg-red-500"; // Red for incomplete steps
    }
    return "h-2"; // Default blue/green for normal progress
  };

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

    fetchServiceCategories();
    fetchDepartments();
    fetchOfficers();
    fetchFrontdeskAssignments();
  }, [session, status, router]);

  // Initialize form resolver after determining frontdesk type
  useEffect(() => {
    if (!formInitialized) {
      setFormInitialized(true);
    }
  }, [formInitialized]);

  // Update form resolver when application type changes
  useEffect(() => {
    if (formInitialized) {
      // We'll create a new form instance with the updated schema if needed
      // For now, we'll handle validation in the submit function
    }
  }, [applicationType, formInitialized]);

  // Auto-set Uncategorised category for general frontdesk
  useEffect(() => {
    if (isGeneralFrontdesk && formInitialized && uncategorisedCategoryId) {
      form.setValue("serviceCategoryId", uncategorisedCategoryId);
    }
  }, [isGeneralFrontdesk, formInitialized, uncategorisedCategoryId, form]);

  // Auto-assign officer when both officers and frontdesk assignments are loaded
  useEffect(() => {
    if (officers.length > 0 && frontdeskAssignments.length > 0) {
      const specificOfficerAssignments = frontdeskAssignments.filter(
        (assignment: FrontdeskAssignment) => assignment.officerId !== null
      );

      if (
        specificOfficerAssignments.length === 1 &&
        specificOfficerAssignments[0].officer
      ) {
        // Find the user ID that corresponds to this officer profile
        const officerProfileId = specificOfficerAssignments[0].officer.id;
        const matchingOfficer = officers.find(
          (officer) => officer.profile?.id === officerProfileId
        );

        if (matchingOfficer) {
          form.setValue("assignedOfficerId", matchingOfficer.id);
        }
      }
    }
  }, [officers, frontdeskAssignments, form]);

  useEffect(() => {
    // Auto-advance to next step when current step is completed
    const maxSteps = isGeneralFrontdesk ? 3 : 4;
    if (validateStep(currentStep) && currentStep < maxSteps) {
      // Optional: You can remove this auto-advance if you prefer manual navigation
      // setCurrentStep(currentStep + 1);
    }
  }, [watchedFields, documents, currentStep, isGeneralFrontdesk]);

  // Auto-focus first input when form is loaded and ready
  useEffect(() => {
    if (!loading && formInitialized && currentStep === 1) {
      setTimeout(() => {
        serviceCategoryRef.current?.focus();
      }, 500); // Small delay to ensure component is fully mounted
    }
  }, [loading, formInitialized, currentStep]);

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch("/api/service-categories");
      if (!response.ok) throw new Error("Failed to fetch service categories");
      const data = await response.json();

      if (Array.isArray(data)) {
        const categories = data.filter(
          (cat: ServiceCategory) => cat.isActive !== false
        );
        setServiceCategories(categories);

        // Find and set the uncategorised category ID
        const uncategorised = categories.find(
          (cat) => cat.name.toLowerCase() === "uncategorised"
        );
        if (uncategorised) {
          setUncategorisedCategoryId(uncategorised.id);
        } else {
          // If not found in categories, fetch it from API
          fetchUncategorisedCategoryId();
        }
      } else {
        setServiceCategories([]);
      }
    } catch (error) {
      console.error("Error fetching service categories:", error);
      toast.error("Failed to load service categories");
      setServiceCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUncategorisedCategoryId = async () => {
    try {
      const response = await fetch("/api/service-categories/uncategorised");
      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          setUncategorisedCategoryId(data.id);
        }
      }
    } catch (error) {
      console.error("Error fetching uncategorised category ID:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      const data = await response.json();

      if (Array.isArray(data)) {
        setDepartments(
          data.filter((dept: Department) => dept.isActive !== false)
        );
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
      setDepartments([]);
    }
  };

  const fetchOfficers = async () => {
    try {
      const response = await fetch("/api/admin/officers");
      if (!response.ok) throw new Error("Failed to fetch officers");
      const data = await response.json();

      if (data && Array.isArray(data.officers)) {
        setOfficers(
          data.officers.filter(
            (officer: Officer) =>
              officer.profile?.isAvailable && officer.isActive
          )
        );
      } else {
        setOfficers([]);
      }
    } catch (error) {
      console.error("Error fetching officers:", error);
      toast.error("Failed to load officers");
      setOfficers([]);
    }
  };

  const fetchFrontdeskAssignments = async () => {
    try {
      const response = await fetch("/api/frontdesk/assignments");
      if (!response.ok)
        throw new Error("Failed to fetch frontdesk assignments");
      const data = await response.json();

      if (data && Array.isArray(data.assignments)) {
        setFrontdeskAssignments(data.assignments);

        // Determine if this is a general frontdesk user
        const hasSpecificAssignments = data.assignments.some(
          (assignment: FrontdeskAssignment) => assignment.officerId !== null
        );
        setIsGeneralFrontdesk(!hasSpecificAssignments);
      } else {
        setFrontdeskAssignments([]);
        setIsGeneralFrontdesk(true); // Default to general if no assignments
      }
    } catch (error) {
      console.error("Error fetching frontdesk assignments:", error);
      toast.error("Failed to load officer assignments");
      setFrontdeskAssignments([]);
      setIsGeneralFrontdesk(true); // Default to general on error
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];

    // Validate each file using the S3 validation function
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        continue;
      }
      validFiles.push(file);
    }

    const newDocuments = validFiles.map((file) => ({
      file,
      documentType: "SUPPORTING_DOCUMENT",
    }));

    setDocuments((prev) => [...prev, ...newDocuments]);
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDocumentType = (index: number, documentType: string) => {
    setDocuments((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, documentType } : doc))
    );
  };

  const onSubmit = async (data: ApplicationFormData) => {
    // For general frontdesk, set serviceCategoryId to Uncategorised if not set
    if (isGeneralFrontdesk && !data.serviceCategoryId) {
      data.serviceCategoryId = uncategorisedCategoryId;
    }

    // Validate using the current schema
    const currentSchema = getCurrentSchema();
    const validation = currentSchema.safeParse(data);

    if (!validation.success) {
      validation.error.errors.forEach((error) => {
        toast.error(`${error.path.join(".")}: ${error.message}`);
      });
      return;
    }

    // Add validation for specific frontdesk
    if (!isGeneralFrontdesk && !data.assignedOfficerId) {
      toast.error("Officer assignment is required for specific frontdesk");
      return;
    }

    if (documents.length === 0) {
      toast.error("Please upload at least one document");
      return;
    }

    setSubmitting(true);
    try {
      const applicationFormData = new FormData();
      applicationFormData.append(
        "serviceCategoryId",
        data.serviceCategoryId || uncategorisedCategoryId
      );

      // Only append departmentId if it exists (for government applications)
      if (data.departmentId) {
        applicationFormData.append("departmentId", data.departmentId);
      }

      applicationFormData.append("subject", data.subject);
      applicationFormData.append("applicationSource", applicationType);

      // Only append officer ID if not general frontdesk
      if (!isGeneralFrontdesk && data.assignedOfficerId) {
        applicationFormData.append(
          "preferredOfficerId",
          data.assignedOfficerId
        );
      }

      // Only append application details if provided (for specific frontdesk)
      if (data.instructions) {
        applicationFormData.append("applicationDetails", data.instructions);
      }
      applicationFormData.append("citizenName", data.citizenName);
      applicationFormData.append("citizenPhone", data.citizenPhone);
      applicationFormData.append("citizenEmail", data.citizenEmail || "");
      applicationFormData.append("citizenAddress", data.citizenAddress);
      applicationFormData.append("citizenGender", data.citizenGender || "");
      applicationFormData.append("citizenAadhaar", data.citizenAadhaar || "");
      applicationFormData.append("priority", data.priority.toString());

      documents.forEach((document, index) => {
        applicationFormData.append(`documents[${index}].file`, document.file);
        applicationFormData.append(
          `documents[${index}].documentType`,
          document.documentType
        );
      });

      const applicationResponse = await fetch("/api/applications", {
        method: "POST",
        body: applicationFormData,
      });

      const applicationResult = await applicationResponse.json();

      if (!applicationResponse.ok) {
        throw new Error(
          applicationResult.error || "Failed to create application"
        );
      }

      toast.success("Application created successfully!");

      // Redirect based on frontdesk type
      if (isGeneralFrontdesk) {
        router.push(`/dashboard`); // General frontdesk goes to main dashboard
      } else {
        router.push(`/dashboard/frontdesk-dashboard`); // Specific frontdesk goes to validate
      }
    } catch (error) {
      console.error("Error creating application:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create application"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Loading Application Form
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Please wait while we prepare the form for you...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header - Make it properly sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Create Application
              </h1>
              <p className="text-sm text-gray-600">
                {isGeneralFrontdesk
                  ? "Create application for the queue - will be assigned by specific frontdesk later"
                  : "Create and assign application directly to your designated officer"}
              </p>
            </div>

            {/* General Frontdesk Notice */}
            {isGeneralFrontdesk && (
              <div className="hidden sm:flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                  <AlertCircle className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-xs text-blue-800 font-medium">
                  General Frontdesk Mode
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps - Mobile - Also sticky */}
      <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-16 z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of 4
          </span>
          <span
            className={`text-sm ${
              hasIncompleteSteps() ? "text-red-600" : "text-gray-500"
            }`}
          >
            {Math.round(calculateProgress())}% Complete
          </span>
        </div>
        <Progress value={calculateProgress()} className={getProgressClass()} />
      </div>

      {/* Progress Steps - Desktop - Also sticky */}
      <div className="hidden sm:block bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center space-x-8">
              {getSteps(isGeneralFrontdesk).map((step, stepIdx) => {
                const Icon = step.icon;
                const isCompleted = validateStep(step.id);
                const isCurrent = currentStep === step.id;
                const isClickable = step.id <= currentStep || isCompleted;
                const isIncomplete = isStepIncomplete(step.id);

                return (
                  <li key={step.name} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => isClickable && goToStep(step.id)}
                        disabled={!isClickable}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                          isCompleted
                            ? "bg-green-600 border-green-600 text-white hover:bg-green-700"
                            : isIncomplete
                            ? "bg-red-500 border-red-500 text-white hover:bg-red-600"
                            : isCurrent
                            ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                            : isClickable
                            ? "border-gray-300 text-gray-400 hover:border-gray-400"
                            : "border-gray-200 text-gray-300 cursor-not-allowed"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : isIncomplete ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </button>
                      <span
                        className={`mt-2 text-sm font-medium ${
                          isCompleted
                            ? "text-green-600"
                            : isIncomplete
                            ? "text-red-500"
                            : isCurrent
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                    {stepIdx < getSteps(isGeneralFrontdesk).length - 1 && (
                      <div
                        className={`ml-8 h-0.5 w-16 transition-colors duration-300 ${
                          isCompleted
                            ? "bg-green-600"
                            : isIncomplete
                            ? "bg-red-300"
                            : "bg-gray-300"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content - Add top padding for sticky headers */}
      <div
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ paddingTop: "2rem" }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Service Selection */}
            <div
              ref={stepRefs[0]}
              className={highlightedStep === 1 ? "animate-step-highlight" : ""}
            >
              <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <Settings className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Service Information
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Select application type and provide service details
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={applicationType}
                    onValueChange={(value) =>
                      setApplicationType(value as "PUBLIC" | "GOVERNMENT")
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger
                        value="PUBLIC"
                        className="flex items-center gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        Citizen Application
                      </TabsTrigger>
                      <TabsTrigger
                        value="GOVERNMENT"
                        className="flex items-center gap-2"
                      >
                        <Building2 className="h-4 w-4" />
                        Receive via Dak
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="PUBLIC" className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-blue-600" />
                          <h3 className="font-medium text-blue-900">
                            Public Service Application
                          </h3>
                        </div>
                        <p className="text-sm text-blue-700">
                          For general citizen services that do not require
                          specific department handling.
                        </p>
                      </div>

                      {/* Service Category - Only show for assigned frontdesk */}
                      {!isGeneralFrontdesk && (
                        <FormField
                          control={form.control}
                          name="serviceCategoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Service Category *
                              </FormLabel>
                              <FormControl>
                                <ServiceCategorySelector
                                  value={field.value || ""}
                                  onValueChangeAction={field.onChange}
                                  placeholder="Search or create service category..."
                                  canCreate={true}
                                />
                              </FormControl>
                              <FormDescription>
                                Search for an existing category or create a new
                                one if it does not exist.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Information for general frontdesk */}
                      {isGeneralFrontdesk && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-700 mb-2">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">
                              Service Category
                            </span>
                          </div>
                          <p className="text-sm text-blue-600">
                            Applications created by general frontdesk will
                            automatically be assigned to the
                            &quot;Uncategorised&quot; service category. They can
                            be recategorized later by assigned frontdesk staff
                            or officers.
                          </p>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Application Subject *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Brief description of the service required"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="GOVERNMENT" className="space-y-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-5 w-5 text-green-600" />
                          <h3 className="font-medium text-green-900">
                            Government Service Application
                          </h3>
                        </div>
                        <p className="text-sm text-green-700">
                          For services that require specific department handling
                          and processing.
                        </p>
                      </div>

                      {/* Service Category - Only show for assigned frontdesk */}
                      {!isGeneralFrontdesk && (
                        <FormField
                          control={form.control}
                          name="serviceCategoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Service Category *
                              </FormLabel>
                              <FormControl>
                                <ServiceCategorySelector
                                  value={field.value || ""}
                                  onValueChangeAction={field.onChange}
                                  placeholder="Search or create service category..."
                                  canCreate={true}
                                />
                              </FormControl>
                              <FormDescription>
                                Search for an existing category or create a new
                                one if it does not exist.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Information for general frontdesk */}
                      {isGeneralFrontdesk && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 mb-2">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">
                              Service Category
                            </span>
                          </div>
                          <p className="text-sm text-green-600">
                            Applications created by general frontdesk will
                            automatically be assigned to the
                            &quot;Uncategorised&quot; service category. They can
                            be recategorized later by assigned frontdesk staff
                            or officers.
                          </p>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="departmentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Receive from Department *
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Select receiving department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departments.map((department) => (
                                  <SelectItem
                                    key={department.id}
                                    value={department.id}
                                  >
                                    <div className="flex flex-col items-start">
                                      <span>{department.name}</span>
                                      {department.description && (
                                        <span className="text-xs text-muted-foreground">
                                          {department.description}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select the department that will receive and
                              process this application.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Application Subject *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Brief description of the service required"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
                {/* Step Navigation - Add to Service Card */}
                <div className="px-6 pb-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {validateStep(1) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isStepIncomplete(1) ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span
                        className={`text-sm ${
                          validateStep(1)
                            ? "text-green-600"
                            : isStepIncomplete(1)
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {validateStep(1)
                          ? "Step completed"
                          : isStepIncomplete(1)
                          ? "Complete this step"
                          : "Complete this step"}
                      </span>
                    </div>
                    {validateStep(1) && currentStep === 1 && (
                      <Button
                        type="button"
                        onClick={() => goToStep(2)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Next: Citizen Info
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Citizen Information */}
            <div
              ref={stepRefs[1]}
              className={highlightedStep === 2 ? "animate-step-highlight" : ""}
            >
              <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                      <User className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Citizen Information
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Enter the citizen&apos;s personal details
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="citizenName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Full Name *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter citizen's full name"
                              className="h-11"
                              {...field}
                              ref={(e) => {
                                field.ref(e);
                                citizenNameRef.current = e;
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="citizenPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Phone Number *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="10-digit phone number"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="citizenEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Email Address
                            <span className="text-gray-400 ml-1">
                              (Optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="citizen@example.com"
                              type="email"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="citizenGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Gender
                            <span className="text-gray-400 ml-1">
                              (Optional)
                            </span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="citizenAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Complete Address *
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter complete residential address with pincode"
                            className="min-h-[100px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="citizenAadhaar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Aadhaar Number
                          <span className="text-gray-400 ml-1">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="1234 5678 9012"
                            maxLength={12}
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                {/* Step Navigation - Add to Citizen Info Card */}
                <div className="px-6 pb-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {validateStep(2) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isStepIncomplete(2) ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span
                        className={`text-sm ${
                          validateStep(2)
                            ? "text-green-600"
                            : isStepIncomplete(2)
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {validateStep(2)
                          ? "Step completed"
                          : isStepIncomplete(2)
                          ? "Complete this step"
                          : "Complete this step"}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {currentStep === 2 && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => goToStep(1)}
                            size="sm"
                          >
                            Back
                          </Button>
                          {validateStep(2) && (
                            <Button
                              type="button"
                              onClick={() => goToStep(3)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Next: Documents
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Document Upload */}
            <div
              ref={stepRefs[2]}
              className={highlightedStep === 3 ? "animate-step-highlight" : ""}
            >
              <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Document Upload</CardTitle>
                      <CardDescription className="text-sm">
                        Upload required documents for the application
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => documentUploadRef.current?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div>
                      <span className="text-base font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        Click to upload documents
                      </span>
                      <p className="mt-2 text-sm text-gray-500">
                        PNG, JPG, PDF up to 5MB each. Multiple files supported.
                      </p>
                      <Input
                        ref={documentUploadRef}
                        id="document-upload"
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {documents.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">
                          Uploaded Documents ({documents.length})
                        </Label>
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <FileText className="h-5 w-5 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-48">
                                <Select
                                  value={doc.documentType}
                                  onValueChange={(value) =>
                                    updateDocumentType(index, value)
                                  }
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ID_PROOF">
                                      ID Proof
                                    </SelectItem>
                                    <SelectItem value="ADDRESS_PROOF">
                                      Address Proof
                                    </SelectItem>
                                    <SelectItem value="APPLICATION_FORM">
                                      Application Form
                                    </SelectItem>
                                    <SelectItem value="SUPPORTING_DOCUMENT">
                                      Supporting Document
                                    </SelectItem>
                                    <SelectItem value="PAYMENT_RECEIPT">
                                      Payment Receipt
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                              className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                {/* Step Navigation - Add to Documents Card */}
                <div className="px-6 pb-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {validateStep(3) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isStepIncomplete(3) ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span
                        className={`text-sm ${
                          validateStep(3)
                            ? "text-green-600"
                            : isStepIncomplete(3)
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {validateStep(3)
                          ? "Step completed"
                          : isStepIncomplete(3)
                          ? "Upload at least one document"
                          : "Upload at least one document"}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {currentStep === 3 && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => goToStep(2)}
                            size="sm"
                          >
                            Back
                          </Button>
                          {validateStep(3) && (
                            <Button
                              type="button"
                              onClick={() => {
                                if (isGeneralFrontdesk) {
                                  // For general frontdesk, scroll to submit section
                                  const submitCard = document.querySelector(
                                    ".bg-white\\/80.backdrop-blur-sm:last-of-type"
                                  );
                                  if (submitCard) {
                                    submitCard.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    });
                                  }
                                } else {
                                  goToStep(4);
                                }
                              }}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isGeneralFrontdesk
                                ? "Ready to Submit"
                                : "Next: Assignment"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Officer Assignment - Only for specific frontdesk */}
            {!isGeneralFrontdesk && (
              <div
                ref={stepRefs[3]}
                className={
                  highlightedStep === 4 ? "animate-step-highlight" : ""
                }
              >
                <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                        <UserCheck className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Officer Assignment
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Assign the application to a specific officer for
                          processing
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-6">
                      {/* Officer Assignment Section */}
                      <FormField
                        control={form.control}
                        name="assignedOfficerId"
                        render={({ field }) => {
                          // Get available officers based on frontdesk assignments
                          const availableOfficers = frontdeskAssignments
                            .filter((assignment) => assignment.officer !== null)
                            .map((assignment) => assignment.officer!)
                            .filter((officer) => officer !== null);

                          // Create a list of officers to show with their user IDs
                          let officersToShow: Array<{
                            id: string;
                            fullName: string;
                            designation: string;
                            department: string;
                          }> = [];

                          if (availableOfficers.length > 0) {
                            // Map frontdesk assignment officers to their corresponding user IDs
                            officersToShow = availableOfficers.map(
                              (assignedOfficer) => {
                                const matchingOfficer = officers.find(
                                  (o) => o.profile?.id === assignedOfficer.id
                                );
                                return {
                                  id: matchingOfficer?.id || assignedOfficer.id, // Use user ID if found, fallback to profile ID
                                  fullName: assignedOfficer.fullName,
                                  designation: assignedOfficer.designation,
                                  department: assignedOfficer.department,
                                };
                              }
                            );
                          } else {
                            // Fallback to all officers with their user IDs
                            officersToShow = officers
                              .filter((o) => o.profile)
                              .map((o) => ({
                                id: o.id, // This is the user ID
                                fullName: o.profile!.fullName,
                                designation: o.profile!.designation,
                                department: o.profile!.department,
                              }));
                          }

                          return (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Assign to Officer *
                              </FormLabel>
                              {officersToShow.length === 1 ? (
                                // If only one officer, show it as read-only with info
                                <div className="relative">
                                  <div className="h-14 px-4 py-4 border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                        <UserCheck className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <span className="font-medium text-sm text-gray-900">
                                          {officersToShow[0]?.fullName}
                                        </span>
                                        <p className="text-xs text-gray-600">
                                          {officersToShow[0]?.designation} •{" "}
                                          {officersToShow[0]?.department}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-green-100 text-green-700 border-green-200"
                                    >
                                      Auto-assigned
                                    </Badge>
                                  </div>
                                </div>
                              ) : (
                                // If multiple officers, show dropdown
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder="Select an available officer" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {officersToShow.map((officer) => (
                                      <SelectItem
                                        key={officer?.id}
                                        value={officer?.id}
                                      >
                                        <div className="flex items-center space-x-3 py-1">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                                            <UserCheck className="h-3 w-3 text-blue-600" />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="font-medium">
                                              {officer?.fullName}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {officer?.designation} •{" "}
                                              {officer?.department}
                                            </span>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      {/* Priority Level Section */}
                      <div>
                        <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                          Priority Level
                        </FormLabel>
                        <div className="h-14 px-4 py-4 border border-gray-200 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                High Priority
                              </span>
                              <p className="text-xs text-gray-600">
                                All applications are processed with high
                                priority
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="default"
                            className="bg-red-500 hover:bg-red-600 text-xs font-semibold"
                          >
                            HIGH
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  {/* Step Navigation - Add to Assignment Card */}
                  <div className="px-6 pb-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {validateStep(4) ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : isStepIncomplete(4) ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span
                          className={`text-sm ${
                            validateStep(4)
                              ? "text-green-600"
                              : isStepIncomplete(4)
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {validateStep(4)
                            ? "Step completed"
                            : isStepIncomplete(4)
                            ? "Complete officer assignment"
                            : "Complete officer assignment"}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        {currentStep === 4 && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => goToStep(3)}
                              size="sm"
                            >
                              Back
                            </Button>
                            {validateStep(4) && (
                              <Button
                                type="button"
                                onClick={() => {
                                  // Scroll to instructions section
                                  const instructionsCard =
                                    document.querySelector(
                                      ".bg-white\\/80.backdrop-blur-sm:last-of-type"
                                    );
                                  if (instructionsCard) {
                                    instructionsCard.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    });
                                    // Focus on instructions textarea
                                    setTimeout(() => {
                                      instructionsRef.current?.focus();
                                    }, 1000);
                                  }
                                }}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Next: Instructions
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Application Details - Only shown for specific frontdesk */}
            {!isGeneralFrontdesk && (
              <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Additional Instructions
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Provide additional instructions for the assigned officer
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Application Instructions Section */}
                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Instructions for Officer
                          <span className="text-gray-400 ml-1">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide detailed instructions, requirements, or description for the application processing..."
                            className="min-h-[120px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                            ref={(e) => {
                              field.ref(e);
                              instructionsRef.current = e;
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500 mt-1">
                          This information will help the assigned officer
                          understand the specific requirements and context of
                          the application.
                        </p>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Submit Section - Update the completion check */}
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {allStepsCompleted() ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {allStepsCompleted()
                          ? "Ready to Submit"
                          : `${
                              getRequiredSteps().filter((step) =>
                                validateStep(step)
                              ).length
                            }/${getRequiredSteps().length} Steps Completed`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {allStepsCompleted()
                          ? "All required information has been provided"
                          : "Please complete all steps before submitting"}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !allStepsCompleted()}
                      className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Application"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
      {/* Animation CSS */}
      <style jsx global>{`
        .animate-step-highlight {
          animation: stepHighlight 0.9s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes stepHighlight {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
            background: #e0f2fe;
          }
          60% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.15);
            background: #bae6fd;
          }
          100% {
            box-shadow: none;
            background: none;
          }
        }
      `}</style>
    </div>
  );
}
