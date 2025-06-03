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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the user type based on your Prisma schema
type User = {
  id: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  citizenProfile?: {
    fullName: string;
  } | null;
  officerProfile?: {
    fullName: string;
  } | null;
};

// Create user form schema with proper types
type FormData = {
  email: string;
  phone?: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  designation?: string;
  department?: string;
  officeLocation?: string;
  password?: string;
};

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  fullName: z.string().min(2, { message: "Full name is required" }),
  isActive: z.boolean(),
  // For officer specific fields
  designation: z.string().optional(),
  department: z.string().optional(),
  officeLocation: z.string().optional(),
  // Password is optional - if not provided, a random one will be generated
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .optional(),
});

// Function to determine if the role is an officer role
const isOfficerRole = (role: UserRole): boolean => {
  return [UserRole.FRONT_DESK, UserRole.DC, UserRole.ADC, UserRole.RO].includes(
    role as
      | typeof UserRole.FRONT_DESK
      | typeof UserRole.DC
      | typeof UserRole.ADC
      | typeof UserRole.RO
  );
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
      role: UserRole.CITIZEN,
      isActive: true,
      designation: "",
      department: "",
      officeLocation: "",
      password: "",
    },
  });

  const [users, setUsers] = useState<User[]>([]);
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

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        setUsers(data.users);
      } catch (error) {
        toast.error("Failed to load users. Please try again.");
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (
      session?.user &&
      (session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.SUPER_ADMIN)
    ) {
      fetchUsers();
    }
  }, [session]);

  // Filter users based on search query, role and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.citizenProfile?.fullName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      user.officerProfile?.fullName
        .toLowerCase()
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

    // Reset form with user data
    form.reset({
      email: user.email,
      phone: user.phone || "",
      fullName:
        user.citizenProfile?.fullName || user.officerProfile?.fullName || "",
      role: user.role,
      isActive: user.isActive,
      designation: user.officerProfile ? "Officer" : "",
      department: user.officerProfile ? "Department" : "",
      officeLocation: user.officerProfile ? "Office" : "",
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
                role: UserRole.CITIZEN,
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
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value={UserRole.CITIZEN}>Citizen</SelectItem>
              <SelectItem value={UserRole.FRONT_DESK}>Front Desk</SelectItem>
              <SelectItem value={UserRole.DC}>DC</SelectItem>
              <SelectItem value={UserRole.ADC}>ADC</SelectItem>
              <SelectItem value={UserRole.RO}>RO</SelectItem>
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
                      Last Login
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.citizenProfile?.fullName ||
                              user.officerProfile?.fullName ||
                              "Unnamed User"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {user.email}
                          </span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {user.role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={`
                            ${
                              user.role === UserRole.ADMIN ||
                              user.role === UserRole.SUPER_ADMIN
                                ? "border-red-200 bg-red-50 text-red-800"
                                : user.role === UserRole.CITIZEN
                                ? "border-blue-200 bg-blue-50 text-blue-800"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800"
                            }
                          `}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : "Never"}
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
                          {user.isActive ? "Active" : "Inactive"}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UserRole.CITIZEN}>
                            Citizen
                          </SelectItem>
                          <SelectItem value={UserRole.FRONT_DESK}>
                            Front Desk
                          </SelectItem>
                          <SelectItem value={UserRole.DC}>DC</SelectItem>
                          <SelectItem value={UserRole.ADC}>ADC</SelectItem>
                          <SelectItem value={UserRole.RO}>RO</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.SUPER_ADMIN}>
                            Super Admin
                          </SelectItem>
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

              {/* Officer-specific fields, only shown when an officer role is selected */}
              {isOfficerRole(watchRole) && (
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UserRole.CITIZEN}>
                            Citizen
                          </SelectItem>
                          <SelectItem value={UserRole.FRONT_DESK}>
                            Front Desk
                          </SelectItem>
                          <SelectItem value={UserRole.DC}>DC</SelectItem>
                          <SelectItem value={UserRole.ADC}>ADC</SelectItem>
                          <SelectItem value={UserRole.RO}>RO</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.SUPER_ADMIN}>
                            Super Admin
                          </SelectItem>
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

              {/* Officer-specific fields, only shown when an officer role is selected */}
              {isOfficerRole(watchRole) && (
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
