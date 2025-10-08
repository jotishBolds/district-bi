/**
 * Timezone utility functions for consistent date/time handling
 * Forces all dates to use India Standard Time (IST) in production
 */

// India Standard Time zone
export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Get current date/time in IST
 */
export function getCurrentIST(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: IST_TIMEZONE }));
}

/**
 * Convert any date to IST
 */
export function toIST(date: Date | string): Date {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return new Date(
    inputDate.toLocaleString("en-US", { timeZone: IST_TIMEZONE })
  );
}

/**
 * Format date in IST with custom options
 */
export function formatIST(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }
): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;

  return inputDate.toLocaleString("en-IN", {
    ...options,
    timeZone: IST_TIMEZONE,
  });
}

/**
 * Get greeting based on IST time
 */
export function getGreetingIST(): string {
  const istDate = getCurrentIST();
  const hour = istDate.getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

/**
 * Format relative time from IST
 */
export function formatRelativeTimeIST(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const now = getCurrentIST();
  const istInputDate = toIST(inputDate);

  const diffInMs = now.getTime() - istInputDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return formatIST(inputDate, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Create a new Date object with IST timezone offset
 */
export function createISTDate(
  year?: number,
  month?: number,
  day?: number,
  hours?: number,
  minutes?: number,
  seconds?: number
): Date {
  if (arguments.length === 0) {
    return getCurrentIST();
  }

  // Create date in IST
  const date = new Date();
  date.setFullYear(year || date.getFullYear());
  date.setMonth((month || 1) - 1); // Month is 0-indexed
  date.setDate(day || 1);
  date.setHours(hours || 0);
  date.setMinutes(minutes || 0);
  date.setSeconds(seconds || 0);
  date.setMilliseconds(0);

  return toIST(date);
}

/**
 * Get start of day in IST
 */
export function getStartOfDayIST(date?: Date | string): Date {
  const inputDate = date
    ? typeof date === "string"
      ? new Date(date)
      : date
    : getCurrentIST();
  const istDate = toIST(inputDate);

  istDate.setHours(0, 0, 0, 0);
  return istDate;
}

/**
 * Get end of day in IST
 */
export function getEndOfDayIST(date?: Date | string): Date {
  const inputDate = date
    ? typeof date === "string"
      ? new Date(date)
      : date
    : getCurrentIST();
  const istDate = toIST(inputDate);

  istDate.setHours(23, 59, 59, 999);
  return istDate;
}

/**
 * Check if a date is today in IST
 */
export function isTodayIST(date: Date | string): boolean {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const today = getCurrentIST();
  const checkDate = toIST(inputDate);

  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  );
}

/**
 * Get time ago string with IST context
 */
export function getTimeAgoIST(date: Date | string): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const now = getCurrentIST();
  const checkDate = toIST(inputDate);

  const diffInMs = now.getTime() - checkDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  if (diffInDays < 7)
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  if (diffInWeeks < 4)
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  if (diffInMonths < 12)
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
}

/**
 * Convert UTC timestamp to IST for database operations
 */
export function utcToIST(utcDate: Date | string): Date {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return toIST(date);
}

/**
 * Convert IST to UTC for database storage
 */
export function istToUTC(istDate: Date): Date {
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  return new Date(istDate.getTime() - istOffset);
}

/**
 * Format business hours in IST
 */
export function formatBusinessHours(): string {
  return "9:00 AM - 6:00 PM IST";
}

/**
 * Check if current time is within business hours (IST)
 */
export function isBusinessHoursIST(): boolean {
  const now = getCurrentIST();
  const hour = now.getHours();
  return hour >= 9 && hour < 18; // 9 AM to 6 PM
}

export default {
  getCurrentIST,
  toIST,
  formatIST,
  getGreetingIST,
  formatRelativeTimeIST,
  createISTDate,
  getStartOfDayIST,
  getEndOfDayIST,
  isTodayIST,
  getTimeAgoIST,
  utcToIST,
  istToUTC,
  formatBusinessHours,
  isBusinessHoursIST,
  IST_TIMEZONE,
};
