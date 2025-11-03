"use client";

import Image from "next/image";
import { useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  quality = 95,
  placeholder,
  blurDataURL,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (imageError) {
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center text-gray-500 text-xs`}
        style={{ width, height }}
      >
        <span>Image</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${
        isLoading ? "opacity-0" : "opacity-100"
      } transition-opacity duration-300`}
      priority={priority}
      quality={quality}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      onError={() => setImageError(true)}
      onLoad={() => setIsLoading(false)}
    />
  );
}
