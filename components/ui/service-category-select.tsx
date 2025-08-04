"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createServiceCategorySchema = z.object({
  name: z.string().min(1, "Service category name is required").max(100),
  description: z.string().optional(),
});

type CreateFormData = z.infer<typeof createServiceCategorySchema>;

interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
}

interface ServiceCategorySelectProps {
  value: string;
  onValueChangeAction: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ServiceCategorySelect({
  value,
  onValueChangeAction,
  disabled = false,
  placeholder = "Select service category...",
}: ServiceCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createServiceCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const fetchCategories = async (search = "") => {
    try {
      setLoading(true);
      const searchParams = search
        ? `?search=${encodeURIComponent(search)}`
        : "";
      const response = await fetch(
        `/api/frontdesk/service-categories${searchParams}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch service categories");
      }

      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      toast.error("Failed to load service categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm || open) {
        fetchCategories(searchTerm);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, open]);

  const handleCreateNew = () => {
    if (searchTerm.trim()) {
      createForm.setValue("name", searchTerm.trim());
    }
    setCreateDialogOpen(true);
    setOpen(false);
  };

  const onCreateSubmit = async (data: CreateFormData) => {
    try {
      setCreating(true);
      const response = await fetch("/api/frontdesk/service-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.existingCategory) {
          // If category exists, select it
          onValueChangeAction(result.existingCategory.id);
          toast.success(
            `Selected existing category: ${result.existingCategory.name}`
          );
          setCreateDialogOpen(false);
          createForm.reset();
          return;
        }
        throw new Error(result.error || "Failed to create service category");
      }

      toast.success("Service category created successfully!");
      onValueChangeAction(result.data.id);
      setCreateDialogOpen(false);
      createForm.reset();
      fetchCategories(); // Refresh the list
    } catch (error) {
      console.error("Error creating service category:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create service category"
      );
    } finally {
      setCreating(false);
    }
  };

  const selectedCategory = categories.find((cat) => cat.id === value);
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasExactMatch = filteredCategories.some(
    (cat) => cat.name.toLowerCase() === searchTerm.toLowerCase()
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedCategory ? selectedCategory.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search service categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading...
                  </span>
                </div>
              ) : (
                <>
                  {filteredCategories.length === 0 && searchTerm ? (
                    <CommandEmpty>
                      <div className="flex flex-col items-center gap-2 py-6">
                        <p className="text-sm text-muted-foreground">
                          No service category found for &quot;{searchTerm}&quot;
                        </p>
                        <Button
                          onClick={handleCreateNew}
                          size="sm"
                          className="h-8"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create &quot;{searchTerm}&quot;
                        </Button>
                      </div>
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredCategories.map((category) => (
                        <CommandItem
                          key={category.id}
                          value={category.id}
                          onSelect={(currentValue) => {
                            onValueChangeAction(
                              currentValue === value ? "" : currentValue
                            );
                            setOpen(false);
                            setSearchTerm("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === category.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{category.name}</span>
                            {category.description && (
                              <span className="text-xs text-muted-foreground">
                                {category.description}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                      {searchTerm && !hasExactMatch && (
                        <CommandItem onSelect={handleCreateNew}>
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Create &quot;{searchTerm}&quot;</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Service Category Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Service Category</DialogTitle>
            <DialogDescription>
              Create a new service category for this application.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Education Service, Health Service"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the service category..."
                        rows={3}
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
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
