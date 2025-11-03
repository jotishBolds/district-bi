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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Trash2,
  Plus,
  User,
  UserPlus,
  Settings,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

interface FrontdeskUser {
  id: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  frontdeskAssignments: {
    id: string;
    officerId?: string;
    officer?: {
      id: string;
      fullName: string;
      designation: string;
      department: string;
      officeLocation?: string;
      isAvailable: boolean;
    };
  }[];
}

const frontdeskSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  assignedOfficerId: z.string().optional(),
});

const editFrontdeskSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "Password must be at least 6 characters if provided",
    }),
  fullName: z.string().min(2, "Full name is required"),
  assignedOfficerId: z.string().optional(),
});

type FrontdeskFormData = z.infer<typeof frontdeskSchema>;

export default function FrontdeskManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [frontdeskUsers, setFrontdeskUsers] = useState<FrontdeskUser[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFrontdeskUser, setSelectedFrontdeskUser] =
    useState<FrontdeskUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<FrontdeskUser | null>(null);
  const [deleteDetails, setDeleteDetails] = useState<{
    details: string[];
    totalDependencies: number;
  } | null>(null);

  const form = useForm<FrontdeskFormData>({
    resolver: zodResolver(frontdeskSchema),
    defaultValues: {
      email: "",
      phone: "",
      password: "",
      fullName: "",
      assignedOfficerId: "",
    },
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (
      session?.user?.role !== "SUPER_ADMIN" &&
      session?.user?.role !== "ADMIN"
    ) {
      router.push("/dashboard");
      return;
    }

    fetchFrontdeskUsers();
    fetchOfficers();
  }, [session, status, router]);

  const fetchFrontdeskUsers = async () => {
    try {
      const response = await fetch("/api/admin/frontdesk");
      if (!response.ok) throw new Error("Failed to fetch frontdesk users");
      const data = await response.json();
      setFrontdeskUsers(
        Array.isArray(data.frontdeskUsers) ? data.frontdeskUsers : []
      );
    } catch (error) {
      console.error("Error fetching frontdesk users:", error);
      toast.error("Failed to load frontdesk users");
      setFrontdeskUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const response = await fetch("/api/admin/officers");
      if (!response.ok) throw new Error("Failed to fetch officers");
      const data = await response.json();

      console.log("Officers API response:", data); // Debug log

      // Filter officers to only include those with profiles and are available
      const availableOfficers = Array.isArray(data.officers)
        ? data.officers.filter(
            (officer: Officer) =>
              officer.profile && officer.profile.isAvailable && officer.isActive
          )
        : [];

      console.log("Filtered available officers:", availableOfficers); // Debug log
      setOfficers(availableOfficers);
    } catch (error) {
      console.error("Error fetching officers:", error);
      toast.error("Failed to load officers");
      setOfficers([]);
    }
  };

  const onSubmit = async (data: FrontdeskFormData) => {
    try {
      // Create the user via admin endpoint
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          phone: data.phone,
          role: "FRONT_DESK",
          fullName: data.fullName,
          designation: "Front Desk Officer",
          department: "General",
          isActive: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create frontdesk user");
      }

      // Check if the response has the expected structure
      if (!result || !result.user || !result.user.id) {
        console.error("Unexpected API response structure:", result);
        throw new Error("Invalid response from server. User ID not found.");
      }

      const userId = result.user.id;

      // Now assign the officer if one was selected
      if (data.assignedOfficerId && data.assignedOfficerId !== "GENERAL") {
        await handleAssignOfficer(userId, data.assignedOfficerId);
      } else {
        // Create general assignment (no specific officer)
        await handleAssignOfficer(userId);
      }

      // Send account creation email
      try {
        const emailResponse = await fetch("/api/admin/send-account-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: data.fullName,
            email: data.email,
            password: result.password || data.password, // Use returned password or form password
            role: "FRONT_DESK",
            designation: "Front Desk Officer",
            department: "General",
          }),
        });

        if (!emailResponse.ok) {
          throw new Error("Failed to send account creation email");
        }

        console.log("Account creation email sent successfully");
      } catch (emailError) {
        console.error("Failed to send account creation email:", emailError);
        // Don't fail the entire process if email fails
        toast.error("User created but failed to send email notification");
      }

      toast.success("Frontdesk user created successfully");
      setIsCreateDialogOpen(false);
      form.reset();
      fetchFrontdeskUsers();
    } catch (error) {
      console.error("Error creating frontdesk user:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create frontdesk user"
      );
    }
  };

  const handleAssignOfficer = async (
    frontdeskUserId: string,
    officerId?: string
  ) => {
    try {
      const response = await fetch("/api/admin/frontdesk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frontdeskUserId,
          assignedOfficerIds: officerId ? [officerId] : [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update assignment");
      }

      // Don't show success toast here when called from onSubmit
      if (selectedFrontdeskUser) {
        toast.success("Assignment updated successfully");
        setIsAssignDialogOpen(false);
        setSelectedFrontdeskUser(null);
        fetchFrontdeskUsers();
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update assignment"
      );
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      toast.success(
        `User ${!currentStatus ? "activated" : "deactivated"} successfully`
      );
      fetchFrontdeskUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleEditUser = async (user: FrontdeskUser) => {
    setSelectedFrontdeskUser(user);

    // Fetch the user's full details including full name
    try {
      const response = await fetch(`/api/admin/users/${user.id}`);
      if (response.ok) {
        const userData = await response.json();
        const fullName =
          userData.user?.officerProfile?.fullName ||
          userData.user?.citizenProfile?.fullName ||
          user.email.split("@")[0]; // fallback to email prefix

        form.reset({
          email: user.email,
          phone: user.phone || "",
          password: "",
          fullName: fullName,
          assignedOfficerId: user.frontdeskAssignments[0]?.officerId || "",
        });
      } else {
        // Fallback if API fails
        form.reset({
          email: user.email,
          phone: user.phone || "",
          password: "",
          fullName: user.email.split("@")[0], // fallback to email prefix
          assignedOfficerId: user.frontdeskAssignments[0]?.officerId || "",
        });
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      // Fallback if fetch fails
      form.reset({
        email: user.email,
        phone: user.phone || "",
        password: "",
        fullName: user.email.split("@")[0], // fallback to email prefix
        assignedOfficerId: user.frontdeskAssignments[0]?.officerId || "",
      });
    }

    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (data: FrontdeskFormData) => {
    if (!selectedFrontdeskUser) return;

    try {
      const updateData: Record<string, string> = {
        email: data.email,
        phone: data.phone,
        fullName: data.fullName,
      };

      // Only include password if provided
      if (data.password) {
        updateData.password = data.password;
      }

      const response = await fetch(
        `/api/admin/users/${selectedFrontdeskUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update user");
      }

      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setSelectedFrontdeskUser(null);
      form.reset();
      fetchFrontdeskUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update user"
      );
    }
  };

  const handleDeleteUser = (user: FrontdeskUser) => {
    setUserToDelete(user);
    setDeleteDetails(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        if (result.details && result.totalDependencies) {
          // Set deletion details for display
          setDeleteDetails({
            details: result.details,
            totalDependencies: result.totalDependencies,
          });
          toast.error(
            `Cannot delete user: ${result.totalDependencies} dependencies found`,
            { duration: 8000 }
          );
          return;
        }
        throw new Error(result.error || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteDetails(null);
      fetchFrontdeskUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user"
      );
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Frontdesk Management</h1>
          <p className="text-gray-600 mt-2">
            Manage frontdesk users and their officer assignments
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <UserPlus size={16} />
          Add Frontdesk User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Frontdesk Users
          </CardTitle>
          <CardDescription>
            Manage frontdesk users and their officer assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading frontdesk users...</span>
            </div>
          ) : (frontdeskUsers || []).length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No frontdesk users found
              </h3>
              <p className="text-gray-500 mb-4">
                Get started by creating your first frontdesk user.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <UserPlus size={16} className="mr-2" />
                Create Frontdesk User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">
                      User Information
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[150px]">
                      Officer Assignment
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(frontdeskUsers || []).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-gray-500 md:hidden">
                            {user.phone || "No phone"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          {user.phone || (
                            <span className="text-gray-400">No phone</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.frontdeskAssignments &&
                        user.frontdeskAssignments.length > 0 ? (
                          <div className="space-y-1">
                            {(user.frontdeskAssignments || []).map(
                              (assignment) => (
                                <Badge
                                  key={assignment.id}
                                  variant="outline"
                                  className="block w-fit"
                                >
                                  {assignment.officer?.fullName ||
                                    "General Frontdesk"}
                                </Badge>
                              )
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="flex items-center gap-1"
                          >
                            <Settings size={14} />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFrontdeskUser(user);
                              setIsAssignDialogOpen(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <User size={14} />
                            <span className="hidden sm:inline">Assign</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() =>
                              toggleUserStatus(user.id, user.isActive)
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Frontdesk User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create Frontdesk User
            </DialogTitle>
            <DialogDescription>
              Add a new frontdesk user to handle application submissions and
              validation.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="frontdesk@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
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
                          placeholder="Minimum 6 characters"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="assignedOfficerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Officer Assignment</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select officer assignment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        <SelectItem value="GENERAL">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <div>
                              <div className="font-medium">
                                General Frontdesk
                              </div>
                              <div className="text-xs text-gray-500">
                                Handle applications for all officers
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        {officers.length > 0 ? (
                          officers.map((officer) => (
                            <SelectItem
                              key={officer.id}
                              value={officer.profile?.id || officer.id}
                            >
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">
                                    {officer.profile?.fullName || officer.email}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {officer.profile?.designation ||
                                      officer.role}{" "}
                                    - {officer.profile?.department}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-officers" disabled>
                            No officers available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign Officer Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Officer Assignment
            </DialogTitle>
            <DialogDescription>
              Assign or reassign this frontdesk user to a specific officer or
              general frontdesk.
            </DialogDescription>
          </DialogHeader>
          {selectedFrontdeskUser && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-sm font-medium text-gray-500">
                  Frontdesk User
                </Label>
                <p className="text-lg font-medium">
                  {selectedFrontdeskUser.email}
                </p>
                <p className="text-sm text-gray-600">
                  Status:{" "}
                  <Badge
                    variant={
                      selectedFrontdeskUser.isActive ? "default" : "secondary"
                    }
                  >
                    {selectedFrontdeskUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">
                  Select Officer Assignment
                </Label>

                {/* General Frontdesk Option */}
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => handleAssignOfficer(selectedFrontdeskUser.id)}
                >
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 mt-0.5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">General Frontdesk</div>
                      <div className="text-sm text-gray-500">
                        Handle applications for all officers
                      </div>
                    </div>
                  </div>
                </Button>

                {/* Individual Officers */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {officers.length > 0 ? (
                    officers.map((officer) => (
                      <Button
                        key={officer.id}
                        variant="outline"
                        className="w-full justify-start h-auto p-4"
                        onClick={() =>
                          handleAssignOfficer(
                            selectedFrontdeskUser.id,
                            officer.profile?.id || officer.id
                          )
                        }
                      >
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 mt-0.5 text-green-600" />
                          <div className="text-left">
                            <div className="font-medium">
                              {officer.profile?.fullName || officer.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {officer.profile?.designation || officer.role}
                              {officer.profile?.department &&
                                ` - ${officer.profile.department}`}
                            </div>
                            {officer.profile?.officeLocation && (
                              <div className="text-xs text-gray-400">
                                📍 {officer.profile.officeLocation}
                              </div>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No officers available for assignment</p>
                      <p className="text-sm">
                        Officers need to have active profiles to be assigned
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedFrontdeskUser(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Frontdesk User</DialogTitle>
            <DialogDescription>
              Update the frontdesk user information. Leave password empty to
              keep current password.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Leave empty to keep current password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedFrontdeskUser(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {form.formState.isSubmitting ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Frontdesk User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this frontdesk user? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {userToDelete && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{userToDelete.email}</div>
                <div className="text-sm text-gray-600">
                  {userToDelete.frontdeskAssignments?.[0]?.officer?.fullName ||
                    "No assigned officer"}
                </div>
                <Badge variant="secondary" className="mt-1">
                  Frontdesk User
                </Badge>
              </div>
            )}

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Deleting a frontdesk user will remove all associated data
                including applications, documents, and activity logs.
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
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
                setDeleteDetails(null);
              }}
            >
              Cancel
            </Button>
            {!deleteDetails || deleteDetails.totalDependencies === 0 ? (
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Delete User
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  if (userToDelete) {
                    // Toggle user status to deactivate
                    toggleUserStatus(userToDelete.id, userToDelete.isActive);
                    setIsDeleteDialogOpen(false);
                    setDeleteDetails(null);
                  }
                }}
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
