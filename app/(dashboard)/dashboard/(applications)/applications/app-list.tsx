"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Filter } from "lucide-react";
import { format } from "date-fns";

// Mock data - In a real app, you'd fetch this from your API
const MOCK_APPLICATIONS = [
  {
    id: "APP-1234",
    title: "Passport Application",
    type: "PASSPORT",
    status: "PENDING",
    createdAt: new Date(2025, 4, 5),
    updatedAt: new Date(2025, 4, 5),
  },
  {
    id: "APP-2345",
    title: "Drivers License Renewal",
    type: "DRIVERS_LICENSE",
    status: "APPROVED",
    createdAt: new Date(2025, 4, 1),
    updatedAt: new Date(2025, 4, 3),
  },
  {
    id: "APP-3456",
    title: "Business Registration",
    type: "BUSINESS",
    status: "PROCESSING",
    createdAt: new Date(2025, 3, 25),
    updatedAt: new Date(2025, 4, 2),
  },
  {
    id: "APP-4567",
    title: "Tax Registration",
    type: "TAX",
    status: "REJECTED",
    createdAt: new Date(2025, 3, 20),
    updatedAt: new Date(2025, 4, 1),
  },
];

export default function ApplicationsList() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApplications = MOCK_APPLICATIONS.filter(
    (app) =>
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Processing
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>All Applications</CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search applications..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.length > 0 ? (
                filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.id}
                    </TableCell>
                    <TableCell>{application.title}</TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell>
                      {format(application.createdAt, "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(application.updatedAt, "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/applications/${application.id}`}>
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-6 text-gray-500"
                  >
                    No applications found that match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
