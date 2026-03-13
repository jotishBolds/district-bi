"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  User,
  Building,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  url: string;
}

interface Application {
  id: string;
  fullName: string;
  subject: string;
  createdAt: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  documents: Document[];
  currentOfficer?: {
    name: string;
    designation?: string;
  };
  servicecategory?: {
    name: string;
    department?: {
      name: string;
    };
  };
}

interface Props {
  userRole?: string;
}

const RecentApplications = ({ userRole }: Props) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filteredApplications, setFilteredApplications] = useState<
    Application[]
  >([]);

  const itemsPerPage = 8;

  // Fetch applications
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          "/api/applications?limit=50&includeForwardingHistory=true",
        );
        if (response.ok) {
          const data = await response.json();
          setApplications(data.applications || []);
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [userRole]);

  useEffect(() => {
    const sorted = [...applications];

    sorted.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "name":
          aValue = a.fullName ? a.fullName.toLowerCase() : "";
          bValue = b.fullName ? b.fullName.toLowerCase() : "";
          break;

        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredApplications(sorted);
  }, [applications, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentApplications = filteredApplications.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      default:
        return "bg-muted/30 text-muted-foreground border-border";
    }
  };

  const handleSort = (field: "date" | "name" | "status") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Applications
          </h3>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-4 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-muted rounded-full w-20"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-muted rounded w-32"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            Recent Applications
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("date")}
              className={cn(
                "gap-1",
                sortBy === "date" && "bg-primary/10 border-primary/20",
              )}
            >
              <Clock className="h-4 w-4" />
              Date
              <ArrowUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("name")}
              className={cn(
                "gap-1",
                sortBy === "name" && "bg-primary/10 border-primary/20",
              )}
            >
              <User className="h-4 w-4" />
              Name
              <ArrowUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort("status")}
              className={cn(
                "gap-1",
                sortBy === "status" && "bg-primary/10 border-primary/20",
              )}
            >
              Status
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {currentApplications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No applications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentApplications.map((application) => (
              <div
                key={application.id}
                className="bg-background border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1 flex-1">
                    <h4 className="font-medium text-foreground">
                      {application.fullName}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {application.subject}
                    </p>
                    {application.servicecategory && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span>{application.servicecategory.name}</span>
                        {application.servicecategory.department && (
                          <>
                            <span></span>
                            <span>
                              {application.servicecategory.department.name}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge
                    className={cn(
                      "text-xs",
                      getStatusColor(application.status),
                    )}
                  >
                    {application.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDate(application.createdAt)}</span>
                    {application.documents?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {application.documents.length} document
                        {application.documents.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {application.currentOfficer && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {application.currentOfficer.name}
                        {application.currentOfficer.designation && (
                          <span className="text-xs">
                            ({application.currentOfficer.designation})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {/* Removed Eye and ExternalLink icons and their buttons */}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredApplications.length)} of{" "}
              {filteredApplications.length} applications
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentApplications;
