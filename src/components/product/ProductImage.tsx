"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export default function ProductImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
}: ProductImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // If no src provided or image failed to load, show fallback
  if (!src || imageError) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${fallbackClassName || className}`}
      >
        <Package className="h-12 w-12 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading skeleton */}
      {isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />}

      {/* Actual image */}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
