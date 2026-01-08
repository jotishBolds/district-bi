"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Loader2,
  Eye,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

interface Ticket {
  id: string;
  referenceId: string;
  queryType: "FEEDBACK" | "GRIEVANCE" | "SUGGESTION";
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: string;
  section: { id: string; name: string };
  citizenName: string;
  description: string;
  assignedOfficer: {
    id: string;
    name: string;
    designation?: string;
    role: string;
  } | null;
  escalatedTo: {
    id: string;
    name: string;
    designation?: string;
    role: string;
  } | null;
  slaStatus: "GREEN" | "YELLOW" | "RED" | "N/A";
  slaDeadline: string | null;
  slaBreachedAt: string | null;
  createdAt: string;
  hasAttachments: boolean;
  pendingInfoRequests: number;
  isOverdue: boolean;
  isSlaBreached: boolean;
}

interface Statistics {
  total: number;
  unseen: number;
  inProgress: number;
  resolved: number;
  overdue: number;
}

interface AdditionalStats {
  slaBreachedCount: number;
  awaitingEscalationCount: number;
  overdueCount: number;
  escalatedCount: number;
  appealedCount: number;
}

interface Section {
  id: string;
  name: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  UNSEEN: { color: "gray", label: "Unseen" },
  SEEN: { color: "blue", label: "Seen" },
  ACKNOWLEDGED: { color: "blue", label: "Acknowledged" },
  IN_PROGRESS: { color: "yellow", label: "In Progress" },
  PENDING_INFORMATION: { color: "orange", label: "Pending Info" },
  ESCALATED: { color: "purple", label: "Escalated" },
  AWAITING_ESCALATION: { color: "orange", label: "Awaiting Escalation" },
  RESOLVED: { color: "green", label: "Resolved" },
  CLOSED: { color: "green", label: "Closed" },
  CLOSED_NO_RESPONSE: { color: "red", label: "Closed - No Response" },
  APPEALED: { color: "purple", label: "Appealed" },
  APPEAL_FILED: { color: "purple", label: "Appeal Filed" },
  OVERDUE: { color: "red", label: "Overdue" },
};

const queryTypeConfig = {
  FEEDBACK: { icon: MessageSquare, color: "green", label: "Feedback" },
  GRIEVANCE: { icon: AlertCircle, color: "red", label: "Grievance" },
  SUGGESTION: { icon: Lightbulb, color: "amber", label: "Suggestion" },
};

const priorityConfig = {
  LOW: { color: "gray", label: "Low" },
  MEDIUM: { color: "yellow", label: "Medium" },
  HIGH: { color: "red", label: "High" },
};

export default function OfficerSamadhanDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [additionalStats, setAdditionalStats] =
    useState<AdditionalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<
    | "my"
    | "section"
    | "all"
    | "escalated"
    | "overdue"
    | "sla-breached"
    | "awaiting-escalation"
    | "appealed"
  >("my");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDCOrAdmin, setIsDCOrAdmin] = useState(false);
  const [isHigherAuthority, setIsHigherAuthority] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    fetchTickets();
  }, [
    currentView,
    filterStatus,
    filterType,
    filterPriority,
    filterSection,
    page,
  ]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        view: currentView,
        page: page.toString(),
        limit: "20",
      });

      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterType !== "all") params.append("queryType", filterType);
      if (filterPriority !== "all") params.append("priority", filterPriority);
      if (filterSection !== "all") params.append("sectionId", filterSection);

      const response = await fetch(`/api/samadhan/officer?${params}`);
      const data = await response.json();

      if (data.success) {
        setTickets(data.data.tickets);
        setStatistics(data.data.statistics);
        setAdditionalStats(data.data.additionalStats);
        setTotalPages(data.data.pagination.totalPages);
        setIsDCOrAdmin(data.data.isDCOrAdmin);
        setIsHigherAuthority(data.data.isHigherAuthority);
        if (data.data.sections) {
          setSections(data.data.sections);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to fetch tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "DC";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            SAMADHAN Dashboard
          </h1>
          <p className="text-gray-600">
            {isDCOrAdmin
              ? "Overview of all citizen queries across sections"
              : "Manage citizen feedback, grievances, and suggestions"}
          </p>
        </div>
        <Button onClick={fetchTickets} variant="outline" size="sm">
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">New</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {statistics.unseen}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {statistics.inProgress}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statistics.resolved}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>
          <Card
            className={statistics.overdue > 0 ? "bg-red-50 border-red-200" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p
                    className={`text-2xl font-bold ${
                      statistics.overdue > 0 ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {statistics.overdue}
                  </p>
                </div>
                <AlertTriangle
                  className={`h-8 w-8 ${
                    statistics.overdue > 0 ? "text-red-400" : "text-gray-300"
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Higher Authority Dashboard Panel */}
      {isHigherAuthority && additionalStats && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
              Higher Authority Dashboard
            </CardTitle>
            <CardDescription>
              {isDCOrAdmin
                ? "District-wide oversight"
                : "Monitor SLA compliance and escalations across your jurisdiction"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="p-4 bg-red-100 rounded-lg cursor-pointer hover:bg-red-200 transition-colors"
                onClick={() => setCurrentView("sla-breached")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    SLA Breached
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {additionalStats.slaBreachedCount}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Tickets requiring immediate attention
                </p>
              </div>
              <div
                className="p-4 bg-orange-100 rounded-lg cursor-pointer hover:bg-orange-200 transition-colors"
                onClick={() => setCurrentView("awaiting-escalation")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">
                    At Risk (24h)
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {additionalStats.awaitingEscalationCount}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Will breach SLA within 24 hours
                </p>
              </div>
              <div
                className="p-4 bg-purple-100 rounded-lg cursor-pointer hover:bg-purple-200 transition-colors"
                onClick={() => setCurrentView("escalated")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">
                    Escalated
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {additionalStats.escalatedCount}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Active escalations pending resolution
                </p>
              </div>
              <div
                className="p-4 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => setCurrentView("overdue")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Total Overdue
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-600">
                  {additionalStats.overdueCount}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  All overdue tickets in system
                </p>
              </div>
              <div
                className="p-4 bg-amber-100 rounded-lg cursor-pointer hover:bg-amber-200 transition-colors"
                onClick={() => setCurrentView("appealed")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    Appealed
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {additionalStats.appealedCount}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Tickets appealed by citizens
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>Note:</strong> As a higher authority (
                {session?.user?.role}), you can view and resolve SLA breached,
                overdue, appealed, and escalated tickets even if they are
                assigned to other officers. Use this to intervene when
                necessary.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <Tabs
        value={currentView}
        onValueChange={(v) =>
          setCurrentView(
            v as
              | "my"
              | "section"
              | "all"
              | "escalated"
              | "overdue"
              | "sla-breached"
              | "awaiting-escalation"
              | "appealed"
          )
        }
      >
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="my">My Tickets</TabsTrigger>
          <TabsTrigger value="section">Section Tickets</TabsTrigger>
          {isDCOrAdmin && <TabsTrigger value="all">All Tickets</TabsTrigger>}
          {isHigherAuthority && (
            <TabsTrigger value="escalated" className="text-purple-600">
              Escalated{" "}
              {additionalStats?.escalatedCount
                ? `(${additionalStats.escalatedCount})`
                : ""}
            </TabsTrigger>
          )}
          {isHigherAuthority && (
            <TabsTrigger value="sla-breached" className="text-red-600">
              SLA Breached{" "}
              {additionalStats?.slaBreachedCount
                ? `(${additionalStats.slaBreachedCount})`
                : ""}
            </TabsTrigger>
          )}
          {isHigherAuthority && (
            <TabsTrigger
              value="awaiting-escalation"
              className="text-orange-600"
            >
              At Risk{" "}
              {additionalStats?.awaitingEscalationCount
                ? `(${additionalStats.awaitingEscalationCount})`
                : ""}
            </TabsTrigger>
          )}
          {isHigherAuthority && (
            <TabsTrigger value="overdue" className="text-red-600">
              Overdue{" "}
              {additionalStats?.overdueCount
                ? `(${additionalStats.overdueCount})`
                : ""}
            </TabsTrigger>
          )}
          {isHigherAuthority && (
            <TabsTrigger value="appealed" className="text-amber-600">
              Appealed{" "}
              {additionalStats?.appealedCount
                ? `(${additionalStats.appealedCount})`
                : ""}
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by reference, name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {isHigherAuthority && sections.length > 0 && (
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="UNSEEN">Unseen</SelectItem>
                <SelectItem value="SEEN">Seen</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="PENDING_INFORMATION">
                  Pending Info
                </SelectItem>
                <SelectItem value="ESCALATED">Escalated</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FEEDBACK">Feedback</SelectItem>
                <SelectItem value="GRIEVANCE">Grievance</SelectItem>
                <SelectItem value="SUGGESTION">Suggestion</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tickets found
                </h3>
                <p className="text-gray-500">
                  {tickets.length === 0
                    ? "You don't have any assigned tickets."
                    : "No tickets match your search criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const queryConfig = queryTypeConfig[ticket.queryType];
                const status =
                  statusConfig[ticket.status] || statusConfig.UNSEEN;
                const priority = priorityConfig[ticket.priority];
                const QueryIcon = queryConfig.icon;

                return (
                  <Card
                    key={ticket.id}
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      ticket.status === "UNSEEN"
                        ? "border-l-4 border-l-blue-500"
                        : ""
                    } ${
                      ticket.isOverdue
                        ? "border-l-4 border-l-red-500 bg-red-50"
                        : ""
                    }`}
                    onClick={() =>
                      router.push(`/dashboard/samadhan/${ticket.id}`)
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 bg-${queryConfig.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}
                          >
                            <QueryIcon
                              className={`h-5 w-5 text-${queryConfig.color}-600`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-mono text-sm font-medium">
                                {ticket.referenceId}
                              </p>
                              <Badge
                                variant="outline"
                                className={`text-${priority.color}-600 text-xs`}
                              >
                                {priority.label}
                              </Badge>
                              {ticket.isSlaBreached && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs animate-pulse"
                                >
                                  ⚠️ SLA BREACHED
                                </Badge>
                              )}
                              {ticket.isOverdue && !ticket.isSlaBreached && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Overdue
                                </Badge>
                              )}
                              {ticket.slaStatus === "YELLOW" &&
                                !ticket.isOverdue && (
                                  <Badge
                                    variant="outline"
                                    className="text-orange-600 border-orange-300 text-xs"
                                  >
                                    SLA Warning
                                  </Badge>
                                )}
                              {ticket.escalatedTo && (
                                <Badge
                                  variant="outline"
                                  className="text-purple-600 border-purple-300 text-xs"
                                >
                                  Escalated
                                </Badge>
                              )}
                              {ticket.pendingInfoRequests > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-blue-600 border-blue-300 text-xs"
                                >
                                  Info Requested
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {ticket.citizenName}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {ticket.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                              <span>{ticket.section.name}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(ticket.createdAt), "PP")}
                              </span>
                              {ticket.slaDeadline && (
                                <>
                                  <span>•</span>
                                  <span
                                    className={
                                      ticket.isOverdue
                                        ? "text-red-600 font-medium"
                                        : ""
                                    }
                                  >
                                    Due:{" "}
                                    {format(
                                      new Date(ticket.slaDeadline),
                                      "PP p"
                                    )}
                                  </span>
                                </>
                              )}
                              {isDCOrAdmin && ticket.assignedOfficer && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600">
                                    Assigned: {ticket.assignedOfficer.name}
                                  </span>
                                </>
                              )}
                              {isDCOrAdmin && ticket.escalatedTo && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-600">
                                    Escalated to: {ticket.escalatedTo.name}
                                  </span>
                                </>
                              )}
                              {isHigherAuthority && ticket.isSlaBreached && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-600 font-medium">
                                    🔴 Click to intervene
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-${status.color}-600 border-${status.color}-300`}
                          >
                            {status.label}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
