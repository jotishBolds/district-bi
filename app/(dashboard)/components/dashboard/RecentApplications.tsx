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
import Link from "next/link";
import { ArrowRight, FileText, ExternalLink, Search } from "lucide-react";

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
  const getApplications = (): Application[] => {
    switch (userRole) {
      case UserRole.CITIZEN:
        return [
          {
            id: "1",
            rrNumber: "RR-2025-0001",
            service: "Land Certificate",
            status: "Pending",
            updatedAt: "2025-05-10",
          },
          {
            id: "2",
            rrNumber: "RR-2025-0002",
            service: "Income Certificate",
            status: "In Progress",
            updatedAt: "2025-05-09",
          },
          {
            id: "3",
            rrNumber: null,
            service: "Residence Certificate",
            status: "Draft",
            updatedAt: "2025-05-08",
          },
        ];
      case UserRole.FRONT_DESK:
        return [
          {
            id: "1",
            rrNumber: "RR-2025-0101",
            service: "Land Certificate",
            status: "Pending Validation",
            updatedAt: "2025-05-10",
          },
          {
            id: "2",
            rrNumber: "RR-2025-0102",
            service: "Income Certificate",
            status: "Validated",
            updatedAt: "2025-05-10",
          },
          {
            id: "3",
            rrNumber: "RR-2025-0103",
            service: "Caste Certificate",
            status: "Rejected",
            updatedAt: "2025-05-09",
          },
        ];
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
        return [
          {
            id: "1",
            rrNumber: "RR-2025-0201",
            service: "Land Mutation",
            status: "Assigned",
            updatedAt: "2025-05-10",
          },
          {
            id: "2",
            rrNumber: "RR-2025-0202",
            service: "Property Tax Appeal",
            status: "In Review",
            updatedAt: "2025-05-09",
          },
          {
            id: "3",
            rrNumber: "RR-2025-0203",
            service: "Land Dispute",
            status: "Approved",
            updatedAt: "2025-05-08",
          },
        ];
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return [
          {
            id: "1",
            rrNumber: "RR-2025-0301",
            service: "Land Certificate",
            status: "Completed",
            updatedAt: "2025-05-10",
          },
          {
            id: "2",
            rrNumber: "RR-2025-0302",
            service: "User Registration",
            status: "Pending Approval",
            updatedAt: "2025-05-10",
          },
          {
            id: "3",
            rrNumber: "RR-2025-0303",
            service: "System Configuration",
            status: "In Progress",
            updatedAt: "2025-05-09",
          },
        ];
      default:
        return [];
    }
  };

  const getStatusColor = (status: string): string => {
    const statusMap: Record<string, string> = {
      Draft: "bg-gray-100 text-gray-800 border-gray-200",
      Pending: "bg-amber-100 text-amber-800 border-amber-200",
      "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
      Completed: "bg-green-100 text-green-800 border-green-200",
      Rejected: "bg-red-100 text-red-800 border-red-200",
      Validated: "bg-green-100 text-green-800 border-green-200",
      "Pending Validation": "bg-amber-100 text-amber-800 border-amber-200",
      Assigned: "bg-blue-100 text-blue-800 border-blue-200",
      "In Review": "bg-purple-100 text-purple-800 border-purple-200",
      Approved: "bg-green-100 text-green-800 border-green-200",
      "Pending Approval": "bg-amber-100 text-amber-800 border-amber-200",
    };

    return statusMap[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getTitle = () => {
    switch (userRole) {
      case UserRole.CITIZEN:
        return "Your Recent Applications";
      case UserRole.FRONT_DESK:
        return "Applications Pending Review";
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
        return "Cases Assigned to You";
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return "System Overview";
      default:
        return "Recent Applications";
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm h-full">
      <CardHeader className="pb-0 border-b ">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <CardTitle className="text-lg font-semibold text-gray-800">
              {getTitle()}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {getApplications().map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 p-2 rounded-full hidden sm:block">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {app.rrNumber ? (
                      <Link
                        href={`/applications/${app.id}`}
                        className="hover:text-blue-600 hover:underline flex items-center"
                      >
                        {app.rrNumber}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Draft</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {app.service}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge
                  className={`${getStatusColor(
                    app.status
                  )} py-1 px-2 text-xs font-medium`}
                >
                  {app.status}
                </Badge>
                <div className="text-xs text-gray-500 hidden md:block">
                  {app.updatedAt}
                </div>
                <Link
                  href={`/applications/${app.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">View</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center border-t py-4 bg-gray-50">
        <Button
          variant="outline"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Link href="/applications" className="flex items-center">
            View All Applications
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
