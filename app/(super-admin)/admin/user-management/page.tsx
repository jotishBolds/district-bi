"use client";

import { useState, useEffect } from "react";
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

// Create user form schema with proper types
type FormData = {
  email: string;
  phone?: string;
  role: UserRole;
  level?: number;
  fullName: string;
  isActive: boolean;
  designation?: string;
  department?: string;
  officeLocation?: string;
  sectionId?: string;
  password?: string;
};

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  level: z.number().int().min(-2).max(7).optional(),
  fullName: z.string().min(2, { message: "Full name is required" }),
  isActive: z.boolean(),
  // For officer specific fields
  designation: z.string().optional(),
  department: z.string().optional(),
  officeLocation: z.string().optional(),
  sectionId: z.string().optional(),
  // Password is optional - if not provided, a random one will be generated
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .optional(),
});

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

export default function UserManagement() {
  const { data: session } = useSession();
  const router = useRouter();

  // Initialize form inside the component
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      phone: "",
      fullName: "",
      role: UserRole.OS_RC, // Default to a lower level officer role
      level: 6, // Default to level 6
      isActive: true,
      designation: "",
      department: "",
      officeLocation: "",
      sectionId: "",
      password: "",
    },
  });

  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Watch the role value to show/hide officer-specific fields
  const watchRole = form.watch("role");

  // Check if user is authorized (admin or super admin)
  useEffect(() => {
    if (
      session?.user &&
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.SUPER_ADMIN
    ) {
      router.push("/dashboard");
      toast.error("You don't have permission to access this page.");
    }
  }, [session, router]);

  // Fetch users and sections
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersResponse, sectionsResponse] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/sections"),
        ]);

        if (!usersResponse.ok) throw new Error("Failed to fetch users");
        if (!sectionsResponse.ok) throw new Error("Failed to fetch sections");

        const usersData = await usersResponse.json();
        const sectionsData = await sectionsResponse.json();

        setUsers(usersData.users);
        setSections(sectionsData.sections);
      } catch (error) {
        toast.error("Failed to load data. Please try again.");
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (
      session?.user &&
      (session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.SUPER_ADMIN)
    ) {
      fetchData();
    }
  }, [session]);

  // Watch role changes and auto-populate level and default section
  useEffect(() => {
    if (watchRole) {
      const roleMapping = getRoleMapping(watchRole);
      if (roleMapping) {
        form.setValue("level", roleMapping.level);

        // Find matching section by name
        const defaultSection = sections.find(
          (s) => s.name === roleMapping.defaultSection
        );
        if (defaultSection) {
          form.setValue("sectionId", defaultSection.id);
        }

        // Set default designation
        form.setValue("designation", roleMapping.shortDesignation);
        form.setValue("department", roleMapping.defaultSection);
      }
    }
  }, [watchRole, sections, form]);

  // Filter users based on search query, role and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.officerProfile?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && user.isActive) ||
      (statusFilter === "INACTIVE" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle form submission for creating a new user
  const onSubmitCreate = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }

      const newUser = await response.json();
      setUsers((prev) => [...prev, newUser.user]);
      toast.success("User has been created successfully.");
      setCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission for editing a user
  const onSubmitEdit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user");
      }

      const updatedUser = await response.json();
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id ? updatedUser.user : user
        )
      );
      toast.success("User has been updated successfully.");
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
      toast.success("User has been deleted successfully.");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog and prefill form
  const handleEditUser = (user: User) => {
    setSelectedUser(user);

    // Reset form with user data, ensuring all fields have defined values
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
      sectionId: user.officerProfile?.sectionId || "",
      password: "", // Don't prefill password
    });

    setEditDialogOpen(true);
  };

  // Handle toggling user active status
  const toggleUserStatus = async (user: User) => {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user status");
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );
      toast.success(
        `User has been ${
          !user.isActive ? "activated" : "deactivated"
        } successfully.`
      );
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  // Create a temporary admin user (for development purposes)
  const createTempAdminUser = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/create-temp-admin", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create temporary admin");
      }

      const data = await response.json();
      toast.success(
        `Temporary admin created with email: ${data.email} and password: ${data.password}`
      );
      // Add the new admin to the users list
      setUsers((prev) => [...prev, data.user]);
    } catch (error) {
      console.error("Error creating temp admin:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Create and manage user accounts within the system.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={createTempAdminUser}
            disabled={isSubmitting}
            className="hidden md:flex"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="mr-2 h-4 w-4" />
            )}
            Create Temp Admin
          </Button>
          <Button
            onClick={() => {
              form.reset({
                email: "",
                phone: "",
                fullName: "",
                role: UserRole.FRONT_DESK,
                isActive: true,
                designation: "",
                department: "",
                officeLocation: "",
                password: "",
              });
              setCreateDialogOpen(true);
            }}
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>{" "}
            <SelectContent>
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
              <SelectItem value={UserRole.DISPATCH_HANDLER}>
                Dispatch Handler
              </SelectItem>
              {/* Legacy roles for backward compatibility */}
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
            <SelectTrigger className="w-[180px]">
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
                    <TableHead className="w-[250px]">User</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Level
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Section
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Last Login
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">
                                {user.officerProfile?.fullName ||
                                  user.citizenProfile?.fullName ||
                                  "Unnamed User"}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                              <div className="md:hidden mt-1">
                                <Badge
                                  variant={getRoleBadgeVariant(user.role)}
                                  className="text-xs"
                                >
                                  {roleMapping?.shortDesignation || user.role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={getRoleBadgeVariant(user.role)}
                              className="w-fit"
                            >
                              <div className="flex items-center gap-1">
                                <RoleIcon className="w-3 h-3" />
                                <span>
                                  {roleMapping?.shortDesignation || user.role}
                                </span>
                              </div>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {roleMapping?.fullName || user.role}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {user.officerProfile?.section?.name ||
                                  "No Section"}
                              </span>
                              {user.officerProfile?.section?.description && (
                                <span className="text-xs text-muted-foreground">
                                  {user.officerProfile.section.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
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
        <DialogContent className="sm:max-w-md md:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Enter the details to create a new user account.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitCreate)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="example@mail.com"
                          {...field}
                        />
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
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
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
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px] overflow-y-auto ">
                          {/* Administrative Roles */}
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                            Administrative Roles
                          </div>
                          <SelectItem value={UserRole.SUPER_ADMIN}>
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4" />
                              <span>Super Administrator</span>
                            </div>
                          </SelectItem>
                          <SelectItem value={UserRole.ADMIN}>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span>Administrator</span>
                            </div>
                          </SelectItem>

                          {/* Officer Roles by Level */}
                          {Object.entries(getRolesByLevel()).map(
                            ([level, roles]) => {
                              const levelNum = parseInt(level);
                              if (levelNum < 0 || levelNum > 7) return null;

                              return (
                                <div key={level}>
                                  <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                                    Level {level} Officers (
                                    {levelNum === 0
                                      ? "Highest"
                                      : levelNum === 6
                                      ? "Standard"
                                      : levelNum === 8
                                      ? "Support"
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
                                          <div className="flex items-center gap-2">
                                            <UserCog className="w-4 h-4" />
                                            <div className="flex flex-col">
                                              <span>
                                                {mapping?.fullName || role}
                                              </span>
                                              <span className="text-xs text-gray-500">
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
                      <FormLabel>Password (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Leave blank to auto-generate"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        If left blank, a random password will be generated
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Level and Section fields - shown for all roles */}
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
                      <FormDescription className="text-xs">
                        -2: Super Admin, -1: Admin, 0-6: Officer levels (0
                        highest)
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
                      <FormLabel>Section</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Officer-specific fields, only shown when an officer role is selected */}
              {checkOfficerRole(watchRole) && (
                <>
                  <Separator />
                  <h3 className="text-sm font-medium">Officer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation</FormLabel>
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
                          <FormLabel>Department</FormLabel>
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
                        Only active users can log in to the system
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account information.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="example@mail.com"
                          {...field}
                        />
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
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
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
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          {/* Administrative Roles */}
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                            Administrative Roles
                          </div>
                          <SelectItem value={UserRole.SUPER_ADMIN}>
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4" />
                              <span>Super Administrator</span>
                            </div>
                          </SelectItem>
                          <SelectItem value={UserRole.ADMIN}>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span>Administrator</span>
                            </div>
                          </SelectItem>

                          {/* Officer Roles by Level */}
                          {Object.entries(getRolesByLevel()).map(
                            ([level, roles]) => {
                              const levelNum = parseInt(level);
                              if (levelNum < 0 || levelNum > 7) return null;

                              return (
                                <div key={level}>
                                  <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-50">
                                    Level {level} Officers (
                                    {levelNum === 0
                                      ? "Highest"
                                      : levelNum === 6
                                      ? "Standard"
                                      : levelNum === 8
                                      ? "Support"
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
                                          <div className="flex items-center gap-2">
                                            <UserCog className="w-4 h-4" />
                                            <div className="flex flex-col">
                                              <span>
                                                {mapping?.fullName || role}
                                              </span>
                                              <span className="text-xs text-gray-500">
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
                      <FormLabel>Password (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Leave blank to keep current password"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Only fill this to change the user&apos;s password
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Level and Section fields - shown for all roles */}
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
                      <FormDescription className="text-xs">
                        -2: Super Admin, -1: Admin, 0-6: Officer levels (0
                        highest)
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
                      <FormLabel>Section</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Officer-specific fields, only shown when an officer role is selected */}
              {checkOfficerRole(watchRole) && (
                <>
                  <Separator />
                  <h3 className="text-sm font-medium">Officer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation</FormLabel>
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
                          <FormLabel>Department</FormLabel>
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
                        Only active users can log in to the system
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Deleting a user will remove all associated data including
                applications, documents, and activity logs.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
