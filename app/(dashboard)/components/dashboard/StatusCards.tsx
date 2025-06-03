import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/app/generated/prisma";
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
  const getCards = (): StatusCard[] => {
    switch (userRole) {
      case UserRole.CITIZEN:
        return [
          {
            title: "Draft Applications",
            value: 2,
            badge: "Draft",
            badgeColor: "bg-gray-100 text-gray-800 border-gray-200",
            icon: <ClipboardList className="h-8 w-8 text-gray-600" />,
            description: "Incomplete applications",
          },
          {
            title: "Pending Applications",
            value: 3,
            badge: "Pending",
            badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
            icon: <Clock className="h-8 w-8 text-amber-600" />,
            description: "Awaiting processing",
          },
          {
            title: "In Progress",
            value: 1,
            badge: "In Progress",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
            icon: <FileClock className="h-8 w-8 text-blue-600" />,
            description: "Under review",
          },
          {
            title: "Completed",
            value: 5,
            badge: "Completed",
            badgeColor: "bg-green-100 text-green-800 border-green-200",
            icon: <CheckCircle className="h-8 w-8 text-green-600" />,
            description: "Successfully processed",
          },
        ];
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
            title: "Rejected Today",
            value: 2,
            badge: "Rejected",
            badgeColor: "bg-red-100 text-red-800 border-red-200",
            icon: <FileX className="h-8 w-8 text-red-600" />,
            description: "Rejected today",
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
      case UserRole.DC:
      case UserRole.ADC:
      case UserRole.RO:
        return [
          {
            title: "Assigned Cases",
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
        return [];
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {getCards().map((card, index) => (
        <Card
          key={index}
          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gray-50 p-3 rounded-full">{card.icon}</div>
              <Badge
                className={`${card.badgeColor} py-1 px-3 text-xs font-medium rounded-md`}
              >
                {card.badge}
              </Badge>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <h3 className="text-sm font-medium text-gray-700 mt-1">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{card.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
