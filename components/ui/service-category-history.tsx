// components/ui/service-category-history.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ServiceCategoryChangeDialog } from "./service-category-selector";
import { History, Edit3, Clock, User } from "lucide-react";
import { format } from "date-fns";

interface ServiceCategoryChange {
  id: string;
  previousCategory?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  newCategory: {
    id: string;
    name: string;
    color?: string;
  };
  changedBy: {
    id: string;
    email: string;
    officerProfile?: {
      fullName: string;
      designation: string;
      department: string;
    } | null;
  };
  reason?: string;
  createdAt: string;
}

interface ServiceCategoryHistoryProps {
  applicationId: string;
  currentCategoryId?: string;
  currentCategoryName?: string;
  canManageCategories?: boolean;
  onCategoryChanged?: (newCategoryId: string) => void;
}

export function ServiceCategoryHistory({
  applicationId,
  currentCategoryId,
  currentCategoryName,
  canManageCategories = false,
  onCategoryChanged,
}: ServiceCategoryHistoryProps) {
  const [history, setHistory] = useState<ServiceCategoryChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/applications/${applicationId}/service-category`
      );
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error fetching category history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      fetchHistory();
    }
  }, [dialogOpen, applicationId]);

  const handleCategoryChanged = (newCategoryId: string) => {
    onCategoryChanged?.(newCategoryId);
    fetchHistory(); // Refresh history
  };

  const handleCategoryChangeSuccess = () => {
    fetchHistory(); // Refresh history after successful change
  };

  return (
    <div className="flex items-center gap-2">
      {/* Current Category Display */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Category:</span>
        <Badge variant="secondary" className="gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          {currentCategoryName || "Unknown"}
        </Badge>
      </div>

      {/* Change Category Button - Only show if user can manage categories */}
      {canManageCategories && (
        <ServiceCategoryChangeDialog
          applicationId={applicationId}
          currentCategoryId={currentCategoryId}
          onSuccess={handleCategoryChangeSuccess}
          trigger={
            <Button variant="outline" size="sm" className="gap-1">
              <Edit3 className="h-3 w-3" />
              Change
            </Button>
          }
        />
      )}

      {/* History Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <History className="h-3 w-3" />
            History
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Service Category History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">
                  No category changes recorded
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((change, index) => (
                  <Card
                    key={change.id}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Category Change
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(change.createdAt),
                            "MMM dd, yyyy 'at' HH:mm"
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {/* Category Change */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">From:</span>
                          <Badge variant="outline" className="gap-1">
                            {change.previousCategory?.color && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    change.previousCategory.color,
                                }}
                              />
                            )}
                            {change.previousCategory?.name || "None"}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="secondary" className="gap-1">
                            {change.newCategory.color && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: change.newCategory.color,
                                }}
                              />
                            )}
                            {change.newCategory.name}
                          </Badge>
                        </div>

                        {/* Changed By */}
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Changed by:
                          </span>
                          <span className="font-medium">
                            {change.changedBy.officerProfile?.fullName ||
                              change.changedBy.email}
                          </span>
                          {change.changedBy.officerProfile && (
                            <Badge variant="outline" className="text-xs">
                              {change.changedBy.officerProfile.designation}
                            </Badge>
                          )}
                        </div>

                        {/* Reason */}
                        {change.reason && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Reason:
                            </span>
                            <p className="mt-1 text-foreground bg-muted p-2 rounded text-xs">
                              {change.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    {index < history.length - 1 && (
                      <Separator className="mt-2" />
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
