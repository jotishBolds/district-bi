// components/ui/service-category-edit-modal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ServiceCategoryBadge } from "./service-category-badge";
import { X, Plus, Palette, Save, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ServiceCategory {
  id: string;
  name: string;
  color?: string;
}

interface ServiceCategoryEditModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  applicationId: string;
  currentCategory?: ServiceCategory;
  onCategoryUpdatedAction?: () => void;
}

export function ServiceCategoryEditModal({
  isOpen,
  onCloseAction,
  applicationId,
  currentCategory,
  onCategoryUpdatedAction,
}: ServiceCategoryEditModalProps) {
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"select" | "create">("select");

  // New category creation states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Predefined color palette
  const colorPalette = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#eab308",
    "#dc2626",
    "#7c3aed",
    "#059669",
  ];

  useEffect(() => {
    if (isOpen) {
      fetchServiceCategories();
      setSelectedCategoryId(currentCategory?.id || "");
      // Reset form
      setError("");
      setActiveTab("select");
      setSearchTerm("");
      setNewCategoryName("");
      setNewCategoryColor("#3b82f6");
    }
  }, [isOpen, currentCategory]);

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch("/api/service-categories");
      if (!response.ok) throw new Error("Failed to fetch service categories");
      const categories = await response.json();
      setServiceCategories(categories || []);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      setError("Failed to load service categories");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Please enter a category name");
      return;
    }

    setCreatingCategory(true);
    setError("");

    try {
      const response = await fetch("/api/frontdesk/service-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          color: newCategoryColor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create service category");
      }

      const newCategory = await response.json();

      // Refresh categories list
      await fetchServiceCategories();

      // Select the newly created category
      setSelectedCategoryId(newCategory.id);

      // Switch back to select tab
      setActiveTab("select");

      // Reset form
      setNewCategoryName("");
      setNewCategoryColor("#3b82f6");
    } catch (error) {
      console.error("Error creating service category:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create service category"
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCategoryId) {
      setError("Please select a service category");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/service-category`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serviceCategoryId: selectedCategoryId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update service category");
      }

      onCategoryUpdatedAction?.();
      onCloseAction();
    } catch (error) {
      console.error("Error updating service category:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update service category"
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = serviceCategories.find(
    (cat) => cat.id === selectedCategoryId
  );

  // Filter categories based on search term
  const filteredCategories = serviceCategories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Service Category Management</DialogTitle>
          <DialogDescription>
            Select an existing category or create a new one for this
            application.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "select" | "create")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select" className="flex items-center gap-2">
              <span>Select Category</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Create New</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            {currentCategory && (
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Current Category
                </Label>
                <div className="mt-1">
                  <ServiceCategoryBadge
                    category={currentCategory}
                    variant="outline"
                    size="md"
                  />
                </div>
              </div>
            )}

            <div>
              <Label
                htmlFor="category"
                className="text-sm font-medium text-gray-700"
              >
                Select Service Category
              </Label>

              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a service category" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {/* Search bar inside dropdown */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-2 z-10">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Category options */}
                  <div className="p-1">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id}
                          className="pl-2"
                        >
                          <div className="flex items-center gap-2">
                            {category.color && (
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-4 text-center text-sm text-gray-500">
                        No categories found
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  Preview
                </Label>
                <div className="mt-2">
                  <ServiceCategoryBadge
                    category={selectedCategory}
                    variant="default"
                    size="md"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div>
              <Label
                htmlFor="newCategoryName"
                className="text-sm font-medium text-gray-700"
              >
                Category Name *
              </Label>
              <Input
                id="newCategoryName"
                type="text"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Category Color *
              </Label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newCategoryColor === color
                          ? "border-gray-900 scale-110"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {newCategoryName && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  Preview
                </Label>
                <div className="mt-2">
                  <ServiceCategoryBadge
                    category={{
                      id: "preview",
                      name: newCategoryName,
                      color: newCategoryColor,
                    }}
                    variant="default"
                    size="md"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mt-4">
            {error}
          </div>
        )}

        <DialogFooter>
          {activeTab === "create" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("select")}
                disabled={creatingCategory}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
                className="flex items-center gap-2"
              >
                {creatingCategory ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create & Use
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onCloseAction}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || !selectedCategoryId}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
