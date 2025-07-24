"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/app/generated/prisma";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  FileCheck,
  FileText,
  Loader2,
} from "lucide-react";

interface StatusCard {
  title: string;
  value: number | string;
  badge: string;
  description: string;
}

interface StatusCardsProps {
  userRole?: UserRole;
}

export default function StatusCards({ userRole }: StatusCardsProps) {
  const [cards, setCards] = useState<StatusCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }
        const data = await response.json();
        setCards(data.cards || []);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError("Failed to load dashboard statistics");
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userRole]);

  const getIcon = (title: string): React.ReactNode => {
    const iconClass = "h-6 w-6";

    if (title.includes("Pending") || title.includes("Queue")) {
      return <Clock className={`${iconClass} text-amber-600`} />;
    }
    if (
      title.includes("Validated") ||
      title.includes("Resolved") ||
      title.includes("Completed")
    ) {
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    }
    if (title.includes("Progress") || title.includes("Assigned")) {
      return <FileText className={`${iconClass} text-blue-600`} />;
    }
    if (title.includes("Overdue") || title.includes("Issues")) {
      return <AlertTriangle className={`${iconClass} text-red-600`} />;
    }
    if (title.includes("Users") || title.includes("Active")) {
      return <Users className={`${iconClass} text-purple-600`} />;
    }
    if (title.includes("Total") || title.includes("System")) {
      return <ClipboardList className={`${iconClass} text-gray-600`} />;
    }

    return <FileCheck className={`${iconClass} text-blue-600`} />;
  };

  const getBadgeColor = (badge: string): string => {
    switch (badge.toLowerCase()) {
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "validated":
      case "resolved":
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200";
      case "processing":
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
      case "issues":
        return "bg-red-100 text-red-800 border-red-200";
      case "queue":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "total":
      case "active":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="border border-gray-200 shadow-sm animate-pulse"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-red-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-red-600">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-xs px-2 py-0.5 ${getBadgeColor(
                      card.badge
                    )}`}
                  >
                    {card.badge}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
              <div className="flex-shrink-0">{getIcon(card.title)}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
