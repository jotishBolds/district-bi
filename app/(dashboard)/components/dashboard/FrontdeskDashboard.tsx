"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  Users,
  Clock,
  CheckCircle,
  Forward,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FrontdeskAssignment {
  id: string;
  officerId: string | null;
  officer: {
    id: string;
    fullName: string;
    designation: string;
    department: string;
  } | null;
}

interface DashboardStats {
  pendingValidation: number;
  validated: number;
  inQueue: number;
  totalProcessed: number;
}

interface DashboardCard {
  title: string;
  value: number;
}

export default function FrontdeskDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [frontdeskAssignments, setFrontdeskAssignments] = useState<
    FrontdeskAssignment[]
  >([]);
  const [isGeneralFrontdesk, setIsGeneralFrontdesk] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    pendingValidation: 0,
    validated: 0,
    inQueue: 0,
    totalProcessed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role === "FRONT_DESK") {
      fetchFrontdeskAssignments();
      fetchStats();
    }
  }, [session]);

  const fetchFrontdeskAssignments = async () => {
    try {
      const response = await fetch("/api/frontdesk/assignments");
      if (!response.ok)
        throw new Error("Failed to fetch frontdesk assignments");
      const data = await response.json();

      if (data && Array.isArray(data.assignments)) {
        setFrontdeskAssignments(data.assignments);

        // Determine if this is a general frontdesk user
        const hasSpecificAssignments = data.assignments.some(
          (assignment: FrontdeskAssignment) => assignment.officerId !== null
        );
        setIsGeneralFrontdesk(!hasSpecificAssignments);
      } else {
        setFrontdeskAssignments([]);
        setIsGeneralFrontdesk(true);
      }
    } catch (error) {
      console.error("Error fetching frontdesk assignments:", error);
      setFrontdeskAssignments([]);
      setIsGeneralFrontdesk(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      const data = await response.json();

      if (data.cards && Array.isArray(data.cards)) {
        const statsMap = data.cards.reduce(
          (acc: DashboardStats, card: DashboardCard) => {
            if (card.title === "Pending Validation") {
              acc.pendingValidation = card.value;
            } else if (card.title === "Validated") {
              acc.validated = card.value;
            } else if (card.title === "In Queue") {
              acc.inQueue = card.value;
            } else if (card.title === "Total Processed") {
              acc.totalProcessed = card.value;
            }
            return acc;
          },
          {
            pendingValidation: 0,
            validated: 0,
            inQueue: 0,
            totalProcessed: 0,
          }
        );

        setStats(statsMap);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Set default values on error
      setStats({
        pendingValidation: 0,
        validated: 0,
        inQueue: 0,
        totalProcessed: 0,
      });
    }
  };

  if (session?.user?.role !== "FRONT_DESK") {
    return null; // This component is only for frontdesk users
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Frontdesk Type Banner */}
      <Card
        className={`border-l-4 ${
          isGeneralFrontdesk
            ? "border-l-blue-500 bg-blue-50"
            : "border-l-green-500 bg-green-50"
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle
                className={`${
                  isGeneralFrontdesk ? "text-blue-900" : "text-green-900"
                }`}
              >
                {isGeneralFrontdesk
                  ? "General Frontdesk"
                  : "Specific Officer Frontdesk"}
              </CardTitle>
              <CardDescription
                className={`${
                  isGeneralFrontdesk ? "text-blue-700" : "text-green-700"
                }`}
              >
                {isGeneralFrontdesk
                  ? "You can create applications for the queue - they will be assigned by specific frontdesk staff"
                  : "You can create applications and assign them directly to your designated officers"}
              </CardDescription>
            </div>
            <Badge
              variant={isGeneralFrontdesk ? "secondary" : "default"}
              className="ml-4"
            >
              {isGeneralFrontdesk ? "General" : "Specific"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Application</CardTitle>
                <CardDescription>
                  {isGeneralFrontdesk ? "Add to queue" : "Create & assign"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/create-application")}
              className="w-full"
            >
              New Application
            </Button>
          </CardContent>
        </Card>

        {isGeneralFrontdesk ? (
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
                  <Forward className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Queue Overview</CardTitle>
                  <CardDescription>Monitor queue status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/dashboard/general-queue-view")}
                variant="outline"
                className="w-full"
              >
                View Queue ({stats.inQueue})
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Forward className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Application Queue</CardTitle>
                  <CardDescription>Pull & assign from queue</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/dashboard/queue")}
                variant="outline"
                className="w-full"
              >
                View Queue ({stats.inQueue})
              </Button>
            </CardContent>
          </Card>
        )}

        {!isGeneralFrontdesk && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Manage Applications</CardTitle>
                  <CardDescription>View & process applications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/dashboard/frontdesk-dashboard")}
                variant="outline"
                className="w-full"
              >
                View Applications
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assigned Officers (for specific frontdesk) */}
      {!isGeneralFrontdesk && frontdeskAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Your Assigned Officers</span>
            </CardTitle>
            <CardDescription>
              Officers you can assign applications to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {frontdeskAssignments
                .filter((assignment) => assignment.officer)
                .map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {assignment.officer?.fullName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {assignment.officer?.designation}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {assignment.officer?.department}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
