"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Clock,
  User,
  Building2,
  Inbox,
  UserPlus,
  Eye,
  FileText,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface QueuedTicket {
  id: string; // Changed from ticketId to match API response
  referenceId: string;
  queryType: "FEEDBACK" | "GRIEVANCE";
  status: string;
  subject: string | null;
  description: string;
  visitedDC: boolean;
  visitDate: string | null;
  citizenName: string | null;
  citizenEmail: string | null;
  citizenPhone: string | null;
  isAnonymousToOfficer: boolean;
  createdAt: string;
  queuedAt: string | null;
  section: {
    id: string; // Changed from sectionId to match API response
    name: string;
  };
  hasAttachments?: boolean;
}

interface Officer {
  odId: string;
  fullName: string;
  email: string;
  role: string;
  section: {
    sectionId: string;
    name: string;
  } | null;
}

interface Section {
  id: string;
  name: string;
}

const QUEUE_MANAGER_ROLES = [
  "DC",
  "ADC",
  "ADC_GTK",
  "ADC_HQ",
  "US_ADM",
  "ADMIN",
  "SUPER_ADMIN",
];

export default function SamadhanQueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<QueuedTicket[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [filteredOfficers, setFilteredOfficers] = useState<Officer[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterType, setFilterType] = useState("");

  // Assignment dialog
  const [selectedTicket, setSelectedTicket] = useState<QueuedTicket | null>(
    null,
  );
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // View ticket dialog
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewTicket, setViewTicket] = useState<QueuedTicket | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    grievances: 0,
    feedback: 0,
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    // Check role permission
    const userRole = (session.user as { role?: string })?.role;
    if (!userRole || !QUEUE_MANAGER_ROLES.includes(userRole)) {
      toast.error("You don't have permission to access this page");
      router.push("/dashboard");
      return;
    }

    fetchQueuedTickets();
    fetchSections();
    fetchOfficers();
  }, [session, status, router]);

  useEffect(() => {
    if (selectedTicket && officers.length > 0) {
      // Filter officers by the ticket's section
      const sectionOfficers = officers.filter(
        (o) => o.section?.sectionId === selectedTicket.section.id,
      );
      setFilteredOfficers(sectionOfficers);
    }
  }, [selectedTicket, officers]);

  const fetchQueuedTickets = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterSection) params.append("sectionId", filterSection);
      if (filterType) params.append("queryType", filterType);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/samadhan/queue?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTickets(data.data.tickets);

        // Calculate stats
        const ticketList = data.data.tickets;
        setStats({
          total: ticketList.length,
          grievances: ticketList.filter(
            (t: QueuedTicket) => t.queryType === "GRIEVANCE",
          ).length,
          feedback: ticketList.filter(
            (t: QueuedTicket) => t.queryType === "FEEDBACK",
          ).length,
        });
      } else {
        toast.error(data.message || "Failed to fetch queue");
      }
    } catch (error) {
      console.error("Failed to fetch queued tickets:", error);
      toast.error("Failed to load queue");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/samadhan/sections");
      const data = await response.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  };

  const fetchOfficers = async () => {
    try {
      const response = await fetch("/api/samadhan/officers");
      const data = await response.json();
      if (data.success) {
        setOfficers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch officers:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQueuedTickets();
    setIsRefreshing(false);
    toast.success("Queue refreshed");
  };

  const handleAssign = async () => {
    if (!selectedTicket || !selectedOfficer) {
      toast.error("Please select an officer");
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch("/api/samadhan/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          assignToOfficerId: selectedOfficer,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Ticket assigned successfully!");
        setShowAssignDialog(false);
        setSelectedTicket(null);
        setSelectedOfficer("");
        fetchQueuedTickets();
      } else {
        toast.error(data.message || "Failed to assign ticket");
      }
    } catch (error) {
      console.error("Failed to assign ticket:", error);
      toast.error("Failed to assign ticket");
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignDialog = (ticket: QueuedTicket) => {
    setSelectedTicket(ticket);
    setSelectedOfficer("");
    setShowAssignDialog(true);
  };

  const openViewDialog = (ticket: QueuedTicket) => {
    setViewTicket(ticket);
    setShowViewDialog(true);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "GRIEVANCE":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Grievance
          </Badge>
        );
      case "FEEDBACK":
        return (
          <Badge className="bg-green-500 gap-1">
            <MessageSquare className="h-3 w-3" /> Feedback
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-blue-600" />
            SAMADHAN Queue
          </h1>
          <p className="text-gray-500">
            Review and assign queued tickets to section officers
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total in Queue</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Inbox className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Grievances</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.grievances}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <Label className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by reference ID, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger>
                <SelectValue placeholder="All Sections" />
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="GRIEVANCE">Grievance</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={fetchQueuedTickets}
              className="lg:hidden"
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Queued Tickets</CardTitle>
          <CardDescription>
            Tickets waiting to be assigned to section officers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Queue is empty!</h3>
              <p className="text-gray-500 mt-1">
                All tickets have been assigned to officers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Subject
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Section
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Submitted
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {ticket.referenceId}
                        </code>
                      </TableCell>
                      <TableCell>{getTypeBadge(ticket.queryType)}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {ticket.subject || ticket.description.slice(0, 50)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {ticket.section.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(ticket.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(ticket)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Only show Assign button for GRIEVANCE, not for FEEDBACK */}
                          {ticket.queryType === "GRIEVANCE" && (
                            <Button
                              size="sm"
                              onClick={() => openAssignDialog(ticket)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Ticket</DialogTitle>
            <DialogDescription>
              Assign this ticket to a section officer for handling.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference</span>
                  <code className="font-mono">
                    {selectedTicket.referenceId}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  {getTypeBadge(selectedTicket.queryType)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Section</span>
                  <span>{selectedTicket.section.name}</span>
                </div>
              </div>

              <div>
                <Label>Select Officer</Label>
                <Select
                  value={selectedOfficer}
                  onValueChange={setSelectedOfficer}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose an officer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredOfficers.length > 0 ? (
                      filteredOfficers.map((officer) => (
                        <SelectItem key={officer.odId} value={officer.odId}>
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{officer.fullName}</span>
                            <Badge variant="outline" className="ml-2">
                              {officer.role}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem key="none" value="none" disabled>
                        No officers in this section
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {filteredOfficers.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    ⚠️ No officers found in {selectedTicket.section.name}{" "}
                    section
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedOfficer || isAssigning}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Officer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Ticket Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              Review ticket information before assignment
            </DialogDescription>
          </DialogHeader>

          {viewTicket && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <code className="font-mono text-lg">
                  {viewTicket.referenceId}
                </code>
                <div className="flex gap-2">
                  {getTypeBadge(viewTicket.queryType)}
                </div>
              </div>

              {/* Feedback notice */}
              {viewTicket.queryType === "FEEDBACK" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Feedback (View Only):</strong> Feedback submissions
                    are for review only and cannot be assigned to officers. Only
                    higher authorities (DC, Admin) can view feedback.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Section</p>
                  <p className="font-medium">{viewTicket.section.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Submitted</p>
                  <p className="font-medium">
                    {format(new Date(viewTicket.createdAt), "PPp")}
                  </p>
                </div>
                {viewTicket.visitedDC && (
                  <>
                    <div>
                      <p className="text-gray-500">Visited DC</p>
                      <p className="font-medium">Yes</p>
                    </div>
                    {viewTicket.visitDate && (
                      <div>
                        <p className="text-gray-500">Visit Date</p>
                        <p className="font-medium">
                          {format(new Date(viewTicket.visitDate), "PPP")}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {viewTicket.subject && (
                <div>
                  <p className="text-gray-500 text-sm">Subject</p>
                  <p className="font-medium">{viewTicket.subject}</p>
                </div>
              )}

              <div>
                <p className="text-gray-500 text-sm">Description</p>
                <p className="text-sm bg-gray-50 p-3 rounded-lg mt-1">
                  {viewTicket.description}
                </p>
              </div>

              {!viewTicket.isAnonymousToOfficer && (
                <div className="border-t pt-4">
                  <p className="text-gray-500 text-sm mb-2">
                    Contact Information
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {viewTicket.citizenName && (
                      <div>
                        <p className="text-gray-500">Name</p>
                        <p>{viewTicket.citizenName}</p>
                      </div>
                    )}
                    {viewTicket.citizenEmail && (
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p>{viewTicket.citizenEmail}</p>
                      </div>
                    )}
                    {viewTicket.citizenPhone && (
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p>
                          {viewTicket.citizenPhone.length > 4
                            ? `${viewTicket.citizenPhone.slice(0, 2)}${"*".repeat(viewTicket.citizenPhone.length - 4)}${viewTicket.citizenPhone.slice(-2)}`
                            : viewTicket.citizenPhone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewTicket.isAnonymousToOfficer && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Citizen opted for anonymous submission
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {viewTicket?.queryType === "GRIEVANCE" && (
              <Button
                onClick={() => {
                  setShowViewDialog(false);
                  if (viewTicket) openAssignDialog(viewTicket);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
