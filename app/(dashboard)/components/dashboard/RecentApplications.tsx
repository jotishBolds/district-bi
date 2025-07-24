"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/app/generated/prisma";
import { isOfficerRole, isOfficerOrOfficial } from "@/lib/officer-roles";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  ExternalLink,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Application {
  id: string;
  rrNumber: string | null;
  service: string;
  status: string;
  updatedAt: string;
}

interface RecentApplicationsProps {
  userRole?: UserRole;
}

export default function RecentApplications({
  userRole,
}: RecentApplicationsProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/recent-applications");
        if (!response.ok) {
          throw new Error("Failed to fetch recent applications");
        }
        const data = await response.json();
        setApplications(data.applications || []);
      } catch (err) {
        console.error("Error fetching recent applications:", err);
        setError("Failed to load recent applications");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [userRole]);

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending validation":
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "validated":
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in progress":
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "under review":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDashboardPath = () => {
    if (userRole === UserRole.FRONT_DESK) {
      return "/applications?tab=queue";
    }
    if (userRole && isOfficerOrOfficial(userRole)) {
      return "/applications?tab=assigned";
    }
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return "/admin/applications";
    }
    return "/applications";
  };

  const getViewAllText = () => {
    if (userRole === UserRole.FRONT_DESK) {
      return "View Queue";
    }
    if (userRole && isOfficerOrOfficial(userRole)) {
      return "View Assigned";
    }
    return "View All Applications";
  };

  if (loading) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Recent Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Recent Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-600 py-8">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-lg font-semibold flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Recent Applications
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              No recent applications found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {application.rrNumber || `APP-${application.id}`}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-1 ${getStatusColor(
                        application.status
                      )}`}
                    >
                      {application.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {application.service}
                  </p>
                  <p className="text-xs text-gray-500">
                    Updated on{" "}
                    {new Date(application.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Individual application view button */}
                  <Link
                    href={`/track?id=${application.rrNumber || application.id}`}
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Search className="h-4 w-4" />
                    </Button>
                  </Link>

                  {/* Officer/Admin specific view button */}
                  {userRole &&
                    (isOfficerOrOfficial(userRole) ||
                      userRole === UserRole.ADMIN ||
                      userRole === UserRole.SUPER_ADMIN ||
                      userRole === UserRole.FRONT_DESK) && (
                      <Link href={`/applications/${application.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-gray-100 pt-4">
        <Link href={getDashboardPath()} className="w-full">
          <Button variant="outline" className="w-full">
            {getViewAllText()}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
