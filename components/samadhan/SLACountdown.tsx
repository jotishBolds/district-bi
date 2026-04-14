"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Timer,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

interface SLACountdownProps {
  deadline: string | Date | null;
  status: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isOverdue: boolean;
}

function calculateTimeRemaining(deadline: Date): TimeRemaining {
  const now = new Date();
  const total = deadline.getTime() - now.getTime();
  const isOverdue = total < 0;
  const absDiff = Math.abs(total);

  const seconds = Math.floor((absDiff / 1000) % 60);
  const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
  const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total, isOverdue };
}

function getSLAStatus(
  timeRemaining: TimeRemaining,
  status: string,
): "GREEN" | "YELLOW" | "RED" | "COMPLETED" | "APPEALED" {
  const closedStatuses = ["CLOSED", "RESOLVED", "CLOSED_NO_RESPONSE"];

  if (closedStatuses.includes(status)) {
    return "COMPLETED";
  }

  // APPEALED status - SLA timer paused, under higher authority review
  if (status === "APPEALED") {
    return "APPEALED";
  }

  if (timeRemaining.isOverdue) {
    return "RED";
  }

  const hoursRemaining = timeRemaining.total / (1000 * 60 * 60);

  if (hoursRemaining < 24) {
    return "RED";
  } else if (hoursRemaining < 48) {
    return "YELLOW";
  }

  return "GREEN";
}

export function SLACountdown({
  deadline,
  status,
  size = "md",
  showLabel = true,
}: SLACountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
    null,
  );
  const [slaStatus, setSlaStatus] = useState<
    "GREEN" | "YELLOW" | "RED" | "COMPLETED" | "APPEALED"
  >("GREEN");
  const { t } = useSamadhanI18n();

  useEffect(() => {
    if (!deadline) return;

    const deadlineDate = new Date(deadline);

    const updateTime = () => {
      const remaining = calculateTimeRemaining(deadlineDate);
      setTimeRemaining(remaining);
      setSlaStatus(getSLAStatus(remaining, status));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [deadline, status]);

  if (!deadline) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Clock className="h-4 w-4" />
        <span>{t("sla.noSlaSet")}</span>
      </div>
    );
  }

  if (slaStatus === "COMPLETED") {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>{t("sla.completed")}</span>
      </div>
    );
  }

  // Show Appealed status - Under Higher Authority Review
  if (slaStatus === "APPEALED") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-orange-700">
            {t("sla.appealed")}
          </span>
          <span className="text-xs text-orange-600">
            {t("sla.underHigherReview")}
          </span>
        </div>
      </div>
    );
  }

  if (!timeRemaining) {
    return null;
  }

  const statusColors = {
    GREEN: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-400",
      icon: "text-green-500",
    },
    YELLOW: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: "text-yellow-500",
    },
    RED: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      icon: "text-red-500",
    },
    COMPLETED: {
      bg: "bg-gray-50 dark:bg-gray-800",
      border: "border-gray-200 dark:border-gray-700",
      text: "text-gray-600 dark:text-gray-400",
      icon: "text-gray-500",
    },
    APPEALED: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-400",
      icon: "text-orange-500",
    },
  };

  const colors = statusColors[slaStatus];

  const sizeStyles = {
    sm: {
      container: "px-2 py-1 text-xs",
      icon: "h-3 w-3",
      number: "text-xs font-semibold",
      label: "text-[10px]",
    },
    md: {
      container: "px-3 py-2 text-sm",
      icon: "h-4 w-4",
      number: "text-lg font-bold",
      label: "text-xs",
    },
    lg: {
      container: "px-4 py-3 text-base",
      icon: "h-5 w-5",
      number: "text-2xl font-bold",
      label: "text-sm",
    },
  };

  const styles = sizeStyles[size];

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <div
      className={cn(
        "rounded-lg border",
        colors.bg,
        colors.border,
        styles.container,
      )}
    >
      <div className="flex items-center gap-2">
        {timeRemaining.isOverdue ? (
          <AlertTriangle
            className={cn(styles.icon, colors.icon, "animate-pulse")}
          />
        ) : slaStatus === "RED" ? (
          <AlertCircle
            className={cn(styles.icon, colors.icon, "animate-pulse")}
          />
        ) : (
          <Timer className={cn(styles.icon, colors.icon)} />
        )}

        <div className="flex items-center gap-1">
          {showLabel && (
            <span className={cn(colors.text, "mr-1")}>
              {timeRemaining.isOverdue ? t("sla.overdue") : t("sla.timeLeft")}
            </span>
          )}

          <div className="flex items-center gap-1">
            {timeRemaining.days > 0 && (
              <div className="flex flex-col items-center">
                <span className={cn(styles.number, colors.text)}>
                  {formatNumber(timeRemaining.days)}
                </span>
                {showLabel && (
                  <span className={cn(styles.label, colors.text, "opacity-75")}>
                    {t("sla.days")}
                  </span>
                )}
              </div>
            )}

            {(timeRemaining.days > 0 || timeRemaining.hours > 0) && (
              <>
                {timeRemaining.days > 0 && (
                  <span className={cn(styles.number, colors.text)}>:</span>
                )}
                <div className="flex flex-col items-center">
                  <span className={cn(styles.number, colors.text)}>
                    {formatNumber(timeRemaining.hours)}
                  </span>
                  {showLabel && (
                    <span
                      className={cn(styles.label, colors.text, "opacity-75")}
                    >
                      {t("sla.hrs")}
                    </span>
                  )}
                </div>
              </>
            )}

            <span className={cn(styles.number, colors.text)}>:</span>

            <div className="flex flex-col items-center">
              <span className={cn(styles.number, colors.text)}>
                {formatNumber(timeRemaining.minutes)}
              </span>
              {showLabel && (
                <span className={cn(styles.label, colors.text, "opacity-75")}>
                  {t("sla.min")}
                </span>
              )}
            </div>

            <span className={cn(styles.number, colors.text)}>:</span>

            <div className="flex flex-col items-center">
              <span className={cn(styles.number, colors.text)}>
                {formatNumber(timeRemaining.seconds)}
              </span>
              {showLabel && (
                <span className={cn(styles.label, colors.text, "opacity-75")}>
                  {t("sla.sec")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact SLA badge for list views
export function SLABadge({
  deadline,
  status,
}: {
  deadline: string | Date | null;
  status: string;
}) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
    null,
  );
  const [slaStatus, setSlaStatus] = useState<
    "GREEN" | "YELLOW" | "RED" | "COMPLETED" | "APPEALED"
  >("GREEN");
  const { t: tBadge } = useSamadhanI18n();

  useEffect(() => {
    if (!deadline) return;

    const deadlineDate = new Date(deadline);

    const updateTime = () => {
      const remaining = calculateTimeRemaining(deadlineDate);
      setTimeRemaining(remaining);
      setSlaStatus(getSLAStatus(remaining, status));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute for badge

    return () => clearInterval(interval);
  }, [deadline, status]);

  if (!deadline) {
    return <span className="text-xs text-gray-400">{tBadge("sla.noSla")}</span>;
  }

  // Appealed status - show special badge
  if (slaStatus === "APPEALED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
        <AlertTriangle className="h-3 w-3" />
        {tBadge("sla.appealed")}
      </span>
    );
  }

  const closedStatuses = ["CLOSED", "RESOLVED", "CLOSED_NO_RESPONSE"];
  if (closedStatuses.includes(status)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="h-3 w-3" />
        {tBadge("sla.done")}
      </span>
    );
  }

  if (!timeRemaining) return null;

  const statusStyles = {
    GREEN: "bg-green-100 text-green-700 border-green-200",
    YELLOW: "bg-yellow-100 text-yellow-700 border-yellow-200",
    RED: "bg-red-100 text-red-700 border-red-200",
    COMPLETED: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const formatCompact = () => {
    if (timeRemaining.isOverdue) {
      if (timeRemaining.days > 0) {
        return `-${timeRemaining.days}d ${timeRemaining.hours}h`;
      }
      return `-${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    }

    if (timeRemaining.days > 0) {
      return `${timeRemaining.days}d ${timeRemaining.hours}h`;
    }
    return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
        statusStyles[slaStatus],
        slaStatus === "RED" && "animate-pulse",
      )}
    >
      {slaStatus === "RED" ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {formatCompact()}
    </span>
  );
}
