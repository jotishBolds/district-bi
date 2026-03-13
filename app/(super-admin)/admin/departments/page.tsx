"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  Shield,
  Users,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/app/generated/prisma";

interface Department {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    applications: number;
  };
}

type FormData = {
  name: string;
  description?: string;
  isActive: boolean;
};

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Department name must be at least 2 characters" }),
  description: z.string().optional(),
  isActive: z.boolean(),
});

export default function DepartmentManagement() {
  const { data: session } = useSession();
  const router = useRouter();

  // Initialize form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch("/api/admin/departments");
        if (!response.ok) throw new Error("Failed to fetch departments");

        const data = await response.json();
        // Support both array and object response
        if (Array.isArray(data)) {
          setDepartments(data);
        } else if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
        } else {
          setDepartments([]);
        }
      } catch (error) {
        toast.error("Failed to load departments. Please try again.");
        console.error("Error fetching departments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (
      session?.user &&
      (session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.SUPER_ADMIN)
    ) {
      fetchDepartments();
    }
  }, [session]);

  // Filter departments based on search query and status
  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch =
      searchQuery === "" ||
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && dept.isActive) ||
      (statusFilter === "INACTIVE" && !dept.isActive);

    return matchesSearch && matchesStatus;
  });

  // Handle form submission for creating a new department
  const onSubmitCreate = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create department");
      }

      const newDepartment = await response.json();
      setDepartments((prev) => [...prev, newDepartment.department]);
      toast.success("Department has been created successfully.");
      setCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating department:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission for editing a department
  const onSubmitEdit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedDepartment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/departments/${selectedDepartment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update department");
      }

      const updatedDepartmentResponse = await response.json();
      // Support both object and direct department response
      let updatedDepartment =
        updatedDepartmentResponse.department || updatedDepartmentResponse;
      if (!updatedDepartment || !updatedDepartment.id) {
        throw new Error("Invalid department data returned from API");
      }
      // Defensive: ensure _count.applications is always defined
      if (
        !updatedDepartment._count ||
        typeof updatedDepartment._count.applications !== "number"
      ) {
        updatedDepartment = {
          ...updatedDepartment,
          _count: { applications: 0 },
        };
      }
      setDepartments((prev) =>
        prev.map((dept) =>
          dept.id === selectedDepartment.id ? updatedDepartment : dept,
        ),
      );
      toast.success("Department has been updated successfully.");
      setEditDialogOpen(false);
      setSelectedDepartment(null);
      form.reset();
    } catch (error) {
      console.error("Error updating department:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle department deletion
  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/departments/${selectedDepartment.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete department");
      }

      setDepartments((prev) =>
        prev.filter((dept) => dept.id !== selectedDepartment.id),
      );
      toast.success("Department has been deleted successfully.");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog and prefill form
  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    form.reset({
      name: department.name,
      description: department.description || "",
      isActive: department.isActive,
    });
    setEditDialogOpen(true);
  };

  // Handle toggling department active status
  const toggleDepartmentStatus = async (department: Department) => {
    try {
      const response = await fetch(`/api/admin/departments/${department.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !department.isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update department status");
      }

      setDepartments((prev) =>
        prev.map((dept) =>
          dept.id === department.id
            ? { ...dept, isActive: !dept.isActive }
            : dept,
        ),
      );
      toast.success(
        `Department has been ${
          !department.isActive ? "activated" : "deactivated"
        } successfully.`,
      );
    } catch (error) {
      console.error("Error toggling department status:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Department Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage departments for application categorization.
          </p>
        </div>
        <Button
          onClick={() => {
            form.reset({
              name: "",
              description: "",
              isActive: true,
            });
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Department
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row w-full lg:w-2/3 gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments by name or description..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
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
              <span>Loading departments...</span>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="font-medium text-lg">No departments found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "Create a new department to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Department</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Description
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Applications
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((department) => (
                    <TableRow key={department.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">
                              {department.name}
                            </span>
                            <div className="sm:hidden mt-1">
                              <Badge
                                variant={
                                  department.isActive ? "default" : "secondary"
                                }
                                className={
                                  department.isActive
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                }
                              >
                                <div className="flex items-center gap-1">
                                  {department.isActive ? (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  ) : (
                                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                  )}
                                  {department.isActive ? "Active" : "Inactive"}
                                </div>
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {department.description || "No description"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {department._count.applications}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">
                          {new Date(department.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={
                            department.isActive ? "default" : "secondary"
                          }
                          className={
                            department.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          }
                        >
                          <div className="flex items-center gap-1">
                            {department.isActive ? (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            )}
                            {department.isActive ? "Active" : "Inactive"}
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
                              onClick={() => handleEditDepartment(department)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleDepartmentStatus(department)}
                            >
                              {department.isActive ? (
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
                                setSelectedDepartment(department);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={department._count.applications > 0}
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

      {/* Create Department Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Enter the details to create a new department.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitCreate)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Revenue Department"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the department"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <FormLabel>Active Department</FormLabel>
                      <FormDescription>
                        Only active departments can be selected for applications
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
                  Create Department
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false);
            setSelectedDepartment(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Revenue Department"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the department"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <FormLabel>Active Department</FormLabel>
                      <FormDescription>
                        Only active departments can be selected for applications
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedDepartment(null);
                    form.reset();
                  }}
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
              Are you sure you want to delete this department? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                {selectedDepartment?._count.applications ? (
                  <>
                    This department has {selectedDepartment._count.applications}{" "}
                    applications associated with it. You cannot delete it until
                    all applications are transferred to another department.
                  </>
                ) : (
                  "Deleting this department will remove it permanently from the system."
                )}
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
              onClick={handleDeleteDepartment}
              disabled={
                isSubmitting ||
                (selectedDepartment?._count.applications || 0) > 0
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
