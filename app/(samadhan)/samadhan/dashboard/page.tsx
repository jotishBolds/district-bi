"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Loader2,
  User,
  LogOut,
  FileText,
  TrendingUp,
  Bell,
  Calendar,
  ChevronRight,
  Eye,
  RefreshCw,
  XCircle,
  AlertTriangle,
  LayoutDashboard,
  Home,
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";

interface Ticket {
  referenceId: string;
  queryType: "FEEDBACK" | "GRIEVANCE";
  status: string;
  section: { id: string; name: string };
  description: string;
  createdAt: string;
  slaDeadline: string | null;
  hasAttachments: boolean;
  hasPendingInfoRequest?: boolean;
  isDraft?: boolean;
  subject?: string;
}

interface SamadhanUser {
  userId: string;
  phone: string;
  name: string;
  pseudonym: string;
}

const statusConfig: Record<
  string,
  { color: string; bgColor: string; label: string; icon: React.ElementType }
> = {
  DRAFT: {
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Draft",
    icon: FileText,
  },
  QUEUED: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Queued",
    icon: Clock,
  },
  UNSEEN: {
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    label: "Pending Review",
    icon: Clock,
  },
  SEEN: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Under Review",
    icon: Eye,
  },
  ACKNOWLEDGED: {
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    label: "Acknowledged",
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    label: "In Progress",
    icon: RefreshCw,
  },
  PENDING_INFORMATION: {
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Info Requested",
    icon: AlertTriangle,
  },
  RESOLVED: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    label: "Resolved",
    icon: CheckCircle,
  },
  CLOSED: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Closed",
    icon: CheckCircle,
  },
  ESCALATED: {
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Escalated",
    icon: TrendingUp,
  },
};

const queryTypeConfig = {
  FEEDBACK: {
    icon: MessageSquare,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    label: "Feedback",
  },
  GRIEVANCE: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Grievance",
  },
};

export default function CitizenDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SamadhanUser | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Check SAMADHAN session (separate from NextAuth)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/samadhan/auth?action=session");
        const data = await response.json();

        if (data.authenticated) {
          setUser(data.session);
          fetchTickets();
        } else {
          router.push("/samadhan/login");
        }
      } catch (error) {
        console.error("Session check error:", error);
        router.push("/samadhan/login");
      }
    };

    checkSession();
  }, [router]);

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/samadhan/tickets");
      const data = await response.json();

      if (data.success) {
        setTickets(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTickets();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/samadhan/auth?action=logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  // Filter tickets by tab
  const getTabFilteredTickets = () => {
    switch (activeTab) {
      case "drafts":
        return tickets.filter((t) => t.status === "DRAFT");
      case "active":
        return tickets.filter(
          (t) =>
            t.queryType !== "FEEDBACK" &&
            [
              "QUEUED",
              "UNSEEN",
              "SEEN",
              "ACKNOWLEDGED",
              "IN_PROGRESS",
              "PENDING_INFORMATION",
            ].includes(t.status),
        );
      case "action":
        return tickets.filter(
          (t) => t.hasPendingInfoRequest && t.status === "PENDING_INFORMATION",
        );
      case "resolved":
        return tickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status));
      default:
        return tickets.filter((t) => t.status !== "DRAFT"); // Don't show drafts in "all" tab
    }
  };

  const filteredTickets = getTabFilteredTickets().filter((ticket) => {
    const matchesSearch =
      ticket.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.section.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || ticket.queryType === filterType;
    const matchesStatus =
      filterStatus === "all" || ticket.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = filteredTickets.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus, activeTab]);

  // Stats calculations
  const stats = {
    total: tickets.filter((t) => t.status !== "DRAFT").length,
    drafts: tickets.filter((t) => t.status === "DRAFT").length,
    active: tickets.filter(
      (t) =>
        t.queryType !== "FEEDBACK" &&
        ["QUEUED", "UNSEEN", "SEEN", "ACKNOWLEDGED", "IN_PROGRESS"].includes(
          t.status,
        ),
    ).length,
    actionRequired: tickets.filter(
      (t) => t.hasPendingInfoRequest && t.status === "PENDING_INFORMATION",
    ).length,
    resolved: tickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status))
      .length,
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Navigation is provided by the layout - removed duplicate navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back, {user.name?.split(" ")[0] || "Citizen"}!
              </h1>
              <p className="text-gray-500 mt-1">
                Track and manage your queries from this dashboard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Link href="/samadhan/submit">
                <Button className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <Plus className="h-4 w-4" />
                  New Query
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8"
        >
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Queries
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
                    {stats.active}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-white border-0 shadow-sm hover:shadow-md transition-shadow ${
              stats.actionRequired > 0 ? "ring-2 ring-orange-300" : ""
            }`}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Action Required
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                    {stats.actionRequired}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Resolved</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                    {stats.resolved}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Required Alert */}
        <AnimatePresence>
          {stats.actionRequired > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5 text-orange-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">
                    Action Required
                  </h3>
                  <p className="text-sm text-orange-700">
                    {stats.actionRequired}{" "}
                    {stats.actionRequired === 1
                      ? "query requires"
                      : "queries require"}{" "}
                    your response. Please provide the requested information.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => setActiveTab("action")}
                >
                  View Now
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full lg:w-auto"
                >
                  <TabsList className="bg-gray-100 p-1 h-auto flex-wrap">
                    <TabsTrigger
                      value="all"
                      className="data-[state=active]:bg-white px-4 py-2"
                    >
                      All ({stats.total})
                    </TabsTrigger>
                    <TabsTrigger
                      value="drafts"
                      className="data-[state=active]:bg-white px-4 py-2 text-gray-600"
                    >
                      Drafts ({stats.drafts})
                    </TabsTrigger>
                    <TabsTrigger
                      value="active"
                      className="data-[state=active]:bg-white px-4 py-2"
                    >
                      Active ({stats.active})
                    </TabsTrigger>
                    <TabsTrigger
                      value="action"
                      className={`data-[state=active]:bg-white px-4 py-2 ${
                        stats.actionRequired > 0 ? "text-orange-600" : ""
                      }`}
                    >
                      Action ({stats.actionRequired})
                    </TabsTrigger>
                    <TabsTrigger
                      value="resolved"
                      className="data-[state=active]:bg-white px-4 py-2"
                    >
                      Resolved ({stats.resolved})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search queries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[130px] bg-gray-50 border-gray-200">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="FEEDBACK">Feedback</SelectItem>
                        <SelectItem value="GRIEVANCE">Grievance</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-[130px] bg-gray-50 border-gray-200">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="UNSEEN">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="PENDING_INFORMATION">
                          Info Requested
                        </SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Tickets List */}
              {filteredTickets.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No queries found
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    {tickets.length === 0
                      ? "You haven't submitted any queries yet. Get started by submitting your first query."
                      : "No queries match your current filters. Try adjusting your search or filters."}
                  </p>
                  <Link href="/samadhan/submit">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Submit New Query
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentTickets.map((ticket, index) => {
                    const queryConfig =
                      queryTypeConfig[ticket.queryType] ||
                      queryTypeConfig.FEEDBACK;
                    const isFeedback = ticket.queryType === "FEEDBACK";
                    // Feedback always shows "Submitted" status
                    const status = isFeedback
                      ? {
                          color: "text-emerald-600",
                          bgColor: "bg-emerald-100",
                          label: "Submitted",
                          icon: CheckCircle,
                        }
                      : statusConfig[ticket.status] || statusConfig.UNSEEN;
                    const QueryIcon = queryConfig.icon;
                    const StatusIcon = status.icon;
                    const needsResponse =
                      !isFeedback &&
                      ticket.hasPendingInfoRequest &&
                      ticket.status === "PENDING_INFORMATION";
                    const isDraft = ticket.status === "DRAFT";

                    const ticketContent = (
                      <div
                        className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                          needsResponse
                            ? "bg-orange-50/50 hover:bg-orange-50"
                            : isDraft
                              ? "bg-gray-50/50 hover:bg-gray-100"
                              : ""
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 ${queryConfig.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}
                          >
                            <QueryIcon
                              className={`h-5 w-5 sm:h-6 sm:w-6 ${queryConfig.color}`}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-semibold text-gray-900">
                                  {isDraft ? "Draft" : ticket.referenceId}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`${queryConfig.bgColor} ${queryConfig.color} border-0 text-xs`}
                                >
                                  {queryConfig.label}
                                </Badge>
                                {needsResponse && (
                                  <Badge className="bg-orange-500 text-white text-xs animate-pulse">
                                    Action Required
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <StatusIcon
                                  className={`h-4 w-4 ${status.color}`}
                                />
                                <span
                                  className={`text-sm font-medium ${status.color}`}
                                >
                                  {status.label}
                                </span>
                              </div>
                            </div>

                            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                              {ticket.subject || ticket.description}
                            </p>

                            <div className="flex items-center justify-between gap-4 text-xs text-gray-500 flex-wrap">
                              <div className="flex items-center gap-4 flex-wrap">
                                {/* Hide section for feedback */}
                                {!isFeedback && (
                                  <span className="flex items-center gap-1">
                                    <LayoutDashboard className="h-3.5 w-3.5" />
                                    {ticket.section.name}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(
                                    new Date(ticket.createdAt),
                                    "MMM d, yyyy",
                                  )}
                                </span>
                                <span className="text-gray-400">
                                  {formatDistanceToNow(
                                    new Date(ticket.createdAt),
                                    { addSuffix: true },
                                  )}
                                </span>
                                {needsResponse && (
                                  <span className="text-orange-600 font-medium">
                                    Officer requested additional information
                                  </span>
                                )}
                              </div>
                              {isDraft && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                >
                                  Continue Draft
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Arrow - hide for drafts and feedback */}
                          {!isDraft && !isFeedback && (
                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 hidden sm:block" />
                          )}
                        </div>
                      </div>
                    );

                    return (
                      <motion.div
                        key={ticket.referenceId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {isDraft ? (
                          <Link
                            href={`/samadhan/submit?draft=${ticket.referenceId}`}
                          >
                            {ticketContent}
                          </Link>
                        ) : isFeedback ? (
                          <div className="cursor-default">{ticketContent}</div>
                        ) : (
                          <Link href={`/samadhan/track/${ticket.referenceId}`}>
                            {ticketContent}
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-100 p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, filteredTickets.length)} of{" "}
                      {filteredTickets.length} queries
                    </p>
                    <Pagination>
                      <PaginationContent className="gap-1">
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            className={`cursor-pointer ${
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "hover:bg-gray-100"
                            }`}
                          />
                        </PaginationItem>

                        {/* First page */}
                        {totalPages > 0 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(1)}
                              isActive={currentPage === 1}
                              className="cursor-pointer"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {currentPage > 3 && totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            if (totalPages <= 5)
                              return page > 1 && page < totalPages;
                            return (
                              page > 1 &&
                              page < totalPages &&
                              Math.abs(page - currentPage) <= 1
                            );
                          })
                          .map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}

                        {currentPage < totalPages - 2 && totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {totalPages > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(totalPages)}
                              isActive={currentPage === totalPages}
                              className="cursor-pointer"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, currentPage + 1),
                              )
                            }
                            className={`cursor-pointer ${
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "hover:bg-gray-100"
                            }`}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Link href="/samadhan/submit?type=FEEDBACK">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Submit Feedback
                  </h3>
                  <p className="text-sm text-gray-500">Share your experience</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/samadhan/submit?type=GRIEVANCE">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    File Grievance
                  </h3>
                  <p className="text-sm text-gray-500">Report an issue</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
