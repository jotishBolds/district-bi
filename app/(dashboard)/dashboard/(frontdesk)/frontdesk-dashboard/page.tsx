"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  FileText,
  Clock,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  Users,
  ArrowRight,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";
import { ServiceCategoryBadge } from "@/components/ui/service-category-badge";
import { ServiceCategoryEditModal } from "@/components/ui/service-category-edit-modal";
import {
  getRoleMapping,
  getLevelPriority,
  canAssignTo,
} from "@/lib/officer-roles";
import { UserRole } from "@/app/generated/prisma";
import { useSession } from "next-auth/react";

interface Application {
  id: string;
  rrNumber?: string;
  citizenName: string;
  citizenPhone: string;
  citizenAddress?: string;
  subject?: string;
  status: string;
  createdAt: string;
  submittedAt?: string;
  updatedAt: string;
  serviceCategory: {
    id: string;
    name: string;
    color?: string | null;
  };
  documents?: Array<{
    id: string;
    fileName: string;
    documentType: string;
  }>;
  citizenProfile?: {
    fullName: string;
    phone: string;
    address: string;
  };
  currentHolder?: {
    id: string;
    officerProfile?: {
      fullName: string;
      designation: string;
      department: string;
    };
  };
  frontdeskForwardings?: Array<{
    createdAt: string;
    instructions: string;
    fromFrontdesk: {
      id: string;
      email: string;
      citizenProfile?: {
        fullName: string;
      };
    };
    toFrontdesk: {
      id: string;
      email: string;
      citizenProfile?: {
        fullName: string;
      };
    };
  }>;
}

interface Officer {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  role: UserRole;
  level?: number;
}

interface FrontdeskAssignment {
  id: string;
  officerId: string | null;
  officer: {
    id: string;
    fullName: string;
    designation: string;
    department: string;
    role: UserRole;
  } | null;
}

interface FrontdeskData {
  activeApplications: Application[];
  forwardedOutByMe: Application[];
  receivedByMe: Application[];
  completedApplications: Application[];
  assignedOfficers: Officer[];
  summary: {
    active: number;
    forwardedOut: number;
    received: number;
    completed: number;
    total: number;
  };
}

export default function FrontdeskDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<FrontdeskData | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<Officer[]>([]);
  const [filteredOfficers, setFilteredOfficers] = useState<Officer[]>([]);
  const [frontdeskAssignments, setFrontdeskAssignments] = useState<
    FrontdeskAssignment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [forwardingApp, setForwardingApp] = useState<Application | null>(null);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [serviceCategories, setServiceCategories] = useState<
    Array<{ id: string; name: string; color?: string }>
  >([]);
  const [isCategoryEditModalOpen, setIsCategoryEditModalOpen] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState<string>("");
  const [editingCurrentCategory, setEditingCurrentCategory] = useState<
    { id: string; name: string; color?: string } | undefined
  >(undefined);

  const fetchFrontdeskAssignments = async (
    availableOfficersForRef?: Officer[]
  ) => {
    try {
      const response = await fetch("/api/frontdesk/assignments");
      if (!response.ok)
        throw new Error("Failed to fetch frontdesk assignments");
      const assignmentData = await response.json();

      setFrontdeskAssignments(assignmentData.assignments || []);

      // Find the assigned officer with the highest priority (lowest level number)
      const specificAssignments = (assignmentData.assignments || []).filter(
        (assignment: FrontdeskAssignment) =>
          assignment.officerId !== null && assignment.officer
      );

      if (specificAssignments.length > 0) {
        // Get the level of the highest priority assigned officer
        // Cross-reference with available officers to get correct levels
        const levels = specificAssignments.map(
          (assignment: FrontdeskAssignment) => {
            if (assignment.officer?.role) {
              // If role is available in assignment, use it
              return getLevelPriority(assignment.officer.role);
            } else if (availableOfficersForRef) {
              // If role is missing, find it in available officers by matching fullName or officerId
              const matchingOfficer = availableOfficersForRef.find(
                (officer: Officer) =>
                  officer.id === assignment.officerId ||
                  officer.fullName === assignment.officer?.fullName
              );
              if (matchingOfficer) {
                console.log(
                  `🔧 Fixed missing role for ${assignment.officer?.fullName}: ${
                    matchingOfficer.role
                  } (L${getLevelPriority(matchingOfficer.role)})`
                );
                return getLevelPriority(matchingOfficer.role);
              }
              console.warn(
                `⚠️ Could not find role for assignment:`,
                assignment
              );
              return 0; // Default to highest level if not found
            } else {
              console.warn(
                `⚠️ No officers available for role lookup:`,
                assignment
              );
              return 0;
            }
          }
        );

        const highestPriorityLevel = Math.min(...levels); // Lowest number = highest priority

        console.log("🎯 Frontdesk Assignment Info:", {
          assignments: specificAssignments.map((a: FrontdeskAssignment) => {
            const matchingOfficer = availableOfficersForRef?.find(
              (officer: Officer) =>
                officer.id === a.officerId ||
                officer.fullName === a.officer?.fullName
            );
            return {
              officer: a.officer?.fullName,
              role: a.officer?.role || matchingOfficer?.role,
              level: a.officer?.role
                ? getLevelPriority(a.officer.role)
                : matchingOfficer
                ? getLevelPriority(matchingOfficer.role)
                : 0,
            };
          }),
          highestPriorityLevel,
          allLevels: levels,
          canForwardToLevels: `${highestPriorityLevel} to 6`,
        });
      } else {
        // General frontdesk - can forward to all officers
        console.log("🎯 General Frontdesk - no specific assignments");
      }
    } catch (error) {
      console.error("Error fetching frontdesk assignments:", error);
      setFrontdeskAssignments([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch available officers first
      const officersResponse = await fetch("/api/officers/available");
      if (!officersResponse.ok) throw new Error("Failed to fetch officers");
      const officersData = await officersResponse.json();
      setAvailableOfficers(officersData);

      // Fetch frontdesk assignments with officers data for cross-reference
      await fetchFrontdeskAssignments(officersData);

      // Fetch frontdesk applications
      const response = await fetch("/api/frontdesk/applications");
      if (!response.ok) throw new Error("Failed to fetch applications");
      const applicationData = await response.json();
      setData(applicationData);

      // Note: Officer filtering will happen in useEffect when frontdeskAssignments state updates
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceCategories = async () => {
    try {
      const response = await fetch("/api/frontdesk/service-categories");
      if (response.ok) {
        const categories = await response.json();
        setServiceCategories(Array.isArray(categories) ? categories : []);
      }
    } catch (error) {
      console.error("Error fetching service categories:", error);
    }
  };

  const filterOfficersByLevel = (officers: Officer[]) => {
    if (!session?.user?.role) {
      setFilteredOfficers([]);
      return;
    }

    const currentUserRole = session.user.role as UserRole;

    // Add level information to officers
    const officersWithLevels = officers.map((officer) => ({
      ...officer,
      level: getLevelPriority(officer.role),
    }));

    console.log(
      "👥 All Available Officers:",
      officersWithLevels.map((o) => ({
        fullName: o.fullName,
        role: o.role,
        level: o.level,
      }))
    );

    let assignableOfficers;

    if (currentUserRole === UserRole.FRONT_DESK) {
      // For frontdesk users, use the level of their assigned officer(s)
      console.log("=== FRONTDESK ASSIGNMENT LEVEL DEBUG ===");
      console.log("Current user level from session:", session.user.level);
      console.log("Frontdesk assignments:", frontdeskAssignments);

      if (frontdeskAssignments.length > 0) {
        // Find specific assignments (exclude null officer assignments)
        const specificAssignments = frontdeskAssignments.filter(
          (assignment: FrontdeskAssignment) =>
            assignment.officerId !== null && assignment.officer
        );

        if (specificAssignments.length > 0) {
          // Get the level of each assigned officer
          const assignedOfficerLevels = specificAssignments.map(
            (assignment) => {
              // Find the officer in available officers to get their role and level
              const assignedOfficer = officersWithLevels.find(
                (officer) =>
                  officer.id === assignment.officerId ||
                  officer.fullName === assignment.officer?.fullName
              );

              if (assignedOfficer) {
                console.log(
                  `✅ Assignment: ${assignment.officer?.fullName} -> Level ${assignedOfficer.level}`
                );
                return assignedOfficer.level;
              }

              // Fallback: get level from role mapping if officer not found in available list
              const roleLevel = assignment.officer?.role
                ? getLevelPriority(assignment.officer.role)
                : 7;
              console.log(
                `⚠️ Assignment fallback: ${assignment.officer?.fullName} -> Level ${roleLevel} (from role)`
              );
              return roleLevel;
            }
          );

          // Find the highest authority level (lowest number) among assigned officers
          const highestAuthorityLevel = Math.min(...assignedOfficerLevels);

          console.log("📊 Assignment Analysis:", {
            assignments: specificAssignments.length,
            assignedOfficerLevels,
            highestAuthorityLevel,
            filterRule: `Can forward to Level ${highestAuthorityLevel} and below (${highestAuthorityLevel}-6)`,
          });

          // Frontdesk can forward to officers at the SAME level or LOWER authority (same number or HIGHER)
          // If assigned to Level 6 officer, can only forward to Level 6 officers
          // If assigned to Level 2 officer, can forward to Level 2,3,4,5,6 officers
          assignableOfficers = officersWithLevels.filter((officer) => {
            const canAssign = officer.level >= highestAuthorityLevel;
            console.log(
              `🎯 Filter: Frontdesk(assigned to L${highestAuthorityLevel}) -> ${
                officer.fullName
              }(L${officer.level}): ${canAssign ? "✅ ALLOWED" : "❌ BLOCKED"}`
            );
            return canAssign;
          });

          console.log("🔍 Frontdesk Assignment-Based Filtering Result:", {
            totalOfficers: officers.length,
            filteredOfficers: assignableOfficers.length,
            filterRule: `Level ${highestAuthorityLevel} and below only`,
            allowedLevels: Array.from(
              new Set(assignableOfficers.map((o) => o.level))
            ).sort(),
          });
        } else {
          // Has assignments but no specific officers - treat as general frontdesk
          assignableOfficers = officersWithLevels.filter((officer) => {
            const roleMapping = getRoleMapping(officer.role);
            return roleMapping?.userType === "Officer";
          });
          console.log(
            "🔍 Frontdesk with general assignments - can forward to all officers"
          );
        }
      } else {
        // No assignments at all - treat as general frontdesk
        assignableOfficers = officersWithLevels.filter((officer) => {
          const roleMapping = getRoleMapping(officer.role);
          return roleMapping?.userType === "Officer";
        });
        console.log(
          "🔍 General Frontdesk (no assignments) - can forward to all officers"
        );
      }
    } else {
      // For non-frontdesk officers, use existing canAssignTo logic
      const currentUserLevel = getLevelPriority(currentUserRole);
      assignableOfficers = officersWithLevels.filter((officer) => {
        const canAssign = canAssignTo(currentUserRole, officer.role);
        console.log(
          `🎯 Officer canAssignTo(${currentUserRole}, ${officer.role}): ${canAssign} (levels: ${currentUserLevel} -> ${officer.level})`
        );
        return canAssign;
      });

      console.log("🔍 Officer Filtering:", {
        currentUserRole,
        currentUserLevel,
        totalOfficers: officers.length,
      });
    }

    console.log(
      "✅ Final Assignable officers:",
      assignableOfficers.map((o) => ({
        fullName: o.fullName,
        role: o.role,
        level: o.level,
      }))
    );

    // Sort by level (higher priority officers first)
    assignableOfficers.sort((a, b) => (a.level || 0) - (b.level || 0));

    setFilteredOfficers(assignableOfficers);
  };

  const filterApplicationsByCategory = (applications: Application[]) => {
    if (selectedCategoryFilter === "all") {
      return applications;
    }
    return applications.filter(
      (app) => app.serviceCategory?.id === selectedCategoryFilter
    );
  };

  useEffect(() => {
    fetchData();
    fetchServiceCategories();
  }, []);

  useEffect(() => {
    if (availableOfficers.length > 0) {
      filterOfficersByLevel(availableOfficers);
    }
  }, [
    session?.user?.role,
    session?.user?.level,
    availableOfficers,
    frontdeskAssignments,
  ]);

  const handleForward = async () => {
    if (!forwardingApp || !selectedOfficer || !instructions.trim()) {
      toast.error("Please select an officer and provide instructions");
      return;
    }

    try {
      const response = await fetch("/api/frontdesk/forward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: forwardingApp.id,
          toOfficerId: selectedOfficer,
          instructions: instructions.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Application forwarded successfully");
        setIsForwardDialogOpen(false);
        setForwardingApp(null);
        setSelectedOfficer("");
        setInstructions("");
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to forward application");
      }
    } catch (error) {
      console.error("Error forwarding application:", error);
      toast.error("Error forwarding application");
    }
  };

  const openForwardDialog = (application: Application) => {
    setForwardingApp(application);
    setIsForwardDialogOpen(true);
  };

  const closeForwardDialog = () => {
    setIsForwardDialogOpen(false);
    setForwardingApp(null);
    setSelectedOfficer("");
    setInstructions("");
  };

  const handleCategoryEdit = (
    applicationId: string,
    currentCategory: { id: string; name: string; color?: string }
  ) => {
    setEditingApplicationId(applicationId);
    setEditingCurrentCategory(currentCategory);
    setIsCategoryEditModalOpen(true);
  };

  const closeCategoryEditModal = () => {
    setIsCategoryEditModalOpen(false);
    setEditingApplicationId("");
    setEditingCurrentCategory(undefined);
  };

  const handleCategoryUpdated = () => {
    fetchData(); // Refresh data after category update
    toast.success("Service category updated successfully");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "REOPENED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const ApplicationCard = ({
    application,
    showForwardButton = false,
  }: {
    application: Application;
    showForwardButton?: boolean;
  }) => (
    <Card
      key={application.id}
      className="mb-4 hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500"
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
              {application.citizenProfile?.fullName ||
                application.citizenName ||
                "N/A"}
            </CardTitle>
            <CardDescription className="space-y-1">
              <div className="flex items-center gap-2">
                <ServiceCategoryBadge
                  category={{
                    id: application.serviceCategory.id,
                    name: application.serviceCategory.name,
                    color: application.serviceCategory.color || undefined,
                  }}
                  clickable={true}
                  onClick={() =>
                    handleCategoryEdit(application.id, {
                      id: application.serviceCategory.id,
                      name: application.serviceCategory.name,
                      color: application.serviceCategory.color || undefined,
                    })
                  }

                  // No variant or className override here
                />
              </div>

              {application.subject && (
                <div className="text-blue-600 font-medium">
                  {application.subject}
                </div>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`${getStatusColor(
                application.status
              )} border font-medium`}
            >
              {application.status.replace("_", " ")}
            </Badge>
            {application.rrNumber && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 font-medium"
              >
                {application.rrNumber}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Show indicator if this application was received from another frontdesk */}
      {application.frontdeskForwardings &&
        application.frontdeskForwardings.length > 0 &&
        application.frontdeskForwardings[0].toFrontdesk && (
          <div className="mx-6 mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-green-600" />
              <p className="text-green-700 font-medium text-sm">
                Received from{" "}
                {application.frontdeskForwardings[0].fromFrontdesk
                  ?.citizenProfile?.fullName ||
                  application.frontdeskForwardings[0].fromFrontdesk?.email ||
                  "another frontdesk"}
              </p>
            </div>
          </div>
        )}

      <CardContent>
        <div className="space-y-4">
          {/* Quick info row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="font-medium">
                {new Date(
                  application.submittedAt || application.createdAt
                ).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              <span className="font-medium">
                {application.documents?.length || 0} documents
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="font-medium">Standard SLA</span>
            </div>
          </div>

          {/* Citizen contact info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">
                Contact Information
              </h4>
              {(application.citizenProfile?.phone ||
                application.citizenPhone) && (
                <p className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span>
                    {application.citizenProfile?.phone ||
                      application.citizenPhone}
                  </span>
                </p>
              )}
              {(application.citizenProfile?.address ||
                application.citizenAddress) && (
                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                  <span className="break-words">
                    {application.citizenProfile?.address ||
                      application.citizenAddress}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">
                Current Assignment
              </h4>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {application.currentHolder?.officerProfile?.fullName ||
                    "Unassigned"}
                </p>
                {application.currentHolder?.officerProfile?.designation && (
                  <p className="text-xs text-blue-700">
                    {application.currentHolder.officerProfile.designation}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Forwarding information */}
          {application.frontdeskForwardings &&
            application.frontdeskForwardings.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Forwarding Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-blue-800">From:</span>
                      <p className="text-blue-700">
                        {application.frontdeskForwardings[0].fromFrontdesk
                          ?.citizenProfile?.fullName ||
                          application.frontdeskForwardings[0].fromFrontdesk
                            ?.email ||
                          "Unknown"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">To:</span>
                      <p className="text-blue-700">
                        {application.frontdeskForwardings[0].toFrontdesk
                          ?.citizenProfile?.fullName ||
                          application.frontdeskForwardings[0].toFrontdesk
                            ?.email ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>
                  {application.frontdeskForwardings[0].instructions && (
                    <div>
                      <span className="font-medium text-blue-800">
                        Instructions:
                      </span>
                      <p className="text-blue-700 bg-white p-2 rounded border border-blue-100 mt-1">
                        &quot;{application.frontdeskForwardings[0].instructions}
                        &quot;
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-blue-800">
                      Forwarded:
                    </span>
                    <p className="text-blue-700">
                      {formatDistance(
                        new Date(application.frontdeskForwardings[0].createdAt),
                        new Date(),
                        {
                          addSuffix: true,
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Action buttons */}
          {showForwardButton && (
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openForwardDialog(application)}
                className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <Send className="w-4 h-4" />
                Forward Application
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Enhanced history card for forwarded applications
  const ForwardedHistoryCard = ({
    application,
    type,
  }: {
    application: Application;
    type: "incoming" | "outgoing";
  }) => {
    const latestForwarding = application.frontdeskForwardings?.[0];
    const isIncoming = type === "incoming";

    return (
      <Card
        className="hover:shadow-md transition-shadow duration-200 border-l-4"
        style={{ borderLeftColor: isIncoming ? "#10b981" : "#f59e0b" }}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {isIncoming ? (
                    <ArrowLeft className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                  )}
                  <h3 className="font-semibold text-gray-900">
                    {application.rrNumber || `App-${application.id.slice(-6)}`}
                  </h3>
                </div>
                <Badge
                  variant={isIncoming ? "default" : "secondary"}
                  className={`text-xs font-medium ${
                    isIncoming
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-orange-100 text-orange-800 border-orange-200"
                  }`}
                >
                  {isIncoming ? "Received" : "Sent Out"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">
                    {application.serviceCategory?.name}
                  </span>
                  <span>•</span>
                  <Badge
                    className={getStatusColor(application.status)}
                    variant="outline"
                  >
                    {application.status.toLowerCase().replace("_", " ")}
                  </Badge>
                </div>

                {latestForwarding && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {isIncoming ? "From" : "To"}:
                    </span>{" "}
                    <span className="text-gray-900">
                      {isIncoming
                        ? latestForwarding.fromFrontdesk?.citizenProfile
                            ?.fullName || latestForwarding.fromFrontdesk?.email
                        : latestForwarding.toFrontdesk?.citizenProfile
                            ?.fullName || latestForwarding.toFrontdesk?.email}
                    </span>
                  </div>
                )}

                {latestForwarding?.instructions && (
                  <div className="bg-gray-50 border border-gray-200 p-2 rounded text-xs text-gray-700">
                    <span className="font-medium">Instructions:</span> &quot;
                    {latestForwarding.instructions}&quot;
                  </div>
                )}
              </div>
            </div>

            <div className="text-right text-xs text-gray-500 space-y-1">
              <div className="font-medium">
                {formatDistance(new Date(application.updatedAt), new Date(), {
                  addSuffix: true,
                })}
              </div>
              {latestForwarding && (
                <div>
                  Forwarded{" "}
                  {formatDistance(
                    new Date(latestForwarding.createdAt),
                    new Date(),
                    { addSuffix: true }
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-8xl mx-auto">
      {/* <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Frontdesk Dashboard
        </h1>
        <p className="text-gray-600 text-lg">
          Manage applications for your assigned officers
        </p>
      </div> */}

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">
                  Active Applications
                </p>
                <p className="text-4xl font-bold mb-1">
                  {data?.summary?.active || 0}
                </p>
                <p className="text-green-100 text-xs">In progress & reopened</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Activity className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">
                  Forwarded Out
                </p>
                <p className="text-4xl font-bold mb-1">
                  {data?.summary?.forwardedOut || 0}
                </p>
                <p className="text-orange-100 text-xs">
                  Sent to other frontdesks
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Send className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Received
                </p>
                <p className="text-4xl font-bold mb-1">
                  {data?.summary?.received || 0}
                </p>
                <p className="text-blue-100 text-xs">From other frontdesks</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">
                  Completed
                </p>
                <p className="text-4xl font-bold mb-1">
                  {data?.summary?.completed || 0}
                </p>
                <p className="text-purple-100 text-xs">Resolved & closed</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-4">
          <Label htmlFor="category-filter" className="text-sm font-medium">
            Filter by Category:
          </Label>
          <Select
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {serviceCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    {category.color && (
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-gray-100 rounded-lg">
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-2 text-xs sm:text-sm font-medium"
          >
            <div className="flex flex-col items-center gap-1">
              <span>Active</span>
              <Badge variant="secondary" className="text-xs">
                {data?.summary?.active || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="forwarded"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-2 text-xs sm:text-sm font-medium"
          >
            <div className="flex flex-col items-center gap-1">
              <span>Forwarded</span>
              <Badge variant="secondary" className="text-xs">
                {data?.summary?.forwardedOut || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="received"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-2 text-xs sm:text-sm font-medium"
          >
            <div className="flex flex-col items-center gap-1">
              <span>Received</span>
              <Badge variant="secondary" className="text-xs">
                {data?.summary?.received || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-2 text-xs sm:text-sm font-medium"
          >
            <div className="flex flex-col items-center gap-1">
              <span>Completed</span>
              <Badge variant="secondary" className="text-xs">
                {data?.summary?.completed || 0}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Active Applications
                </h3>
                <p className="text-sm text-gray-600">
                  Applications in your officers&apos; queues (including received
                  from other frontdesks)
                </p>
              </div>
            </div>
            {data.activeApplications.length === 0 ? (
              <Card className="p-8 text-center">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No active applications</p>
                <p className="text-gray-400 text-sm">
                  New applications will appear here
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filterApplicationsByCategory(data.activeApplications).map(
                  (app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      showForwardButton={true}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="forwarded" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Forwarded Applications
                </h3>
                <p className="text-sm text-gray-600">
                  Applications you forwarded to other frontdesks
                </p>
              </div>
            </div>
            {data.forwardedOutByMe.length === 0 ? (
              <Card className="p-8 text-center">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No applications forwarded out yet
                </p>
                <p className="text-gray-400 text-sm">
                  Forwarded applications will appear here
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filterApplicationsByCategory(data.forwardedOutByMe).map(
                  (app: Application) => (
                    <ForwardedHistoryCard
                      key={app.id}
                      application={app}
                      type="outgoing"
                    />
                  )
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="received" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Received Applications
                </h3>
                <p className="text-sm text-gray-600">
                  Applications received from other frontdesks
                </p>
              </div>
            </div>
            {data.receivedByMe.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No applications received yet
                </p>
                <p className="text-gray-400 text-sm">
                  Received applications will appear here
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filterApplicationsByCategory(data.receivedByMe).map(
                  (app: Application) => (
                    <ForwardedHistoryCard
                      key={app.id}
                      application={app}
                      type="incoming"
                    />
                  )
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Completed Applications
                </h3>
                <p className="text-sm text-gray-600">
                  Applications that have been resolved and closed
                </p>
              </div>
            </div>
            {data?.completedApplications?.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No completed applications yet
                </p>
                <p className="text-gray-400 text-sm">
                  Completed applications will appear here
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filterApplicationsByCategory(
                  data?.completedApplications || []
                ).map((app: Application) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    showForwardButton={false}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Fixed Forward Dialog */}
      <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Forward Application
            </DialogTitle>
            <DialogDescription>
              Forward {forwardingApp?.rrNumber || forwardingApp?.id} to another
              officer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="officer" className="text-sm font-medium">
                Select Officer
              </Label>
              {filteredOfficers.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">
                    No officers available for forwarding
                  </p>
                  <p className="text-xs text-gray-400">
                    {session?.user?.role === UserRole.FRONT_DESK
                      ? frontdeskAssignments.length > 0
                        ? `As a frontdesk assigned to work with officers, you can forward based on your assignment level`
                        : "As general frontdesk, you can forward to all officers"
                      : "You can only forward applications to officers at the same level or lower in the hierarchy"}
                  </p>
                </div>
              ) : (
                <Select
                  onValueChange={setSelectedOfficer}
                  value={selectedOfficer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an officer" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredOfficers
                      ?.filter(
                        (officer) =>
                          officer.id !== forwardingApp?.currentHolder?.id
                      )
                      .map((officer) => {
                        const roleMapping = getRoleMapping(officer.role);
                        return (
                          <SelectItem key={officer.id} value={officer.id}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {officer.fullName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {roleMapping?.shortDesignation ||
                                  officer.designation}{" "}
                                - Level {officer.level}
                              </span>
                              <span className="text-xs text-gray-400">
                                {officer.department}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-sm font-medium">
                Instructions
              </Label>
              <Textarea
                id="instructions"
                placeholder="Provide forwarding instructions..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForwardDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={
                !selectedOfficer ||
                !instructions.trim() ||
                filteredOfficers.length === 0
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Forward Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Category Edit Modal */}
      <ServiceCategoryEditModal
        isOpen={isCategoryEditModalOpen}
        onCloseAction={closeCategoryEditModal}
        applicationId={editingApplicationId}
        currentCategory={editingCurrentCategory}
        onCategoryUpdatedAction={handleCategoryUpdated}
      />
    </div>
  );
}
