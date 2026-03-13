"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Building2,
  Layers,
  ListTree,
  Filter,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";

interface Section {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  section: Section;
  isActive: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  serviceId: string;
  service: Service;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SamadhanServiceCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterService, setFilterService] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [includeInactive, setIncludeInactive] = useState(true);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serviceId: "",
  });

  // Filtered services based on section selection
  const filteredServicesForForm = services.filter(
    (s) => filterSection === "all" || s.section.id === filterSection,
  );

  useEffect(() => {
    fetchSections();
    fetchServices();
    fetchCategories();
  }, [includeInactive, filterService]);

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
      const response = await fetch(
        "/api/samadhan/services?includeInactive=true",
      );
      const data = await response.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("includeInactive", String(includeInactive));
      if (filterService && filterService !== "all") {
        params.set("serviceId", filterService);
      }

      const response = await fetch(
        `/api/samadhan/service-categories?${params.toString()}`,
      );
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        toast.error(data.message || "Failed to fetch categories");
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (!formData.serviceId) {
      toast.error("Please select a service");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/samadhan/service-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          serviceId: formData.serviceId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Category created successfully");
        setIsCreateDialogOpen(false);
        setFormData({ name: "", description: "", serviceId: "" });
        fetchCategories();
      } else {
        toast.error(data.message || "Failed to create category");
      }
    } catch (error) {
      toast.error("Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory) return;

    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (!formData.serviceId) {
      toast.error("Please select a service");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/samadhan/service-categories/${selectedCategory.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            serviceId: formData.serviceId,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Category updated successfully");
        setIsEditDialogOpen(false);
        setSelectedCategory(null);
        setFormData({ name: "", description: "", serviceId: "" });
        fetchCategories();
      } else {
        toast.error(data.message || "Failed to update category");
      }
    } catch (error) {
      toast.error("Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/samadhan/service-categories/${selectedCategory.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Category deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedCategory(null);
        fetchCategories();
      } else {
        toast.error(data.message || "Failed to delete category");
      }
    } catch (error) {
      toast.error("Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (category: ServiceCategory) => {
    try {
      const response = await fetch(
        `/api/samadhan/service-categories/${category.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isActive: !category.isActive,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success(
          `Category ${!category.isActive ? "activated" : "deactivated"}`,
        );
        fetchCategories();
      } else {
        toast.error(data.message || "Failed to update category");
      }
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const openEditDialog = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      serviceId: category.serviceId,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  // Filter categories based on search and section filter
  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.service.section.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesSection =
      filterSection === "all" || category.service.section.id === filterSection;

    return matchesSearch && matchesSection;
  });

  // Get services filtered by selected section for the form
  const getServicesForSection = (sectionId: string) => {
    if (sectionId === "all") return services;
    return services.filter((s) => s.section.id === sectionId);
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-7 w-7 text-purple-600" />
            SAMADHAN Service Categories
          </h1>
          <p className="text-gray-500 mt-1">
            Manage service categories under each service
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ name: "", description: "", serviceId: "" });
            setIsCreateDialogOpen(true);
          }}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Hierarchy Info */}
      <Card className="mb-6 bg-purple-50/50 border-purple-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Section</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-600" />
              <span className="font-medium">Service</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Service Category</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, service, or section..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Layers className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {getServicesForSection(filterSection).map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                id="include-inactive"
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
              />
              <Label
                htmlFor="include-inactive"
                className="text-sm whitespace-nowrap"
              >
                Show Inactive
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No categories found
              </h3>
              <p className="text-gray-500 mt-1">
                {searchQuery ||
                filterService !== "all" ||
                filterSection !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first service category to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Section
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-purple-500" />
                          <div>
                            <span className="font-medium">{category.name}</span>
                            {category.description && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-green-500" />
                          <span>{category.service.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <span>{category.service.section.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={category.isActive ? "default" : "secondary"}
                          className={
                            category.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {category.isActive ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {format(new Date(category.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(category)}
                            title={
                              category.isActive ? "Deactivate" : "Activate"
                            }
                          >
                            {category.isActive ? (
                              <XCircle className="h-4 w-4 text-gray-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(category)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              Create Service Category
            </DialogTitle>
            <DialogDescription>
              Add a new category under a service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Service *</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, serviceId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <span>{service.name}</span>
                        <span className="text-xs text-gray-500">
                          ({service.section.name})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                placeholder="Enter category name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Enter category description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={isSubmitting}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Category
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Service Category
            </DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Service *</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, serviceId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <span>{service.name}</span>
                        <span className="text-xs text-gray-500">
                          ({service.section.name})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                placeholder="Enter category name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Enter category description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedCategory?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
