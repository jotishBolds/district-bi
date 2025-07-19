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
    name: string;
    slaDays: number;
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
  role?: string;
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
  const [data, setData] = useState<FrontdeskData | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [forwardingApp, setForwardingApp] = useState<Application | null>(null);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch frontdesk applications
      const response = await fetch("/api/frontdesk/applications");
      if (!response.ok) throw new Error("Failed to fetch applications");
      const applicationData = await response.json();

      // Fetch available officers from the proper endpoint
      const officersResponse = await fetch("/api/officers/available");
      if (!officersResponse.ok) throw new Error("Failed to fetch officers");
      const officersData = await officersResponse.json();

      setData(applicationData);
      setAvailableOfficers(officersData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
              <div className="font-medium text-gray-700">
                {application.serviceCategory?.name}
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
              <span className="font-medium">
                {application.serviceCategory?.slaDays || 0} days SLA
              </span>
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
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Frontdesk Dashboard
        </h1>
        <p className="text-gray-600 text-lg">
          Manage applications for your assigned officers
        </p>
      </div>

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
                {data.activeApplications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    showForwardButton={true}
                  />
                ))}
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
                {data.forwardedOutByMe.map((app: Application) => (
                  <ForwardedHistoryCard
                    key={app.id}
                    application={app}
                    type="outgoing"
                  />
                ))}
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
                {data.receivedByMe.map((app: Application) => (
                  <ForwardedHistoryCard
                    key={app.id}
                    application={app}
                    type="incoming"
                  />
                ))}
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
                {data?.completedApplications?.map((app: Application) => (
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
              <Select
                onValueChange={setSelectedOfficer}
                value={selectedOfficer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an officer" />
                </SelectTrigger>
                <SelectContent>
                  {availableOfficers
                    ?.filter(
                      (officer) =>
                        officer.id !== forwardingApp?.currentHolder?.id
                    )
                    .map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            {officer.fullName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {officer.designation} - {officer.department}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
              disabled={!selectedOfficer || !instructions.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Forward Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
