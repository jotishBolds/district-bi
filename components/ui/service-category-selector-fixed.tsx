// components/ui/service-category-selector.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface ServiceCategorySelectorProps {
  value?: string;
  onValueChangeAction: (value: string) => void;
  disabled?: boolean;
  canCreate?: boolean;
  placeholder?: string;
  className?: string;
  showCreateDialog?: boolean;
}

export function ServiceCategorySelector({
  value,
  onValueChangeAction,
  disabled = false,
  canCreate = false,
  placeholder = "Select a service category...",
  className,
  showCreateDialog = true,
}: ServiceCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Create form state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#0066cc");

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/frontdesk/service-categories");
      if (response.ok) {
        const data = await response.json();
        // Handle direct array response from frontdesk API
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } else {
        // Only log error if it's not just empty categories
        if (response.status !== 404) {
          console.error("Failed to fetch service categories");
        }
      }
    } catch (error) {
      console.error("Error fetching service categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const selectedCategory = useMemo(() => {
    return categories.find((category) => category.id === value);
  }, [categories, value]);

  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/frontdesk/service-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || undefined,
          color: newCategoryColor,
          isActive: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Service category created successfully");

        // Add the new category to the list (handle response format)
        const categoryData = data.data || data;
        setCategories((prev) => [...prev, categoryData]);

        // Select the new category
        onValueChangeAction(categoryData.id);

        // Reset form and close dialog
        setNewCategoryName("");
        setNewCategoryDescription("");
        setNewCategoryColor("#0066cc");
        setCreateDialogOpen(false);
        setOpen(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("An error occurred while creating the category");
    } finally {
      setCreating(false);
    }
  }, [
    newCategoryName,
    newCategoryDescription,
    newCategoryColor,
    onValueChangeAction,
  ]);

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (category) =>
        category.isActive &&
        category.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [categories, searchValue]);

  // Memoized input handlers to prevent re-renders
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewCategoryName(e.target.value);
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewCategoryDescription(e.target.value);
    },
    []
  );

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewCategoryColor(e.target.value);
    },
    []
  );

  const handleCancelCreate = useCallback(() => {
    setCreateDialogOpen(false);
  }, []);

  // Memoized create category dialog content
  const createCategoryDialog = useMemo(
    () => (
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Service Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={handleNameChange}
                placeholder="Enter category name"
                disabled={creating}
                ref={inputRef}
              />
            </div>
            <div>
              <Label htmlFor="category-description">
                Description (Optional)
              </Label>
              <Textarea
                id="category-description"
                value={newCategoryDescription}
                onChange={handleDescriptionChange}
                placeholder="Enter category description"
                disabled={creating}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="category-color"
                  type="color"
                  value={newCategoryColor}
                  onChange={handleColorChange}
                  disabled={creating}
                  className="w-16 h-10 p-1 border rounded cursor-pointer"
                />
                <Input
                  value={newCategoryColor}
                  onChange={handleColorChange}
                  placeholder="#0066cc"
                  disabled={creating}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelCreate}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    ),
    [
      createDialogOpen,
      newCategoryName,
      newCategoryDescription,
      newCategoryColor,
      creating,
      handleNameChange,
      handleDescriptionChange,
      handleColorChange,
      handleCancelCreate,
      handleCreateCategory,
    ]
  );

  return (
    <>
      {canCreate && showCreateDialog && createCategoryDialog}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !selectedCategory && "text-muted-foreground",
              className
            )}
          >
            {selectedCategory ? (
              <span className="truncate">{selectedCategory.name}</span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search categories..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading..." : "No categories found."}
              </CommandEmpty>
              <CommandGroup>
                {filteredCategories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={() => {
                      onValueChangeAction(category.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{category.name}</span>
                      {category.description && (
                        <span className="text-sm text-muted-foreground">
                          {category.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {canCreate && showCreateDialog && (
                  <CommandItem
                    value="__create_new__"
                    onSelect={() => {
                      setCreateDialogOpen(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new category
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

// Service Category Change Dialog Component
interface ServiceCategoryChangeDialogProps {
  applicationId: string;
  currentCategoryId?: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function ServiceCategoryChangeDialog({
  applicationId,
  currentCategoryId,
  trigger,
  onSuccess,
}: ServiceCategoryChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    currentCategoryId || ""
  );
  const [reason, setReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleUpdateCategory = async () => {
    if (!selectedCategoryId) {
      toast.error("Please select a category");
      return;
    }

    if (selectedCategoryId === currentCategoryId) {
      toast.error("Please select a different category");
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(
        `/api/applications/${applicationId}/service-category`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serviceCategoryId: selectedCategoryId,
            reason: reason.trim() || undefined,
          }),
        }
      );

      if (response.ok) {
        toast.success("Service category updated successfully");
        setOpen(false);
        setReason("");
        onSuccess?.();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("An error occurred while updating the category");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Service Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-category">New Service Category</Label>
            <ServiceCategorySelector
              value={selectedCategoryId}
              onValueChangeAction={setSelectedCategoryId}
              canCreate={true}
              placeholder="Select new category..."
              disabled={updating}
            />
          </div>
          <div>
            <Label htmlFor="change-reason">Reason for Change (Optional)</Label>
            <Textarea
              id="change-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for changing category"
              disabled={updating}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Category
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
