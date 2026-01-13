"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { UserRole } from "@/app/generated/prisma";
import {
  OFFICER_ROLE_MAPPINGS,
  getRoleMapping,
  getAllRoles,
  getRolesByLevel,
  getNonLegacyRolesByLevel,
  isOfficerRole as checkOfficerRole,
  isAdminRole,
} from "@/lib/officer-roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  User,
  UserCog,
  UserPlus,
  X,
  Shield,
  Crown,
  Users,
  Building,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the user type based on your Prisma schema
type User = {
  id: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  level?: number | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  officerProfile?: {
    fullName: string;
    designation?: string;
    department?: string;
    officeLocation?: string;
    sectionId?: string;
    section?: {
      id: string;
      name: string;
      description?: string;
    };
  } | null;
  citizenProfile?: {
    fullName: string;
  } | null;
};

// API Response Types
interface CreateUserResponse {
  user: User;
  password?: string;
}

interface UpdateUserResponse {
  user: User;
}

interface CreateAdminResponse {
  user: User;
  email: string;
  password: string;
}

// Enhanced validation schema with comprehensive validation
const formSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" })
      .max(255, { message: "Email is too long" })
      .refine(
        (email) => {
          // Additional email format validation
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          return emailRegex.test(email);
        },
        { message: "Please enter a valid email format" }
      ),

    phone: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true;
          // Enhanced phone validation - supports international formats
          // Accepts: +91-9876543210, +1 (555) 123-4567, 9876543210, etc.
          const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)\.\+]{7,15}$/;
          const cleanPhone = val.replace(/[\s\-\(\)\.\+]/g, "");
          return (
            phoneRegex.test(val) &&
            cleanPhone.length >= 7 &&
            cleanPhone.length <= 15
          );
        },
        {
          message:
            "Please enter a valid phone number (7-15 digits with optional country code)",
        }
      ),

    role: z.nativeEnum(UserRole, {
      errorMap: () => ({ message: "Please select a valid role" }),
    }),

    level: z
      .number()
      .int({ message: "Level must be a whole number" })
      .min(-2, { message: "Level cannot be less than -2" })
      .max(7, { message: "Level cannot be greater than 7" })
      .optional(),

    fullName: z
      .string()
      .min(1, { message: "Full name is required" })
      .min(2, { message: "Full name must be at least 2 characters" })
      .max(100, { message: "Full name is too long" })
      .regex(/^[a-zA-Z\s\-\.\']+$/, {
        message:
          "Full name can only contain letters, spaces, hyphens, dots, and apostrophes",
      })
      .refine((name) => name.trim().length > 0, {
        message: "Full name cannot be just spaces",
      }),

    isActive: z.boolean(),

    // Officer-specific fields
    designation: z
      .string()
      .max(100, { message: "Designation is too long" })
      .optional(),

    department: z
      .string()
      .max(100, { message: "Department name is too long" })
      .optional(),

    officeLocation: z
      .string()
      .max(200, { message: "Office location is too long" })
      .optional(),

    sectionId: z.string().optional(),

    // Enhanced password validation
    password: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true;
          return val.length >= 8;
        },
        {
          message: "Password must be at least 8 characters if provided",
        }
      )
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true;
          // Strong password: at least one uppercase, one lowercase, one number, one special character
          const strongPasswordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
          return strongPasswordRegex.test(val);
        },
        {
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
        }
      ),
  })
  .superRefine((data, ctx) => {
    // Conditional validation for officer roles
    if (checkOfficerRole(data.role)) {
      if (!data.designation || data.designation.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Designation is required for officer roles",
          path: ["designation"],
        });
      }

      if (!data.department || data.department.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Department is required for officer roles",
          path: ["department"],
        });
      }

      if (!data.sectionId || data.sectionId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Section is required for officer roles",
          path: ["sectionId"],
        });
      }
    }
  });

type FormData = z.infer<typeof formSchema>;

// Helper function to get role badge variant
const getRoleBadgeVariant = (role: UserRole) => {
  if (isAdminRole(role)) return "destructive";
  if (checkOfficerRole(role)) return "default";
  return "secondary";
};

// Helper function to get level badge variant
const getLevelBadgeVariant = (level?: number | null) => {
  if (level === null || level === undefined) return "outline";
  if (level <= 0) return "destructive";
  if (level <= 2) return "default";
  if (level <= 4) return "secondary";
  return "outline";
};

// Helper function to get role icon
const getRoleIcon = (role: UserRole) => {
  if (role === UserRole.SUPER_ADMIN) return Crown;
  if (role === UserRole.ADMIN) return Shield;
  if (checkOfficerRole(role)) return UserCog;
  return User;
};

// Helper function to sanitize form data
const sanitizeFormData = (data: FormData): FormData => {
  return {
    ...data,
    email: data.email?.trim().toLowerCase(),
    fullName: data.fullName?.trim(),
    phone: data.phone?.trim() || undefined,
    designation: data.designation?.trim() || undefined,
    department: data.department?.trim() || undefined,
    officeLocation: data.officeLocation?.trim() || undefined,
    password: data.password?.trim() || undefined,
  };
};

// Types for error handling
interface ApiError {
  message?: string;
  error?: string;
  errors?: Array<{ message?: string } | string>;
  details?: string | string[];
}

// Enhanced error message parser
const parseApiError = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }

  const apiError = error as ApiError;

  if (apiError?.message) {
    return apiError.message;
  }

  if (apiError?.error) {
    return apiError.error;
  }

  // Handle validation errors
  if (apiError?.errors && Array.isArray(apiError.errors)) {
    return apiError.errors
      .map((err: { message?: string } | string) =>
        typeof err === "string" ? err : err.message || "Unknown error"
      )
      .join(", ");
  }

  // Handle field-specific errors
  if (apiError?.details) {
    if (typeof apiError.details === "string") {
      return apiError.details;
    }
    if (Array.isArray(apiError.details)) {
      return apiError.details.join(", ");
    }
  }

  return "An unexpected error occurred";
};

export default function UserManagement() {
  const { data: session } = useSession();
  const router = useRouter();

  // Initialize form with enhanced validation
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      phone: "",
      fullName: "",
      role: UserRole.OS_RC,
      level: 6,
      isActive: true,
      designation: "",
      department: "",
      officeLocation: "",
      sectionId: "",
      password: "",
    },
    mode: "onChange", // Real-time validation
  });

  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const loadingToastShown = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDetails, setDeleteDetails] = useState<{
    details: string[];
    totalDependencies: number;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailValidationLoading, setEmailValidationLoading] = useState(false);

  // Watch form values
  const watchRole = form.watch("role");
  const watchEmail = form.watch("email");

  // Check authorization
  useEffect(() => {
    if (
      session?.user &&
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN
    ) {
      router.push("/dashboard");
      // Removed toast since we're redirecting anyway
    }
  }, [session, router]);

  // Enhanced email validation with debouncing
  useEffect(() => {
    if (!watchEmail || watchEmail.length < 3) return;

    const timer = setTimeout(async () => {
      if (form.formState.errors.email) return; // Skip if email format is invalid

      setEmailValidationLoading(true);
      try {
        const response = await fetch(
          `/api/admin/check-email?email=${encodeURIComponent(watchEmail)}${
            selectedUser?.id ? `&exclude=${selectedUser.id}` : ""
          }`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            form.setError("email", {
              type: "manual",
              message: "This email address is already registered",
            });
          } else {
            form.clearErrors("email");
          }
        }
      } catch (error) {
        console.error("Email validation error:", error);
        // Don't show error to user for validation failures
      } finally {
        setEmailValidationLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [watchEmail, selectedUser?.id, form]);

  // Fetch data with enhanced error handling
  useEffect(() => {
    const fetchData = async () => {
      if (dataFetched || !session?.user || loadingToastShown.current) return; // Prevent multiple fetches and ensure session exists

      // Double check authorization
      if (
        session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.SUPER_ADMIN
      ) {
        return; // Don't fetch if not authorized
      }

      setDataFetched(true); // Mark as fetching to prevent duplicate calls
      loadingToastShown.current = true; // Mark toast as shown

      const loadingToast = toast.loading("Loading users and sections...");

      try {
        const [usersResponse, sectionsResponse] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/sections"),
        ]);

        let usersData = [];
        let sectionsData = [];

        // Handle users response
        if (usersResponse.ok) {
          const usersResult = await usersResponse.json();
          usersData = Array.isArray(usersResult.users) ? usersResult.users : [];
        } else {
          const errorData = await usersResponse.json();
          console.error("Failed to fetch users:", errorData);
        }

        // Handle sections response
        if (sectionsResponse.ok) {
          const sectionsResult = await sectionsResponse.json();
          sectionsData = Array.isArray(sectionsResult)
            ? sectionsResult
            : Array.isArray(sectionsResult.sections)
            ? sectionsResult.sections
            : [];
        } else {
          const errorData = await sectionsResponse.json();
          console.error("Failed to fetch sections:", errorData);
        }

        setUsers(usersData);
        setSections(sectionsData);

        toast.success("Data loaded successfully", { id: loadingToast });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data. Please refresh the page.", {
          id: loadingToast,
          duration: 6000,
        });

        // Set empty arrays to prevent crashes
        setUsers([]);
        setSections([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id]); // Removed dataFetched from dependencies since we handle it internally

  // Auto-populate role-based fields
  useEffect(() => {
    if (watchRole) {
      const roleMapping = getRoleMapping(watchRole);
      if (roleMapping) {
        form.setValue("level", roleMapping.level);

        // Find matching section
        const defaultSection = sections.find(
          (s) => s.name === roleMapping.defaultSection
        );
        if (defaultSection) {
          form.setValue("sectionId", defaultSection.id);
        }

        // Set default values
        form.setValue("designation", roleMapping.shortDesignation);
        form.setValue("department", roleMapping.defaultSection);
      }
    }
  }, [watchRole, sections, form]);

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.officerProfile?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      user.citizenProfile?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && user.isActive) ||
      (statusFilter === "INACTIVE" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Enhanced error handling for API responses
  const handleApiResponse = async <T = unknown,>(
    response: Response
  ): Promise<T> => {
    let responseData;

    try {
      responseData = await response.json();
    } catch (e) {
      throw new Error(
        `Server error (${response.status}): Unable to parse response`
      );
    }

    if (!response.ok) {
      const errorMessage = parseApiError(responseData);

      // Handle specific error cases
      if (response.status === 400) {
        throw new Error(errorMessage || "Invalid data provided");
      } else if (response.status === 409) {
        throw new Error("User with this email already exists");
      } else if (response.status === 403) {
        throw new Error("You don't have permission to perform this action");
      } else if (response.status === 404) {
        throw new Error("User not found");
      } else if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(errorMessage);
      }
    }

    return responseData;
  };

  // Handle create user with enhanced error handling
  const onSubmitCreate = async (values: FormData) => {
    setIsSubmitting(true);
    const loadingToast = toast.loading("Creating user...");

    try {
      // Sanitize data
      const sanitizedData = sanitizeFormData(values);

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedData),
      });

      const responseData = await handleApiResponse<CreateUserResponse>(
        response
      );
      const newUser = responseData;

      setUsers((prev) => [...prev, newUser.user]);

      // Send account creation email
      try {
        const emailResponse = await fetch("/api/admin/send-account-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: sanitizedData.fullName,
            email: sanitizedData.email,
            password: newUser.password || sanitizedData.password,
            role: sanitizedData.role,
            designation: sanitizedData.designation,
            department: sanitizedData.department,
          }),
        });

        if (!emailResponse.ok) {
          console.warn("Failed to send account creation email");
        }

        toast.success("User created successfully and email sent!", {
          id: loadingToast,
        });
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        toast.success("User created successfully (email sending failed)", {
          id: loadingToast,
        });
      }

      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      toast.error(errorMessage, { id: loadingToast, duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit user with enhanced error handling
  const onSubmitEdit = async (values: FormData) => {
    if (!selectedUser) {
      toast.error("No user selected for editing");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Updating user...");

    try {
      // Sanitize data
      const sanitizedData = sanitizeFormData(values);

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedData),
      });

      const responseData = await handleApiResponse<UpdateUserResponse>(
        response
      );
      const updatedUser = responseData;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id ? updatedUser.user : user
        )
      );

      toast.success("User updated successfully!", { id: loadingToast });
      setEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";
      toast.error(errorMessage, { id: loadingToast, duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user with enhanced error handling
  const handleDeleteUser = async () => {
    if (!selectedUser) {
      toast.error("No user selected for deletion");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Deleting user...");

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details && errorData.totalDependencies) {
          // Set deletion details for display
          setDeleteDetails({
            details: errorData.details,
            totalDependencies: errorData.totalDependencies,
          });
          toast.error(
            `Cannot delete user: ${errorData.totalDependencies} dependencies found`,
            { id: loadingToast, duration: 8000 }
          );
          return;
        }
        throw new Error(errorData.error || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
      toast.success("User deleted successfully!", { id: loadingToast });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setDeleteDetails(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user";
      toast.error(errorMessage, { id: loadingToast, duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog
  const handleEditUser = (user: User) => {
    setSelectedUser(user);

    form.reset({
      email: user.email || "",
      phone: user.phone || "",
      fullName:
        user.officerProfile?.fullName || user.citizenProfile?.fullName || "",
      role: user.role,
      level: user.level ?? undefined,
      isActive: user.isActive,
      designation: user.officerProfile?.designation || "",
      department: user.officerProfile?.department || "",
      officeLocation: user.officerProfile?.officeLocation || "",
      sectionId:
        user.officerProfile?.section?.id ||
        user.officerProfile?.sectionId ||
        "",
      password: "",
    });

    setEditDialogOpen(true);
  };

  // Toggle user status with enhanced error handling
  const toggleUserStatus = async (user: User) => {
    const loadingToast = toast.loading(
      `${user.isActive ? "Deactivating" : "Activating"} user...`
    );

    try {
      const response = await fetch(
        `/api/admin/users/${user.id}/toggle-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive: !user.isActive }),
        }
      );

      await handleApiResponse(response);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );

      toast.success(
        `User ${!user.isActive ? "activated" : "deactivated"} successfully!`,
        { id: loadingToast }
      );
    } catch (error) {
      console.error("Error toggling user status:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user status";
      toast.error(errorMessage, { id: loadingToast, duration: 5000 });
    }
  };

  // Create temp admin with enhanced error handling
  const createTempAdminUser = async () => {
    setIsSubmitting(true);
    const loadingToast = toast.loading("Creating temporary admin...");

    try {
      const response = await fetch("/api/admin/create-temp-admin", {
        method: "POST",
      });

      const data = await handleApiResponse<CreateAdminResponse>(response);

      toast.success(
        `Temporary admin created!\nEmail: ${data.email}\nPassword: ${data.password}`,
        { id: loadingToast, duration: 10000 }
      );

      setUsers((prev) => [...prev, data.user]);
    } catch (error) {
      console.error("Error creating temp admin:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create temporary admin";
      toast.error(errorMessage, { id: loadingToast, duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form helper
  const resetForm = () => {
    form.reset({
      email: "",
      phone: "",
      fullName: "",
      role: UserRole.OS_RC,
      level: 6,
      isActive: true,
      designation: "",
      department: "",
      officeLocation: "",
      sectionId: "",
      password: "",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Create and manage user accounts within the system.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* <Button
            variant="outline"
            onClick={createTempAdminUser}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="mr-2 h-4 w-4" />
            )}
            Create Temp Admin
          </Button> */}
          <Button
            onClick={() => {
              resetForm();
              setCreateDialogOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row w-full lg:w-2/3 gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            onValueChange={(value) => setRoleFilter(value)}
            defaultValue="ALL"
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value={UserRole.FRONT_DESK}>Front Desk</SelectItem>
              <SelectItem value={UserRole.DC}>District Collector</SelectItem>
              <SelectItem value={UserRole.ADC_GTK}>ADC (Gangtok)</SelectItem>
              <SelectItem value={UserRole.ADC_HQ}>ADC (HQ)</SelectItem>
              <SelectItem value={UserRole.SDM_GTK}>SDM (Gangtok)</SelectItem>
              <SelectItem value={UserRole.SDM_HQ}>SDM (HQ)</SelectItem>
              <SelectItem value={UserRole.AC}>Assistant Collector</SelectItem>
              <SelectItem value={UserRole.DPO_DDMA}>
                Joint Director (DDMA)
              </SelectItem>
              <SelectItem value={UserRole.DD_REV}>DD (Revenue)</SelectItem>
              <SelectItem value={UserRole.DD_ACQ}>DD (Acquisition)</SelectItem>
              <SelectItem value={UserRole.US_ADM}>
                US (Administration)
              </SelectItem>
              <SelectItem value={UserRole.AO}>Accounts Officer</SelectItem>
              <SelectItem value={UserRole.TO_DDMA}>Training Officer</SelectItem>
              <SelectItem value={UserRole.AD_IT}>AD (IT)</SelectItem>
              <SelectItem value={UserRole.US_ELECTION}>
                US (Election)
              </SelectItem>
              <SelectItem value={UserRole.OS_COI_RC}>OS (COI & RC)</SelectItem>
              <SelectItem value={UserRole.OS_RC}>OS (Registration)</SelectItem>
              <SelectItem value={UserRole.RI_LEGAL}>RI (Legal)</SelectItem>
              <SelectItem value={UserRole.DEALING_HAND}>
                Dealing Hand
              </SelectItem>
              {/* DISPATCH_HANDLER is hidden/deprecated */}
              <SelectItem value={UserRole.ADC}>ADC (Legacy)</SelectItem>
              <SelectItem value={UserRole.RO}>RO (Legacy)</SelectItem>
              <SelectItem value={UserRole.SDM}>SDM (Legacy)</SelectItem>
              <SelectItem value={UserRole.DYDIR}>DYDIR (Legacy)</SelectItem>
              <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
              <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => setStatusFilter(value)}
            defaultValue="ALL"
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <User className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="font-medium text-lg">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "Create a new user to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">User</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[200px]">
                      Role
                    </TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[100px]">
                      Level
                    </TableHead>
                    <TableHead className="hidden xl:table-cell min-w-[150px]">
                      Section
                    </TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[120px]">
                      Last Login
                    </TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[100px]">
                      Status
                    </TableHead>
                    <TableHead className="text-right min-w-[80px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleMapping = getRoleMapping(user.role);
                    const RoleIcon = getRoleIcon(user.role);

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <RoleIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium truncate max-w-[200px]">
                                {user.officerProfile?.fullName ||
                                  user.citizenProfile?.fullName ||
                                  "Unnamed User"}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">
                                  {user.email}
                                </span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{user.phone}</span>
                                </div>
                              )}
                              <div className="md:hidden mt-1">
                                <Badge
                                  variant={getRoleBadgeVariant(user.role)}
                                  className="text-xs"
                                >
                                  <span className="truncate max-w-[150px]">
                                    {roleMapping?.shortDesignation || user.role}
                                  </span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            <Badge
                              variant={getRoleBadgeVariant(user.role)}
                              className="w-fit"
                            >
                              <div className="flex items-center gap-1">
                                <RoleIcon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {roleMapping?.shortDesignation || user.role}
                                </span>
                              </div>
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {roleMapping?.fullName || user.role}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={getLevelBadgeVariant(user.level)}
                              className="w-fit"
                            >
                              {user.level !== null && user.level !== undefined
                                ? `Level ${user.level}`
                                : "N/A"}
                            </Badge>
                            {user.level !== null &&
                              user.level !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {user.level === 0
                                    ? "Highest"
                                    : user.level === 6
                                    ? "Lowest"
                                    : `Priority ${user.level}`}
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex items-center gap-2 max-w-[150px]">
                            <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-medium truncate">
                                {user.officerProfile?.section?.name ||
                                  "No Section"}
                              </span>
                              {user.officerProfile?.section?.description && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {user.officerProfile.section.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">
                              {user.lastLoginAt
                                ? new Date(
                                    user.lastLoginAt
                                  ).toLocaleDateString()
                                : "Never"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            className={
                              user.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                            }
                          >
                            <div className="flex items-center gap-1">
                              {user.isActive ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              ) : (
                                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                              )}
                              {user.isActive ? "Active" : "Inactive"}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleUserStatus(user)}
                              >
                                {user.isActive ? (
                                  <>
                                    <X className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeleteDetails(null);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-7xl sm:max-w-7xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Enter the details to create a new user account. All required
              fields must be completed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-6 -mr-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitCreate)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        Full Name
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name (e.g., John Doe)"
                          {...field}
                          className={
                            form.formState.errors.fullName
                              ? "border-red-500"
                              : ""
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Enter the complete name (letters, spaces, hyphens, dots,
                        and apostrophes only)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Email Address
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="email"
                              placeholder="user@example.com"
                              {...field}
                              className={
                                form.formState.errors.email
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            {emailValidationLoading && (
                              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {!form.formState.errors.email &&
                              field.value &&
                              !emailValidationLoading && (
                                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                              )}
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          A valid email address for account notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+91 9876543210"
                            {...field}
                            className={
                              form.formState.errors.phone
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Optional. Include country code for international
                          numbers (7-15 digits)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Role
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={
                                form.formState.errors.role
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                              Administrative Roles
                            </div>
                            <SelectItem value={UserRole.SUPER_ADMIN}>
                              <div className="flex items-center gap-2 w-full">
                                <Crown className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  Super Administrator
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value={UserRole.ADMIN}>
                              <div className="flex items-center gap-2 w-full">
                                <Shield className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Administrator</span>
                              </div>
                            </SelectItem>

                            {Object.entries(getNonLegacyRolesByLevel()).map(
                              ([level, roles]) => {
                                const levelNum = parseInt(level);
                                if (levelNum < 0 || levelNum > 8) return null;

                                return (
                                  <div key={level}>
                                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                                      Level {level}{" "}
                                      {levelNum === 8
                                        ? "Officials"
                                        : "Officers"}{" "}
                                      (
                                      {levelNum === 0
                                        ? "Highest"
                                        : levelNum === 7
                                        ? "Dealing Hands"
                                        : levelNum === 8
                                        ? "Support Staff"
                                        : `Priority ${levelNum}`}
                                      )
                                    </div>
                                    {roles
                                      .filter(
                                        (role) => role !== UserRole.FRONT_DESK
                                      )
                                      .map((role) => {
                                        const mapping = getRoleMapping(role);
                                        return (
                                          <SelectItem key={role} value={role}>
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                              <UserCog className="w-4 h-4 flex-shrink-0" />
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <span className="truncate">
                                                  {mapping?.fullName || role}
                                                </span>
                                                <span className="text-xs text-gray-500 truncate">
                                                  {mapping?.shortDesignation ||
                                                    role}
                                                </span>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                  </div>
                                );
                              }
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Leave blank for auto-generation"
                            {...field}
                            className={
                              form.formState.errors.password
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Leave blank to auto-generate. If provided: min 8
                          chars, include uppercase, lowercase, number, and
                          special character (@$!%*?&)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={-2}
                            max={7}
                            placeholder="Auto-filled based on role"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                              )
                            }
                            className={
                              form.formState.errors.level
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          -2: Super Admin, -1: Admin, 0-6: Officer levels (0 is
                          highest priority)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Section
                          {checkOfficerRole(watchRole) && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={
                                form.formState.errors.sectionId
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select a section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {sections.map((section) => (
                              <SelectItem key={section.id} value={section.id}>
                                <span className="truncate max-w-[200px]">
                                  {section.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          {checkOfficerRole(watchRole)
                            ? "Required for officer roles"
                            : "Optional for non-officer roles"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {checkOfficerRole(watchRole) && (
                  <>
                    <Separator />
                    <h3 className="text-sm font-medium text-gray-900">
                      Officer Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Designation
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Officer Designation"
                                {...field}
                                className={
                                  form.formState.errors.designation
                                    ? "border-red-500"
                                    : ""
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Department
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Department Name"
                                {...field}
                                className={
                                  form.formState.errors.department
                                    ? "border-red-500"
                                    : ""
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="officeLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Office Address"
                              {...field}
                              className={
                                form.formState.errors.officeLocation
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Optional. Physical location of the office
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active Account</FormLabel>
                        <FormDescription>
                          Only active users can log in to the system. Inactive
                          users are suspended.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmitCreate)}
              disabled={
                isSubmitting ||
                emailValidationLoading ||
                !form.formState.isValid
              }
              className="w-full sm:w-auto"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog - Similar structure with appropriate changes */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false);
            setSelectedUser(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-7xl sm:max-w-7xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account information. All required fields must be
              completed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-6 -mr-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitEdit)}
                className="space-y-6"
              >
                {/* Similar form structure as create dialog but for editing */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        Full Name
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name (e.g., John Doe)"
                          {...field}
                          className={
                            form.formState.errors.fullName
                              ? "border-red-500"
                              : ""
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Email Address
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="email"
                              placeholder="user@example.com"
                              {...field}
                              className={
                                form.formState.errors.email
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            {emailValidationLoading && (
                              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {!form.formState.errors.email &&
                              field.value &&
                              !emailValidationLoading && (
                                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                              )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+91 9876543210"
                            {...field}
                            className={
                              form.formState.errors.phone
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Continue with role, password, and other fields similar to create form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Role
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={
                                form.formState.errors.role
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {/* Role options same as create */}
                            <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                              Administrative Roles
                            </div>
                            <SelectItem value={UserRole.SUPER_ADMIN}>
                              <div className="flex items-center gap-2 w-full">
                                <Crown className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  Super Administrator
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value={UserRole.ADMIN}>
                              <div className="flex items-center gap-2 w-full">
                                <Shield className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Administrator</span>
                              </div>
                            </SelectItem>

                            {Object.entries(getNonLegacyRolesByLevel()).map(
                              ([level, roles]) => {
                                const levelNum = parseInt(level);
                                if (levelNum < 0 || levelNum > 8) return null;

                                return (
                                  <div key={level}>
                                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                                      Level {level}{" "}
                                      {levelNum === 8
                                        ? "Officials"
                                        : "Officers"}{" "}
                                      (
                                      {levelNum === 0
                                        ? "Highest"
                                        : levelNum === 7
                                        ? "Dealing Hands"
                                        : levelNum === 8
                                        ? "Support Staff"
                                        : `Priority ${levelNum}`}
                                      )
                                    </div>
                                    {roles
                                      .filter(
                                        (role) => role !== UserRole.FRONT_DESK
                                      )
                                      .map((role) => {
                                        const mapping = getRoleMapping(role);
                                        return (
                                          <SelectItem key={role} value={role}>
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                              <UserCog className="w-4 h-4 flex-shrink-0" />
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <span className="truncate">
                                                  {mapping?.fullName || role}
                                                </span>
                                                <span className="text-xs text-gray-500 truncate">
                                                  {mapping?.shortDesignation ||
                                                    role}
                                                </span>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                  </div>
                                );
                              }
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Leave blank to keep current password"
                            {...field}
                            className={
                              form.formState.errors.password
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Leave blank to keep current password. If changing: min
                          8 chars, include uppercase, lowercase, number, and
                          special character (@$!%*?&)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Continue with remaining fields... */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={-2}
                            max={7}
                            placeholder="Auto-filled based on role"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Section
                          {checkOfficerRole(watchRole) && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {sections.map((section) => (
                              <SelectItem key={section.id} value={section.id}>
                                <span className="truncate max-w-[200px]">
                                  {section.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Officer-specific fields for edit */}
                {checkOfficerRole(watchRole) && (
                  <>
                    <Separator />
                    <h3 className="text-sm font-medium text-gray-900">
                      Officer Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Designation
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Officer Designation"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Department
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Department Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="officeLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Office Address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active Account</FormLabel>
                        <FormDescription>
                          Only active users can log in to the system.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedUser(null);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmitEdit)}
              disabled={
                isSubmitting ||
                emailValidationLoading ||
                !form.formState.isValid
              }
              className="w-full sm:w-auto"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {selectedUser && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">
                  {selectedUser.officerProfile?.fullName ||
                    selectedUser.citizenProfile?.fullName ||
                    "Unknown User"}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedUser.email}
                </div>
                <Badge variant="secondary" className="mt-1">
                  {getRoleMapping(selectedUser.role)?.shortDesignation ||
                    selectedUser.role}
                </Badge>
              </div>
            )}

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Deleting a user will remove all associated data including
                applications, documents, and activity logs.
              </AlertDescription>
            </Alert>

            {deleteDetails && deleteDetails.totalDependencies > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cannot Delete - Dependencies Found</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <div className="font-medium mb-2">
                      This user has {deleteDetails.totalDependencies}{" "}
                      dependencies that prevent deletion:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {deleteDetails.details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                      <strong>Recommendation:</strong> Instead of deleting,
                      consider deactivating this user account to preserve data
                      integrity.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedUser(null);
                setDeleteDetails(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {!deleteDetails || deleteDetails.totalDependencies === 0 ? (
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete User
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedUser) {
                    toggleUserStatus(selectedUser);
                    setDeleteDialogOpen(false);
                    setDeleteDetails(null);
                  }
                }}
                className="w-full sm:w-auto"
              >
                Deactivate Instead
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
