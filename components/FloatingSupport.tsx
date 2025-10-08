"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, X, MessageCircle, Phone, Mail } from "lucide-react";

const FloatingSupport = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  // Hide floating support on home page and support page
  if (pathname === "/" || pathname === "/support") {
    return null;
  }

  const quickActions = [
    {
      title: "Browse Support",
      description: "View all help topics and guides",
      icon: HelpCircle,
      href: "/support",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Contact Support",
      description: "Get in touch with our team",
      icon: MessageCircle,
      href: "/support#contact",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Emergency Contact",
      description: "For urgent matters",
      icon: Phone,
      href: "tel:100",
      color: "bg-red-500 hover:bg-red-600",
    },
  ];

  return (
    <>
      {/* Floating Support Button */}
      <div className="fixed bottom-6 left-6 z-50">
        {/* Expanded Menu */}
        {isExpanded && (
          <Card className="mb-4 w-72 shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Need Help?
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      asChild
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => setIsExpanded(false)}
                    >
                      <Link href={action.href}>
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-lg ${action.color} transition-colors`}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                              {action.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </Button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Available 24/7 for assistance
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Button */}
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            w-14 h-14 rounded-full shadow-2xl transition-all duration-300 border-0
            ${
              isExpanded
                ? "bg-slate-600 hover:bg-slate-700 dark:bg-slate-400 dark:hover:bg-slate-300"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-110"
            }
            hover:shadow-xl active:scale-95
          `}
        >
          {isExpanded ? (
            <X className="h-6 w-6 text-white dark:text-slate-900" />
          ) : (
            <HelpCircle className="h-6 w-6 text-white animate-pulse" />
          )}
        </Button>
      </div>

      {/* Backdrop for mobile */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
};

export default FloatingSupport;
