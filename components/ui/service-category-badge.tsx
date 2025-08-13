// components/ui/service-category-badge.tsx
"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface ServiceCategoryBadgeProps {
  category: {
    id: string;
    name: string;
    color?: string | null;
  };
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
  variant?: "default" | "outline" | "solid";
  size?: "sm" | "md" | "lg";
}

export function ServiceCategoryBadge({
  category,
  className,
  onClick,
  clickable = false,
  variant = "default",
  size = "md",
}: ServiceCategoryBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Enhanced color palette for better readability
  const defaultColors = {
    primary: "#3b82f6", // Blue
    secondary: "#8b5cf6", // Purple
    success: "#10b981", // Emerald
    warning: "#f59e0b", // Amber
    danger: "#ef4444", // Red
    info: "#06b6d4", // Cyan
    slate: "#64748b", // Slate
  };

  // Function to get luminance value for better contrast calculation
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const sRGB = c / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Function to calculate contrast ratio
  const getContrastRatio = (color1: string, color2: string): number => {
    const parseColor = (hex: string) => {
      const clean = hex.replace("#", "");
      return {
        r: parseInt(clean.substr(0, 2), 16),
        g: parseInt(clean.substr(2, 2), 16),
        b: parseInt(clean.substr(4, 2), 16),
      };
    };

    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    const l1 = getLuminance(c1.r, c1.g, c1.b);
    const l2 = getLuminance(c2.r, c2.g, c2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  };

  // Function to get optimal text color with better contrast
  const getOptimalTextColor = (backgroundColor: string): string => {
    const whiteContrast = getContrastRatio(backgroundColor, "#ffffff");
    const darkContrast = getContrastRatio(backgroundColor, "#1f2937");
    const veryDarkContrast = getContrastRatio(backgroundColor, "#111827");

    // Prefer very dark for light backgrounds, white for dark backgrounds
    // Aim for WCAG AA compliance (4.5:1 ratio minimum)
    if (whiteContrast >= 4.5 && whiteContrast > darkContrast) {
      return "#ffffff";
    } else if (veryDarkContrast >= 4.5) {
      return "#111827";
    } else if (darkContrast >= 4.5) {
      return "#1f2937";
    } else {
      // Fallback: choose the option with better contrast
      return whiteContrast > darkContrast ? "#ffffff" : "#111827";
    }
  };

  // Function to lighten or darken colors for better visual hierarchy
  const adjustColorBrightness = (hexColor: string, factor: number): string => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const adjust = (color: number) => {
      return Math.round(Math.max(0, Math.min(255, color * factor)));
    };

    const newR = adjust(r).toString(16).padStart(2, "0");
    const newG = adjust(g).toString(16).padStart(2, "0");
    const newB = adjust(b).toString(16).padStart(2, "0");

    return `#${newR}${newG}${newB}`;
  };

  // Function to create rgba color with opacity
  const toRgba = (hexColor: string, opacity: number): string => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Enhanced color styles with better visual hierarchy
  const getColorStyles = () => {
    // Use default slate color when no color is provided
    if (!category.color || category.color.trim() === "") {
      const baseColor = defaultColors.slate;
      const backgroundColor =
        variant === "outline"
          ? "transparent"
          : isHovered && clickable
          ? "#f8fafc"
          : "#f1f5f9";

      return {
        backgroundColor,
        borderColor: variant === "outline" ? baseColor : "#cbd5e1",
        color: variant === "outline" ? baseColor : "#475569",
        boxShadow:
          isHovered && clickable
            ? "0 2px 4px rgba(100, 116, 139, 0.1)"
            : "none",
      };
    }

    const baseColor = category.color.startsWith("#")
      ? category.color
      : `#${category.color}`;

    let backgroundColor: string;
    let borderColor: string;
    let textColor: string;
    let boxShadow = "none";

    switch (variant) {
      case "outline":
        backgroundColor =
          isHovered && clickable ? toRgba(baseColor, 0.05) : "transparent";
        borderColor = baseColor;
        textColor = baseColor;
        boxShadow =
          isHovered && clickable
            ? `0 2px 8px ${toRgba(baseColor, 0.15)}`
            : "none";
        break;

      case "solid":
        backgroundColor =
          isHovered && clickable
            ? adjustColorBrightness(baseColor, 0.9)
            : baseColor;
        borderColor = baseColor;
        textColor = getOptimalTextColor(backgroundColor);
        boxShadow =
          isHovered && clickable
            ? `0 4px 12px ${toRgba(baseColor, 0.25)}`
            : "none";
        break;

      default: // "default"
        backgroundColor =
          isHovered && clickable
            ? toRgba(baseColor, 0.15)
            : toRgba(baseColor, 0.1);
        borderColor = toRgba(baseColor, 0.3);
        textColor = adjustColorBrightness(baseColor, 0.7);

        // Ensure good contrast for text
        const contrastRatio = getContrastRatio(textColor, backgroundColor);
        if (contrastRatio < 4.5) {
          textColor = getOptimalTextColor(backgroundColor);
        }

        boxShadow =
          isHovered && clickable
            ? `0 2px 8px ${toRgba(baseColor, 0.15)}`
            : "none";
        break;
    }

    return {
      backgroundColor,
      borderColor,
      color: textColor,
      boxShadow,
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    };
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-2.5 py-1 text-xs font-medium";
      case "lg":
        return "px-4 py-2.5 text-sm font-semibold";
      default: // "md"
        return "px-3 py-1.5 text-xs font-medium";
    }
  };

  const colorStyles = getColorStyles();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-full",
        "transition-all duration-200 ease-in-out",
        getSizeClasses(),
        clickable && [
          "cursor-pointer",
          "hover:scale-105 hover:shadow-md",
          "active:scale-95 active:transition-transform active:duration-75",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        ],
        !clickable && "cursor-default",
        className
      )}
      style={colorStyles}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={clickable ? `Click to edit ${category.name}` : category.name}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {/* Enhanced color indicator dot with better visibility */}
      {category.color && (
        <span
          className={cn(
            "rounded-full flex-shrink-0 border border-white/20",
            size === "sm"
              ? "w-1.5 h-1.5"
              : size === "lg"
              ? "w-3 h-3"
              : "w-2 h-2"
          )}
          style={{
            backgroundColor: category.color.startsWith("#")
              ? category.color
              : `#${category.color}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        />
      )}

      <span className="truncate leading-none">{category.name}</span>

      {/* Enhanced clickable indicator */}
      {clickable && (
        <span
          className={cn(
            "transition-all duration-200",
            isHovered ? "opacity-75 translate-x-0.5" : "opacity-50"
          )}
        >
          <svg
            className={cn(
              size === "sm"
                ? "w-2.5 h-2.5"
                : size === "lg"
                ? "w-4 h-4"
                : "w-3 h-3"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </span>
      )}
    </span>
  );
}
