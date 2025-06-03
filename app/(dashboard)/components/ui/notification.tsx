"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "Your application has been received",
      description: "Application #APP-2025-0023",
      unread: true,
      time: "10 minutes ago",
    },
    {
      id: "2",
      title: "Document verification required",
      description: "Additional documents needed for processing",
      unread: true,
      time: "2 hours ago",
    },
    {
      id: "3",
      title: "Scheduled system maintenance",
      description: "System will be unavailable from 2AM-4AM tomorrow",
      unread: false,
      time: "Yesterday",
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="h-5 w-5 p-0 flex items-center justify-center absolute -top-1 -right-1 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount > 0 && (
            <Badge
              variant="outline"
              className="ml-2 bg-blue-50 text-blue-700 border-blue-200"
            >
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-3 cursor-pointer focus:bg-blue-50"
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start w-full">
                  {notification.unread && (
                    <div className="h-2 w-2 bg-blue-700 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                  )}
                  <div className={`flex-1 ${!notification.unread && "pl-4"}`}>
                    <p
                      className={`text-sm ${
                        notification.unread ? "font-medium" : ""
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {notification.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-2 cursor-pointer text-center text-blue-700 font-medium hover:text-blue-800 hover:bg-blue-50">
              View all notifications
            </DropdownMenuItem>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No new notifications
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
