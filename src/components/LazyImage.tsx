import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "../lib/utils";

interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTJhNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhcnJlZ2FuZG8uLi48L3RleHQ+PC9zdmc+",
  fallback = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTJhNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbSBuJmFncmF2ZTtvIGVuY29udHJhZGE8L3RleHQ+PC9zdmc+",
  width,
  height,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px", // Começar a carregar 50px antes de entrar na viewport
      }
    );

    observerRef.current.observe(currentContainer);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Preparar carregamento quando entrar na viewport
  useEffect(() => {
    if (!isInView) return;
    setIsLoading(true);
    setHasError(false);
  }, [isInView]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {isInView && (
        <Image
          src={hasError ? fallback || placeholder : src || placeholder}
          alt={alt}
          {...(width && height ? { width, height } : { fill: true })}
          className={cn(
            "transition-opacity duration-300 ease-in-out",
            isLoading ? "opacity-70" : "opacity-100",
            "object-cover"
          )}
          sizes="100vw"
          placeholder="blur"
          blurDataURL={placeholder}
          loading="lazy"
          onLoadingComplete={() => {
            setIsLoading(false);
            onLoad?.();
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
            onError?.();
          }}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasError && (
        <div className="absolute top-2 right-2 bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
          Erro ao carregar
        </div>
      )}
    </div>
  );
};

export default LazyImage;
