"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Layers,
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

interface Section {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    officers: number;
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
    .min(2, { message: "Section name must be at least 2 characters" }),
  description: z.string().optional(),
  isActive: z.boolean(),
});

export default function SectionManagement() {
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

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
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

  // Fetch sections
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetch("/api/admin/sections");
        if (!response.ok) throw new Error("Failed to fetch sections");

        const data = await response.json();
        // Support both array and object response
        if (Array.isArray(data)) {
          setSections(data);
        } else if (Array.isArray(data.sections)) {
          setSections(data.sections);
        } else {
          setSections([]);
        }
      } catch (error) {
        toast.error("Failed to load sections. Please try again.");
        console.error("Error fetching sections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (
      session?.user &&
      (session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.SUPER_ADMIN)
    ) {
      fetchSections();
    }
  }, [session]);

  // Filter sections based on search query and status
  const filteredSections = sections.filter((section) => {
    const matchesSearch =
      searchQuery === "" ||
      section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && section.isActive) ||
      (statusFilter === "INACTIVE" && !section.isActive);

    return matchesSearch && matchesStatus;
  });

  // Handle form submission for creating a new section
  const onSubmitCreate = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/sections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create section");
      }

      const newSectionResponse = await response.json();
      const newSection = newSectionResponse.section || newSectionResponse;

      setSections((prev) => [...prev, newSection]);
      toast.success("Section has been created successfully.");
      setCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating section:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission for editing a section
  const onSubmitEdit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedSection) return;

    console.log("Submitting edit for section:", selectedSection.id);
    console.log("Form values being submitted:", values);
    console.log("Original section data:", selectedSection);

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/sections/${selectedSection.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update section");
      }

      const updatedSectionResponse = await response.json();
      console.log("API response:", updatedSectionResponse);

      let updatedSection =
        updatedSectionResponse.section || updatedSectionResponse;

      if (!updatedSection || !updatedSection.id) {
        throw new Error("Invalid section data returned from API");
      }

      // Defensive: ensure _count.officers is always defined
      if (
        !updatedSection._count ||
        typeof updatedSection._count.officers !== "number"
      ) {
        updatedSection = {
          ...updatedSection,
          _count: { officers: 0 },
        };
      }

      console.log("Updating sections list with:", updatedSection);

      setSections((prev) =>
        prev.map((section) =>
          section.id === selectedSection.id ? updatedSection : section
        )
      );
      toast.success("Section has been updated successfully.");
      setEditDialogOpen(false);
      setSelectedSection(null);
      form.reset();
    } catch (error) {
      console.error("Error updating section:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle section deletion
  const handleDeleteSection = async () => {
    if (!selectedSection) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/sections/${selectedSection.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete section");
      }

      setSections((prev) =>
        prev.filter((section) => section.id !== selectedSection.id)
      );
      toast.success("Section has been deleted successfully.");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog and prefill form
  const handleEditSection = (section: Section) => {
    console.log("=== OPENING EDIT DIALOG ===");
    console.log("Selected section:", section);
    console.log("Current form values before reset:", form.getValues());

    setSelectedSection(section);
    setEditDialogOpen(true);

    // Use setTimeout to ensure dialog is open before setting form values
    setTimeout(() => {
      console.log("Setting form values...");
      form.reset({
        name: section.name,
        description: section.description || "",
        isActive: section.isActive,
      });

      // Also set individual values to ensure they are set
      form.setValue("name", section.name);
      form.setValue("description", section.description || "");
      form.setValue("isActive", section.isActive);

      console.log("Form values after reset:", form.getValues());
      console.log("=== EDIT DIALOG SETUP COMPLETE ===");
    }, 50); // Increased delay slightly
  };

  // Handle toggling section active status
  const toggleSectionStatus = async (section: Section) => {
    try {
      const response = await fetch(`/api/admin/sections/${section.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !section.isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update section status");
      }

      setSections((prev) =>
        prev.map((sec) =>
          sec.id === section.id ? { ...sec, isActive: !sec.isActive } : sec
        )
      );
      toast.success(
        `Section has been ${
          !section.isActive ? "activated" : "deactivated"
        } successfully.`
      );
    } catch (error) {
      console.error("Error toggling section status:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Section Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage sections for officer organization.
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
          Create Section
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row w-full lg:w-2/3 gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections by name or description..."
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sections</SelectItem>
              <SelectItem value="ACTIVE">Active Sections</SelectItem>
              <SelectItem value="INACTIVE">Inactive Sections</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Sections ({filteredSections.length})
          </CardTitle>
          <CardDescription>
            Manage organizational sections and their officer assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading sections...</span>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No sections found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first section."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Officers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">
                        {section.name}
                      </TableCell>
                      <TableCell>
                        {section.description || (
                          <span className="text-muted-foreground italic">
                            No description
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {section._count.officers}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={section.isActive ? "default" : "secondary"}
                          className={
                            section.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }
                        >
                          {section.isActive ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="mr-1 h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(section.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEditSection(section)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Section
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleSectionStatus(section)}
                            >
                              {section.isActive ? (
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
                              onClick={() => {
                                setSelectedSection(section);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                              disabled={section._count.officers > 0}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Section
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

      {/* Create Section Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Section
            </DialogTitle>
            <DialogDescription>
              Create a new section to organize officers within your department.
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
                    <FormLabel>Section Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter section name"
                        {...field}
                        disabled={isSubmitting}
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter section description"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a brief description of this section&apos;s
                      purpose.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Section</FormLabel>
                      <FormDescription>
                        Active sections can be assigned officers.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Section
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && editDialogOpen) {
            // Only reset when actually closing the dialog
            setEditDialogOpen(false);
            setSelectedSection(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Section
            </DialogTitle>
            <DialogDescription>
              Update the section information.
            </DialogDescription>
          </DialogHeader>
          <Form {...form} key={selectedSection?.id || "edit-form"}>
            <form
              onSubmit={form.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter section name"
                        {...field}
                        disabled={isSubmitting}
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter section description"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a brief description of this section&apos;s
                      purpose.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Section</FormLabel>
                      <FormDescription>
                        Active sections can be assigned officers.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedSection(null);
                    form.reset();
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Update Section
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Section Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Section
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              section &quot;{selectedSection?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          {selectedSection && selectedSection._count.officers > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cannot Delete Section</AlertTitle>
              <AlertDescription>
                This section has {selectedSection._count.officers} assigned
                officers. Please reassign or remove these officers before
                deleting the section.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSection}
              disabled={
                isSubmitting ||
                Boolean(selectedSection && selectedSection._count.officers > 0)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Section
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
