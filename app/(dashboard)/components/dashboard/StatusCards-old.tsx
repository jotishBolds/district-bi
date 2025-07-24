import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/app/generated/prisma";
import { isOfficerRole, isOfficerOrOfficial } from "@/lib/officer-roles";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  FileCheck,
  FileX,
  ShieldAlert,
  FileText,
  CheckSquare,
  XCircle,
  FileClock,
} from "lucide-react";

interface StatusCard {
  title: string;
  value: number;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  description: string;
}

interface StatusCardsProps {
  userRole?: UserRole;
}

export default function StatusCards({ userRole }: StatusCardsProps) {
  // Helper to get card bg/text classes based on badgeColor
  const getCardStyle = (badgeColor: string) => {
    if (badgeColor.includes("amber")) {
      return {
        bg: "bg-amber-50",
        text: "text-amber-900",
        badge: "ring-amber-300",
      };
    }
    if (badgeColor.includes("green")) {
      return {
        bg: "bg-green-50",
        text: "text-green-900",
        badge: "ring-green-300",
      };
    }
    if (badgeColor.includes("red")) {
      return {
        bg: "bg-red-50",
        text: "text-red-900",
        badge: "ring-red-300",
      };
    }
    if (badgeColor.includes("blue")) {
      return {
        bg: "bg-blue-50",
        text: "text-blue-900",
        badge: "ring-blue-300",
      };
    }
    if (badgeColor.includes("purple")) {
      return {
        bg: "bg-purple-50",
        text: "text-purple-900",
        badge: "ring-purple-300",
      };
    }
    if (badgeColor.includes("gray")) {
      return {
        bg: "bg-gray-50",
        text: "text-gray-900",
        badge: "ring-gray-300",
      };
    }
    return {
      bg: "bg-white",
      text: "text-gray-900",
      badge: "ring-gray-200",
    };
  };

  const getCards = (): StatusCard[] => {
    switch (userRole) {
      case UserRole.FRONT_DESK:
        return [
          {
            title: "Pending Validation",
            value: 12,
            badge: "Pending",
            badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
            icon: <Clock className="h-8 w-8 text-amber-600" />,
            description: "Require your review",
          },
          {
            title: "Validated Today",
            value: 8,
            badge: "Validated",
            badgeColor: "bg-green-100 text-green-800 border-green-200",
            icon: <FileCheck className="h-8 w-8 text-green-600" />,
            description: "Processed today",
          },
          {
            title: "Closed with Action Today",
            value: 2,
            badge: "Closed with Action",
            badgeColor: "bg-red-100 text-red-800 border-red-200",
            icon: <FileX className="h-8 w-8 text-red-600" />,
            description: "Closed with action today",
          },
          {
            title: "Total Processed",
            value: 45,
            badge: "Total",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
            icon: <CheckSquare className="h-8 w-8 text-blue-600" />,
            description: "Historical total",
          },
        ];
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return [
          {
            title: "Total Applications",
            value: 125,
            badge: "Total",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
            icon: <FileText className="h-8 w-8 text-blue-600" />,
            description: "All applications in system",
          },
          {
            title: "Active Users",
            value: 42,
            badge: "Active",
            badgeColor: "bg-green-100 text-green-800 border-green-200",
            icon: <Users className="h-8 w-8 text-green-600" />,
            description: "Users currently active",
          },
          {
            title: "Pending Approvals",
            value: 7,
            badge: "Pending",
            badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
            icon: <Clock className="h-8 w-8 text-amber-600" />,
            description: "Items requiring approval",
          },
          {
            title: "System Alerts",
            value: 2,
            badge: "Alerts",
            badgeColor: "bg-red-100 text-red-800 border-red-200",
            icon: <ShieldAlert className="h-8 w-8 text-red-600" />,
            description: "Issues requiring attention",
          },
        ];
      default:
        // Check if it's an officer or official role
        if (userRole && isOfficerOrOfficial(userRole)) {
          return [
            {
              title: "Assigned Applications",
              value: 8,
              badge: "Assigned",
              badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
              icon: <FileText className="h-8 w-8 text-blue-600" />,
              description: "Cases assigned to you",
            },
            {
              title: "Pending Review",
              value: 3,
              badge: "Pending",
              badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
              icon: <Clock className="h-8 w-8 text-amber-600" />,
              description: "Awaiting your review",
            },
            {
              title: "Completed Today",
              value: 2,
              badge: "Completed",
              badgeColor: "bg-green-100 text-green-800 border-green-200",
              icon: <CheckCircle className="h-8 w-8 text-green-600" />,
              description: "Processed today",
            },
            {
              title: "Overdue Cases",
              value: 1,
              badge: "Overdue",
              badgeColor: "bg-red-100 text-red-800 border-red-200",
              icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
              description: "Require immediate attention",
            },
          ];
        }
        return [];
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {getCards().map((card, index) => {
        const style = getCardStyle(card.badgeColor);
        return (
          <Card
            key={index}
            className={`${style.bg} border-0 shadow-md hover:shadow-lg transition-shadow duration-200`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/70 p-3 rounded-full shadow-sm">
                  {card.icon}
                </div>
                <Badge
                  className={`${card.badgeColor} py-1 px-3 text-xs font-medium rounded-md ring-2 ${style.badge} border-0`}
                >
                  {card.badge}
                </Badge>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <span
                    className={`inline-block px-4 py-1 rounded-full bg-white/80 shadow text-4xl font-extrabold tracking-tight ${style.text} border border-gray-100`}
                  >
                    {card.value}
                  </span>
                </div>
                <h3 className={`text-sm font-semibold ${style.text} mt-1`}>
                  {card.title}
                </h3>
                <p className="text-xs text-gray-600 mt-1">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
