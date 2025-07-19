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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, User, UserPlus, Settings } from "lucide-react";
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

type FrontdeskFormData = z.infer<typeof frontdeskSchema>;

export default function FrontdeskManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [frontdeskUsers, setFrontdeskUsers] = useState<FrontdeskUser[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFrontdeskUser, setSelectedFrontdeskUser] =
    useState<FrontdeskUser | null>(null);

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
      // Filter officers to only include those with profiles and are available
      const availableOfficers = Array.isArray(data.officers)
        ? data.officers.filter(
            (officer: Officer) =>
              officer.profile && officer.profile.isAvailable && officer.isActive
          )
        : [];
      setOfficers(availableOfficers);
    } catch (error) {
      console.error("Error fetching officers:", error);
      toast.error("Failed to load officers");
      setOfficers([]);
    }
  };

  const onSubmit = async (data: FrontdeskFormData) => {
    try {
      // First create the user via registration
      const response = await fetch("/api/auth/register", {
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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create frontdesk user");
      }

      // Check if the response has the expected structure
      if (!result || !result.userId) {
        console.error("Unexpected API response structure:", result);
        throw new Error("Invalid response from server. User ID not found.");
      }

      const userId = result.userId;

      // Now assign the officer if one was selected
      if (data.assignedOfficerId && data.assignedOfficerId !== "GENERAL") {
        await handleAssignOfficer(userId, data.assignedOfficerId);
      } else {
        // Create general assignment
        await handleAssignOfficer(userId);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading frontdesk management...</p>
        </div>
      </div>
    );
  }

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
          <CardTitle>Frontdesk Users</CardTitle>
          <CardDescription>
            List of all frontdesk users and their officer assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Officer</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(frontdeskUsers || []).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.phone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.frontdeskAssignments &&
                    user.frontdeskAssignments.length > 0 ? (
                      <div className="space-y-1">
                        {(user.frontdeskAssignments || []).map((assignment) => (
                          <Badge key={assignment.id} variant="outline">
                            {assignment.officer?.fullName ||
                              "General Frontdesk"}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="secondary">No assignments</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFrontdeskUser(user);
                          setIsAssignDialogOpen(true);
                        }}
                      >
                        <Settings size={16} />
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

          {(frontdeskUsers || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No frontdesk users found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Frontdesk User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Frontdesk User</DialogTitle>
            <DialogDescription>
              Add a new frontdesk user to handle application submissions and
              validation.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="frontdesk@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <Input
                        type="password"
                        placeholder="Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedOfficerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Officer (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an officer or leave empty for general frontdesk" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GENERAL">
                          General Frontdesk (All Officers)
                        </SelectItem>
                        {(officers || []).map((officer) => (
                          <SelectItem
                            key={officer.id}
                            value={officer.profile?.id || officer.id}
                          >
                            {officer.profile?.fullName || officer.email} -{" "}
                            {officer.profile?.designation || officer.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign Officer Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Officer Assignment</DialogTitle>
            <DialogDescription>
              Assign or reassign this frontdesk user to a specific officer.
            </DialogDescription>
          </DialogHeader>
          {selectedFrontdeskUser && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  User
                </Label>
                <p className="text-lg">{selectedFrontdeskUser.email}</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Select Officer Assignment</Label>
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() =>
                      handleAssignOfficer(selectedFrontdeskUser.id)
                    }
                  >
                    General Frontdesk (All Officers)
                  </Button>
                  {(officers || []).map((officer) => (
                    <Button
                      key={officer.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() =>
                        handleAssignOfficer(
                          selectedFrontdeskUser.id,
                          officer.profile?.id || officer.id
                        )
                      }
                    >
                      {officer.profile?.fullName || officer.email} -{" "}
                      {officer.profile?.designation || officer.role}
                    </Button>
                  ))}
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
    </div>
  );
}
